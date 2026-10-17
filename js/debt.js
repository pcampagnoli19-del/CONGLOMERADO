/**
 * CONGLOMERADO — Captação e estrutura de dívida (Fase 6)
 * Aprofunda Finance (empréstimos/debêntures) e Market (rating/bancos/investidores).
 * Perfil financeiro, modalidades, covenants, notes, fornecedor, intercompany,
 * leasing, project finance, agenda, eventos de crédito.
 */
(function (global) {
  'use strict';

  const CURTO_PRAZO_SEM = 52;
  const EVENT_CAP = 40;
  const AGENDA_CAP = 80;

  const Debt = {
    /* ========== Bootstrap ========== */

    createEmptyDebtState() {
      return {
        version: 6,
        climaCredito: 1, // multiplicador de juros do mercado
        apetiteDebentures: 1,
        bancosIndisponiveis: [],
        subsidioTaxa: 0,
        ofertasRefi: [],
        interessesProjeto: [],
        eventos: [],
        semanaUltimoTick: 0
      };
    },

    ensureDebt(state) {
      if (!state.debt || typeof state.debt !== 'object') {
        state.debt = this.createEmptyDebtState();
      } else {
        const base = this.createEmptyDebtState();
        state.debt = {
          ...base,
          ...state.debt,
          bancosIndisponiveis: Array.isArray(state.debt.bancosIndisponiveis)
            ? state.debt.bancosIndisponiveis
            : [],
          ofertasRefi: Array.isArray(state.debt.ofertasRefi) ? state.debt.ofertasRefi : [],
          interessesProjeto: Array.isArray(state.debt.interessesProjeto)
            ? state.debt.interessesProjeto
            : [],
          eventos: Array.isArray(state.debt.eventos) ? state.debt.eventos : [],
          version: 6
        };
      }
      return state.debt;
    },

    ensureCompanyDebt(empresa, state) {
      if (!empresa) return null;
      CGL.Finance.ensureCompanyFinance(empresa, state);
      const fin = empresa.finance;
      if (!Array.isArray(fin.notasPromissorias)) fin.notasPromissorias = [];
      if (!Array.isArray(fin.creditoFornecedor)) fin.creditoFornecedor = [];
      if (!Array.isArray(fin.creditoIntercompany)) fin.creditoIntercompany = [];
      if (!Array.isArray(fin.leasings)) fin.leasings = [];
      if (!Array.isArray(fin.projectFinance)) fin.projectFinance = [];
      if (!Array.isArray(fin.covenantsAtivos)) fin.covenantsAtivos = [];
      if (!Array.isArray(fin.violacoesCovenant)) fin.violacoesCovenant = [];
      if (!fin.perfilFinanceiro) fin.perfilFinanceiro = {};
      if (!fin.agendaFinanceira) fin.agendaFinanceira = [];
      if (fin.payoutMaxCovenant == null) fin.payoutMaxCovenant = null;
      if (fin.limiteCreditoMult == null) fin.limiteCreditoMult = 1;
      fin.version = 6;
      // Enriquece contratos legados sem campos da Fase 6
      (fin.emprestimos || []).forEach((l) => this._enrichLegacyLoan(l));
      (fin.debentures || []).forEach((d) => {
        if (d.quantidadeTitulos == null) d.quantidadeTitulos = Math.max(1, Math.round((d.valorFace || d.captado || 0) / 1000));
        if (d.conversivel == null) d.conversivel = d.tipo === 'conversivel';
        if (!d.publicoAlvo) d.publicoAlvo = 'institucional';
      });
      return fin;
    },

    migrateAll(state) {
      this.ensureDebt(state);
      (state.companies?.empresas || []).forEach((e) => {
        if (e.ativa || e.finance) this.ensureCompanyDebt(e, state);
      });
      return state.debt;
    },

    _enrichLegacyLoan(loan) {
      if (!loan) return;
      if (!loan.amortizacao) loan.amortizacao = 'price';
      if (loan.multaAtraso == null) loan.multaAtraso = 0.02;
      if (loan.permiteRenegociacao == null) loan.permiteRenegociacao = true;
      if (!loan.modalidade) {
        const pur = CGL.Data.getLoanPurposeById?.(loan.finalidadeId);
        loan.modalidade = pur?.modalidade || loan.finalidadeId || 'giro';
      }
      if (loan.principal == null) loan.principal = loan.valorOriginal;
      if (!Array.isArray(loan.covenantsIds)) loan.covenantsIds = [];
      if (loan.carenciaSem == null) loan.carenciaSem = 0;
    },

    /* ========== Perfil financeiro ========== */

    financialProfile(empresa, state) {
      this.ensureCompanyDebt(empresa, state);
      const fin = empresa.finance;
      const ind = fin.indicadores || CGL.Finance.recalcIndicators(empresa, state) || {};
      const dash = this.debtDashboard(empresa, state);
      const histCredito = this._creditHistoryScore(empresa);
      const capacidade = this._paymentCapacity(empresa, dash);
      const risco = CGL.Utils.clamp(
        (ind.riscoFinanceiro || 50) * 0.5 +
          (dash.alavancagem || 0) * 25 +
          (100 - histCredito) * 0.3,
        0,
        100
      );
      const perfil = {
        liquidez: ind.liquidez ?? 1,
        endividamento: ind.endividamento ?? 0,
        geracaoCaixa: Math.round((empresa.lucro || 0) * 4 + (empresa.caixa || 0) * 0.05),
        patrimonioLiquido: Math.round(empresa.patrimonioLiquido || 0),
        historicoCredito: Math.round(histCredito),
        capacidadePagamento: Math.round(capacidade),
        nivelRisco: Math.round(risco),
        rating: empresa.rating?.nota || 'BBB',
        confiancaMercado: empresa.confiancaMercado ?? 50
      };
      fin.perfilFinanceiro = perfil;
      return perfil;
    },

    _creditHistoryScore(empresa) {
      const fin = empresa.finance;
      const atraso = fin.inadimplencia?.emprestimosAtraso || 0;
      const quitados = (fin.emprestimos || []).filter((e) => e.status === 'quitado').length;
      const viol = (fin.violacoesCovenant || []).length;
      let s = 70 + quitados * 3 - atraso * 4 - viol * 5;
      s += ((empresa.reputacao?.geral || 50) - 50) * 0.3;
      return CGL.Utils.clamp(s, 5, 98);
    },

    _paymentCapacity(empresa, dash) {
      const ebitdaProxy = Math.max(0, (empresa.lucro || 0) + (dash.jurosSemanais || 0));
      const cobertura = dash.coberturaJuros || 0;
      return CGL.Utils.clamp(ebitdaProxy / 1000 + cobertura * 15 + (empresa.caixa || 0) / 50000, 0, 100);
    },

    /* ========== Empréstimo bancário aprofundado ========== */

    /**
     * Solicita empréstimo via Finance.requestLoan e completa o contrato (Fase 6).
     */
    requestBankLoan(state, empresaId, opts) {
      this.ensureDebt(state);
      const empresa = CGL.Company.getById(state, empresaId);
      if (!empresa?.ativa) throw new Error('Empresa inválida.');
      this.ensureCompanyDebt(empresa, state);
      this.financialProfile(empresa, state);

      const purpose = CGL.Data.getLoanPurposeById(opts.finalidadeId) || CGL.Data.loanPurposes[0];
      const bankId = opts.bancoId;
      if ((state.debt.bancosIndisponiveis || []).includes(bankId)) {
        throw new Error('Banco indisponível (liquidação / restrição de crédito).');
      }

      // Relacionamento mínimo por modalidade
      const rel = CGL.Market?.getBankRelationship
        ? CGL.Market.getBankRelationship(empresa, bankId)
        : 50;
      if (purpose.relMin != null && rel < purpose.relMin) {
        return {
          ok: false,
          aprovado: false,
          motivo: `Relacionamento com o banco insuficiente para ${purpose.nome} (mín. ${purpose.relMin}).`,
          score: rel
        };
      }

      // Setor rural
      if (purpose.setores?.length) {
        const seg = empresa.segmentoId || '';
        const ok = purpose.setores.some((s) => seg.includes(s) || seg === s);
        if (!ok && purpose.id === 'rural') {
          // Permite com taxa pior — Finance aplica taxa; aqui só avisa via mult
          opts._taxaExtra = 1.15;
        }
      }

      const amort = CGL.Data.getAmortizationById(opts.amortizacao || 'price');
      const clima = state.debt.climaCredito || 1;
      const subsidio = state.debt.subsidioTaxa || 0;

      const result = CGL.Finance.requestLoan(state, empresaId, {
        bancoId: opts.bancoId,
        finalidadeId: opts.finalidadeId,
        valor: opts.valor,
        prazoSem: opts.prazoSem,
        garantias: opts.garantias || []
      });

      if (!result.ok || !result.loan) return result;

      const loan = result.loan;
      this._enrichLegacyLoan(loan);
      loan.principal = result.valor;
      loan.amortizacao = amort.id;
      loan.multaAtraso = Number(opts.multaAtraso) || 0.02;
      loan.permiteRenegociacao = opts.permiteRenegociacao !== false;
      loan.modalidade = purpose.modalidade || purpose.id;
      loan.carenciaSem = Math.max(0, Number(opts.carenciaSem) || 0);

      // Ajuste de taxa por clima / subsidio / amortização
      loan.taxaSemanal = Math.max(
        0.0005,
        loan.taxaSemanal * clima * (opts._taxaExtra || 1) * (1 + subsidio) * (amort.fatorParc > 1 ? 0.98 : 1)
      );
      loan.parcela = this._calcParcela(loan.saldo, loan.taxaSemanal, loan.prazoSem, amort.id);

      // Covenants padrão em operações maiores
      if (result.valor >= 100000 || opts.covenants) {
        const covs = opts.covenants || this._defaultCovenants(empresa);
        covs.forEach((c) => this.attachCovenant(empresa, loan, c));
      }

      this._rebuildAgenda(empresa, state);
      CGL.Finance.rebuildBalanceSheet(empresa, state);
      CGL.Finance.recalcIndicators(empresa, state);
      this.financialProfile(empresa, state);
      return { ...result, loan };
    },

    _calcParcela(saldo, taxaSem, prazoSem, amortId) {
      const n = Math.max(1, prazoSem);
      const i = taxaSem || 0;
      if (amortId === 'bullet' || amortId === 'interest_only') {
        return Math.round(saldo * i); // só juros semanais
      }
      if (amortId === 'sac') {
        const amort = saldo / n;
        return Math.round(amort + saldo * i);
      }
      // PRICE aproximado
      if (i <= 0) return Math.round(saldo / n);
      const fator = Math.pow(1 + i, n);
      return Math.round((saldo * i * fator) / (fator - 1));
    },

    _defaultCovenants(empresa) {
      const ind = empresa.finance?.indicadores || {};
      return [
        { tipoId: 'endividamento_max', limite: Math.max(0.7, (ind.endividamento || 0.5) + 0.2) },
        { tipoId: 'caixa_min', limite: Math.max(10000, Math.round((empresa.caixa || 0) * 0.15)) },
        { tipoId: 'liquidez_min', limite: 0.85 },
        { tipoId: 'dividendo_max', limite: 0.5 }
      ];
    },

    /* ========== Renegociação ========== */

    /**
     * Renegocia com opção explícita (alongamento, carência, equity swap…).
     * Aceitação depende da confiança do credor (relacionamento + rating + atraso).
     */
    renegotiateDebt(state, empresaId, loanId, opcaoId, opts = {}) {
      const empresa = CGL.Company.getById(state, empresaId);
      this.ensureCompanyDebt(empresa, state);
      const fin = empresa.finance;
      const loan = (fin.emprestimos || []).find((e) => e.id === loanId);
      if (!loan || (loan.status !== 'ativo' && loan.status !== 'atraso')) {
        throw new Error('Empréstimo inválido para renegociação.');
      }
      if (loan.permiteRenegociacao === false) {
        throw new Error('Contrato não permite renegociação.');
      }
      const opcao = CGL.Data.getRenegotiationById(opcaoId);
      if (!opcao) throw new Error('Opção de renegociação inválida.');

      const rel = CGL.Market?.getBankRelationship
        ? CGL.Market.getBankRelationship(empresa, loan.bancoId)
        : 50;
      const rating = empresa.rating?.score ?? 55;
      const confianca = (rel * 0.5 + rating * 0.35 - (loan.semanasAtraso || 0) * 4);
      const limiar = 38 + (opcao.id === 'equity_swap' ? 12 : 0);
      if (confianca < limiar && !opts.force) {
        CGL.Company.addHistory(empresa, state, {
          tipo: 'financeiro',
          titulo: 'Renegociação recusada',
          descricao: `Credor rejeitou ${opcao.nome} (confiança ${Math.round(confianca)}).`
        });
        return { ok: false, motivo: 'Credor recusou — confiança insuficiente.', confianca };
      }

      loan.taxaSemanal *= opcao.taxaMult || 1;
      loan.prazoSem = Math.round((loan.semanasRestantes || loan.prazoSem) * (opcao.prazoMult || 1));
      loan.semanasRestantes = loan.prazoSem;
      if (opcao.carenciaSem) loan.carenciaSem = (loan.carenciaSem || 0) + opcao.carenciaSem;
      loan.parcela = Math.round(
        this._calcParcela(loan.saldo, loan.taxaSemanal, loan.prazoSem, loan.amortizacao) *
          (opcao.parcelaMult || 1)
      );
      loan.status = 'ativo';
      loan.semanasAtraso = 0;
      loan.ultimaRenegociacao = {
        opcaoId: opcao.id,
        semana: state.world?.semanaAtual || 0
      };

      if (opcao.exigeGarantia && opts.garantias?.length) {
        loan.garantias = opts.garantias;
        opts.garantias.forEach((g) => {
          fin.garantias.push({
            id: CGL.Utils.uuid(),
            tipoId: g.tipoId,
            valor: g.valor,
            emprestimoId: loan.id,
            executada: false
          });
        });
      }

      if (opcao.equityPct && opcao.equityPct > 0) {
        const convert = Math.round(loan.saldo * opcao.equityPct);
        loan.saldo = Math.max(0, loan.saldo - convert);
        loan.parcela = this._calcParcela(loan.saldo, loan.taxaSemanal, loan.prazoSem, loan.amortizacao);
        // Diluição simbólica: banco vira sócio minoritário
        const bank = CGL.Data.getBankById(loan.bancoId);
        const pct = Math.min(12, Math.max(2, opcao.equityPct * 100));
        const jog = (empresa.socios || []).find((s) => s.tipo === 'jogador');
        if (jog && (jog.percentual || 0) > pct + 5) {
          jog.percentual = Math.round((jog.percentual - pct) * 10) / 10;
          empresa.socios.push({
            id: CGL.Utils.uuid(),
            tipo: 'banco',
            nome: bank?.nome || 'Credor',
            percentual: pct,
            viaRenegociacao: true
          });
        }
      }

      fin.inadimplencia.emprestimosAtraso = Math.max(
        0,
        (fin.inadimplencia.emprestimosAtraso || 0) - 1
      );
      if (CGL.Market?.adjustBankRelationship) {
        CGL.Market.adjustBankRelationship(empresa, loan.bancoId, 2, state);
      }
      CGL.Company.addHistory(empresa, state, {
        tipo: 'financeiro',
        titulo: 'Dívida renegociada',
        descricao: `${opcao.nome}: prazo ${loan.prazoSem} sem., parcela ${CGL.Utils.formatBRL(loan.parcela)}.`
      });
      this._rebuildAgenda(empresa, state);
      CGL.Finance.rebuildBalanceSheet(empresa, state);
      return { ok: true, loan, opcao, confianca };
    },

    /* ========== Debêntures com apetite ========== */

    /**
     * Emite debêntures com análise de apetite dos investidores do Market.
     */
    issueDebenture(state, empresaId, opts) {
      const empresa = CGL.Company.getById(state, empresaId);
      this.ensureCompanyDebt(empresa, state);
      this.ensureDebt(state);
      const perfil = this.financialProfile(empresa, state);

      const valor = Math.round(Number(opts.valor) || 0);
      const qtd = Math.max(1, Number(opts.quantidadeTitulos) || Math.round(valor / 1000));
      const prazoSem = Math.max(52, Number(opts.prazoSem) || 104);
      const remuneracao = Number(opts.remuneracaoAnual) || 0.12;
      const tipo = opts.tipo || 'simples';
      const conversivel = tipo === 'conversivel' || !!opts.conversivel;
      const publico = opts.publicoAlvo || 'institucional';

      // Apetite: investidores + rating + clima
      let apetite = this._calcDebentureAppetite(state, empresa, {
        remuneracao,
        valor,
        conversivel,
        perfil
      });
      apetite *= state.debt.apetiteDebentures || 1;

      if (apetite < 0.35) {
        this._pushEvent(state, {
          tipo: 'emissao_recusada',
          empresaId,
          titulo: 'Emissão sem compradores',
          descricao: `${empresa.nomeFantasia}: apetite ${(apetite * 100).toFixed(0)}% — investidores recusaram.`
        });
        throw new Error('Investidores não compraram a emissão (apetite insuficiente).');
      }

      // Usa Finance.issueDebentures mas ajusta demanda via risco artificial
      const ind = empresa.finance.indicadores || {};
      const riscoBackup = ind.riscoFinanceiro;
      // demanda Finance = clamp(1 - risco/120 + rep/200); invertemos para bater apetite
      ind.riscoFinanceiro = CGL.Utils.clamp(120 * (1 - apetite) + 10, 10, 95);

      let deb;
      try {
        deb = CGL.Finance.issueDebentures(state, empresaId, {
          valor,
          prazoSem,
          remuneracaoAnual: remuneracao,
          tipo,
          garantias: opts.garantias || []
        });
      } finally {
        if (riscoBackup != null) ind.riscoFinanceiro = riscoBackup;
      }

      deb.quantidadeTitulos = qtd;
      deb.conversivel = conversivel;
      deb.publicoAlvo = publico;
      deb.apetite = Math.round(apetite * 1000) / 1000;
      deb.garantias = opts.garantias || [];

      if (valor >= 500000) {
        this._defaultCovenants(empresa).forEach((c) => {
          const cov = this._makeCovenant(empresa, c, { fonte: 'debenture', contratoId: deb.id });
          empresa.finance.covenantsAtivos.push(cov);
        });
      }

      this._rebuildAgenda(empresa, state);
      return deb;
    },

    _calcDebentureAppetite(state, empresa, ctx) {
      CGL.Market?.ensureMarket?.(state);
      const investors = state.market?.investidores || [];
      const rating = empresa.rating?.score ?? 55;
      const conf = empresa.confiancaMercado ?? 50;
      const risco = ctx.perfil?.nivelRisco ?? 50;
      let base =
        0.35 +
        (rating / 100) * 0.35 +
        (conf / 100) * 0.2 -
        (risco / 100) * 0.25 +
        ((ctx.remuneracao || 0.12) - 0.1) * 1.5;
      if (ctx.conversivel) base += 0.08;
      if (investors.length) {
        const interessados = investors.filter((inv) => {
          const tipo = CGL.Data.investorTypes?.find((t) => t.id === inv.tipoId);
          const apetiteRisco = tipo?.apetiteRisco ?? inv.apetiteRisco ?? 0.5;
          return apetiteRisco * 100 + 20 > risco;
        }).length;
        base += (interessados / investors.length) * 0.25;
      }
      return CGL.Utils.clamp(base, 0.1, 1.15);
    },

    /* ========== Notas promissórias / commercial paper ========== */

    issueCommercialPaper(state, empresaId, opts) {
      const empresa = CGL.Company.getById(state, empresaId);
      this.ensureCompanyDebt(empresa, state);
      const valor = Math.round(Number(opts.valor) || 0);
      const prazoSem = Math.min(26, Math.max(2, Number(opts.prazoSem) || 8));
      if (valor < 10000) throw new Error('Nota mínima R$ 10.000.');
      const perfil = this.financialProfile(empresa, state);
      if (perfil.nivelRisco > 85) throw new Error('Risco elevado demais para commercial paper.');

      const taxa = 0.003 + (state.economy?.taxaJuros || 0.1) * 0.015 +
        (perfil.nivelRisco / 100) * 0.004;
      const note = {
        id: CGL.Utils.uuid(),
        tipo: opts.tipo || 'commercial_paper',
        valorOriginal: valor,
        saldo: valor,
        prazoSem,
        semanasRestantes: prazoSem,
        taxaSemanal: Math.round(taxa * 10000) / 10000,
        status: 'ativa',
        semanaEmissao: state.world?.semanaAtual || 0,
        credor: opts.credor || 'Mercado de curto prazo'
      };
      empresa.finance.notasPromissorias.push(note);
      CGL.Finance.creditEmpresa(state, empresaId, valor, {
        categoria: 'nota_promissoria',
        descricao: `Nota promissória / commercial paper (${prazoSem} sem.)`
      });
      CGL.Company.addHistory(empresa, state, {
        tipo: 'financeiro',
        titulo: 'Nota promissória emitida',
        descricao: `${CGL.Utils.formatBRL(valor)} · ${prazoSem} semanas.`
      });
      this._rebuildAgenda(empresa, state);
      CGL.Finance.rebuildBalanceSheet(empresa, state);
      return note;
    },

    /* ========== Crédito de fornecedor ========== */

    grantSupplierCredit(state, empresaId, opts) {
      const empresa = CGL.Company.getById(state, empresaId);
      this.ensureCompanyDebt(empresa, state);
      const valor = Math.round(Number(opts.valor) || 0);
      const prazoSem = Math.max(2, Number(opts.prazoSem) || 4);
      if (valor < 2000) throw new Error('Crédito de fornecedor mínimo R$ 2.000.');

      const relComercial = Number(opts.relacionamento) || 50;
      const histPag = 100 - Math.min(40, (empresa.finance.inadimplencia?.emprestimosAtraso || 0) * 5);
      const prazoEfetivo = Math.round(prazoSem * (0.7 + (relComercial + histPag) / 400));
      const jurosSem = relComercial >= 70 ? 0.001 : 0.003;

      const cred = {
        id: CGL.Utils.uuid(),
        fornecedor: opts.fornecedor || 'Fornecedor estratégico',
        valorOriginal: valor,
        saldo: valor,
        prazoSem: prazoEfetivo,
        semanasRestantes: prazoEfetivo,
        taxaSemanal: jurosSem,
        status: 'ativo',
        relacionamento: relComercial,
        semanaInicio: state.world?.semanaAtual || 0
      };
      empresa.finance.creditoFornecedor.push(cred);
      // Crédito aumenta contas a pagar e libera caixa operacional (estoque/insumos)
      empresa.finance.contasPagar = (empresa.finance.contasPagar || 0) + valor;
      empresa.finance.ativosFisicos.estoques =
        (empresa.finance.ativosFisicos.estoques || 0) + Math.round(valor * 0.85);
      CGL.Company.addHistory(empresa, state, {
        tipo: 'financeiro',
        titulo: 'Crédito de fornecedor',
        descricao: `${cred.fornecedor}: ${CGL.Utils.formatBRL(valor)} em ${prazoEfetivo} sem.`
      });
      this._rebuildAgenda(empresa, state);
      CGL.Finance.rebuildBalanceSheet(empresa, state);
      return cred;
    },

    /* ========== Crédito intercompany ========== */

    intercompanyLoan(state, deId, paraId, opts) {
      const de = CGL.Company.getById(state, deId);
      const para = CGL.Company.getById(state, paraId);
      if (!de?.ativa || !para?.ativa) throw new Error('Empresas inválidas.');
      if (de.id === para.id) throw new Error('Mesma empresa.');
      this.ensureCompanyDebt(de, state);
      this.ensureCompanyDebt(para, state);

      // Governança: mesma holding ou jogador controla ambas
      if (!this._sameGroup(de, para, state)) {
        throw new Error('Crédito intercompany exige empresas do mesmo grupo.');
      }
      const valor = Math.round(Number(opts.valor) || 0);
      const prazoSem = Math.max(4, Number(opts.prazoSem) || 26);
      const taxa = Number(opts.taxaSemanal) || 0.002;
      if (valor < 5000) throw new Error('Mínimo R$ 5.000.');
      if ((de.caixa || 0) < valor + 2000) throw new Error('Caixa da credora insuficiente.');

      // Conselho / governança: se listada, pressão
      if (de.ipo?.listada && (de.boardPressure?.nivel || 0) > 60 && !opts.aprovadoConselho) {
        throw new Error('Conselho da listada exige aprovação formal do mútuo intercompany.');
      }

      CGL.Finance.debitEmpresa(state, deId, valor, {
        categoria: 'intercompany',
        descricao: `Empréstimo intercompany → ${para.nomeFantasia}`
      });
      CGL.Finance.creditEmpresa(state, paraId, valor, {
        categoria: 'intercompany',
        descricao: `Empréstimo intercompany ← ${de.nomeFantasia}`
      });

      const contrato = {
        id: CGL.Utils.uuid(),
        deId,
        paraId,
        valorOriginal: valor,
        saldo: valor,
        prazoSem,
        semanasRestantes: prazoSem,
        taxaSemanal: taxa,
        status: 'ativo',
        semanaInicio: state.world?.semanaAtual || 0,
        governanca: {
          aprovadoConselho: !!opts.aprovadoConselho || !de.ipo?.listada,
          mesmoGrupo: true
        }
      };
      de.finance.creditoIntercompany.push({ ...contrato, papel: 'credora' });
      para.finance.creditoIntercompany.push({ ...contrato, papel: 'devedora' });

      CGL.Company.addHistory(de, state, {
        tipo: 'financeiro',
        titulo: 'Crédito intercompany (saída)',
        descricao: `${CGL.Utils.formatBRL(valor)} para ${para.nomeFantasia}.`
      });
      CGL.Company.addHistory(para, state, {
        tipo: 'financeiro',
        titulo: 'Crédito intercompany (entrada)',
        descricao: `${CGL.Utils.formatBRL(valor)} de ${de.nomeFantasia}.`
      });
      this._rebuildAgenda(para, state);
      return contrato;
    },

    _sameGroup(a, b, state) {
      const playerId = state.player?.id;
      const stakeA = CGL.Company.playerStake?.(a, playerId) ?? 0;
      const stakeB = CGL.Company.playerStake?.(b, playerId) ?? 0;
      if (stakeA >= 50 && stakeB >= 50) return true;
      if (a.holdingId && a.holdingId === b.holdingId) return true;
      if (a.controladoraId && (a.controladoraId === b.id || b.controladoraId === a.id)) return true;
      // Participações
      const partA = (a.participacoesDetidas || []).some((p) => p.empresaId === b.id && p.percentual >= 50);
      const partB = (b.participacoesDetidas || []).some((p) => p.empresaId === a.id && p.percentual >= 50);
      return partA || partB;
    },

    /* ========== Leasing ========== */

    startLeasing(state, empresaId, opts) {
      const empresa = CGL.Company.getById(state, empresaId);
      this.ensureCompanyDebt(empresa, state);
      const tipo = CGL.Data.getLeasingTypeById(opts.tipoLeasing || 'operacional');
      const ativo = CGL.Data.getLeasingAssetById(opts.ativoId || 'equipamentos');
      if (!ativo) throw new Error('Ativo de leasing inválido.');
      const valorBem = Math.round(Number(opts.valor) || ativo.valorBase);
      const prazoSem = Math.max(26, Number(opts.prazoSem) || 104);
      const taxa = (0.0035 + (state.economy?.taxaJuros || 0.1) * 0.01) * (tipo.taxaMult || 1);
      const parcela = Math.round((valorBem * (1 + taxa * prazoSem) * 0.55) / prazoSem);

      const contract = {
        id: CGL.Utils.uuid(),
        tipoLeasing: tipo.id,
        ativoId: ativo.id,
        ativoNome: ativo.nome,
        valorBem,
        saldo: tipo.ownershipEnd ? Math.round(valorBem * 0.7) : 0,
        prazoSem,
        semanasRestantes: prazoSem,
        taxaSemanal: taxa,
        parcela,
        status: 'ativo',
        ownershipEnd: !!tipo.ownershipEnd,
        semanaInicio: state.world?.semanaAtual || 0
      };
      empresa.finance.leasings.push(contract);

      // Uso do bem sem compra imediata — eficiência / capacidade
      empresa.eficiencia = CGL.Utils.clamp((empresa.eficiencia || 50) + 2, 10, 98);
      if (tipo.ownershipEnd) {
        // Contabiliza compromisso
        empresa.finance.contasPagar = (empresa.finance.contasPagar || 0) + Math.round(valorBem * 0.1);
      }

      CGL.Company.addHistory(empresa, state, {
        tipo: 'financeiro',
        titulo: `Leasing ${tipo.nome}`,
        descricao: `${ativo.nome}: parcela ${CGL.Utils.formatBRL(parcela)} / ${prazoSem} sem.`
      });
      this._rebuildAgenda(empresa, state);
      CGL.Finance.rebuildBalanceSheet(empresa, state);
      return contract;
    },

    /* ========== Project finance ========== */

    startProjectFinance(state, empresaId, opts) {
      const empresa = CGL.Company.getById(state, empresaId);
      this.ensureCompanyDebt(empresa, state);
      const orcamento = Math.round(Number(opts.orcamento) || 0);
      const prazoObra = Math.max(12, Number(opts.prazoObraSem) || 52);
      const financiado = Math.round(orcamento * (Number(opts.pctFinanciado) || 0.7));
      if (orcamento < 200000) throw new Error('Project finance mínimo R$ 200.000.');
      if ((empresa.caixa || 0) < orcamento - financiado) {
        throw new Error('Equity do projeto insuficiente no caixa.');
      }

      const equity = orcamento - financiado;
      CGL.Finance.debitEmpresa(state, empresaId, equity, {
        categoria: 'project_finance',
        descricao: `Equity projeto: ${opts.nome || 'Projeto'}`
      });

      const taxa = 0.004 + (state.economy?.taxaJuros || 0.1) * 0.012;
      const proj = {
        id: CGL.Utils.uuid(),
        nome: opts.nome || 'Projeto especial',
        orcamento,
        equity,
        financiado,
        saldoDivida: financiado,
        prazoObraSem: prazoObra,
        semanasRestantesObra: prazoObra,
        fase: 'construcao', // construcao | operacao | encerrado
        taxaSemanal: taxa,
        parcelaOperacao: Math.round((financiado * (1 + taxa * 104)) / 104),
        fluxoProprio: { caixa: 0, despesasAcum: equity, receitasAcum: 0 },
        status: 'ativo',
        semanaInicio: state.world?.semanaAtual || 0,
        sponsorFundo: !!opts.sponsorFundo
      };
      empresa.finance.projectFinance.push(proj);

      if (financiado > 0) {
        CGL.Finance.creditEmpresa(state, empresaId, financiado, {
          categoria: 'project_finance',
          descricao: `Tranche dívida projeto ${proj.nome}`
        });
        // Consome imediatamente na obra (sem receita)
        CGL.Finance.debitEmpresa(state, empresaId, Math.min(financiado, Math.round(orcamento * 0.15)), {
          categoria: 'project_finance',
          descricao: `CAPEX inicial ${proj.nome}`
        });
        proj.fluxoProprio.despesasAcum += Math.round(orcamento * 0.15);
      }

      this._defaultCovenants(empresa).slice(0, 2).forEach((c) => {
        empresa.finance.covenantsAtivos.push(
          this._makeCovenant(empresa, c, { fonte: 'project', contratoId: proj.id })
        );
      });

      CGL.Company.addHistory(empresa, state, {
        tipo: 'financeiro',
        titulo: 'Project finance',
        descricao: `${proj.nome}: orçamento ${CGL.Utils.formatBRL(orcamento)}, obra ${prazoObra} sem.`
      });
      this._rebuildAgenda(empresa, state);
      return proj;
    },

    /* ========== Covenants ========== */

    attachCovenant(empresa, loan, spec) {
      const cov = this._makeCovenant(empresa, spec, {
        fonte: 'emprestimo',
        contratoId: loan.id
      });
      empresa.finance.covenantsAtivos.push(cov);
      loan.covenantsIds = loan.covenantsIds || [];
      loan.covenantsIds.push(cov.id);
      if (spec.tipoId === 'dividendo_max') {
        empresa.finance.payoutMaxCovenant = Math.min(
          empresa.finance.payoutMaxCovenant ?? 1,
          spec.limite ?? 0.4
        );
      }
      return cov;
    },

    _makeCovenant(empresa, spec, meta) {
      const tipo = CGL.Data.getCovenantTypeById(spec.tipoId) || CGL.Data.covenantTypes[0];
      return {
        id: CGL.Utils.uuid(),
        tipoId: tipo.id,
        nome: tipo.nome,
        campo: tipo.campo,
        op: tipo.op,
        limite: spec.limite != null ? spec.limite : tipo.padrao,
        fonte: meta.fonte,
        contratoId: meta.contratoId,
        status: 'ok', // ok | violado
        semanaAnexo: 0
      };
    },

    checkCovenants(empresa, state) {
      this.ensureCompanyDebt(empresa, state);
      const fin = empresa.finance;
      const ind = fin.indicadores || CGL.Finance.recalcIndicators(empresa, state) || {};
      const pol = CGL.Data.getDividendPolicyById(fin.politicaDividendos || 'nunca');
      const metrics = {
        endividamento: ind.endividamento ?? 0,
        caixa: empresa.caixa || 0,
        liquidez: ind.liquidez ?? 1,
        payoutMax: pol.payout
      };
      const breaches = [];
      (fin.covenantsAtivos || []).forEach((c) => {
        const val = metrics[c.campo];
        if (val == null) return;
        let ok = true;
        if (c.op === 'lte') ok = val <= c.limite;
        if (c.op === 'gte') ok = val >= c.limite;
        // Para dividendo_max: payout da política não pode exceder limite
        if (c.campo === 'payoutMax') ok = (pol.payout || 0) <= c.limite;
        if (!ok) {
          c.status = 'violado';
          breaches.push(c);
        } else {
          c.status = 'ok';
        }
      });
      return breaches;
    },

    applyCovenantBreaches(empresa, state, breaches) {
      if (!breaches?.length) return;
      const fin = empresa.finance;
      breaches.forEach((c) => {
        fin.violacoesCovenant.push({
          id: CGL.Utils.uuid(),
          covenantId: c.id,
          tipoId: c.tipoId,
          semana: state.world?.semanaAtual || 0
        });
        // Vencimento antecipado parcial ou pressão por renegociação
        if (c.fonte === 'emprestimo' && c.contratoId) {
          const loan = (fin.emprestimos || []).find((l) => l.id === c.contratoId);
          if (loan && (loan.status === 'ativo' || loan.status === 'atraso')) {
            // Acelera 20% do saldo como parcela extraordinária
            const accel = Math.round(loan.saldo * 0.2);
            loan.parcela = Math.max(loan.parcela, accel);
            loan.status = 'atraso';
            try {
              CGL.Finance.debitEmpresa(state, empresa.id, Math.min(accel, empresa.caixa || 0), {
                categoria: 'covenant',
                descricao: `Aceleração por covenant: ${c.nome}`
              });
              loan.saldo = Math.max(0, loan.saldo - Math.min(accel, empresa.caixa || 0));
            } catch (e) {
              fin.falencia.estagio = Math.max(fin.falencia.estagio || 0, 4);
            }
          }
        }
        if (c.fonte === 'debenture') {
          const deb = (fin.debentures || []).find((d) => d.id === c.contratoId);
          if (deb) deb.status = 'default';
        }
      });
      if (empresa.confiancaMercado != null) {
        empresa.confiancaMercado = CGL.Utils.clamp(empresa.confiancaMercado - 8, 0, 100);
      }
      if (empresa.rating?.score != null) {
        empresa.rating.score = CGL.Utils.clamp(empresa.rating.score - 4, 0, 100);
      }
      CGL.Company.addHistory(empresa, state, {
        tipo: 'financeiro',
        titulo: 'Covenant descumprido',
        descricao: breaches.map((b) => b.nome).join(', ') + ' — aceleração / renegociação exigida.'
      });
      if (!empresa.concorrente) {
        CGL.Events.notify(
          'alert',
          empresa.nomeFantasia,
          `Covenant violado: ${breaches[0].nome}`
        );
      }
    },

    /** Bloqueia dividendos acima do payout covenant */
    dividendPayoutCap(empresa) {
      const cap = empresa.finance?.payoutMaxCovenant;
      return cap == null ? null : cap;
    },

    /* ========== Dashboard de endividamento ========== */

    debtDashboard(empresa, state) {
      this.ensureCompanyDebt(empresa, state);
      const fin = empresa.finance;
      const semana = state.world?.semanaAtual || 0;

      const items = this._collectDebtItems(fin);
      let total = 0;
      let curto = 0;
      let longo = 0;
      let jurosSem = 0;
      const vencimentos = {}; // bucket por horizonte

      items.forEach((it) => {
        total += it.saldo;
        const rest = it.semanasRestantes ?? 999;
        if (rest <= CURTO_PRAZO_SEM) curto += it.saldo;
        else longo += it.saldo;
        jurosSem += (it.saldo || 0) * (it.taxaSemanal || 0);
        const bucket =
          rest <= 13 ? '0-13s' :
          rest <= 26 ? '14-26s' :
          rest <= 52 ? '27-52s' :
          rest <= 104 ? '1-2a' : '2a+';
        vencimentos[bucket] = (vencimentos[bucket] || 0) + it.saldo;
      });

      const caixa = empresa.caixa || 0;
      const dividaLiquida = total - caixa;
      const pl = Math.max(1, empresa.patrimonioLiquido || 1);
      const alavancagem = total / pl;
      // Cobertura de juros: lucro operacional / juros (semanal anualizado)
      const jurosAnual = jurosSem * 52;
      const ebitProxy = Math.max(0, (empresa.lucro || 0) * 52);
      const coberturaJuros = jurosAnual > 0 ? ebitProxy / jurosAnual : 99;

      return {
        dividaTotal: Math.round(total),
        dividaCurtoPrazo: Math.round(curto),
        dividaLongoPrazo: Math.round(longo),
        caixaDisponivel: Math.round(caixa),
        dividaLiquida: Math.round(dividaLiquida),
        alavancagem: Math.round(alavancagem * 1000) / 1000,
        coberturaJuros: Math.round(coberturaJuros * 100) / 100,
        jurosSemanais: Math.round(jurosSem),
        perfilVencimentos: vencimentos,
        contratos: items.length,
        semana
      };
    },

    _collectDebtItems(fin) {
      const out = [];
      const push = (arr, mapFn) => {
        (arr || []).forEach((x) => {
          const m = mapFn(x);
          if (m) out.push(m);
        });
      };
      push(fin.emprestimos, (e) =>
        e.status === 'ativo' || e.status === 'atraso'
          ? {
              id: e.id,
              tipo: 'emprestimo',
              saldo: e.saldo || 0,
              semanasRestantes: e.semanasRestantes,
              taxaSemanal: e.taxaSemanal,
              parcela: e.parcela,
              label: e.modalidade || e.finalidadeId
            }
          : null
      );
      push(fin.financiamentos, (e) =>
        e.status === 'ativo' || e.status === 'atraso'
          ? {
              id: e.id,
              tipo: 'financiamento',
              saldo: e.saldo || 0,
              semanasRestantes: e.semanasRestantes,
              taxaSemanal: e.taxaSemanal,
              parcela: e.parcela,
              label: e.tipoBem
            }
          : null
      );
      push(fin.debentures, (e) =>
        e.status === 'ativa'
          ? {
              id: e.id,
              tipo: 'debenture',
              saldo: e.saldo || 0,
              semanasRestantes: e.semanasRestantes,
              taxaSemanal: (e.remuneracaoAnual || 0.12) / 52,
              parcela: Math.round((e.saldo || 0) * ((e.remuneracaoAnual || 0.12) / 52)),
              label: e.tipo
            }
          : null
      );
      push(fin.emprestimosSocio, (e) =>
        e.status === 'ativo' && e.direcao === 'socio_para_empresa'
          ? {
              id: e.id,
              tipo: 'mutuo_socio',
              saldo: e.saldo || 0,
              semanasRestantes: e.semanasRestantes,
              taxaSemanal: e.taxaSemanal,
              parcela: e.parcela,
              label: 'mútuo sócio'
            }
          : null
      );
      push(fin.notasPromissorias, (e) =>
        e.status === 'ativa'
          ? {
              id: e.id,
              tipo: 'nota',
              saldo: e.saldo || 0,
              semanasRestantes: e.semanasRestantes,
              taxaSemanal: e.taxaSemanal,
              parcela: e.saldo,
              label: e.tipo
            }
          : null
      );
      push(fin.creditoFornecedor, (e) =>
        e.status === 'ativo'
          ? {
              id: e.id,
              tipo: 'fornecedor',
              saldo: e.saldo || 0,
              semanasRestantes: e.semanasRestantes,
              taxaSemanal: e.taxaSemanal,
              parcela: e.saldo,
              label: e.fornecedor
            }
          : null
      );
      push(fin.creditoIntercompany, (e) =>
        e.status === 'ativo' && e.papel === 'devedora'
          ? {
              id: e.id,
              tipo: 'intercompany',
              saldo: e.saldo || 0,
              semanasRestantes: e.semanasRestantes,
              taxaSemanal: e.taxaSemanal,
              parcela: e.parcela || Math.round((e.saldo || 0) / Math.max(1, e.semanasRestantes || 1)),
              label: 'intercompany'
            }
          : null
      );
      push(fin.leasings, (e) =>
        e.status === 'ativo'
          ? {
              id: e.id,
              tipo: 'leasing',
              saldo: e.ownershipEnd ? e.saldo || 0 : 0,
              semanasRestantes: e.semanasRestantes,
              taxaSemanal: e.taxaSemanal,
              parcela: e.parcela,
              label: e.ativoNome
            }
          : null
      );
      push(fin.projectFinance, (e) =>
        e.status === 'ativo' && e.saldoDivida > 0
          ? {
              id: e.id,
              tipo: 'project',
              saldo: e.saldoDivida || 0,
              semanasRestantes: e.fase === 'construcao' ? e.semanasRestantesObra + 104 : e.semanasRestantesObra,
              taxaSemanal: e.taxaSemanal,
              parcela: e.fase === 'operacao' ? e.parcelaOperacao : 0,
              label: e.nome
            }
          : null
      );
      return out;
    },

    /** Extensão do totalDebt do Finance — instrumentos Fase 6 */
    extraDebtBalance(fin) {
      if (!fin) return 0;
      let s = 0;
      (fin.notasPromissorias || []).filter((n) => n.status === 'ativa').forEach((n) => { s += n.saldo || 0; });
      (fin.creditoFornecedor || []).filter((n) => n.status === 'ativo').forEach((n) => { s += n.saldo || 0; });
      (fin.creditoIntercompany || [])
        .filter((n) => n.status === 'ativo' && n.papel === 'devedora')
        .forEach((n) => { s += n.saldo || 0; });
      (fin.leasings || [])
        .filter((n) => n.status === 'ativo' && n.ownershipEnd)
        .forEach((n) => { s += n.saldo || 0; });
      (fin.projectFinance || [])
        .filter((n) => n.status === 'ativo')
        .forEach((n) => { s += n.saldoDivida || 0; });
      return s;
    },

    /* ========== Agenda financeira ========== */

    buildCalendar(empresa, state) {
      this.ensureCompanyDebt(empresa, state);
      const fin = empresa.finance;
      const semana = state.world?.semanaAtual || 0;
      const events = [];

      const add = (semOffset, tipo, descricao, valor, meta) => {
        events.push({
          id: CGL.Utils.uuid(),
          semana: semana + Math.max(0, semOffset),
          offset: Math.max(0, semOffset),
          tipo,
          descricao,
          valor: Math.round(valor || 0),
          ...meta
        });
      };

      (fin.emprestimos || []).forEach((l) => {
        if (l.status !== 'ativo' && l.status !== 'atraso') return;
        if ((l.carenciaSem || 0) > 0) {
          add(l.carenciaSem, 'carencia', `Fim carência empréstimo ${l.modalidade}`, 0, { contratoId: l.id });
        }
        add(1, 'parcela_emprestimo', `Parcela empréstimo (${l.modalidade || l.finalidadeId})`, l.parcela, { contratoId: l.id });
        add(l.semanasRestantes || 1, 'vencimento', `Quitação empréstimo`, l.saldo, { contratoId: l.id });
      });
      (fin.financiamentos || []).forEach((f) => {
        if (f.status !== 'ativo' && f.status !== 'atraso') return;
        add(1, 'parcela_financiamento', `Parcela financiamento ${f.tipoBem}`, f.parcela, {});
      });
      (fin.debentures || []).forEach((d) => {
        if (d.status !== 'ativa') return;
        const j = Math.round((d.saldo || 0) * ((d.remuneracaoAnual || 0.12) / 52));
        add(1, 'juros_debenture', `Juros debêntures`, j, {});
        add(d.semanasRestantes || 1, 'resgate_debenture', `Resgate debêntures`, d.saldo, {});
      });
      (fin.notasPromissorias || []).forEach((n) => {
        if (n.status !== 'ativa') return;
        add(n.semanasRestantes || 1, 'nota_promissoria', `Vencimento nota`, n.saldo, {});
      });
      (fin.creditoFornecedor || []).forEach((c) => {
        if (c.status !== 'ativo') return;
        add(c.semanasRestantes || 1, 'fornecedor', `Pagamento ${c.fornecedor}`, c.saldo, {});
      });
      (fin.leasings || []).forEach((l) => {
        if (l.status !== 'ativo') return;
        add(1, 'leasing', `Parcela leasing ${l.ativoNome}`, l.parcela, {});
      });
      (fin.projectFinance || []).forEach((p) => {
        if (p.status !== 'ativo') return;
        if (p.fase === 'construcao') {
          add(1, 'capex_projeto', `CAPEX ${p.nome}`, Math.round((p.orcamento || 0) / (p.prazoObraSem || 52)), {});
          add(p.semanasRestantesObra || 1, 'fim_obra', `Fim da obra ${p.nome}`, 0, {});
        } else {
          add(1, 'parcela_projeto', `Serviço dívida ${p.nome}`, p.parcelaOperacao, {});
        }
      });

      // Folha / tributos / dividendos programados (RH real se disponível)
      let folha = Math.round((empresa.funcionarios || 0) * 1800 / 4);
      let folhaDesc = 'Folha salarial (estim.)';
      if (global.CGL?.Hr?.payrollAgendaEstimate) {
        try {
          folha = CGL.Hr.payrollAgendaEstimate(empresa);
          folhaDesc = 'Folha salarial + benefícios (RH)';
        } catch (e) { /* mantém estimativa */ }
      }
      if (folha > 0) add(1, 'folha', folhaDesc, folha, {});

      // Marketing / campanhas (Fase 8)
      let mkt = 0;
      let mktDesc = 'Marketing (estim.)';
      if (CGL.Marketing?.weeklyMarketingCostEstimate) {
        try {
          mkt = CGL.Marketing.weeklyMarketingCostEstimate(empresa);
          mktDesc = 'Marketing / campanhas / CRM';
        } catch (e) { /* ok */ }
      } else if (empresa.finance?._mktCustoSemanal) {
        mkt = empresa.finance._mktCustoSemanal;
      }
      if (mkt > 0) add(1, 'marketing', mktDesc, mkt, {});

      // P&D / inovação (Fase 9)
      let rd = 0;
      let rdDesc = 'P&D (estim.)';
      if (CGL.Rd?.weeklyRdCostEstimate) {
        try {
          rd = CGL.Rd.weeklyRdCostEstimate(empresa);
          rdDesc = 'P&D / projetos / parcerias';
        } catch (e) { /* ok */ }
      } else if (empresa.finance?._rdCustoSemanal) {
        rd = empresa.finance._rdCustoSemanal;
      }
      if (rd > 0) add(1, 'pd', rdDesc, rd, {});

      const trib = Math.round(Math.max(0, empresa.lucro || 0) * 0.15);
      if (trib > 0) add(4 - (semana % 4), 'tributos', 'Tributos estimados', trib, {});
      const pol = CGL.Data.getDividendPolicyById(fin.politicaDividendos || 'nunca');
      if (pol.payout > 0 && (fin.lucrosAcumulados || 0) > 5000) {
        const nextDiv = 13 - (semana % 13);
        add(nextDiv, 'dividendos', 'Dividendos programados (estim.)', Math.round(fin.lucrosAcumulados * pol.payout * 0.25), {});
      }
      if ((fin.contasPagar || 0) > 0) {
        add(2, 'contas_pagar', 'Contas a pagar', Math.round((fin.contasPagar || 0) * 0.2), {});
      }

      events.sort((a, b) => a.offset - b.offset || a.valor - b.valor);
      fin.agendaFinanceira = events.slice(0, AGENDA_CAP);
      return fin.agendaFinanceira;
    },

    _rebuildAgenda(empresa, state) {
      return this.buildCalendar(empresa, state);
    },

    /* ========== Tick semanal ========== */

    weeklyTick(state) {
      this.ensureDebt(state);
      const debt = state.debt;
      const semana = state.world?.semanaAtual || 0;
      if (debt.semanaUltimoTick === semana) return debt;
      debt.semanaUltimoTick = semana;

      // Decai clima lentamente
      debt.climaCredito = CGL.Utils.clamp(
        (debt.climaCredito || 1) * 0.98 + 0.02,
        0.85,
        1.4
      );
      debt.apetiteDebentures = CGL.Utils.clamp(
        (debt.apetiteDebentures || 1) * 0.99 + 0.01,
        0.5,
        1.2
      );
      if (debt.subsidioTaxa) {
        debt.subsidioTaxa *= 0.9;
        if (Math.abs(debt.subsidioTaxa) < 0.002) debt.subsidioTaxa = 0;
      }

      const empresas = CGL.Company.listAll(state).filter((e) => e.ativa && !e.concorrente);
      empresas.forEach((empresa) => {
        this.ensureCompanyDebt(empresa, state);
        this._processPhase6Debt(empresa, state);
        const breaches = this.checkCovenants(empresa, state);
        if (breaches.length) this.applyCovenantBreaches(empresa, state, breaches);
        this.financialProfile(empresa, state);
        this.buildCalendar(empresa, state);
        // Sync endividamento com extras
        empresa.endividamento = Math.round(
          CGL.Finance.totalDebt(empresa.finance) + this.extraDebtBalance(empresa.finance)
        );
      });

      // Evento de crédito (~18% por semana se houver empresas)
      if (empresas.length && Math.random() < 0.18) {
        this._rollCreditEvent(state, empresas);
      }

      // Expira ofertas
      debt.ofertasRefi = (debt.ofertasRefi || []).filter(
        (o) => (o.semanaExpira || 0) > semana
      );
      debt.interessesProjeto = (debt.interessesProjeto || []).filter(
        (o) => (o.semanaExpira || 0) > semana
      );

      return debt;
    },

    _processPhase6Debt(empresa, state) {
      const fin = empresa.finance;

      // Carência em empréstimos: não cobra parcela
      (fin.emprestimos || []).forEach((l) => {
        if (l.carenciaSem > 0 && (l.status === 'ativo' || l.status === 'atraso')) {
          l.carenciaSem -= 1;
          // Marca para Finance não — na verdade Finance já debitou.
          // Solução: reembolsar parcela se ainda em carência após tick Finance.
          // Ordem: Debt.weeklyTick roda DEPOIS de Finance — se carenciaSem era > 0
          // antes do tick, precisamos ter decrementado ANTES. Usamos flag.
        }
      });

      // Notas promissórias
      (fin.notasPromissorias || []).filter((n) => n.status === 'ativa').forEach((n) => {
        const juros = Math.round((n.saldo || 0) * (n.taxaSemanal || 0));
        n.semanasRestantes = (n.semanasRestantes || 1) - 1;
        try {
          if (juros > 0) {
            CGL.Finance.debitEmpresa(state, empresa.id, juros, {
              categoria: 'juros',
              descricao: 'Juros nota promissória'
            });
          }
          if (n.semanasRestantes <= 0) {
            CGL.Finance.debitEmpresa(state, empresa.id, n.saldo, {
              categoria: 'nota_promissoria',
              descricao: 'Resgate nota promissória'
            });
            n.saldo = 0;
            n.status = 'liquidada';
          }
        } catch (e) {
          n.status = 'default';
          fin.falencia.estagio = Math.max(fin.falencia.estagio || 0, 3);
        }
      });

      // Fornecedor
      (fin.creditoFornecedor || []).filter((c) => c.status === 'ativo').forEach((c) => {
        c.semanasRestantes = (c.semanasRestantes || 1) - 1;
        if ((c.taxaSemanal || 0) > 0) {
          c.saldo = Math.round(c.saldo * (1 + c.taxaSemanal));
        }
        if (c.semanasRestantes <= 0) {
          try {
            CGL.Finance.debitEmpresa(state, empresa.id, c.saldo, {
              categoria: 'fornecedor',
              descricao: `Pagamento ${c.fornecedor}`
            });
            fin.contasPagar = Math.max(0, (fin.contasPagar || 0) - c.valorOriginal);
            c.saldo = 0;
            c.status = 'pago';
          } catch (e) {
            c.status = 'atraso';
            c.saldo = Math.round(c.saldo * 1.02);
            fin.inadimplencia.fornecedorJuros = (fin.inadimplencia.fornecedorJuros || 0) + 1;
          }
        }
      });

      // Intercompany — só lado devedora processa pagamento
      (fin.creditoIntercompany || [])
        .filter((c) => c.status === 'ativo' && c.papel === 'devedora')
        .forEach((c) => {
          const juros = Math.round((c.saldo || 0) * (c.taxaSemanal || 0));
          const amort = Math.round((c.saldo || 0) / Math.max(1, c.semanasRestantes || 1));
          const parcela = juros + amort;
          try {
            CGL.Finance.debitEmpresa(state, empresa.id, parcela, {
              categoria: 'intercompany',
              descricao: 'Serviço dívida intercompany'
            });
            CGL.Finance.creditEmpresa(state, c.deId, parcela, {
              categoria: 'intercompany',
              descricao: `Recebimento intercompany de ${empresa.nomeFantasia}`
            });
            c.saldo = Math.max(0, c.saldo - amort);
            c.semanasRestantes = Math.max(0, (c.semanasRestantes || 1) - 1);
            if (c.saldo <= 0 || c.semanasRestantes <= 0) {
              c.status = 'quitado';
              c.saldo = 0;
            }
            // Sync credora
            const credora = CGL.Company.getById(state, c.deId);
            const mirror = credora?.finance?.creditoIntercompany?.find(
              (x) => x.id === c.id && x.papel === 'credora'
            );
            if (mirror) {
              mirror.saldo = c.saldo;
              mirror.semanasRestantes = c.semanasRestantes;
              mirror.status = c.status;
            }
          } catch (e) {
            c.status = 'atraso';
          }
        });

      // Leasing
      (fin.leasings || []).filter((l) => l.status === 'ativo').forEach((l) => {
        try {
          CGL.Finance.debitEmpresa(state, empresa.id, l.parcela, {
            categoria: 'leasing',
            descricao: `Leasing ${l.ativoNome}`
          });
          l.semanasRestantes = Math.max(0, (l.semanasRestantes || 1) - 1);
          if (l.ownershipEnd) {
            const amort = Math.round((l.saldo || 0) / Math.max(1, l.semanasRestantes + 1));
            l.saldo = Math.max(0, (l.saldo || 0) - amort);
          }
          if (l.semanasRestantes <= 0) {
            l.status = 'encerrado';
            if (l.ownershipEnd) {
              const key = l.ativoId === 'imoveis' ? 'imoveis' :
                l.ativoId === 'caminhoes' || l.ativoId === 'aeronaves' ? 'veiculos' : 'maquinas';
              fin.ativosFisicos[key] = (fin.ativosFisicos[key] || 0) + Math.round(l.valorBem * 0.5);
              l.saldo = 0;
            }
          }
        } catch (e) {
          l.status = 'atraso';
        }
      });

      // Project finance
      (fin.projectFinance || []).filter((p) => p.status === 'ativo').forEach((p) => {
        if (p.fase === 'construcao') {
          const capex = Math.round((p.orcamento || 0) / Math.max(1, p.prazoObraSem || 52));
          try {
            CGL.Finance.debitEmpresa(state, empresa.id, capex, {
              categoria: 'project_finance',
              descricao: `CAPEX ${p.nome}`
            });
            p.fluxoProprio.despesasAcum += capex;
            p.fluxoProprio.caixa -= capex;
          } catch (e) {
            // Obra atrasa
            p.semanasRestantesObra += 1;
          }
          p.semanasRestantesObra = Math.max(0, (p.semanasRestantesObra || 1) - 1);
          // Juros durante construção (capitalizam)
          p.saldoDivida = Math.round((p.saldoDivida || 0) * (1 + (p.taxaSemanal || 0) * 0.5));
          if (p.semanasRestantesObra <= 0) {
            p.fase = 'operacao';
            p.semanasRestantesObra = 104;
            empresa.receita = Math.round((empresa.receita || 0) + (p.orcamento || 0) * 0.02);
            CGL.Company.addHistory(empresa, state, {
              tipo: 'financeiro',
              titulo: 'Projeto em operação',
              descricao: `${p.nome} concluiu a obra e começa a gerar receita.`
            });
          }
        } else if (p.fase === 'operacao') {
          const receita = Math.round((p.orcamento || 0) * 0.008);
          try {
            CGL.Finance.creditEmpresa(state, empresa.id, receita, {
              categoria: 'project_finance',
              descricao: `Receita ${p.nome}`
            });
            p.fluxoProprio.receitasAcum += receita;
            CGL.Finance.debitEmpresa(state, empresa.id, p.parcelaOperacao, {
              categoria: 'project_finance',
              descricao: `Serviço dívida ${p.nome}`
            });
            const juros = Math.round((p.saldoDivida || 0) * (p.taxaSemanal || 0));
            p.saldoDivida = Math.max(0, (p.saldoDivida || 0) - Math.max(0, p.parcelaOperacao - juros));
            p.semanasRestantesObra = Math.max(0, (p.semanasRestantesObra || 1) - 1);
            if (p.saldoDivida <= 0 || p.semanasRestantesObra <= 0) {
              p.status = 'encerrado';
              p.fase = 'encerrado';
              p.saldoDivida = 0;
            }
          } catch (e) {
            p.saldoDivida = Math.round((p.saldoDivida || 0) * 1.01);
          }
        }
      });

      // Multa por atraso em empréstimos (além do Finance)
      (fin.emprestimos || []).filter((l) => l.status === 'atraso').forEach((l) => {
        const multa = l.multaAtraso || 0.02;
        l.saldo = Math.round((l.saldo || 0) * (1 + multa * 0.25));
        // Execução já em Finance._executeCollateral após 6 semanas
      });
    },

    _rollCreditEvent(state, empresas) {
      const defs = CGL.Data.creditEventDefs || [];
      if (!defs.length) return;
      const total = defs.reduce((s, d) => s + (d.peso || 1), 0);
      let r = Math.random() * total;
      let chosen = defs[0];
      for (const d of defs) {
        r -= d.peso || 1;
        if (r <= 0) {
          chosen = d;
          break;
        }
      }
      const emp = empresas[Math.floor(Math.random() * empresas.length)];
      this.applyCreditEvent(state, chosen.id, emp);
    },

    applyCreditEvent(state, eventId, empresa) {
      this.ensureDebt(state);
      const def = CGL.Data.getCreditEventById(eventId);
      if (!def) return null;
      const debt = state.debt;
      const semana = state.world?.semanaAtual || 0;
      let descricao = def.nome;

      switch (def.efeito) {
        case 'limite_credito':
          if (empresa) {
            this.ensureCompanyDebt(empresa, state);
            empresa.finance.limiteCreditoMult = CGL.Utils.clamp(
              (empresa.finance.limiteCreditoMult || 1) * (1 + def.delta),
              0.4,
              1.5
            );
            (empresa.finance.contas || []).forEach((c) => {
              c.limiteCredito = Math.round((c.limiteCredito || 0) * (1 + def.delta));
            });
            descricao = `${empresa.nomeFantasia}: limites bancários ajustados (${Math.round(def.delta * 100)}%).`;
          }
          break;
        case 'subsidio_taxa':
          debt.subsidioTaxa = (debt.subsidioTaxa || 0) + def.delta;
          descricao = 'Governo lança linha subsidiada — taxas de novas operações caem.';
          break;
        case 'juros_mercado':
          debt.climaCredito = CGL.Utils.clamp((debt.climaCredito || 1) + def.delta * 3, 0.85, 1.5);
          if (state.economy) {
            state.economy.taxaJuros = CGL.Utils.clamp(
              (state.economy.taxaJuros || 0.1) + def.delta,
              0.02,
              0.4
            );
          }
          descricao = 'Crise de crédito: juros de mercado sobem.';
          break;
        case 'banco_indisponivel': {
          const banks = CGL.Data.banks || [];
          const b = banks[Math.floor(Math.random() * banks.length)];
          if (b && !debt.bancosIndisponiveis.includes(b.id)) {
            debt.bancosIndisponiveis.push(b.id);
            descricao = `${b.nome} entra em liquidação temporária.`;
          }
          break;
        }
        case 'apetite_deb':
          debt.apetiteDebentures = CGL.Utils.clamp(
            (debt.apetiteDebentures || 1) + def.delta,
            0.3,
            1.3
          );
          descricao = 'Investidores ficam seletivos com emissões de dívida.';
          break;
        case 'rating_delta':
          if (empresa?.rating) {
            empresa.rating.score = CGL.Utils.clamp(
              (empresa.rating.score || 55) + def.delta,
              0,
              100
            );
            if (CGL.Data.getRatingByScore) {
              empresa.rating.nota = CGL.Data.getRatingByScore(empresa.rating.score).id;
            }
            descricao = `${empresa.nomeFantasia}: rating → ${empresa.rating.nota}.`;
          }
          break;
        case 'oferta_refi':
          if (empresa) {
            const bank = CGL.Data.banks[Math.floor(Math.random() * CGL.Data.banks.length)];
            debt.ofertasRefi.push({
              id: CGL.Utils.uuid(),
              empresaId: empresa.id,
              bancoId: bank.id,
              descontoTaxa: 0.12,
              semanaExpira: semana + 6
            });
            descricao = `${bank.nome} oferece refinanciamento a ${empresa.nomeFantasia}.`;
          }
          break;
        case 'interesse_projeto':
          if (empresa) {
            debt.interessesProjeto.push({
              id: CGL.Utils.uuid(),
              empresaId: empresa.id,
              fundo: 'Fundo Infra Alpha',
              orcamentoSugerido: Math.max(300000, Math.round((empresa.capitalSocial || 100000) * 2)),
              semanaExpira: semana + 8
            });
            descricao = `Fundo demonstra interesse em financiar projeto de ${empresa.nomeFantasia}.`;
          }
          break;
        default:
          break;
      }

      const ev = this._pushEvent(state, {
        tipo: def.id,
        empresaId: empresa?.id,
        titulo: def.nome,
        descricao
      });
      if (empresa && !empresa.concorrente) {
        CGL.Events.notify('info', 'Mercado de crédito', descricao);
      }
      return ev;
    },

    _pushEvent(state, ev) {
      const debt = this.ensureDebt(state);
      const full = {
        id: CGL.Utils.uuid(),
        semana: state.world?.semanaAtual || 0,
        ...ev
      };
      debt.eventos.unshift(full);
      if (debt.eventos.length > EVENT_CAP) debt.eventos.length = EVENT_CAP;
      return full;
    },

    /** Aceita oferta de refinanciamento gerada por evento */
    acceptRefiOffer(state, ofertaId) {
      this.ensureDebt(state);
      const oferta = (state.debt.ofertasRefi || []).find((o) => o.id === ofertaId);
      if (!oferta) throw new Error('Oferta expirada.');
      const empresa = CGL.Company.getById(state, oferta.empresaId);
      this.ensureCompanyDebt(empresa, state);
      const loan = (empresa.finance.emprestimos || []).find(
        (l) => l.status === 'ativo' || l.status === 'atraso'
      );
      if (!loan) throw new Error('Nenhum empréstimo ativo para refinanciar.');
      loan.taxaSemanal *= 1 - (oferta.descontoTaxa || 0.1);
      loan.bancoId = oferta.bancoId;
      loan.parcela = this._calcParcela(
        loan.saldo,
        loan.taxaSemanal,
        loan.semanasRestantes || loan.prazoSem,
        loan.amortizacao || 'price'
      );
      loan.modalidade = 'refinanciamento';
      state.debt.ofertasRefi = state.debt.ofertasRefi.filter((o) => o.id !== ofertaId);
      CGL.Company.addHistory(empresa, state, {
        tipo: 'financeiro',
        titulo: 'Refinanciamento aceito',
        descricao: `Nova taxa semanal ${(loan.taxaSemanal * 100).toFixed(3)}%.`
      });
      return loan;
    }
  };

  // Patch Finance.totalDebt para incluir instrumentos Fase 6
  function patchFinanceTotalDebt() {
    if (!global.CGL?.Finance?.totalDebt || global.CGL.Finance._debtPatched) return;
    const orig = global.CGL.Finance.totalDebt.bind(global.CGL.Finance);
    global.CGL.Finance.totalDebt = function (fin) {
      return orig(fin) + Debt.extraDebtBalance(fin);
    };
    global.CGL.Finance._debtPatched = true;
  }

  /** Carência: pula parcela semanal enquanto carenciaSem > 0 */
  function patchDebtServiceCarencia() {
    if (!global.CGL?.Finance?._processDebtService || global.CGL.Finance._carenciaPatched) return;
    const orig = global.CGL.Finance._processDebtService.bind(global.CGL.Finance);
    global.CGL.Finance._processDebtService = function (empresa, state) {
      const fin = empresa.finance;
      (fin?.emprestimos || []).forEach((l) => {
        if ((l.carenciaSem || 0) > 0 && (l.status === 'ativo' || l.status === 'atraso')) {
          l._parcelaBackup = l.parcela;
          l.parcela = 0;
          l._emCarencia = true;
        }
      });
      orig(empresa, state);
      (fin?.emprestimos || []).forEach((l) => {
        if (l._emCarencia) {
          l.parcela = l._parcelaBackup || l.parcela;
          delete l._parcelaBackup;
          delete l._emCarencia;
          l.carenciaSem = Math.max(0, (l.carenciaSem || 1) - 1);
          // Só juros capitalizam levemente na carência
          l.saldo = Math.round((l.saldo || 0) * (1 + (l.taxaSemanal || 0) * 0.5));
        }
      });
    };
    global.CGL.Finance._carenciaPatched = true;
  }

  // Patch distributeDividends para respeitar covenant de payout
  function patchDividendCovenant() {
    if (!global.CGL?.Finance?.distributeDividends || global.CGL.Finance._covPatched) return;
    const orig = global.CGL.Finance.distributeDividends.bind(global.CGL.Finance);
    global.CGL.Finance.distributeDividends = function (state, empresaId, opts = {}) {
      const empresa = CGL.Company.getById(state, empresaId);
      if (empresa) {
        Debt.ensureCompanyDebt(empresa, state);
        const cap = Debt.dividendPayoutCap(empresa);
        if (cap != null) {
          const pol = CGL.Data.getDividendPolicyById(
            opts.policyId || empresa.finance.politicaDividendos || 'nunca'
          );
          if ((pol.payout || 0) > cap + 0.001) {
            throw new Error(
              `Covenant limita payout a ${(cap * 100).toFixed(0)}% (política pede ${((pol.payout || 0) * 100).toFixed(0)}%).`
            );
          }
        }
      }
      return orig(state, empresaId, opts);
    };
    global.CGL.Finance._covPatched = true;
  }

  // Patch requestLoan para enriquecer contratos quando chamado direto (UI antiga)
  function patchRequestLoan() {
    if (!global.CGL?.Finance?.requestLoan || global.CGL.Finance._loanEnrichPatched) return;
    const orig = global.CGL.Finance.requestLoan.bind(global.CGL.Finance);
    global.CGL.Finance.requestLoan = function (state, empresaId, opts) {
      const r = orig(state, empresaId, opts);
      if (r?.ok && r.loan) {
        const empresa = CGL.Company.getById(state, empresaId);
        if (empresa) {
          Debt.ensureCompanyDebt(empresa, state);
          Debt._enrichLegacyLoan(r.loan);
          const amort = CGL.Data.getAmortizationById?.(opts.amortizacao || 'price');
          if (amort) {
            r.loan.amortizacao = amort.id;
            r.loan.parcela = Debt._calcParcela(
              r.loan.saldo,
              r.loan.taxaSemanal,
              r.loan.prazoSem,
              amort.id
            );
          }
          r.loan.multaAtraso = Number(opts.multaAtraso) || r.loan.multaAtraso || 0.02;
          if ((r.valor || r.loan.valorOriginal || 0) >= 100000) {
            Debt._defaultCovenants(empresa).forEach((c) => Debt.attachCovenant(empresa, r.loan, c));
          }
          Debt._rebuildAgenda(empresa, state);
        }
      }
      return r;
    };
    global.CGL.Finance._loanEnrichPatched = true;
  }

  function applyPatches() {
    patchFinanceTotalDebt();
    patchDividendCovenant();
    patchRequestLoan();
    patchDebtServiceCarencia();
  }

  // Aplica quando Finance já carregou
  applyPatches();
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', applyPatches);
  }

  global.CGL = global.CGL || {};
  global.CGL.Debt = Debt;
})(typeof window !== 'undefined' ? window : globalThis);
