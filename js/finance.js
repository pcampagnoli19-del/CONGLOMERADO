/**
 * CONGLOMERADO — Finanças empresariais e pessoais (Fases 3–6)
 * Caixa por empresa (sem compartilhamento automático entre holdings).
 * Contas PJ/PF, ledger, DRE, balanço, crédito, aplicações, dividendos, falência.
 * Fase 4: pró-labore, aportes, empréstimos sócio–empresa, reembolso, restituição de capital.
 * Fase 5: rating/relacionamento bancário influenciam crédito; dividendos listados → mercado.
 * Fase 6: Debt aprofunda modalidades/covenants/agenda (totalDebt patchado).
 * Retiradas PF só pelos mecanismos formais — nunca gasto livre do caixa PJ.
 */
(function (global) {
  'use strict';

  const LEDGER_CAP = 800;
  const DRE_CAP = 260;
  /** Buffer mínimo de caixa PJ após retiradas formais */
  const CAIXA_BUFFER = 1500;
  /** Limite de mútuo empresa→sócio: fração do caixa disponível */
  const MUTUO_PJ_FRAC = 0.35;
  /** Limite de mútuo sócio→empresa: múltiplo do capital social do sócio */
  const MUTUO_PF_CAP_MULT = 2;

  const Finance = {
    /* ========== Bootstrap / ensure ========== */

    createEmptyCompanyFinance() {
      return {
        version: 6,
        contas: [],
        ledger: [],
        dreHistorico: [],
        balanco: null,
        emprestimos: [],
        financiamentos: [],
        debentures: [],
        aplicacoes: [],
        garantias: [],
        emprestimosSocio: [],
        reembolsos: [],
        notasPromissorias: [],
        creditoFornecedor: [],
        creditoIntercompany: [],
        leasings: [],
        projectFinance: [],
        covenantsAtivos: [],
        violacoesCovenant: [],
        perfilFinanceiro: {},
        agendaFinanceira: [],
        payoutMaxCovenant: null,
        limiteCreditoMult: 1,
        inadimplencia: {
          clientesAtrasados: 0,
          fornecedorJuros: 0,
          emprestimosAtraso: 0
        },
        indicadores: {},
        politicaDividendos: 'nunca',
        lucrosAcumulados: 0,
        reservas: 0,
        ativosFisicos: {
          estoques: 0,
          imoveis: 0,
          maquinas: 0,
          veiculos: 0
        },
        contasPagar: 0,
        contasReceber: 0,
        falencia: { estagio: 0, chave: 'saudavel', semanasEmEstagio: 0 },
        transferenciaLog: []
      };
    },

    createEmptyPersonalFinance() {
      return {
        version: 6,
        contas: [],
        ledger: [],
        aplicacoes: []
      };
    },

    ensureStateFinance(state) {
      if (!state.finance || typeof state.finance !== 'object') state.finance = {};
      if (!state.finance.pessoal) state.finance.pessoal = this.createEmptyPersonalFinance();
      return state.finance;
    },

    ensureCompanyFinance(empresa, state) {
      if (!empresa) return null;
      if (!empresa.finance || !Array.isArray(empresa.finance.contas)) {
        empresa.finance = this.createEmptyCompanyFinance();
      } else {
        const base = this.createEmptyCompanyFinance();
        const prev = empresa.finance;
        empresa.finance = { ...base, ...prev };
        empresa.finance.ativosFisicos = {
          ...base.ativosFisicos,
          ...(prev.ativosFisicos || {})
        };
        empresa.finance.inadimplencia = {
          ...base.inadimplencia,
          ...(prev.inadimplencia || {})
        };
        empresa.finance.falencia = {
          ...base.falencia,
          ...(prev.falencia || {})
        };
        empresa.finance.contas = Array.isArray(prev.contas) ? prev.contas : [];
        empresa.finance.emprestimosSocio = Array.isArray(prev.emprestimosSocio)
          ? prev.emprestimosSocio
          : [];
        empresa.finance.reembolsos = Array.isArray(prev.reembolsos) ? prev.reembolsos : [];
        empresa.finance.notasPromissorias = Array.isArray(prev.notasPromissorias)
          ? prev.notasPromissorias
          : [];
        empresa.finance.creditoFornecedor = Array.isArray(prev.creditoFornecedor)
          ? prev.creditoFornecedor
          : [];
        empresa.finance.creditoIntercompany = Array.isArray(prev.creditoIntercompany)
          ? prev.creditoIntercompany
          : [];
        empresa.finance.leasings = Array.isArray(prev.leasings) ? prev.leasings : [];
        empresa.finance.projectFinance = Array.isArray(prev.projectFinance)
          ? prev.projectFinance
          : [];
        empresa.finance.covenantsAtivos = Array.isArray(prev.covenantsAtivos)
          ? prev.covenantsAtivos
          : [];
        empresa.finance.violacoesCovenant = Array.isArray(prev.violacoesCovenant)
          ? prev.violacoesCovenant
          : [];
        empresa.finance.version = 6;
      }
      this._ensureAdminsProLabore(empresa);
      if (!empresa.finance.contas.length) {
        this.bootstrapCompanyAccounts(empresa, state);
      } else if (!empresa.finance.balanco) {
        this.rebuildBalanceSheet(empresa, state);
      }
      if (!empresa.finance.indicadores || !Object.keys(empresa.finance.indicadores).length) {
        this.recalcIndicators(empresa, state);
      }
      return empresa.finance;
    },

    /** Garante campos de pró-labore em cada administrador */
    _ensureAdminsProLabore(empresa) {
      if (!empresa || !Array.isArray(empresa.administradores)) return;
      const ref = this.referenciaProLabore(empresa);
      empresa.administradores.forEach((a) => {
        if (a.proLaboreMensal == null) {
          // Jogador-admin: valor inicial modesto; contratados: referência de mercado
          a.proLaboreMensal = a.ehContratado ? Math.round(ref * 0.85) : Math.round(ref * 0.6);
        }
        if (a.satisfacao == null) a.satisfacao = a.ehContratado ? 70 : 80;
        if (a.ehContratado == null) {
          a.ehContratado = !(a.socioId && (empresa.socios || []).some(
            (s) => s.id === a.socioId && s.tipo === 'jogador'
          ));
        }
      });
    },

    /** Referência mensal de pró-labore (~porte / receita) */
    referenciaProLabore(empresa) {
      const receitaMes = Math.max(0, (empresa.receita || 0) * 4);
      const porPorte = {
        micro: 3500,
        pequena: 8000,
        media: 18000,
        grande: 45000,
        corporacao: 90000,
        conglomerado: 150000
      };
      const base = porPorte[empresa.porte] || 3500;
      return Math.max(base, Math.round(receitaMes * 0.04));
    },

    ensurePersonal(state) {
      this.ensureStateFinance(state);
      const pf = state.finance.pessoal;
      if (!Array.isArray(pf.contas)) pf.contas = [];
      if (!Array.isArray(pf.ledger)) pf.ledger = [];
      if (!Array.isArray(pf.aplicacoes)) pf.aplicacoes = [];
      if (!pf.contas.length && state.player) {
        this.bootstrapPersonalAccounts(state);
      }
      return pf;
    },

    /** Conta PJ inicial alinhada ao caixa da empresa */
    bootstrapCompanyAccounts(empresa, state) {
      const bank = this._pickDefaultBank(empresa);
      const caixa = Math.max(0, Number(empresa.caixa) || 0);
      const fixed = Math.max(0, (empresa.capitalSocial || 0) * 0.15);
      empresa.finance = empresa.finance || this.createEmptyCompanyFinance();
      empresa.finance.ativosFisicos.maquinas = empresa.finance.ativosFisicos.maquinas || Math.round(fixed * 0.5);
      empresa.finance.ativosFisicos.estoques = empresa.finance.ativosFisicos.estoques || Math.round(fixed * 0.3);
      empresa.finance.ativosFisicos.imoveis = empresa.finance.ativosFisicos.imoveis || Math.round(fixed * 0.2);
      empresa.finance.lucrosAcumulados = empresa.finance.lucrosAcumulados || 0;
      empresa.finance.reservas = empresa.finance.reservas || 0;

      const conta = this._makeAccount(bank, 'pj', caixa, empresa.porte);
      empresa.finance.contas.push(conta);
      this._postLedger(empresa.finance, state, {
        tipo: 'entrada',
        categoria: 'capital',
        descricao: 'Capital social integralizado em conta corrente',
        valor: caixa,
        contaId: conta.id,
        empresaId: empresa.id
      });
      this.syncEmpresaCaixa(empresa);
      this.rebuildBalanceSheet(empresa, state);
      this.recalcIndicators(empresa, state);
      return conta;
    },

    bootstrapPersonalAccounts(state) {
      const pf = this.ensureStateFinance(state).pessoal;
      const bank = CGL.Data.getBankById('nubank') || CGL.Data.banks[0];
      const saldo = Math.max(0, Number(state.player?.dinheiro) || 0);
      const conta = this._makeAccount(bank, 'pf', saldo, 'micro');
      pf.contas.push(conta);
      this._postLedger(pf, state, {
        tipo: 'entrada',
        categoria: 'saldo_inicial',
        descricao: 'Saldo pessoal inicial',
        valor: saldo,
        contaId: conta.id,
        pessoal: true
      });
      this.syncPersonalCash(state);
      return conta;
    },

    /** Chamado após constituir empresa (Company já debitou player.dinheiro) */
    onCompanyCreated(empresa, state) {
      this.ensureCompanyFinance(empresa, state);
      if (CGL.Market?.ensureCompanyMarket) {
        try { CGL.Market.ensureCompanyMarket(empresa, state); } catch (e) { /* ok */ }
      }
      this.ensurePersonal(state);
      const aporte = (empresa.capitalSocial || 0) *
        ((CGL.Company.playerStake(empresa, state.player?.id) || 0) / 100);
      const pf = state.finance.pessoal;
      const primary = this.primaryAccount(pf);
      if (primary) {
        const other = pf.contas.slice(1).reduce((s, c) => s + (c.disponivel || 0), 0);
        primary.disponivel = Math.max(0, Math.round((state.player.dinheiro || 0) - other));
        if (aporte > 0) {
          this._postLedger(pf, state, {
            tipo: 'saida',
            categoria: 'aporte_capital',
            descricao: `Aporte de capital em ${empresa.nomeFantasia}`,
            valor: Math.round(aporte),
            contaId: primary.id,
            pessoal: true
          });
        }
      }
      this.syncPersonalCash(state);
      return empresa.finance;
    },

    migrateAll(state) {
      this.ensureStateFinance(state);
      this.ensurePersonal(state);
      (state.companies?.empresas || []).forEach((e) => {
        if (e.ativa || e.finance) this.ensureCompanyFinance(e, state);
      });
      return state;
    },

    /* ========== Contas ========== */

    _pickDefaultBank(empresa) {
      const porte = empresa?.porte || 'micro';
      const order = ['media', 'grande', 'corporacao', 'conglomerado'].includes(porte)
        ? ['itau', 'bb', 'btg', 'bradesco']
        : ['inter', 'nubank', 'caixa', 'bb'];
      for (const id of order) {
        const b = CGL.Data.getBankById(id);
        if (b && (!b.porteMin || this._porteRank(porte) >= this._porteRank(b.porteMin))) return b;
      }
      return CGL.Data.banks[0];
    },

    _porteRank(id) {
      const order = ['micro', 'pequena', 'media', 'grande', 'corporacao', 'conglomerado'];
      const i = order.indexOf(id);
      return i < 0 ? 0 : i;
    },

    _makeAccount(bank, tipoTitular, saldo, porte) {
      const limite = Math.round(
        Math.max(0, saldo) * 0.25 * (bank.creditoMult || 1) *
        (1 + this._porteRank(porte || 'micro') * 0.35)
      );
      return {
        id: CGL.Utils.uuid(),
        bancoId: bank.id,
        bancoNome: bank.nome,
        tipoTitular, // pj | pf
        tipo: 'corrente',
        disponivel: Math.round(saldo),
        bloqueado: 0,
        limiteCredito: limite,
        tarifaMensal: bank.tarifaMensal || 0,
        rendimentoAuto: !!bank.rendimentoAuto,
        relacionamento: bank.relacionamentoInicial || 50,
        extrato: []
      };
    },

    openCompanyAccount(state, empresaId, bancoId) {
      const empresa = CGL.Company.getById(state, empresaId);
      if (!empresa || !empresa.ativa) throw new Error('Empresa inválida.');
      const fin = this.ensureCompanyFinance(empresa, state);
      const bank = CGL.Data.getBankById(bancoId);
      if (!bank) throw new Error('Banco inválido.');
      if (bank.porteMin && this._porteRank(empresa.porte) < this._porteRank(bank.porteMin)) {
        throw new Error(`${bank.nome} exige porte mínimo ${bank.porteMin}.`);
      }
      if (fin.contas.some((c) => c.bancoId === bancoId)) {
        throw new Error('Já existe conta neste banco.');
      }
      const conta = this._makeAccount(bank, 'pj', 0, empresa.porte);
      fin.contas.push(conta);
      CGL.Company.addHistory(empresa, state, {
        tipo: 'financeiro',
        titulo: 'Nova conta bancária',
        descricao: `Conta aberta em ${bank.nome}.`
      });
      return conta;
    },

    openPersonalAccount(state, bancoId) {
      const pf = this.ensurePersonal(state);
      const bank = CGL.Data.getBankById(bancoId);
      if (!bank) throw new Error('Banco inválido.');
      if (pf.contas.some((c) => c.bancoId === bancoId)) {
        throw new Error('Já existe conta pessoal neste banco.');
      }
      const conta = this._makeAccount(bank, 'pf', 0, 'micro');
      pf.contas.push(conta);
      return conta;
    },

    primaryAccount(fin) {
      return (fin?.contas || [])[0] || null;
    },

    totalAvailable(fin) {
      return (fin?.contas || []).reduce((a, c) => a + (c.disponivel || 0), 0);
    },

    totalBlocked(fin) {
      return (fin?.contas || []).reduce((a, c) => a + (c.bloqueado || 0), 0);
    },

    totalInvested(fin) {
      return (fin?.aplicacoes || [])
        .filter((a) => a.status === 'ativa')
        .reduce((s, a) => s + (a.valorAtual || a.valor || 0), 0);
    },

    totalDebt(fin) {
      const loans = (fin?.emprestimos || [])
        .filter((e) => e.status === 'ativo' || e.status === 'atraso')
        .reduce((s, e) => s + (e.saldo || 0), 0);
      const fins = (fin?.financiamentos || [])
        .filter((e) => e.status === 'ativo' || e.status === 'atraso')
        .reduce((s, e) => s + (e.saldo || 0), 0);
      const deb = (fin?.debentures || [])
        .filter((e) => e.status === 'ativa')
        .reduce((s, e) => s + (e.saldo || 0), 0);
      // Mútuos em que a empresa deve ao sócio
      const mutuoPf = (fin?.emprestimosSocio || [])
        .filter((e) => e.status === 'ativo' && e.direcao === 'socio_para_empresa')
        .reduce((s, e) => s + (e.saldo || 0), 0);
      return loans + fins + deb + mutuoPf;
    },

    /** Soma mútuos empresa→sócio (ativo da PJ) */
    totalMutuoAtivo(fin) {
      return (fin?.emprestimosSocio || [])
        .filter((e) => e.status === 'ativo' && e.direcao === 'empresa_para_socio')
        .reduce((s, e) => s + (e.saldo || 0), 0);
    },

    syncEmpresaCaixa(empresa) {
      const fin = empresa.finance;
      if (!fin) return empresa.caixa;
      empresa.caixa = Math.round(this.totalAvailable(fin));
      empresa.endividamento = Math.round(this.totalDebt(fin));
      return empresa.caixa;
    },

    syncPersonalCash(state) {
      const pf = state.finance?.pessoal;
      if (!pf || !state.player) return;
      state.player.dinheiro = Math.round(this.totalAvailable(pf));
      return state.player.dinheiro;
    },

    /* ========== Ledger ========== */

    _postLedger(owner, state, entry) {
      if (!owner.ledger) owner.ledger = [];
      const row = {
        id: CGL.Utils.uuid(),
        semana: state?.world?.semanaAtual || 0,
        data: state?.world?.dataAtual || new Date().toISOString(),
        tipo: entry.tipo, // entrada | saida
        categoria: entry.categoria || 'outros',
        descricao: entry.descricao || '',
        valor: Math.round(Math.abs(Number(entry.valor) || 0)),
        contaId: entry.contaId || null,
        empresaId: entry.empresaId || null,
        pessoal: !!entry.pessoal,
        meta: entry.meta || null
      };
      owner.ledger.unshift(row);
      if (owner.ledger.length > LEDGER_CAP) owner.ledger.length = LEDGER_CAP;

      if (entry.contaId) {
        const conta = (owner.contas || []).find((c) => c.id === entry.contaId);
        if (conta) {
          if (!conta.extrato) conta.extrato = [];
          conta.extrato.unshift({
            id: row.id,
            semana: row.semana,
            tipo: row.tipo,
            categoria: row.categoria,
            descricao: row.descricao,
            valor: row.valor
          });
          if (conta.extrato.length > 80) conta.extrato.length = 80;
        }
      }
      return row;
    },

    creditAccount(fin, contaId, valor, state, meta) {
      const conta = (fin.contas || []).find((c) => c.id === contaId) || this.primaryAccount(fin);
      if (!conta) throw new Error('Conta não encontrada.');
      const v = Math.round(Math.abs(valor));
      conta.disponivel = Math.round((conta.disponivel || 0) + v);
      this._postLedger(fin, state, {
        tipo: 'entrada',
        categoria: meta?.categoria || 'entrada',
        descricao: meta?.descricao || 'Crédito em conta',
        valor: v,
        contaId: conta.id,
        empresaId: meta?.empresaId,
        pessoal: meta?.pessoal,
        meta
      });
      return conta;
    },

    debitAccount(fin, contaId, valor, state, meta) {
      const conta = (fin.contas || []).find((c) => c.id === contaId) || this.primaryAccount(fin);
      if (!conta) throw new Error('Conta não encontrada.');
      const v = Math.round(Math.abs(valor));
      const disponivel = conta.disponivel || 0;
      const limite = conta.limiteCredito || 0;
      if (disponivel + limite < v) {
        throw new Error('Saldo e limite insuficientes.');
      }
      conta.disponivel = Math.round(disponivel - v);
      this._postLedger(fin, state, {
        tipo: 'saida',
        categoria: meta?.categoria || 'saida',
        descricao: meta?.descricao || 'Débito em conta',
        valor: v,
        contaId: conta.id,
        empresaId: meta?.empresaId,
        pessoal: meta?.pessoal,
        meta
      });
      return conta;
    },

    /** Débito empresarial (atualiza caixa espelho) */
    debitEmpresa(state, empresaId, valor, meta = {}) {
      const empresa = CGL.Company.getById(state, empresaId);
      if (!empresa) throw new Error('Empresa inválida.');
      const fin = this.ensureCompanyFinance(empresa, state);
      this.debitAccount(fin, meta.contaId, valor, state, {
        ...meta,
        empresaId
      });
      this.syncEmpresaCaixa(empresa);
      return empresa;
    },

    creditEmpresa(state, empresaId, valor, meta = {}) {
      const empresa = CGL.Company.getById(state, empresaId);
      if (!empresa) throw new Error('Empresa inválida.');
      const fin = this.ensureCompanyFinance(empresa, state);
      this.creditAccount(fin, meta.contaId, valor, state, {
        ...meta,
        empresaId
      });
      this.syncEmpresaCaixa(empresa);
      return empresa;
    },

    debitPersonal(state, valor, meta = {}) {
      const pf = this.ensurePersonal(state);
      try {
        this.debitAccount(pf, meta.contaId, valor, state, { ...meta, pessoal: true });
      } catch (e) {
        // Migração: se dinheiro pessoal > contas, realinha
        this.syncPersonalCash(state);
        if ((state.player.dinheiro || 0) >= valor) {
          // força distribuição
          const primary = this.primaryAccount(pf);
          if (primary) primary.disponivel = state.player.dinheiro;
          this.debitAccount(pf, meta.contaId, valor, state, { ...meta, pessoal: true });
        } else {
          throw e;
        }
      }
      this.syncPersonalCash(state);
    },

    creditPersonal(state, valor, meta = {}) {
      const pf = this.ensurePersonal(state);
      this.creditAccount(pf, meta.contaId, valor, state, { ...meta, pessoal: true });
      this.syncPersonalCash(state);
    },

    /**
     * Transferência explícita entre empresas do grupo (não automática).
     * Exige controle ≥50% em ambas.
     */
    transferBetweenCompanies(state, fromId, toId, valor, opts = {}) {
      const from = CGL.Company.getById(state, fromId);
      const to = CGL.Company.getById(state, toId);
      if (!from || !to || !from.ativa || !to.ativa) throw new Error('Empresas inválidas.');
      if (fromId === toId) throw new Error('Origem e destino iguais.');
      const pid = state.player?.id;
      if (CGL.Company.playerStake(from, pid) < 50 || CGL.Company.playerStake(to, pid) < 50) {
        throw new Error('É preciso controle (≥50%) nas duas empresas.');
      }
      const v = Math.round(Number(valor) || 0);
      if (v <= 0) throw new Error('Valor inválido.');
      this.debitEmpresa(state, fromId, v, {
        categoria: 'transferencia_intercompany',
        descricao: opts.descricao || `Transferência para ${to.nomeFantasia}`
      });
      this.creditEmpresa(state, toId, v, {
        categoria: 'transferencia_intercompany',
        descricao: opts.descricao || `Transferência de ${from.nomeFantasia}`
      });
      const finFrom = from.finance;
      finFrom.transferenciaLog = finFrom.transferenciaLog || [];
      finFrom.transferenciaLog.unshift({
        semana: state.world?.semanaAtual,
        de: fromId,
        para: toId,
        valor: v
      });
      CGL.Company.addHistory(from, state, {
        tipo: 'financeiro',
        titulo: 'Transferência intercompany',
        descricao: `Enviou ${CGL.Utils.formatBRL(v)} para ${to.nomeFantasia}.`
      });
      return { from, to, valor: v };
    },

    /* ========== Operação semanal / DRE / Balanço ========== */

    /**
     * Aplica resultado operacional da semana no ledger detalhado.
     * Company já calculou receita/custos/lucro; aqui desdobramos e sincronizamos contas.
     */
    applyOperatingWeek(empresa, state) {
      if (!empresa?.ativa || empresa.concorrente) return;
      const fin = this.ensureCompanyFinance(empresa, state);
      const receita = Math.max(0, Number(empresa.receita) || 0);
      const custos = Math.max(0, Number(empresa.custos) || 0);
      const lucro = Number(empresa.lucro) || 0;

      // Desdobra entradas
      const vendas = Math.round(receita * 0.7);
      const servicos = Math.round(receita * 0.25);
      const recebimentos = receita - vendas - servicos;

      // Desdobra saídas (proporcional aos custos)
      const salarios = Math.round(custos * 0.32);
      const fornecedores = Math.round(custos * 0.28);
      const aluguel = Math.round(custos * 0.08);
      const energia = Math.round(custos * 0.04);
      const agua = Math.round(custos * 0.015);
      const impostos = Math.round(custos * 0.12);
      const marketing = Math.round(custos * 0.06);
      const outros = custos - salarios - fornecedores - aluguel - energia - agua - impostos - marketing;

      const conta = this.primaryAccount(fin);
      // Company já somou lucro ao caixa — registramos fluxo no ledger e realinhamos contas
      const post = (tipo, cat, desc, val) => {
        if (val <= 0 || !conta) return;
        this._postLedger(fin, state, {
          tipo,
          categoria: cat,
          descricao: desc,
          valor: val,
          contaId: conta.id,
          empresaId: empresa.id
        });
      };

      post('entrada', 'vendas', 'Vendas da semana', vendas);
      post('entrada', 'servicos', 'Prestação de serviços', servicos);
      if (recebimentos > 0) {
        post('entrada', 'recebimento_clientes', 'Recebimento de clientes', recebimentos);
      }
      post('saida', 'salarios', 'Folha de pagamento', salarios);
      post('saida', 'fornecedores', 'Fornecedores', fornecedores);
      post('saida', 'aluguel', 'Aluguéis', aluguel);
      post('saida', 'energia', 'Energia', energia);
      post('saida', 'agua', 'Água', agua);
      post('saida', 'impostos', 'Impostos', impostos);
      post('saida', 'marketing', 'Marketing', marketing);
      if (outros > 0) post('saida', 'outros_custos', 'Outros custos operacionais', outros);

      const targetCaixa = Math.max(0, Number(empresa.caixa) || 0);
      if (conta) {
        const other = fin.contas.slice(1).reduce((s, c) => s + (c.disponivel || 0), 0);
        conta.disponivel = Math.max(0, Math.round(targetCaixa - other));
      }

      // DRE semanal
      const dre = this.buildDreSnapshot(empresa, {
        receitaBruta: receita,
        custos,
        lucro,
        salarios,
        fornecedores,
        aluguel,
        energia,
        agua,
        impostos,
        marketing,
        despesasFinanceiras: 0
      });
      fin.dreHistorico.unshift(dre);
      if (fin.dreHistorico.length > DRE_CAP) fin.dreHistorico.length = DRE_CAP;

      fin.lucrosAcumulados = Math.round((fin.lucrosAcumulados || 0) + Math.max(0, lucro));
      if (lucro < 0) {
        fin.lucrosAcumulados = Math.max(0, (fin.lucrosAcumulados || 0) + lucro);
      }

      // Contas a receber/pagar leves (inadimplência de clientes)
      if (Math.random() < 0.08) {
        const atraso = Math.round(receita * CGL.Utils.randomFloat(0.02, 0.08));
        fin.contasReceber += atraso;
        fin.inadimplencia.clientesAtrasados += 1;
        if (conta) conta.disponivel = Math.max(0, (conta.disponivel || 0) - atraso);
        empresa.caixa = Math.max(0, (empresa.caixa || 0) - atraso);
        this._postLedger(fin, state, {
          tipo: 'saida',
          categoria: 'inadimplencia_cliente',
          descricao: 'Cliente em atraso (provisão)',
          valor: atraso,
          contaId: conta?.id,
          empresaId: empresa.id
        });
      } else if (fin.contasReceber > 0 && Math.random() < 0.25) {
        const recv = Math.min(fin.contasReceber, Math.round(fin.contasReceber * 0.3 + 500));
        fin.contasReceber = Math.max(0, fin.contasReceber - recv);
        if (conta) conta.disponivel = Math.round((conta.disponivel || 0) + recv);
        empresa.caixa = (empresa.caixa || 0) + recv;
        post('entrada', 'recebimento_clientes', 'Recebimento de atraso', recv);
      }

      this.syncEmpresaCaixa(empresa);
      return dre;
    },

    buildDreSnapshot(empresa, parts) {
      const receitaBruta = parts.receitaBruta || 0;
      const deducoes = Math.round(receitaBruta * 0.05);
      const receitaLiquida = receitaBruta - deducoes;
      const custosOp = Math.round((parts.fornecedores || 0) + (parts.salarios || 0) * 0.4);
      const despAdm = Math.round(
        (parts.aluguel || 0) + (parts.energia || 0) + (parts.agua || 0) +
        (parts.marketing || 0) + (parts.salarios || 0) * 0.6
      );
      const despFin = parts.despesasFinanceiras || 0;
      const resultadoOp = receitaLiquida - custosOp - despAdm;
      const impostos = parts.impostos || Math.round(Math.max(0, resultadoOp) * 0.15);
      const lucroLiquido = resultadoOp - despFin - impostos;
      return {
        semana: empresa._dreSemana || null,
        receitaBruta,
        deducoes,
        receitaLiquida,
        custosOperacionais: custosOp,
        despesasAdministrativas: despAdm,
        despesasFinanceiras: despFin,
        resultadoOperacional: Math.round(resultadoOp),
        impostos: Math.round(impostos),
        lucroLiquido: Math.round(lucroLiquido),
        // espelho ops
        receitaOps: empresa.receita,
        custosOps: empresa.custos,
        lucroOps: empresa.lucro
      };
    },

    aggregateDre(empresa, periodo) {
      const fin = empresa.finance;
      if (!fin?.dreHistorico?.length) return this.emptyDre();
      const weeks = { semanal: 1, mensal: 4, trimestral: 13, anual: 52 }[periodo] || 1;
      const slice = fin.dreHistorico.slice(0, weeks);
      const sum = (key) => slice.reduce((a, d) => a + (d[key] || 0), 0);
      return {
        periodo,
        semanas: slice.length,
        receitaBruta: sum('receitaBruta'),
        deducoes: sum('deducoes'),
        receitaLiquida: sum('receitaLiquida'),
        custosOperacionais: sum('custosOperacionais'),
        despesasAdministrativas: sum('despesasAdministrativas'),
        despesasFinanceiras: sum('despesasFinanceiras'),
        resultadoOperacional: sum('resultadoOperacional'),
        impostos: sum('impostos'),
        lucroLiquido: sum('lucroLiquido')
      };
    },

    emptyDre() {
      return {
        periodo: 'semanal',
        semanas: 0,
        receitaBruta: 0,
        deducoes: 0,
        receitaLiquida: 0,
        custosOperacionais: 0,
        despesasAdministrativas: 0,
        despesasFinanceiras: 0,
        resultadoOperacional: 0,
        impostos: 0,
        lucroLiquido: 0
      };
    },

    rebuildBalanceSheet(empresa, state) {
      // Não chama ensureCompanyFinance (evita recursão com bootstrap)
      const fin = empresa?.finance;
      if (!fin) return null;
      const caixa = this.totalAvailable(fin);
      const bancosBloq = this.totalBlocked(fin);
      const aplic = this.totalInvested(fin);
      const af = fin.ativosFisicos || {};
      let participacoes = 0;
      (empresa.participacoesDetidas || []).forEach((p) => {
        const sub = CGL.Company.getById(state, p.empresaId);
        if (sub?.ativa) {
          participacoes += ((sub.patrimonioLiquido || 0) + (sub.caixa || 0) * 0.5) *
            ((p.percentual || 0) / 100);
        }
      });

      const mutuoAtivo = this.totalMutuoAtivo(fin);
      const ativos = {
        caixa: Math.round(caixa),
        bancos: Math.round(bancosBloq),
        aplicacoes: Math.round(aplic),
        estoques: Math.round(af.estoques || 0),
        imoveis: Math.round(af.imoveis || 0),
        maquinas: Math.round(af.maquinas || 0),
        veiculos: Math.round(af.veiculos || 0),
        contasReceber: Math.round(fin.contasReceber || 0),
        emprestimosSocio: Math.round(mutuoAtivo),
        participacoes: Math.round(participacoes)
      };
      const totalAtivos = Object.values(ativos).reduce((a, b) => a + b, 0);

      const emp = (fin.emprestimos || [])
        .filter((e) => e.status === 'ativo' || e.status === 'atraso')
        .reduce((s, e) => s + (e.saldo || 0), 0);
      const fins = (fin.financiamentos || [])
        .filter((e) => e.status === 'ativo' || e.status === 'atraso')
        .reduce((s, e) => s + (e.saldo || 0), 0);
      const deb = (fin.debentures || [])
        .filter((e) => e.status === 'ativa')
        .reduce((s, e) => s + (e.saldo || 0), 0);
      const mutuoPassivo = (fin.emprestimosSocio || [])
        .filter((e) => e.status === 'ativo' && e.direcao === 'socio_para_empresa')
        .reduce((s, e) => s + (e.saldo || 0), 0);

      const passivos = {
        emprestimos: Math.round(emp),
        financiamentos: Math.round(fins),
        debentures: Math.round(deb),
        emprestimosSocio: Math.round(mutuoPassivo),
        contasPagar: Math.round(fin.contasPagar || 0),
        obrigacoes: Math.round((fin.contasPagar || 0) * 0.2)
      };
      const totalPassivos = Object.values(passivos).reduce((a, b) => a + b, 0);

      const capital = Math.round(empresa.capitalSocial || 0);
      const reservas = Math.round(fin.reservas || 0);
      const lucros = Math.round(fin.lucrosAcumulados || 0);
      // Ajusta lucros para fechar: PL = Ativos - Passivos
      const plAlvo = totalAtivos - totalPassivos;
      const pl = {
        capitalSocial: capital,
        reservas,
        lucrosAcumulados: Math.round(plAlvo - capital - reservas)
      };
      fin.lucrosAcumulados = pl.lucrosAcumulados;
      const totalPL = pl.capitalSocial + pl.reservas + pl.lucrosAcumulados;

      fin.balanco = {
        ativos,
        passivos,
        patrimonioLiquido: pl,
        totalAtivos,
        totalPassivos,
        totalPL,
        atualizadoEm: state?.world?.semanaAtual || 0
      };

      empresa.patrimonioLiquido = Math.max(0, totalPL);
      empresa.endividamento = Math.round(emp + fins + deb);
      return fin.balanco;
    },

    recalcIndicators(empresa, state) {
      const fin = empresa?.finance;
      if (!fin) return {};
      const bal = fin.balanco || this.rebuildBalanceSheet(empresa, state) || {
        ativos: { caixa: empresa.caixa || 0 },
        passivos: {},
        totalAtivos: empresa.caixa || 0,
        totalPassivos: 0,
        totalPL: empresa.patrimonioLiquido || 0
      };
      const dre = this.aggregateDre(empresa, 'mensal');
      const caixa = bal.ativos.caixa || 0;
      const ativoCirc = caixa + (bal.ativos.bancos || 0) + (bal.ativos.aplicacoes || 0) +
        (bal.ativos.estoques || 0) + (bal.ativos.contasReceber || 0);
      const passivoCirc = (bal.passivos.contasPagar || 0) + (bal.passivos.obrigacoes || 0) +
        (bal.passivos.emprestimos || 0) * 0.25;
      const pl = bal.totalPL || 1;
      const ativos = bal.totalAtivos || 1;
      const divida = bal.totalPassivos || 0;
      const receita = dre.receitaBruta || 1;
      const lucro = dre.lucroLiquido || 0;

      const liquidez = passivoCirc > 0 ? ativoCirc / passivoCirc : ativoCirc > 0 ? 3 : 1;
      const endividamento = ativos > 0 ? divida / ativos : 0;
      const margem = receita > 0 ? lucro / receita : 0;
      const crescimento = empresa.crescimentoSemanal || 0;
      const roe = pl > 0 ? (lucro * (52 / Math.max(dre.semanas || 4, 1))) / pl : 0;
      const roa = ativos > 0 ? (lucro * (52 / Math.max(dre.semanas || 4, 1))) / ativos : 0;
      const eficiencia = (empresa.eficiencia || 50) / 100;
      const capitalGiro = ativoCirc - passivoCirc;
      const risco = CGL.Utils.clamp(
        endividamento * 40 + (liquidez < 1 ? 25 : 0) + (margem < 0 ? 20 : 0) +
        (fin.falencia?.estagio || 0) * 5 + (fin.inadimplencia?.emprestimosAtraso || 0) * 3,
        0,
        100
      );

      fin.indicadores = {
        liquidez: Math.round(liquidez * 100) / 100,
        endividamento: Math.round(endividamento * 1000) / 1000,
        margemLucro: Math.round(margem * 1000) / 1000,
        crescimento: Math.round(crescimento * 1000) / 1000,
        roe: Math.round(roe * 1000) / 1000,
        roa: Math.round(roa * 1000) / 1000,
        eficienciaOperacional: Math.round(eficiencia * 100) / 100,
        capitalGiro: Math.round(capitalGiro),
        caixaDisponivel: Math.round(caixa),
        riscoFinanceiro: Math.round(risco)
      };
      return fin.indicadores;
    },

    /* ========== Empréstimos ========== */

    evaluateLoan(state, empresaId, opts) {
      const empresa = CGL.Company.getById(state, empresaId);
      if (!empresa?.ativa) throw new Error('Empresa inválida.');
      const fin = this.ensureCompanyFinance(empresa, state);
      const bank = CGL.Data.getBankById(opts.bancoId) || this._pickDefaultBank(empresa);
      const purpose = CGL.Data.getLoanPurposeById(opts.finalidadeId) || CGL.Data.loanPurposes[0];
      const valor = Math.round(Number(opts.valor) || 0);
      const prazoSem = Math.min(
        purpose.prazoMaxSem,
        Math.max(4, Number(opts.prazoSem) || 26)
      );
      if (valor < 5000) throw new Error('Valor mínimo R$ 5.000.');

      const ind = fin.indicadores || this.recalcIndicators(empresa, state);
      const conta = fin.contas.find((c) => c.bancoId === bank.id) || this.primaryAccount(fin);
      const rel = conta?.relacionamento || bank.relacionamentoInicial || 50;
      const rep = empresa.reputacao?.geral ?? 50;
      const econ = state.economy || {};
      const jurosBase = (bank.taxaBase || 0.02) * (purpose.taxaMult || 1);
      const jurosEco = (econ.taxaJuros || 0.1) / 12; // mensal ~ semanal approx
      const ratingMult = CGL.Market?.loanRateMultiplier
        ? CGL.Market.loanRateMultiplier(empresa, bank.id)
        : 1;
      const taxaSemanal = (jurosBase * 0.25 + jurosEco * 0.15) * ratingMult;

      // Garantias
      const garantias = opts.garantias || [];
      let garantiaValor = 0;
      garantias.forEach((g) => {
        const tipo = CGL.Data.collateralTypes.find((t) => t.id === g.tipoId);
        garantiaValor += (g.valor || 0) * (tipo?.haircut || 0.5);
      });

      const ratingScore = empresa.rating?.score != null
        ? empresa.rating.score
        : (CGL.Market?.calcRatingScore ? CGL.Market.calcRatingScore(empresa, state) : 55);
      const score =
        (rep / 100) * 22 +
        (rel / 100) * 18 +
        (ratingScore / 100) * 12 +
        CGL.Utils.clamp(1.5 - (ind.endividamento || 0), 0, 1.5) * 18 +
        CGL.Utils.clamp((ind.liquidez || 1) / 2, 0, 1) * 12 +
        CGL.Utils.clamp(1 - (ind.riscoFinanceiro || 50) / 100, 0, 1) * 8 +
        CGL.Utils.clamp(garantiaValor / valor, 0, 1) * 15 -
        (fin.falencia?.estagio || 0) * 4 -
        (bank.rigor || 0.5) * 10;

      const aprovado = score >= 35 + (bank.rigor || 0.5) * 20;
      const parcela = Math.round(
        (valor * (1 + taxaSemanal * prazoSem)) / prazoSem
      );

      return {
        aprovado,
        score: Math.round(score * 10) / 10,
        bancoId: bank.id,
        bancoNome: bank.nome,
        valor,
        prazoSem,
        taxaSemanal: Math.round(taxaSemanal * 10000) / 10000,
        parcela,
        finalidadeId: purpose.id,
        finalidadeNome: purpose.nome,
        garantiaValor: Math.round(garantiaValor),
        motivo: aprovado
          ? 'Crédito aprovado com base no perfil financeiro.'
          : 'Crédito recusado: risco, endividamento ou relacionamento insuficientes.'
      };
    },

    requestLoan(state, empresaId, opts) {
      const eval_ = this.evaluateLoan(state, empresaId, opts);
      const empresa = CGL.Company.getById(state, empresaId);
      const fin = this.ensureCompanyFinance(empresa, state);

      if (!eval_.aprovado) {
        CGL.Company.addHistory(empresa, state, {
          tipo: 'financeiro',
          titulo: 'Empréstimo recusado',
          descricao: `${eval_.bancoNome}: ${eval_.motivo} (score ${eval_.score}).`
        });
        return { ok: false, ...eval_ };
      }

      const loan = {
        id: CGL.Utils.uuid(),
        bancoId: eval_.bancoId,
        finalidadeId: eval_.finalidadeId,
        valorOriginal: eval_.valor,
        saldo: eval_.valor,
        prazoSem: eval_.prazoSem,
        semanasRestantes: eval_.prazoSem,
        taxaSemanal: eval_.taxaSemanal,
        parcela: eval_.parcela,
        status: 'ativo', // ativo | atraso | quitado | renegociado
        semanasAtraso: 0,
        garantias: opts.garantias || [],
        semanaInicio: state.world?.semanaAtual || 0
      };
      fin.emprestimos.push(loan);

      // Registra garantias
      (opts.garantias || []).forEach((g) => {
        fin.garantias.push({
          id: CGL.Utils.uuid(),
          tipoId: g.tipoId,
          valor: g.valor,
          emprestimoId: loan.id,
          executada: false
        });
        if (g.tipoId === 'imovel') fin.ativosFisicos.imoveis = Math.max(0, (fin.ativosFisicos.imoveis || 0));
      });

      this.creditEmpresa(state, empresaId, eval_.valor, {
        categoria: 'emprestimo',
        descricao: `Empréstimo ${eval_.finalidadeNome} — ${eval_.bancoNome}`
      });

      const conta = fin.contas.find((c) => c.bancoId === eval_.bancoId) || this.primaryAccount(fin);
      if (conta) conta.relacionamento = CGL.Utils.clamp((conta.relacionamento || 50) + 3, 0, 100);

      CGL.Company.addHistory(empresa, state, {
        tipo: 'financeiro',
        titulo: 'Empréstimo aprovado',
        descricao: `${CGL.Utils.formatBRL(eval_.valor)} em ${eval_.bancoNome} (${eval_.prazoSem} sem.).`
      });
      this.rebuildBalanceSheet(empresa, state);
      this.recalcIndicators(empresa, state);
      return { ok: true, loan, ...eval_ };
    },

    /* ========== Financiamentos ========== */

    requestFinancing(state, empresaId, opts) {
      const empresa = CGL.Company.getById(state, empresaId);
      if (!empresa?.ativa) throw new Error('Empresa inválida.');
      const fin = this.ensureCompanyFinance(empresa, state);
      const valor = Math.round(Number(opts.valor) || 0);
      const entrada = Math.round(Number(opts.entrada) || valor * 0.2);
      const prazoSem = Math.max(8, Number(opts.prazoSem) || 52);
      const tipoBem = opts.tipoBem || 'maquinas';
      if (valor < 10000) throw new Error('Financiamento mínimo R$ 10.000.');
      if (entrada >= valor) throw new Error('Entrada deve ser menor que o valor.');
      if ((empresa.caixa || 0) < entrada) throw new Error('Caixa insuficiente para a entrada.');

      const ind = fin.indicadores || this.recalcIndicators(empresa, state);
      if ((ind.riscoFinanceiro || 0) > 85) throw new Error('Risco financeiro elevado demais.');

      const financiado = valor - entrada;
      const taxa = 0.004 + (state.economy?.taxaJuros || 0.1) * 0.02;
      const parcela = Math.round((financiado * (1 + taxa * prazoSem)) / prazoSem);

      this.debitEmpresa(state, empresaId, entrada, {
        categoria: 'entrada_financiamento',
        descricao: `Entrada financiamento de ${tipoBem}`
      });

      const contract = {
        id: CGL.Utils.uuid(),
        tipoBem,
        valorBem: valor,
        entrada,
        saldo: financiado,
        prazoSem,
        semanasRestantes: prazoSem,
        taxaSemanal: taxa,
        parcela,
        status: 'ativo',
        semanasAtraso: 0,
        semanaInicio: state.world?.semanaAtual || 0
      };
      fin.financiamentos.push(contract);

      // Ativo físico
      const map = {
        maquinas: 'maquinas',
        equipamentos: 'maquinas',
        veiculos: 'veiculos',
        imoveis: 'imoveis',
        terrenos: 'imoveis',
        projetos: 'imoveis'
      };
      const key = map[tipoBem] || 'maquinas';
      fin.ativosFisicos[key] = (fin.ativosFisicos[key] || 0) + valor;

      CGL.Company.addHistory(empresa, state, {
        tipo: 'financeiro',
        titulo: 'Financiamento',
        descricao: `${tipoBem}: ${CGL.Utils.formatBRL(valor)} (entrada ${CGL.Utils.formatBRL(entrada)}).`
      });
      this.rebuildBalanceSheet(empresa, state);
      this.recalcIndicators(empresa, state);
      return contract;
    },

    /* ========== Debêntures ========== */

    canIssueDebentures(empresa) {
      const okPorte = ['media', 'grande', 'corporacao', 'conglomerado'].includes(empresa.porte);
      const nat = CGL.Data.getLegalNatureById(empresa.naturezaId);
      return okPorte && (nat?.permiteIPO || nat?.id === 'sa_fechada' || nat?.id === 'sa_aberta' || empresa.porte !== 'media');
    },

    issueDebentures(state, empresaId, opts) {
      const empresa = CGL.Company.getById(state, empresaId);
      if (!empresa?.ativa) throw new Error('Empresa inválida.');
      if (!this.canIssueDebentures(empresa)) {
        throw new Error('Debêntures exigem porte médio+ e natureza societária adequada.');
      }
      const fin = this.ensureCompanyFinance(empresa, state);
      const valor = Math.round(Number(opts.valor) || 0);
      const prazoSem = Math.max(52, Number(opts.prazoSem) || 104);
      const tipo = opts.tipo || 'simples'; // simples | conversivel | incentivada
      const remuneracao = Number(opts.remuneracaoAnual) || 0.12;
      if (valor < 500000) throw new Error('Emissão mínima R$ 500.000.');

      const ind = fin.indicadores || this.recalcIndicators(empresa, state);
      const risco = ind.riscoFinanceiro || 50;
      const demanda = CGL.Utils.clamp(1 - risco / 120 + (empresa.reputacao?.geral || 50) / 200, 0.2, 1);
      const captado = Math.round(valor * demanda);
      if (captado < valor * 0.4) {
        throw new Error('Investidores não absorveram a emissão (risco elevado).');
      }

      const deb = {
        id: CGL.Utils.uuid(),
        tipo,
        valorFace: valor,
        saldo: captado,
        captado,
        prazoSem,
        semanasRestantes: prazoSem,
        remuneracaoAnual: remuneracao,
        status: 'ativa',
        semanaEmissao: state.world?.semanaAtual || 0,
        garantias: opts.garantias || []
      };
      fin.debentures.push(deb);
      this.creditEmpresa(state, empresaId, captado, {
        categoria: 'debentures',
        descricao: `Emissão de debêntures (${tipo})`
      });
      CGL.Company.addHistory(empresa, state, {
        tipo: 'financeiro',
        titulo: 'Debêntures emitidas',
        descricao: `Captados ${CGL.Utils.formatBRL(captado)} de ${CGL.Utils.formatBRL(valor)} ofertados.`
      });
      this.rebuildBalanceSheet(empresa, state);
      this.recalcIndicators(empresa, state);
      return deb;
    },

    /* ========== Aplicações ========== */

    invest(state, empresaId, produtoId, valor, opts = {}) {
      const empresa = opts.pessoal ? null : CGL.Company.getById(state, empresaId);
      const fin = opts.pessoal
        ? this.ensurePersonal(state)
        : this.ensureCompanyFinance(empresa, state);
      const prod = CGL.Data.getInvestmentById(produtoId);
      if (!prod) throw new Error('Produto inválido.');
      const v = Math.round(Number(valor) || 0);
      if (v < prod.minimo) throw new Error(`Mínimo ${CGL.Utils.formatBRL(prod.minimo)}.`);

      if (opts.pessoal) {
        this.debitPersonal(state, v, {
          categoria: 'aplicacao',
          descricao: `Aplicação em ${prod.nome}`
        });
      } else {
        this.debitEmpresa(state, empresaId, v, {
          categoria: 'aplicacao',
          descricao: `Aplicação em ${prod.nome}`
        });
      }

      const app = {
        id: CGL.Utils.uuid(),
        produtoId: prod.id,
        nome: prod.nome,
        valor: v,
        valorAtual: v,
        liquidezSem: prod.liquidezSem,
        semanasRestantesResgate: prod.liquidezSem,
        rentabilidadeAnual: prod.rentabilidadeAnual,
        risco: prod.risco,
        status: 'ativa',
        semanaInicio: state.world?.semanaAtual || 0,
        pessoal: !!opts.pessoal
      };
      fin.aplicacoes.push(app);
      if (!opts.pessoal) {
        CGL.Company.addHistory(empresa, state, {
          tipo: 'financeiro',
          titulo: 'Aplicação financeira',
          descricao: `${prod.nome}: ${CGL.Utils.formatBRL(v)}.`
        });
        this.rebuildBalanceSheet(empresa, state);
      }
      return app;
    },

    redeemInvestment(state, empresaId, aplicacaoId, opts = {}) {
      const empresa = opts.pessoal ? null : CGL.Company.getById(state, empresaId);
      const fin = opts.pessoal
        ? this.ensurePersonal(state)
        : this.ensureCompanyFinance(empresa, state);
      const app = (fin.aplicacoes || []).find((a) => a.id === aplicacaoId);
      if (!app || app.status !== 'ativa') throw new Error('Aplicação não encontrada.');
      if ((app.semanasRestantesResgate || 0) > 0) {
        throw new Error(`Liquidez em ${app.semanasRestantesResgate} semana(s).`);
      }
      const valor = Math.round(app.valorAtual || app.valor);
      app.status = 'resgatada';
      if (opts.pessoal) {
        this.creditPersonal(state, valor, {
          categoria: 'resgate_aplicacao',
          descricao: `Resgate ${app.nome}`
        });
      } else {
        this.creditEmpresa(state, empresaId, valor, {
          categoria: 'resgate_aplicacao',
          descricao: `Resgate ${app.nome}`
        });
        this.rebuildBalanceSheet(empresa, state);
      }
      return valor;
    },

    /* ========== Fase 4 — Remuneração sócios / admins (PF ≠ PJ) ========== */

    /**
     * Mecanismos permitidos de retirada PJ → PF.
     * Qualquer outro uso de caixa empresarial para gasto pessoal é proibido.
     */
    canaisRetiradaPermitidos() {
      return [
        'pro_labore',
        'dividendos',
        'reembolso',
        'venda_participacao',
        'emprestimo_socio',
        'restituicao_capital'
      ];
    },

    _requireShareholder(empresa, state, minPct = 0.01) {
      const pct = CGL.Company.playerStake(empresa, state.player?.id) || 0;
      if (pct < minPct) throw new Error('É preciso ser sócio da empresa.');
      return pct;
    },

    _requireAdminOrControl(empresa, state) {
      const pct = CGL.Company.playerStake(empresa, state.player?.id) || 0;
      const isAdmin = (empresa.administradores || []).some(
        (a) => a.socioId && (empresa.socios || []).some(
          (s) => s.id === a.socioId && (s.tipo === 'jogador' || s.playerId === state.player?.id)
        )
      ) || (empresa.administradores || []).some(
        (a) => a.nome && state.player &&
          a.nome.toLowerCase().includes((state.player.nome || '').toLowerCase())
      );
      if (pct < 50 && !isAdmin) {
        throw new Error('Somente administradores ou sócios controladores.');
      }
      return { pct, isAdmin };
    },

    _caixaLivre(empresa) {
      return Math.max(0, (empresa.caixa || 0) - CAIXA_BUFFER);
    },

    /* ----- Pró-labore ----- */

    setProLabore(state, empresaId, adminId, valorMensal) {
      const empresa = CGL.Company.getById(state, empresaId);
      if (!empresa?.ativa) throw new Error('Empresa inválida.');
      this.ensureCompanyFinance(empresa, state);
      this._requireAdminOrControl(empresa, state);
      const admin = (empresa.administradores || []).find((a) => a.id === adminId);
      if (!admin) throw new Error('Administrador não encontrado.');
      const v = Math.round(Number(valorMensal) || 0);
      if (v < 0) throw new Error('Valor inválido.');
      if (v > this.referenciaProLabore(empresa) * 8) {
        throw new Error('Pró-labore acima do teto razoável para o porte.');
      }
      admin.proLaboreMensal = v;
      CGL.Company.addHistory(empresa, state, {
        tipo: 'financeiro',
        titulo: 'Pró-labore definido',
        descricao: `${admin.nome}: ${CGL.Utils.formatBRL(v)}/mês.`
      });
      return admin;
    },

    /** Custo mensal total de pró-labore (todos os admins) */
    totalProLaboreMensal(empresa) {
      return (empresa.administradores || []).reduce(
        (s, a) => s + Math.max(0, a.proLaboreMensal || 0),
        0
      );
    },

    /**
     * Paga pró-labore mensal (chamado a cada 4 semanas no tick).
     * Reduz caixa PJ; credita PF do jogador se for o beneficiário; senão é custo puro.
     */
    payProLabores(state, empresaId) {
      const empresa = CGL.Company.getById(state, empresaId);
      if (!empresa?.ativa || empresa.concorrente) return { pagos: [], total: 0 };
      const fin = this.ensureCompanyFinance(empresa, state);
      this._ensureAdminsProLabore(empresa);
      const ref = this.referenciaProLabore(empresa);
      const pagos = [];
      let total = 0;

      (empresa.administradores || []).forEach((admin) => {
        const valor = Math.round(admin.proLaboreMensal || 0);
        if (valor <= 0) {
          if (admin.ehContratado) {
            admin.satisfacao = CGL.Utils.clamp((admin.satisfacao || 70) - 6, 0, 100);
          }
          return;
        }
        try {
          this.debitEmpresa(state, empresaId, valor, {
            categoria: 'pro_labore',
            descricao: `Pró-labore — ${admin.nome}`
          });
          total += valor;
          const isPlayer = this._adminIsPlayer(admin, empresa, state);
          if (isPlayer) {
            this.creditPersonal(state, valor, {
              categoria: 'pro_labore_recebido',
              descricao: `Pró-labore de ${empresa.nomeFantasia}`
            });
            CGL.Player.addHistory(state, {
              tipo: 'financeiro',
              titulo: 'Pró-labore',
              descricao: `Recebeu ${CGL.Utils.formatBRL(valor)} de ${empresa.nomeFantasia}.`
            });
          }
          // Tradeoff: alto custo vs insatisfação
          const ratio = valor / Math.max(1, ref);
          if (admin.ehContratado) {
            if (ratio < 0.5) {
              admin.satisfacao = CGL.Utils.clamp((admin.satisfacao || 70) - 4, 0, 100);
            } else if (ratio >= 0.9) {
              admin.satisfacao = CGL.Utils.clamp((admin.satisfacao || 70) + 2, 0, 100);
            }
          }
          // Custo alto pressiona eficiência levemente
          if (ratio > 2.5) {
            empresa.eficiencia = CGL.Utils.clamp((empresa.eficiencia || 50) - 0.3, 5, 100);
          }
          pagos.push({ adminId: admin.id, nome: admin.nome, valor, isPlayer });
        } catch (e) {
          if (admin.ehContratado) {
            admin.satisfacao = CGL.Utils.clamp((admin.satisfacao || 70) - 8, 0, 100);
          }
        }
      });

      if (total > 0) {
        // Espelha na DRE da semana
        if (fin.dreHistorico[0]) {
          fin.dreHistorico[0].despesasAdministrativas =
            (fin.dreHistorico[0].despesasAdministrativas || 0) + total;
          fin.dreHistorico[0].lucroLiquido =
            (fin.dreHistorico[0].lucroLiquido || 0) - total;
        }
        CGL.Company.addHistory(empresa, state, {
          tipo: 'financeiro',
          titulo: 'Folha de pró-labore',
          descricao: `Total mensal ${CGL.Utils.formatBRL(total)}.`
        });
      }
      this.rebuildBalanceSheet(empresa, state);
      return { pagos, total };
    },

    _adminIsPlayer(admin, empresa, state) {
      if (!state.player) return false;
      if (admin.playerId && admin.playerId === state.player.id) return true;
      const socio = (empresa.socios || []).find((s) => s.id === admin.socioId);
      if (socio && (socio.tipo === 'jogador' || socio.playerId === state.player.id)) return true;
      const nome = `${state.player.nome || ''} ${state.player.sobrenome || ''}`.trim().toLowerCase();
      return !!(admin.nome && nome && admin.nome.toLowerCase() === nome);
    },

    /* ----- Aporte de capital (PF → PJ) ----- */

    contributeCapital(state, empresaId, valor) {
      const empresa = CGL.Company.getById(state, empresaId);
      if (!empresa?.ativa) throw new Error('Empresa inválida.');
      this.ensureCompanyFinance(empresa, state);
      const pct = this._requireShareholder(empresa, state);
      const v = Math.round(Number(valor) || 0);
      if (v < 500) throw new Error('Aporte mínimo: R$ 500.');
      if ((state.player.dinheiro || 0) < v) throw new Error('Dinheiro pessoal insuficiente.');

      this.debitPersonal(state, v, {
        categoria: 'aporte_capital',
        descricao: `Aporte de capital em ${empresa.nomeFantasia}`
      });
      this.creditEmpresa(state, empresaId, v, {
        categoria: 'aporte_capital',
        descricao: `Aporte do sócio (${pct.toFixed(1)}%)`
      });
      // Aumenta capital social proporcional à participação do jogador (integralização)
      empresa.capitalSocial = Math.round((empresa.capitalSocial || 0) + v);
      CGL.Company.addHistory(empresa, state, {
        tipo: 'financeiro',
        titulo: 'Aporte de capital',
        descricao: `Sócio integralizou ${CGL.Utils.formatBRL(v)}. Capital social: ${CGL.Utils.formatBRL(empresa.capitalSocial)}.`
      });
      CGL.Player.addHistory(state, {
        tipo: 'financeiro',
        titulo: 'Aporte empresarial',
        descricao: `Investiu ${CGL.Utils.formatBRL(v)} em ${empresa.nomeFantasia}.`
      });
      this.rebuildBalanceSheet(empresa, state);
      this.recalcIndicators(empresa, state);
      try { CGL.Company.syncPlayerEquity(state); } catch (e) { /* ok */ }
      return { valor: v, capitalSocial: empresa.capitalSocial };
    },

    /* ----- Reembolso de despesas ----- */

    reimburseExpense(state, empresaId, valor, descricao) {
      const empresa = CGL.Company.getById(state, empresaId);
      if (!empresa?.ativa) throw new Error('Empresa inválida.');
      const fin = this.ensureCompanyFinance(empresa, state);
      this._requireShareholder(empresa, state);
      const v = Math.round(Number(valor) || 0);
      if (v < 50) throw new Error('Reembolso mínimo: R$ 50.');
      const teto = Math.max(2000, Math.round(((empresa.receita || 0) * 4) * 0.08));
      if (v > teto) throw new Error(`Reembolso acima do teto (${CGL.Utils.formatBRL(teto)}).`);
      if (v > this._caixaLivre(empresa)) throw new Error('Caixa empresarial insuficiente (respeite o buffer).');

      this.debitEmpresa(state, empresaId, v, {
        categoria: 'reembolso',
        descricao: descricao || 'Reembolso de despesas do sócio'
      });
      this.creditPersonal(state, v, {
        categoria: 'reembolso_recebido',
        descricao: `Reembolso — ${empresa.nomeFantasia}`
      });
      fin.reembolsos = fin.reembolsos || [];
      fin.reembolsos.unshift({
        id: CGL.Utils.uuid(),
        semana: state.world?.semanaAtual || 0,
        valor: v,
        descricao: descricao || 'Despesas operacionais'
      });
      if (fin.reembolsos.length > 80) fin.reembolsos.length = 80;

      CGL.Company.addHistory(empresa, state, {
        tipo: 'financeiro',
        titulo: 'Reembolso de despesas',
        descricao: `${CGL.Utils.formatBRL(v)} — ${descricao || 'despesas'}.`
      });
      CGL.Player.addHistory(state, {
        tipo: 'financeiro',
        titulo: 'Reembolso',
        descricao: `Recebeu ${CGL.Utils.formatBRL(v)} de ${empresa.nomeFantasia}.`
      });
      this.rebuildBalanceSheet(empresa, state);
      return { valor: v };
    },

    /* ----- Empréstimos sócio ↔ empresa ----- */

    /**
     * Sócio empresta à empresa (PF → PJ). Cria passivo mutuo.
     */
    loanShareholderToCompany(state, empresaId, valor, opts = {}) {
      const empresa = CGL.Company.getById(state, empresaId);
      if (!empresa?.ativa) throw new Error('Empresa inválida.');
      const fin = this.ensureCompanyFinance(empresa, state);
      const pct = this._requireShareholder(empresa, state);
      const v = Math.round(Number(valor) || 0);
      if (v < 1000) throw new Error('Mútuo mínimo: R$ 1.000.');
      if ((state.player.dinheiro || 0) < v) throw new Error('Dinheiro pessoal insuficiente.');

      const teto = Math.round(
        Math.max(10000, (empresa.capitalSocial || 0) * (pct / 100) * MUTUO_PF_CAP_MULT)
      );
      const jaEmprestado = (fin.emprestimosSocio || [])
        .filter((e) => e.status === 'ativo' && e.direcao === 'socio_para_empresa')
        .reduce((s, e) => s + (e.saldo || 0), 0);
      if (jaEmprestado + v > teto) {
        throw new Error(`Limite de mútuo sócio→empresa: ${CGL.Utils.formatBRL(teto)}.`);
      }

      const prazoSem = Math.max(4, Math.min(208, Number(opts.prazoSem) || 52));
      const taxaAnual = opts.taxaAnual != null ? Number(opts.taxaAnual) : 0.06;
      const taxaSemanal = taxaAnual / 52;
      const parcela = Math.round((v * (1 + taxaSemanal * prazoSem)) / prazoSem);

      this.debitPersonal(state, v, {
        categoria: 'emprestimo_socio',
        descricao: `Empréstimo à ${empresa.nomeFantasia}`
      });
      this.creditEmpresa(state, empresaId, v, {
        categoria: 'emprestimo_socio',
        descricao: 'Mútuo recebido do sócio'
      });

      const contrato = {
        id: CGL.Utils.uuid(),
        direcao: 'socio_para_empresa',
        valorOriginal: v,
        saldo: v,
        taxaAnual,
        taxaSemanal,
        prazoSem,
        semanasRestantes: prazoSem,
        parcela,
        status: 'ativo',
        semanaInicio: state.world?.semanaAtual || 0
      };
      fin.emprestimosSocio = fin.emprestimosSocio || [];
      fin.emprestimosSocio.unshift(contrato);

      CGL.Company.addHistory(empresa, state, {
        tipo: 'financeiro',
        titulo: 'Mútuo do sócio',
        descricao: `Recebeu ${CGL.Utils.formatBRL(v)} (prazo ${prazoSem} sem., ${(taxaAnual * 100).toFixed(1)}% a.a.).`
      });
      CGL.Player.addHistory(state, {
        tipo: 'financeiro',
        titulo: 'Empréstimo à empresa',
        descricao: `Emprestou ${CGL.Utils.formatBRL(v)} a ${empresa.nomeFantasia}.`
      });
      this.rebuildBalanceSheet(empresa, state);
      this.recalcIndicators(empresa, state);
      return contrato;
    },

    /**
     * Empresa empresta ao sócio (PJ → PF). Limites e juros obrigatórios.
     */
    loanCompanyToShareholder(state, empresaId, valor, opts = {}) {
      const empresa = CGL.Company.getById(state, empresaId);
      if (!empresa?.ativa) throw new Error('Empresa inválida.');
      const fin = this.ensureCompanyFinance(empresa, state);
      const pct = this._requireShareholder(empresa, state);
      if (pct < 10) throw new Error('Participação mínima de 10% para tomar mútuo da empresa.');
      const v = Math.round(Number(valor) || 0);
      if (v < 1000) throw new Error('Mútuo mínimo: R$ 1.000.');
      if (v > this._caixaLivre(empresa)) throw new Error('Caixa insuficiente (buffer de segurança).');

      const limiteEfetivo = Math.min(
        Math.round((empresa.caixa || 0) * MUTUO_PJ_FRAC),
        Math.round((empresa.capitalSocial || 0) * (pct / 100) * 0.8),
        this._caixaLivre(empresa)
      );
      const jaTomado = (fin.emprestimosSocio || [])
        .filter((e) => e.status === 'ativo' && e.direcao === 'empresa_para_socio')
        .reduce((s, e) => s + (e.saldo || 0), 0);
      if (jaTomado + v > limiteEfetivo) {
        throw new Error(`Limite de mútuo empresa→sócio: ${CGL.Utils.formatBRL(limiteEfetivo)}.`);
      }

      const prazoSem = Math.max(4, Math.min(104, Number(opts.prazoSem) || 26));
      // Juros obrigatórios quando empresa empresta ao sócio (evita retirada disfarçada)
      const taxaAnual = opts.taxaAnual != null ? Math.max(0.08, Number(opts.taxaAnual)) : 0.12;
      const taxaSemanal = taxaAnual / 52;
      const parcela = Math.round((v * (1 + taxaSemanal * prazoSem)) / prazoSem);

      this.debitEmpresa(state, empresaId, v, {
        categoria: 'emprestimo_socio',
        descricao: 'Mútuo concedido ao sócio'
      });
      this.creditPersonal(state, v, {
        categoria: 'emprestimo_socio_recebido',
        descricao: `Mútuo de ${empresa.nomeFantasia}`
      });

      const contrato = {
        id: CGL.Utils.uuid(),
        direcao: 'empresa_para_socio',
        valorOriginal: v,
        saldo: v,
        taxaAnual,
        taxaSemanal,
        prazoSem,
        semanasRestantes: prazoSem,
        parcela,
        status: 'ativo',
        semanaInicio: state.world?.semanaAtual || 0
      };
      fin.emprestimosSocio = fin.emprestimosSocio || [];
      fin.emprestimosSocio.unshift(contrato);

      CGL.Company.addHistory(empresa, state, {
        tipo: 'financeiro',
        titulo: 'Mútuo ao sócio',
        descricao: `Concedeu ${CGL.Utils.formatBRL(v)} (${(taxaAnual * 100).toFixed(1)}% a.a., ${prazoSem} sem.).`
      });
      CGL.Player.addHistory(state, {
        tipo: 'financeiro',
        titulo: 'Empréstimo da empresa',
        descricao: `Tomou ${CGL.Utils.formatBRL(v)} de ${empresa.nomeFantasia} (com juros).`
      });
      this.rebuildBalanceSheet(empresa, state);
      this.recalcIndicators(empresa, state);
      return contrato;
    },

    /** Processa parcelas semanais dos mútuos sócio–empresa */
    _processShareholderLoans(empresa, state) {
      const fin = empresa.finance;
      if (!fin?.emprestimosSocio?.length) return;

      fin.emprestimosSocio.filter((c) => c.status === 'ativo').forEach((c) => {
        const parcela = c.parcela || 0;
        const juros = Math.round((c.saldo || 0) * (c.taxaSemanal || 0));
        const principal = Math.max(0, parcela - juros);

        if (c.direcao === 'socio_para_empresa') {
          // Empresa paga o sócio
          try {
            this.debitEmpresa(state, empresa.id, parcela, {
              categoria: 'parcela_mutuo_socio',
              descricao: 'Parcela mútuo (sócio credor)'
            });
            this.creditPersonal(state, parcela, {
              categoria: 'parcela_mutuo_recebida',
              descricao: `Parcela mútuo — ${empresa.nomeFantasia}`
            });
            c.saldo = Math.max(0, (c.saldo || 0) - principal);
            c.semanasRestantes = Math.max(0, (c.semanasRestantes || 1) - 1);
            if (c.saldo <= 0 || c.semanasRestantes <= 0) {
              c.saldo = 0;
              c.status = 'quitado';
            }
          } catch (e) {
            c.status = 'atraso';
          }
        } else if (c.direcao === 'empresa_para_socio') {
          // Sócio paga a empresa
          try {
            this.debitPersonal(state, parcela, {
              categoria: 'parcela_mutuo_paga',
              descricao: `Parcela mútuo — ${empresa.nomeFantasia}`
            });
            this.creditEmpresa(state, empresa.id, parcela, {
              categoria: 'parcela_mutuo_socio',
              descricao: 'Parcela mútuo (sócio devedor)'
            });
            c.saldo = Math.max(0, (c.saldo || 0) - principal);
            c.semanasRestantes = Math.max(0, (c.semanasRestantes || 1) - 1);
            if (c.saldo <= 0 || c.semanasRestantes <= 0) {
              c.saldo = 0;
              c.status = 'quitado';
            }
          } catch (e) {
            c.status = 'atraso';
            c.saldo = Math.round((c.saldo || 0) * (1 + (c.taxaSemanal || 0.002) * 1.5));
          }
        }
      });
    },

    /* ----- Restituição de capital ----- */

    /**
     * Restitui capital ao sócio (quando permitido): reduz capital social e paga PF.
     * Exige caixa livre, participação e que o capital residual cubra o mínimo da natureza.
     */
    restituteCapital(state, empresaId, valor) {
      const empresa = CGL.Company.getById(state, empresaId);
      if (!empresa?.ativa) throw new Error('Empresa inválida.');
      this.ensureCompanyFinance(empresa, state);
      const pct = this._requireShareholder(empresa, state);
      if (pct < 50) throw new Error('Restituição exige controle (≥50%).');

      const v = Math.round(Number(valor) || 0);
      if (v < 500) throw new Error('Restituição mínima: R$ 500.');
      if (v > this._caixaLivre(empresa)) throw new Error('Caixa insuficiente para restituir.');

      const natureza = CGL.Data.getLegalNatureById(empresa.naturezaId);
      const capitalMin = natureza?.capitalMin || 1000;
      const tetoSocio = Math.round((empresa.capitalSocial || 0) * (pct / 100) * 0.5);
      if (v > tetoSocio) {
        throw new Error(`Teto de restituição (50% da sua fatia de capital): ${CGL.Utils.formatBRL(tetoSocio)}.`);
      }
      if ((empresa.capitalSocial || 0) - v < capitalMin) {
        throw new Error(`Capital residual não pode ficar abaixo de ${CGL.Utils.formatBRL(capitalMin)}.`);
      }
      const fin = empresa.finance;
      this.rebuildBalanceSheet(empresa, state);
      // Bloqueia se PL negativo ou estágio crítico (prejuízo a cobrir / insolvência)
      if ((fin.balanco?.totalPL || 0) <= 0) {
        throw new Error('Patrimônio líquido insuficiente — restituição não permitida.');
      }
      if ((fin.falencia?.estagio || 0) >= 3) {
        throw new Error('Empresa em estágio financeiro crítico — restituição bloqueada.');
      }
      if ((empresa.endividamento || 0) > (fin.balanco?.totalAtivos || 0) * 0.85) {
        throw new Error('Endividamento elevado — restituição bloqueada.');
      }

      this.debitEmpresa(state, empresaId, v, {
        categoria: 'restituicao_capital',
        descricao: 'Restituição de capital ao sócio'
      });
      this.creditPersonal(state, v, {
        categoria: 'restituicao_capital_recebida',
        descricao: `Restituição — ${empresa.nomeFantasia}`
      });
      empresa.capitalSocial = Math.max(capitalMin, Math.round((empresa.capitalSocial || 0) - v));

      CGL.Company.addHistory(empresa, state, {
        tipo: 'financeiro',
        titulo: 'Restituição de capital',
        descricao: `${CGL.Utils.formatBRL(v)} devolvidos. Capital social: ${CGL.Utils.formatBRL(empresa.capitalSocial)}.`
      });
      CGL.Player.addHistory(state, {
        tipo: 'financeiro',
        titulo: 'Restituição de capital',
        descricao: `Recebeu ${CGL.Utils.formatBRL(v)} de ${empresa.nomeFantasia}.`
      });
      this.rebuildBalanceSheet(empresa, state);
      this.recalcIndicators(empresa, state);
      try { CGL.Company.syncPlayerEquity(state); } catch (e) { /* ok */ }
      return { valor: v, capitalSocial: empresa.capitalSocial };
    },

    /** Crédito PF por venda de participação (canal formal) */
    creditEquitySale(state, valor, empresaNome) {
      const v = Math.round(Number(valor) || 0);
      if (v <= 0) return 0;
      this.ensurePersonal(state);
      this.creditPersonal(state, v, {
        categoria: 'venda_participacao',
        descricao: `Venda de participação — ${empresaNome || 'empresa'}`
      });
      CGL.Player.addHistory(state, {
        tipo: 'financeiro',
        titulo: 'Venda de participação',
        descricao: `Recebeu ${CGL.Utils.formatBRL(v)} pela venda societária.`
      });
      return v;
    },

    /* ========== Dividendos ========== */

    setDividendPolicy(state, empresaId, policyId) {
      const empresa = CGL.Company.getById(state, empresaId);
      if (!empresa) throw new Error('Empresa inválida.');
      const fin = this.ensureCompanyFinance(empresa, state);
      const pol = CGL.Data.getDividendPolicyById(policyId);
      fin.politicaDividendos = pol.id;
      (empresa.socios || []).forEach((s) => {
        if (s.tipo === 'jogador') return;
        s.satisfacao = CGL.Utils.clamp(
          (s.satisfacao || 60) + pol.satisfacaoDelta * 2,
          0,
          100
        );
      });
      CGL.Company.addHistory(empresa, state, {
        tipo: 'financeiro',
        titulo: 'Política de dividendos',
        descricao: `Definida: ${pol.nome}.`
      });
      // Fase 5: listadas reagem (preço, confiança, pressão do conselho)
      if (CGL.Market?.onDividendPolicyChange) {
        try { CGL.Market.onDividendPolicyChange(state, empresaId, pol.id); } catch (e) { /* ok */ }
      }
      return pol;
    },

    distributeDividends(state, empresaId, opts = {}) {
      const empresa = CGL.Company.getById(state, empresaId);
      if (!empresa?.ativa) throw new Error('Empresa inválida.');
      const fin = this.ensureCompanyFinance(empresa, state);
      const pol = CGL.Data.getDividendPolicyById(
        opts.policyId || fin.politicaDividendos || 'nunca'
      );
      const payout = opts.payout != null ? opts.payout : pol.payout;
      if (payout <= 0) return { total: 0, pagos: [] };

      const base = Math.min(
        fin.lucrosAcumulados || 0,
        Math.max(0, (empresa.caixa || 0) - 2000)
      );
      const total = Math.round(base * payout);
      if (total < 100) throw new Error('Lucros acumulados / caixa insuficientes.');

      this.debitEmpresa(state, empresaId, total, {
        categoria: 'dividendos',
        descricao: `Distribuição de dividendos (${pol.nome})`
      });
      fin.lucrosAcumulados = Math.max(0, (fin.lucrosAcumulados || 0) - total);

      // Pro-rata à participação (sócios com direito a dividendos)
      const elegiveis = (empresa.socios || []).filter(
        (s) => s.direitoDividendos !== false && (s.percentual || 0) > 0
      );
      const somaPct = elegiveis.reduce((a, s) => a + (s.percentual || 0), 0) || 100;
      const pagos = [];
      elegiveis.forEach((s) => {
        const parte = Math.round(total * ((s.percentual || 0) / somaPct));
        if (parte <= 0) return;
        if (s.tipo === 'jogador' || s.playerId === state.player?.id) {
          this.creditPersonal(state, parte, {
            categoria: 'dividendos_recebidos',
            descricao: `Dividendos de ${empresa.nomeFantasia}`
          });
          CGL.Player.addHistory(state, {
            tipo: 'financeiro',
            titulo: 'Dividendos',
            descricao: `Recebeu ${CGL.Utils.formatBRL(parte)} de ${empresa.nomeFantasia}.`
          });
        } else {
          s.satisfacao = CGL.Utils.clamp((s.satisfacao || 60) + 2 + pol.satisfacaoDelta, 0, 100);
        }
        pagos.push({ socioId: s.id || s.nome, nome: s.nome, valor: parte, pct: s.percentual });
      });

      CGL.Company.addHistory(empresa, state, {
        tipo: 'financeiro',
        titulo: 'Dividendos distribuídos',
        descricao: `Total ${CGL.Utils.formatBRL(total)} (${pol.nome}).`
      });
      this.rebuildBalanceSheet(empresa, state);
      this.recalcIndicators(empresa, state);
      return { total, pagos, policy: pol };
    },

    /* ========== Inadimplência / renegociação ========== */

    renegotiateLoan(state, empresaId, loanId) {
      const empresa = CGL.Company.getById(state, empresaId);
      const fin = this.ensureCompanyFinance(empresa, state);
      const loan = (fin.emprestimos || []).find((e) => e.id === loanId);
      if (!loan || (loan.status !== 'ativo' && loan.status !== 'atraso')) {
        throw new Error('Empréstimo inválido.');
      }
      loan.prazoSem = Math.round(loan.semanasRestantes * 1.4) + 8;
      loan.semanasRestantes = loan.prazoSem;
      loan.taxaSemanal = loan.taxaSemanal * 1.08;
      loan.parcela = Math.round(
        (loan.saldo * (1 + loan.taxaSemanal * loan.prazoSem)) / loan.prazoSem
      );
      loan.status = 'ativo';
      loan.semanasAtraso = 0;
      loan.status = 'renegociado';
      // volta a ativo após marcar
      loan.status = 'ativo';
      fin.inadimplencia.emprestimosAtraso = Math.max(
        0,
        (fin.inadimplencia.emprestimosAtraso || 0) - 1
      );
      CGL.Company.addHistory(empresa, state, {
        tipo: 'financeiro',
        titulo: 'Empréstimo renegociado',
        descricao: `Novo prazo ${loan.prazoSem} sem., parcela ${CGL.Utils.formatBRL(loan.parcela)}.`
      });
      return loan;
    },

    /* ========== Falência em estágios ========== */

    advanceBankruptcy(empresa, state) {
      const fin = this.ensureCompanyFinance(empresa, state);
      const ind = fin.indicadores || {};
      const caixa = empresa.caixa || 0;
      const lucro = empresa.lucro || 0;
      const estagio = fin.falencia?.estagio || 0;

      const stress =
        caixa < 1000 ||
        (caixa < 5000 && lucro < 0) ||
        (ind.riscoFinanceiro || 0) > 75 ||
        (fin.inadimplencia?.emprestimosAtraso || 0) > 2;

      const recovering = caixa > 15000 && lucro > 0 && (ind.riscoFinanceiro || 0) < 45;

      if (!fin.falencia) fin.falencia = { estagio: 0, chave: 'saudavel', semanasEmEstagio: 0 };

      if (recovering && estagio > 0 && estagio < 8) {
        fin.falencia.semanasEmEstagio = (fin.falencia.semanasEmEstagio || 0) + 1;
        if (fin.falencia.semanasEmEstagio >= 3) {
          fin.falencia.estagio = Math.max(0, estagio - 1);
          fin.falencia.semanasEmEstagio = 0;
          const st = CGL.Data.getBankruptcyStage(fin.falencia.estagio);
          fin.falencia.chave = st.chave;
          if (estagio >= 2) {
            CGL.Events.notify(
              'success',
              empresa.nomeFantasia,
              `Melhora financeira: ${st.nome}.`
            );
          }
        }
        return fin.falencia;
      }

      if (!stress) {
        if (estagio === 0) {
          fin.falencia.semanasEmEstagio = 0;
        } else {
          fin.falencia.semanasEmEstagio = Math.max(0, (fin.falencia.semanasEmEstagio || 0) - 1);
        }
        return fin.falencia;
      }

      fin.falencia.semanasEmEstagio = (fin.falencia.semanasEmEstagio || 0) + 1;
      const need = estagio <= 2 ? 2 : estagio <= 5 ? 3 : 4;
      if (fin.falencia.semanasEmEstagio >= need && estagio < 8) {
        fin.falencia.estagio = estagio + 1;
        fin.falencia.semanasEmEstagio = 0;
        const st = CGL.Data.getBankruptcyStage(fin.falencia.estagio);
        fin.falencia.chave = st.chave;
        this._applyBankruptcyStageEffects(empresa, state, fin.falencia.estagio);
        CGL.Company.addHistory(empresa, state, {
          tipo: 'financeiro',
          titulo: `Alerta: ${st.nome}`,
          descricao: `Estágio ${st.id}/8 da trajetória de insolvência.`
        });
        if (!empresa.concorrente) {
          CGL.Events.notify(
            fin.falencia.estagio >= 6 ? 'error' : 'alert',
            empresa.nomeFantasia,
            st.nome
          );
        }
      }
      return fin.falencia;
    },

    _applyBankruptcyStageEffects(empresa, state, stage) {
      const fin = empresa.finance;
      if (stage === 2) {
        // Corte de despesas: eficiência cai, custos futuros menores via eficiência
        empresa.eficiencia = CGL.Utils.clamp((empresa.eficiencia || 50) - 5, 10, 98);
        empresa.funcionarios = Math.max(1, Math.floor((empresa.funcionarios || 2) * 0.9));
      }
      if (stage === 3) {
        const sale = Math.round(
          ((fin.ativosFisicos.maquinas || 0) + (fin.ativosFisicos.veiculos || 0)) * 0.15
        );
        if (sale > 0) {
          fin.ativosFisicos.maquinas = Math.round((fin.ativosFisicos.maquinas || 0) * 0.85);
          fin.ativosFisicos.veiculos = Math.round((fin.ativosFisicos.veiculos || 0) * 0.85);
          try {
            this.creditEmpresa(state, empresa.id, sale, {
              categoria: 'venda_ativos',
              descricao: 'Venda forçada de ativos'
            });
          } catch (e) { /* ignore */ }
        }
      }
      if (stage === 5) {
        // Tenta empréstimo emergencial automático
        try {
          this.requestLoan(state, empresa.id, {
            bancoId: this.primaryAccount(fin)?.bancoId || 'caixa',
            finalidadeId: 'emergencial',
            valor: Math.max(20000, Math.round((empresa.capitalSocial || 10000) * 0.3)),
            prazoSem: 26,
            garantias: [{
              tipoId: 'recebivel',
              valor: (empresa.receita || 0) * 8
            }]
          });
        } catch (e) { /* pode falhar */ }
      }
      if (stage === 8) {
        empresa.ativa = false;
        empresa.fechada = true;
        CGL.Company.addHistory(empresa, state, {
          tipo: 'falencia',
          titulo: 'Falência decretada',
          descricao: 'Último estágio: encerramento definitivo após sequência de problemas.'
        });
        if (!empresa.concorrente) {
          CGL.Events.notify('error', 'Falência', `${empresa.nomeFantasia} encerrou por insolvência.`);
        }
      }
    },

    /* ========== Tick semanal ========== */

    weeklyTick(state) {
      this.ensureStateFinance(state);
      this.ensurePersonal(state);

      const semana = state.world?.semanaAtual || 0;
      const empresas = CGL.Company.listAll(state).filter((e) => e.ativa && !e.concorrente);
      empresas.forEach((empresa) => {
        this.ensureCompanyFinance(empresa, state);
        // Company já atualizou receita/custos/lucro/caixa
        this.applyOperatingWeek(empresa, state);
        this._processDebtService(empresa, state);
        this._processShareholderLoans(empresa, state);
        this._processInvestments(empresa.finance, state, { empresaId: empresa.id });
        this._processAccountFeesAndYield(empresa, state);
        // Pró-labore mensal (a cada 4 semanas)
        if (semana > 0 && semana % 4 === 0) {
          this.payProLabores(state, empresa.id);
        }
        this._autoDividends(empresa, state);
        this.rebuildBalanceSheet(empresa, state);
        this.recalcIndicators(empresa, state);
        this.advanceBankruptcy(empresa, state);
      });

      // Aplicações pessoais
      this._processInvestments(state.finance.pessoal, state, { pessoal: true });
      this.syncPersonalCash(state);

      return state.finance;
    },

    _processDebtService(empresa, state) {
      const fin = empresa.finance;
      let despFin = 0;

      const pay = (item, tipo) => {
        if (item.status !== 'ativo' && item.status !== 'atraso') return;
        const parcela = item.parcela || 0;
        const juros = Math.round((item.saldo || 0) * (item.taxaSemanal || 0));
        const principal = Math.max(0, parcela - juros);
        try {
          this.debitEmpresa(state, empresa.id, parcela, {
            categoria: tipo === 'emp' ? 'parcela_emprestimo' : 'parcela_financiamento',
            descricao: `Parcela ${tipo === 'emp' ? 'empréstimo' : 'financiamento'}`
          });
          item.saldo = Math.max(0, (item.saldo || 0) - principal);
          item.semanasRestantes = Math.max(0, (item.semanasRestantes || 1) - 1);
          item.semanasAtraso = 0;
          item.status = item.saldo <= 0 || item.semanasRestantes <= 0 ? 'quitado' : 'ativo';
          if (item.status === 'quitado') item.saldo = 0;
          despFin += juros;
          const conta = this.primaryAccount(fin);
          if (conta) conta.relacionamento = CGL.Utils.clamp((conta.relacionamento || 50) + 0.3, 0, 100);
        } catch (e) {
          item.status = 'atraso';
          item.semanasAtraso = (item.semanasAtraso || 0) + 1;
          item.saldo = Math.round((item.saldo || 0) * (1 + (item.taxaSemanal || 0.005) * 1.5));
          fin.inadimplencia.emprestimosAtraso = (fin.inadimplencia.emprestimosAtraso || 0) + 1;
          const conta = this.primaryAccount(fin);
          if (conta) conta.relacionamento = CGL.Utils.clamp((conta.relacionamento || 50) - 4, 0, 100);
          // Execução de garantia após 6 semanas
          if (item.semanasAtraso >= 6 && item.garantias?.length) {
            this._executeCollateral(empresa, state, item);
          }
        }
      };

      (fin.emprestimos || []).forEach((l) => pay(l, 'emp'));
      (fin.financiamentos || []).forEach((f) => pay(f, 'fin'));

      // Debêntures: juros semanais
      (fin.debentures || []).filter((d) => d.status === 'ativa').forEach((d) => {
        const juros = Math.round((d.saldo || 0) * ((d.remuneracaoAnual || 0.12) / 52));
        despFin += juros;
        try {
          this.debitEmpresa(state, empresa.id, juros, {
            categoria: 'juros',
            descricao: 'Juros de debêntures'
          });
          d.semanasRestantes = (d.semanasRestantes || 1) - 1;
          if (d.semanasRestantes <= 0) {
            this.debitEmpresa(state, empresa.id, d.saldo, {
              categoria: 'debentures',
              descricao: 'Resgate de debêntures'
            });
            d.saldo = 0;
            d.status = 'vencida';
          }
        } catch (e) {
          d.status = 'default';
          fin.falencia.estagio = Math.max(fin.falencia.estagio || 0, 4);
        }
      });

      // Atualiza última DRE com despesas financeiras
      if (fin.dreHistorico[0] && despFin > 0) {
        fin.dreHistorico[0].despesasFinanceiras = (fin.dreHistorico[0].despesasFinanceiras || 0) + despFin;
        fin.dreHistorico[0].lucroLiquido -= despFin;
      }
    },

    _executeCollateral(empresa, state, loan) {
      const fin = empresa.finance;
      (loan.garantias || []).forEach((g) => {
        const haircut = CGL.Data.collateralTypes.find((t) => t.id === g.tipoId)?.haircut || 0.5;
        const valor = Math.round((g.valor || 0) * haircut);
        if (g.tipoId === 'imovel') {
          fin.ativosFisicos.imoveis = Math.max(0, (fin.ativosFisicos.imoveis || 0) - valor);
        } else if (g.tipoId === 'maquina') {
          fin.ativosFisicos.maquinas = Math.max(0, (fin.ativosFisicos.maquinas || 0) - valor);
        } else if (g.tipoId === 'veiculo') {
          fin.ativosFisicos.veiculos = Math.max(0, (fin.ativosFisicos.veiculos || 0) - valor);
        }
        loan.saldo = Math.max(0, loan.saldo - valor);
        const gar = (fin.garantias || []).find((x) => x.emprestimoId === loan.id && x.tipoId === g.tipoId);
        if (gar) gar.executada = true;
      });
      CGL.Company.addHistory(empresa, state, {
        tipo: 'financeiro',
        titulo: 'Garantias executadas',
        descricao: 'Bens dados em garantia foram executados pelo credor.'
      });
      if (loan.saldo <= 0) loan.status = 'quitado';
    },

    _processInvestments(fin, state, ctx) {
      if (!fin?.aplicacoes) return;
      fin.aplicacoes.filter((a) => a.status === 'ativa').forEach((a) => {
        const weekly = (a.rentabilidadeAnual || 0.1) / 52;
        const riskNoise = 1 + (Math.random() - 0.5) * (a.risco || 0.1) * 0.3;
        const yield_ = Math.round((a.valorAtual || a.valor) * weekly * riskNoise);
        a.valorAtual = Math.round((a.valorAtual || a.valor) + yield_);
        if (a.semanasRestantesResgate > 0) a.semanasRestantesResgate -= 1;

        if (yield_ > 0) {
          this._postLedger(fin, state, {
            tipo: 'entrada',
            categoria: 'juros_aplicacoes',
            descricao: `Rendimento ${a.nome}`,
            valor: yield_,
            empresaId: ctx.empresaId,
            pessoal: ctx.pessoal
          });
        }
      });
    },

    _processAccountFeesAndYield(empresa, state) {
      const fin = empresa.finance;
      const semana = state.world?.semanaAtual || 0;
      // Tarifas mensais (~4 semanas)
      if (semana % 4 === 0) {
        (fin.contas || []).forEach((c) => {
          const fee = c.tarifaMensal || 0;
          if (fee > 0 && (c.disponivel || 0) >= fee) {
            c.disponivel -= fee;
            this._postLedger(fin, state, {
              tipo: 'saida',
              categoria: 'tarifas',
              descricao: `Tarifa ${c.bancoNome}`,
              valor: fee,
              contaId: c.id,
              empresaId: empresa.id
            });
          }
          if (c.rendimentoAuto && (c.disponivel || 0) > 0) {
            const y = Math.round(c.disponivel * 0.0015);
            if (y > 0) {
              c.disponivel += y;
              this._postLedger(fin, state, {
                tipo: 'entrada',
                categoria: 'juros_aplicacoes',
                descricao: `Rendimento automático ${c.bancoNome}`,
                valor: y,
                contaId: c.id,
                empresaId: empresa.id
              });
            }
          }
        });
        this.syncEmpresaCaixa(empresa);
      }
    },

    _autoDividends(empresa, state) {
      const fin = empresa.finance;
      const pol = CGL.Data.getDividendPolicyById(fin.politicaDividendos || 'nunca');
      if (pol.payout <= 0) return;
      // Distribui a cada 13 semanas se houver lucro acumulado
      const semana = state.world?.semanaAtual || 0;
      if (semana % 13 !== 0 || semana < 13) return;
      if ((fin.lucrosAcumulados || 0) < 5000) return;
      if ((empresa.caixa || 0) < 10000) return;
      try {
        this.distributeDividends(state, empresa.id, { policyId: pol.id });
      } catch (e) { /* ok */ }
    },

    /* ========== Resumos UI ========== */

    dashboardSummary(state) {
      this.ensurePersonal(state);
      const companies = CGL.Company.listPlayerCompanies(state);
      let caixaGrupo = 0;
      let dividaGrupo = 0;
      let liquidezMedia = 0;
      companies.forEach((e) => {
        this.ensureCompanyFinance(e, state);
        caixaGrupo += e.caixa || 0;
        dividaGrupo += e.endividamento || 0;
        liquidezMedia += e.finance.indicadores?.liquidez || 1;
      });
      if (companies.length) liquidezMedia /= companies.length;
      return {
        caixaPessoal: state.player?.dinheiro || 0,
        caixaGrupo: Math.round(caixaGrupo),
        dividaGrupo: Math.round(dividaGrupo),
        liquidezMedia: Math.round(liquidezMedia * 100) / 100,
        empresas: companies.length
      };
    }
  };

  global.CGL = global.CGL || {};
  global.CGL.Finance = Finance;
})(typeof window !== 'undefined' ? window : globalThis);
