/**
 * CONGLOMERADO — Holding, governança e conglomerado (Fase 12)
 * Árvore societária, M&A, sinergias, conselho, sucessão e departamentos corporativos.
 * Estende Company (Fase 2) — não reescreve constituição/participações.
 */
(function (global) {
  'use strict';

  const EVENT_CAP = 40;
  const HISTORY_CAP = 50;
  const MA_CAP = 20;
  const BOARD_THRESHOLD_FUNC = 80; // funcionários → exige conselho
  const BOARD_THRESHOLD_PORTE = ['grande', 'corporacao', 'conglomerado'];

  const Holding = {
    /* ========== Bootstrap ========== */

    createEmptyHoldingState() {
      return {
        version: 12,
        semanaUltimoTick: 0,
        brandStrategy: 'hibrida',
        maPipeline: [],
        sinergiasAtivas: [],
        eventos: [],
        ranking: [],
        sucessao: {
          herdeiros: [],
          plano: null, // filho | ceo_profissional | dividir | conselho_familiar
          conselhoFamiliar: false,
          conflitos: []
        },
        buffsAtivos: [],
        nomeGrupo: null
      };
    },

    ensureHolding(state) {
      if (!state.holding || typeof state.holding !== 'object') {
        state.holding = this.createEmptyHoldingState();
      } else {
        const base = this.createEmptyHoldingState();
        state.holding = {
          ...base,
          ...state.holding,
          maPipeline: Array.isArray(state.holding.maPipeline) ? state.holding.maPipeline : [],
          sinergiasAtivas: Array.isArray(state.holding.sinergiasAtivas)
            ? state.holding.sinergiasAtivas : [],
          eventos: Array.isArray(state.holding.eventos) ? state.holding.eventos : [],
          ranking: Array.isArray(state.holding.ranking) ? state.holding.ranking : [],
          buffsAtivos: Array.isArray(state.holding.buffsAtivos) ? state.holding.buffsAtivos : [],
          sucessao: {
            ...base.sucessao,
            ...(state.holding.sucessao || {}),
            herdeiros: Array.isArray(state.holding.sucessao?.herdeiros)
              ? state.holding.sucessao.herdeiros : [],
            conflitos: Array.isArray(state.holding.sucessao?.conflitos)
              ? state.holding.sucessao.conflitos : []
          },
          version: 12
        };
      }
      // Espelho leve no slot legado
      state.holdings = state.holdings || {};
      state.holdings.version = 12;
      return state.holding;
    },

    ensureCompanyHolding(empresa, state) {
      if (!empresa) return null;
      if (!empresa.holding || typeof empresa.holding !== 'object') {
        empresa.holding = {};
      }
      const H = empresa.holding;
      if (!Array.isArray(H.departamentos)) H.departamentos = [];
      if (!Array.isArray(H.escritorios)) H.escritorios = [];
      if (!H.conselho || typeof H.conselho !== 'object') {
        H.conselho = { membros: [], nivelPressao: 0, ultimaReuniao: 0, ativo: false };
      }
      if (!Array.isArray(H.conselho.membros)) H.conselho.membros = [];
      if (!H.governanca || typeof H.governanca !== 'object') {
        H.governanca = {
          auditoria: 40,
          compliance: 40,
          risco: 40,
          etica: 50,
          score: 42,
          politicasAtivas: []
        };
      }
      if (!Array.isArray(H.governanca.politicasAtivas)) H.governanca.politicasAtivas = [];
      if (!Array.isArray(H.historico)) H.historico = [];
      if (!Array.isArray(H.licencas)) H.licencas = [];
      if (!H.kpis) H.kpis = {};
      if (H.custoCompartilhadoSemanal == null) H.custoCompartilhadoSemanal = 0;
      if (H.sinergiaReceitaMult == null) H.sinergiaReceitaMult = 1;
      if (H.sinergiaCustoMult == null) H.sinergiaCustoMult = 1;
      if (H.culturaClash == null) H.culturaClash = 0;
      if (H.seeded == null) H.seeded = false;
      return H;
    },

    migrateAll(state) {
      this.ensureHolding(state);
      (state.companies?.empresas || []).forEach((e) => {
        this.ensureCompanyHolding(e, state);
        e.holding.seeded = true;
        if (e.isHolding) this._maybeInitBoard(e, state);
      });
      this.syncHeirsFromFamily(state);
      if (state.finance?.pessoal) state.finance.pessoal.version = 12;
      (state.companies?.empresas || []).forEach((e) => {
        if (e.finance) e.finance.version = 12;
      });
      return state;
    },

    onCompanyCreated(empresa, state) {
      this.ensureHolding(state);
      this.ensureCompanyHolding(empresa, state);
      empresa.holding.seeded = true;
      if (empresa.isHolding) {
        this._maybeInitBoard(empresa, state);
        if (!state.holding.nomeGrupo) {
          state.holding.nomeGrupo = `Grupo ${empresa.nomeFantasia}`;
        }
      }
    },

    /* ========== Árvore societária ========== */

    /**
     * Nó da árvore: holding → controladas → filiais → unidades operacionais.
     */
    buildOwnershipTree(state, rootHoldingId) {
      this.ensureHolding(state);
      const holdings = CGL.Company.listHoldings(state);
      const root = rootHoldingId
        ? CGL.Company.getById(state, rootHoldingId)
        : holdings[0] || null;
      if (!root || !root.ativa) {
        return { root: null, nodes: [], edges: [], summary: this._emptyTreeSummary() };
      }
      this.ensureCompanyHolding(root, state);

      const nodes = [];
      const edges = [];
      const seen = new Set();

      const pushNode = (empresa, nivel, meta = {}) => {
        if (!empresa || seen.has(empresa.id)) return;
        seen.add(empresa.id);
        this.ensureCompanyHolding(empresa, state);
        const val = CGL.Company.calcValuation(empresa, state);
        const diretor = (empresa.administradores || [])[0];
        const stake = meta.percentual != null
          ? meta.percentual
          : CGL.Company.playerStake(empresa, state.player?.id);
        nodes.push({
          id: empresa.id,
          tipo: empresa.isHolding ? 'holding' : (meta.tipoNo || 'subsidiaria'),
          nivel,
          nome: empresa.nomeFantasia,
          percentual: stake,
          valor: val,
          lucro: empresa.lucro || 0,
          divida: empresa.endividamento || 0,
          funcionarios: empresa.funcionarios || 0,
          diretor: diretor?.nome || '—',
          segmentoId: empresa.segmentoId,
          porte: empresa.porte,
          isHolding: !!empresa.isHolding,
          govScore: empresa.holding.governanca?.score || 0
        });

        // Filiais como nós filhos
        (empresa.filiais || []).forEach((f, idx) => {
          const fid = `${empresa.id}::filial::${f.id || idx}`;
          nodes.push({
            id: fid,
            tipo: 'filial',
            nivel: nivel + 1,
            nome: f.nome || `Filial ${f.cidadeNome || f.estado || idx + 1}`,
            percentual: 100,
            valor: Math.round((f.receita || 0) * 4),
            lucro: Math.round((f.receita || 0) - (f.custos || 0)),
            divida: 0,
            funcionarios: f.funcionarios || 0,
            diretor: f.gerente || 'Gerente local',
            parentId: empresa.id,
            estado: f.estado
          });
          edges.push({ from: empresa.id, to: fid, percentual: 100, tipo: 'filial' });

          // Unidades operacionais stub (capacidade)
          if ((f.capacidade || 0) > 0) {
            const uid = `${fid}::unid`;
            nodes.push({
              id: uid,
              tipo: 'unidade',
              nivel: nivel + 2,
              nome: `Unidade op. (${f.capacidade} cap.)`,
              percentual: 100,
              valor: Math.round((f.capacidade || 0) * 50),
              lucro: Math.round(((f.receita || 0) - (f.custos || 0)) * 0.4),
              divida: 0,
              funcionarios: Math.max(1, Math.floor((f.funcionarios || 2) * 0.4)),
              diretor: 'Supervisor',
              parentId: fid
            });
            edges.push({ from: fid, to: uid, percentual: 100, tipo: 'unidade' });
          }
        });

        // Participações / controladas
        (empresa.participacoesDetidas || []).forEach((p) => {
          const child = CGL.Company.getById(state, p.empresaId);
          if (!child || !child.ativa) return;
          edges.push({
            from: empresa.id,
            to: child.id,
            percentual: p.percentual,
            tipo: p.tipo || CGL.Company.classifyStake(p.percentual)
          });
          pushNode(child, nivel + 1, {
            percentual: p.percentual,
            tipoNo: p.percentual >= 50 ? 'controlada' : 'coligada'
          });
        });

        // Subsidiárias internacionais (Fase 11) como ramos leves
        if (empresa.international?.subsidiarias) {
          empresa.international.subsidiarias.forEach((sub) => {
            const sid = `${empresa.id}::intl::${sub.id}`;
            nodes.push({
              id: sid,
              tipo: 'subsidiaria_intl',
              nivel: nivel + 1,
              nome: sub.nome || `Sub. ${sub.paisId}`,
              percentual: 100,
              valor: Math.round((sub.caixaLocal || 0) * (CGL.International?.rateToBRL?.(state, sub.moeda) || 1)),
              lucro: Math.round((sub.lucroLocal || 0) * (CGL.International?.rateToBRL?.(state, sub.moeda) || 1)),
              divida: 0,
              funcionarios: sub.funcionarios || 5,
              diretor: sub.gestor || 'Gestão local',
              parentId: empresa.id,
              paisId: sub.paisId
            });
            edges.push({ from: empresa.id, to: sid, percentual: 100, tipo: 'intl' });
          });
        }
      };

      pushNode(root, 0, { percentual: CGL.Company.playerStake(root, state.player?.id), tipoNo: 'holding' });

      return {
        root: nodes.find((n) => n.id === root.id) || null,
        nodes,
        edges,
        summary: this.treeSummary(state, root.id, nodes)
      };
    },

    _emptyTreeSummary() {
      return {
        empresas: 0,
        valorTotal: 0,
        lucroTotal: 0,
        dividaTotal: 0,
        funcionarios: 0,
        controladas: 0,
        filiais: 0
      };
    },

    treeSummary(state, rootId, nodes) {
      const list = nodes || this.buildOwnershipTree(state, rootId).nodes;
      return {
        empresas: list.filter((n) => n.tipo === 'holding' || n.tipo === 'controlada' || n.tipo === 'coligada' || n.tipo === 'subsidiaria').length,
        valorTotal: list.filter((n) => !String(n.id).includes('::')).reduce((a, n) => a + (n.valor || 0), 0),
        lucroTotal: list.filter((n) => !String(n.id).includes('::')).reduce((a, n) => a + (n.lucro || 0), 0),
        dividaTotal: list.filter((n) => !String(n.id).includes('::')).reduce((a, n) => a + (n.divida || 0), 0),
        funcionarios: list.reduce((a, n) => a + (n.funcionarios || 0), 0),
        controladas: list.filter((n) => n.tipo === 'controlada').length,
        filiais: list.filter((n) => n.tipo === 'filial').length
      };
    },

    /* ========== Anexar empresa à holding ========== */

    /**
     * Holding adquire controle (ou participação) de empresa do jogador / concorrente.
     * Reutiliza Company.acquireStake.
     */
    attachCompany(state, holdingId, targetId, percentual = 100, opts = {}) {
      this.ensureHolding(state);
      const holding = CGL.Company.getById(state, holdingId);
      const target = CGL.Company.getById(state, targetId);
      if (!holding?.isHolding) throw new Error('Empresa-mãe deve ser uma holding.');
      if (!target) throw new Error('Empresa alvo não encontrada.');
      this.ensureCompanyHolding(holding, state);
      this.ensureCompanyHolding(target, state);

      // Licenças mínimas
      const licCost = this._ensureLicenses(holding, state, ['junta']);
      const result = CGL.Company.acquireStake(state, holdingId, targetId, percentual, {
        ...opts,
        premium: opts.premium || 1.02
      });

      this._pushHist(holding, state, {
        tipo: 'anexacao',
        titulo: 'Empresa anexada',
        descricao: `${target.nomeFantasia} entrou na árvore (${percentual}%). Licenças R$ ${licCost}.`
      });

      this.refreshSynergies(state, holdingId);
      this._maybeInitBoard(holding, state);
      this._maybeInitBoard(target, state);
      return result;
    },

    _ensureLicenses(empresa, state, licenseIds) {
      this.ensureCompanyHolding(empresa, state);
      let total = 0;
      (licenseIds || []).forEach((id) => {
        if (empresa.holding.licencas.includes(id)) return;
        const lic = CGL.Data.getLicenseById(id);
        if (!lic) return;
        const custo = lic.custo;
        if ((empresa.caixa || 0) >= custo) {
          empresa.caixa -= custo;
          if (empresa.finance && CGL.Finance?.debitEmpresa) {
            try {
              CGL.Finance.debitEmpresa(state, empresa.id, custo, {
                categoria: 'licenca',
                descricao: lic.nome
              });
            } catch (e) { /* ok */ }
          }
          total += custo;
          empresa.holding.licencas.push(id);
        }
      });
      return total;
    },

    /* ========== Criar / comprar / fundir / dividir / vender / fechar ========== */

    createSubsidiaryUnderHolding(state, holdingId, data) {
      const holding = CGL.Company.getById(state, holdingId);
      if (!holding?.isHolding) throw new Error('Holding inválida.');
      this.ensureCompanyHolding(holding, state);

      const capital = Math.max(Number(data.capitalSocial) || 50000, 10000);
      if ((holding.caixa || 0) < capital * 0.5) {
        throw new Error('Holding precisa de caixa para capitalizar a subsidiária.');
      }

      // Licenças + plano de negócio stub
      this._ensureLicenses(holding, state, data.licencas || ['junta', 'alvara']);

      const emp = CGL.Company.constitute(state, {
        ...data,
        capitalSocial: capital,
        socios: [
          { tipo: 'jogador', percentual: Math.max(0, 100 - (data.holdingPct || 80)) },
          // Holding entra via acquire após constituição
        ],
        isHolding: false
      });

      // Holding capitaliza e assume participação
      const pct = CGL.Utils.clamp(Number(data.holdingPct) || 80, 51, 100);
      const aporte = Math.round(capital * (pct / 100));
      holding.caixa = Math.max(0, (holding.caixa || 0) - aporte);
      emp.caixa += aporte * 0.15; // reforço operacional

      // Remove sócio jogador parcial e atribui à holding
      CGL.Company.acquireStake(state, holdingId, emp.id, pct, {
        preco: 0,
        premium: 1,
        pagarComCaixaEmpresa: false
      });
      // Devolve dinheiro pessoal se constitute debitou o jogador demais
      // (constitute já debitou aporte do jogador — ok)

      this.refreshSynergies(state, holdingId);
      this._pushHist(holding, state, {
        tipo: 'criacao',
        titulo: 'Nova subsidiária',
        descricao: `${emp.nomeFantasia} criada sob a holding (${pct}%).`
      });
      return emp;
    },

    buyUnderHolding(state, holdingId, targetId, opts = {}) {
      return this.attachCompany(state, holdingId, targetId, opts.percentual || 100, opts);
    },

    mergeUnderGroup(state, survivorId, absorbedId) {
      const a = CGL.Company.getById(state, survivorId);
      const b = CGL.Company.getById(state, absorbedId);
      if (!a || !b) throw new Error('Empresas inválidas.');
      this.ensureCompanyHolding(a, state);
      this.ensureCompanyHolding(b, state);

      // Choque cultural pré-fusão
      const clash = Math.abs((a.cultura || 50) - (b.cultura || 50));
      const result = CGL.Company.mergeCompanies(state, survivorId, absorbedId);
      a.holding.culturaClash = Math.min(100, (a.holding.culturaClash || 0) + clash * 0.5);
      if (clash > 30) {
        a.eficiencia = Math.max(20, (a.eficiencia || 50) - Math.round(clash * 0.15));
        a.cultura = Math.round(((a.cultura || 50) + (b.cultura || 50)) / 2 - clash * 0.1);
      }
      this._pushHist(a, state, {
        tipo: 'fusao',
        titulo: 'Fusão no grupo',
        descricao: `Incorporou ${b.nomeFantasia}. Choque cultural: ${Math.round(clash)}.`
      });
      // Atualiza sinergias das holdings que controlam
      CGL.Company.listHoldings(state).forEach((h) => this.refreshSynergies(state, h.id));
      return result;
    },

    /**
     * Divide empresa: cria spin-off com fatia de ativos.
     */
    splitCompany(state, empresaId, opts = {}) {
      const src = CGL.Company.getById(state, empresaId);
      if (!src?.ativa) throw new Error('Empresa inválida.');
      if (CGL.Company.playerStake(src, state.player.id) < 50) {
        throw new Error('Controle necessário para cisão.');
      }
      this.ensureCompanyHolding(src, state);

      const frac = CGL.Utils.clamp(Number(opts.fracao) || 0.4, 0.2, 0.5);
      const nome = opts.nome || `${src.nomeFantasia} Spin-off`;
      const capital = Math.max(20000, Math.round((src.capitalSocial || 50000) * frac));

      if ((src.caixa || 0) < capital * 0.5) {
        throw new Error('Caixa insuficiente para cisão.');
      }

      const spin = CGL.Company.constitute(state, {
        nome,
        nomeFantasia: nome,
        razaoSocial: `${nome} Ltda.`,
        corMarca: opts.corMarca || src.corMarca,
        cidadeId: src.cidadeSedeId,
        segmentoId: opts.segmentoId || src.segmentoId,
        naturezaId: 'ltda',
        porte: 'pequena',
        capitalSocial: capital,
        socios: [{ tipo: 'jogador', percentual: 100 }],
        administradores: [{
          nome: `${state.player.nome} ${state.player.sobrenome}`,
          cargo: 'Administrador'
        }]
      });

      // Transfere fatia de caixa / funcionários / filiais
      const moveCaixa = Math.round((src.caixa || 0) * frac);
      src.caixa -= moveCaixa;
      spin.caixa += moveCaixa;
      const moveFunc = Math.max(1, Math.floor((src.funcionarios || 2) * frac));
      src.funcionarios = Math.max(1, (src.funcionarios || 2) - moveFunc);
      spin.funcionarios = moveFunc;
      src.capitalSocial = Math.max(1000, (src.capitalSocial || 0) - capital);

      if ((src.filiais || []).length > 1 && opts.moverFilial) {
        const f = src.filiais.pop();
        spin.filiais = [f];
      }

      this._pushHist(src, state, {
        tipo: 'cisao',
        titulo: 'Cisão',
        descricao: `Spin-off ${spin.nomeFantasia} criado (${Math.round(frac * 100)}% dos ativos).`
      });

      // Se holding controla a origem, anexar spin-off
      if (opts.holdingId) {
        try {
          this.attachCompany(state, opts.holdingId, spin.id, opts.holdingPct || 100, { preco: 0 });
        } catch (e) { /* ok */ }
      }

      return spin;
    },

    sellFromGroup(state, empresaId, opts = {}) {
      return CGL.Company.sellCompany(state, empresaId, opts);
    },

    closeFromGroup(state, empresaId) {
      const r = CGL.Company.closeCompany(state, empresaId);
      CGL.Company.listHoldings(state).forEach((h) => this.refreshSynergies(state, h.id));
      return r;
    },

    /* ========== M&A pipeline ========== */

    /**
     * 1. Encontrar oportunidade — gera deal stub no pipeline.
     */
    findOpportunity(state, holdingId, opts = {}) {
      this.ensureHolding(state);
      const holding = CGL.Company.getById(state, holdingId);
      if (!holding?.isHolding) throw new Error('Holding inválida.');

      let target = opts.targetId ? CGL.Company.getById(state, opts.targetId) : null;
      if (!target) {
        const pool = CGL.Company.listCompetitors(state);
        target = CGL.Utils.pick(pool);
      }
      if (!target) {
        // Spawna concorrente se não houver
        target = CGL.Company.spawnCompetitor(
          state,
          opts.segmentoId || 'industria',
          holding.cidadeSedeId
        );
      }

      const tipoAlvo = opts.tipoAlvo || 'concorrente';
      const tipoMeta = CGL.Data.maTargetTypes.find((t) => t.id === tipoAlvo);
      const val = CGL.Company.calcValuation(target, state);
      const premium = tipoMeta?.premium || 1.1;

      const deal = {
        id: CGL.Utils.uuid(),
        holdingId,
        alvoId: target.id,
        alvoNome: target.nomeFantasia,
        tipoAlvo,
        estagio: 'encontrar',
        semanaInicio: state.world?.semanaAtual || 0,
        valuationBase: val,
        precoOferta: Math.round(val * premium),
        precoNegociado: null,
        premium,
        dueDiligence: null,
        issuesRevelados: [],
        aprovado: false,
        integrado: false,
        sinergiaEstimada: null,
        status: 'ativo',
        historico: [{ semana: state.world?.semanaAtual || 0, estagio: 'encontrar', nota: 'Oportunidade identificada' }]
      };

      state.holding.maPipeline.unshift(deal);
      if (state.holding.maPipeline.length > MA_CAP) {
        state.holding.maPipeline = state.holding.maPipeline.slice(0, MA_CAP);
      }
      this._pushHist(holding, state, {
        tipo: 'ma',
        titulo: 'Oportunidade M&A',
        descricao: `Alvo: ${target.nomeFantasia} (${tipoAlvo}).`
      });
      return deal;
    },

    /** 2. Fazer proposta */
    makeOffer(state, dealId, preco) {
      const deal = this._getDeal(state, dealId);
      if (deal.estagio !== 'encontrar' && deal.estagio !== 'proposta') {
        throw new Error('Estágio inválido para proposta.');
      }
      deal.precoOferta = Math.round(Number(preco) || deal.precoOferta);
      deal.estagio = 'proposta';
      deal.historico.push({
        semana: state.world?.semanaAtual || 0,
        estagio: 'proposta',
        nota: `Proposta de ${CGL.Utils.formatBRL(deal.precoOferta)}`
      });
      return deal;
    },

    /** 3. Negociar */
    negotiate(state, dealId, opts = {}) {
      const deal = this._getDeal(state, dealId);
      if (deal.estagio !== 'proposta' && deal.estagio !== 'negociar') {
        throw new Error('Faça a proposta antes de negociar.');
      }
      const alvo = CGL.Company.getById(state, deal.alvoId);
      const pressao = opts.agressivo ? 0.08 : 0.03;
      const fator = 1 - pressao + CGL.Utils.randomFloat(-0.04, 0.06);
      deal.precoNegociado = Math.round((deal.precoOferta || deal.valuationBase) * fator);
      deal.estagio = 'negociar';
      deal.historico.push({
        semana: state.world?.semanaAtual || 0,
        estagio: 'negociar',
        nota: `Preço negociado: ${CGL.Utils.formatBRL(deal.precoNegociado)}`
      });
      // Cultura clash estimado
      const holding = CGL.Company.getById(state, deal.holdingId);
      if (holding && alvo) {
        deal.culturaClashEst = Math.abs((holding.cultura || 50) - (alvo.cultura || 50));
      }
      return deal;
    },

    /**
     * 4. Due diligence — revela issues ocultos.
     */
    runDueDiligence(state, dealId) {
      const deal = this._getDeal(state, dealId);
      if (!['negociar', 'diligencia', 'proposta'].includes(deal.estagio)) {
        throw new Error('Negocie antes da due diligence.');
      }
      const alvo = CGL.Company.getById(state, deal.alvoId);
      if (!alvo) throw new Error('Alvo sumiu.');

      const holding = CGL.Company.getById(state, deal.holdingId);
      const custoDD = Math.round((deal.precoNegociado || deal.precoOferta || 100000) * 0.015);
      if (holding && (holding.caixa || 0) < custoDD) {
        throw new Error(`Caixa insuficiente para DD (${CGL.Utils.formatBRL(custoDD)}).`);
      }
      if (holding) {
        holding.caixa -= custoDD;
        if (holding.finance && CGL.Finance?.debitEmpresa) {
          try {
            CGL.Finance.debitEmpresa(state, holding.id, custoDD, {
              categoria: 'due_diligence',
              descricao: `DD — ${alvo.nomeFantasia}`
            });
          } catch (e) { /* ok */ }
        }
      }

      const issues = [];
      const pool = CGL.Data.ddIssues || [];
      // Sempre analisa métricas visíveis
      if ((alvo.endividamento || 0) > (alvo.patrimonioLiquido || 1) * 0.8) {
        issues.push({ ...CGL.Data.getDdIssueById('divida_oculta'), revelado: true });
      }
      if ((alvo.reputacao?.geral ?? alvo.reputacao ?? 50) < 40) {
        const iss = CGL.Data.getDdIssueById('reputacao_manchada');
        if (iss) issues.push({ ...iss, revelado: true });
      }
      if ((alvo.cultura || 50) < 35) {
        const iss = CGL.Data.getDdIssueById('cultura_toxica');
        if (iss) issues.push({ ...iss, revelado: true });
      }
      // Issues aleatórios ocultos
      const ocultos = pool.filter((i) => !issues.find((x) => x.id === i.id));
      const nExtra = CGL.Utils.randomInt(1, 3);
      for (let i = 0; i < nExtra && ocultos.length; i++) {
        const idx = CGL.Utils.randomInt(0, ocultos.length - 1);
        const pick = ocultos.splice(idx, 1)[0];
        issues.push({ ...pick, revelado: true, ocultoAntes: true });
      }

      deal.dueDiligence = {
        semana: state.world?.semanaAtual || 0,
        custo: custoDD,
        valuation: CGL.Company.calcValuation(alvo, state),
        issues: issues.map((i) => i.id),
        scoreRisco: Math.round(
          issues.reduce((a, i) => a + Math.max(0, i.severidade || 0), 0) / Math.max(1, issues.length) * 100
        )
      };
      deal.issuesRevelados = issues;
      deal.estagio = 'diligencia';
      deal.historico.push({
        semana: state.world?.semanaAtual || 0,
        estagio: 'diligencia',
        nota: `DD concluiu: ${issues.length} achados (risco ${deal.dueDiligence.scoreRisco}).`
      });

      // Hook Mercado (Fase 5)
      if (CGL.Market?.startDueDiligence) {
        try { CGL.Market.startDueDiligence(state, deal.alvoId); } catch (e) { /* ok */ }
      }
      return deal;
    },

    /** 5. Aprovar aquisição (conselho / jogador) */
    approveDeal(state, dealId, opts = {}) {
      const deal = this._getDeal(state, dealId);
      if (deal.estagio !== 'diligencia' && deal.estagio !== 'aprovar') {
        throw new Error('Conclua a due diligence antes de aprovar.');
      }
      const holding = CGL.Company.getById(state, deal.holdingId);
      this.ensureCompanyHolding(holding, state);

      // Conselho pode bloquear se pressão alta e risco DD alto
      if (holding.holding.conselho?.ativo && !opts.forcar) {
        const pressao = holding.holding.conselho.nivelPressao || 0;
        const risco = deal.dueDiligence?.scoreRisco || 0;
        if (pressao > 60 && risco > 55 && CGL.Utils.randomFloat(0, 1) < 0.45) {
          deal.historico.push({
            semana: state.world?.semanaAtual || 0,
            estagio: 'aprovar',
            nota: 'Conselho bloqueou a aquisição.'
          });
          throw new Error('Conselho de Administração bloqueou a aquisição.');
        }
      }

      const preco = deal.precoNegociado || deal.precoOferta;
      if ((holding.caixa || 0) < preco) {
        throw new Error('Caixa da holding insuficiente para fechar o deal.');
      }

      // Ajuste de preço se issues graves
      let ajuste = 1;
      (deal.issuesRevelados || []).forEach((iss) => {
        if ((iss.severidade || 0) > 0.5) ajuste -= 0.04;
        if (iss.id === 'potencial_alto') ajuste += 0.03;
      });
      const precoFinal = Math.round(preco * Math.max(0.7, ajuste));

      CGL.Company.acquireStake(state, deal.holdingId, deal.alvoId, 100, {
        preco: precoFinal,
        premium: 1
      });

      // Aplica efeitos negativos revelados se não mitigados
      const alvo = CGL.Company.getById(state, deal.alvoId);
      if (alvo) {
        this.ensureCompanyHolding(alvo, state);
        (deal.issuesRevelados || []).forEach((iss) => {
          const ef = iss.efeito || {};
          if (ef.endividamentoAdd) {
            alvo.endividamento = Math.round(
              (alvo.endividamento || 0) * (1 + ef.endividamentoAdd)
            );
          }
          if (ef.eficiencia) alvo.eficiencia = CGL.Utils.clamp((alvo.eficiencia || 50) + ef.eficiencia, 10, 100);
          if (ef.cultura) alvo.cultura = CGL.Utils.clamp((alvo.cultura || 50) + ef.cultura, 10, 100);
          if (ef.nivelTech) alvo.nivelTech = CGL.Utils.clamp((alvo.nivelTech || 30) + ef.nivelTech, 5, 100);
          if (ef.reputacao && alvo.reputacao && typeof alvo.reputacao === 'object') {
            alvo.reputacao.geral = CGL.Utils.clamp((alvo.reputacao.geral || 50) + ef.reputacao, 0, 100);
          }
        });
        if (deal.culturaClashEst > 25) {
          alvo.holding.culturaClash = Math.min(100, deal.culturaClashEst);
        }
      }

      deal.precoNegociado = precoFinal;
      deal.aprovado = true;
      deal.estagio = 'aprovar';
      deal.historico.push({
        semana: state.world?.semanaAtual || 0,
        estagio: 'aprovar',
        nota: `Aquisição aprovada por ${CGL.Utils.formatBRL(precoFinal)}.`
      });
      deal.estagio = 'integrar';
      this.refreshSynergies(state, deal.holdingId);
      return deal;
    },

    /** 6. Integrar */
    integrateDeal(state, dealId, opts = {}) {
      const deal = this._getDeal(state, dealId);
      if (!deal.aprovado || deal.estagio !== 'integrar') {
        throw new Error('Deal precisa estar aprovado para integrar.');
      }
      const holding = CGL.Company.getById(state, deal.holdingId);
      const alvo = CGL.Company.getById(state, deal.alvoId);
      if (!holding || !alvo) throw new Error('Partes inválidas.');

      this.ensureCompanyHolding(holding, state);
      this.ensureCompanyHolding(alvo, state);

      // Sinergia
      const pair = CGL.Data.getSynergyPair(holding.segmentoId, alvo.segmentoId)
        || this._findGroupSynergy(state, holding.id, alvo);
      let receitaMult = pair?.receitaMult || 1.02;
      let custoMult = pair?.custoMult || 0.98;
      const clash = alvo.holding.culturaClash || deal.culturaClashEst || 0;

      if (clash > 40) {
        receitaMult *= 0.97;
        custoMult *= 1.04;
        alvo.eficiencia = Math.max(15, (alvo.eficiencia || 50) - Math.round(clash * 0.1));
      }

      // Modo fusão total opcional
      if (opts.fundir) {
        this.mergeUnderGroup(state, holding.id, alvo.id);
      } else {
        alvo.holding.sinergiaReceitaMult = receitaMult;
        alvo.holding.sinergiaCustoMult = custoMult;
        holding.holding.sinergiaReceitaMult = Math.max(
          holding.holding.sinergiaReceitaMult || 1,
          receitaMult * 0.98
        );
      }

      deal.sinergiaEstimada = { receitaMult, custoMult, pairId: pair?.id || null, clash };
      deal.integrado = true;
      deal.estagio = 'concluido';
      deal.status = 'concluido';
      deal.historico.push({
        semana: state.world?.semanaAtual || 0,
        estagio: 'integrar',
        nota: `Integração concluída. Sinergia receita ×${receitaMult.toFixed(2)}.`
      });

      this.refreshSynergies(state, deal.holdingId);
      this._pushHist(holding, state, {
        tipo: 'ma',
        titulo: 'M&A concluído',
        descricao: `${alvo.nomeFantasia} integrado ao grupo.`
      });
      return deal;
    },

    cancelDeal(state, dealId, motivo) {
      const deal = this._getDeal(state, dealId);
      deal.estagio = 'cancelado';
      deal.status = 'cancelado';
      deal.historico.push({
        semana: state.world?.semanaAtual || 0,
        estagio: 'cancelado',
        nota: motivo || 'Cancelado pelo jogador'
      });
      return deal;
    },

    _getDeal(state, dealId) {
      this.ensureHolding(state);
      const deal = (state.holding.maPipeline || []).find((d) => d.id === dealId);
      if (!deal) throw new Error('Deal não encontrado.');
      if (deal.status === 'cancelado' || deal.estagio === 'cancelado') {
        throw new Error('Deal cancelado.');
      }
      return deal;
    },

    _findGroupSynergy(state, holdingId, alvo) {
      const holding = CGL.Company.getById(state, holdingId);
      if (!holding) return null;
      let best = null;
      (holding.participacoesDetidas || []).forEach((p) => {
        const e = CGL.Company.getById(state, p.empresaId);
        if (!e || e.id === alvo.id) return;
        const pair = CGL.Data.getSynergyPair(e.segmentoId, alvo.segmentoId);
        if (pair && (!best || pair.receitaMult > best.receitaMult)) best = pair;
      });
      // Tech holding wildcard
      if (!best && (alvo.segmentoId === 'tecnologia' || holding.segmentoId === 'holding')) {
        best = CGL.Data.synergyPairs.find((p) => p.id === 'tech_todas') || null;
      }
      return best;
    },

    /* ========== Sinergias ========== */

    refreshSynergies(state, holdingId) {
      this.ensureHolding(state);
      const holding = CGL.Company.getById(state, holdingId);
      if (!holding) return [];

      const controladas = (holding.participacoesDetidas || [])
        .filter((p) => p.percentual >= 50)
        .map((p) => CGL.Company.getById(state, p.empresaId))
        .filter((e) => e?.ativa);

      const ativas = [];
      const segs = controladas.map((e) => e.segmentoId);
      for (let i = 0; i < segs.length; i++) {
        for (let j = i + 1; j < segs.length; j++) {
          const pair = CGL.Data.getSynergyPair(segs[i], segs[j]);
          if (pair) {
            ativas.push({
              id: `${holdingId}:${pair.id}:${i}:${j}`,
              pairId: pair.id,
              nome: pair.nome,
              holdingId,
              empresaA: controladas[i].id,
              empresaB: controladas[j].id,
              receitaMult: pair.receitaMult,
              custoMult: pair.custoMult,
              culturaRisco: pair.culturaRisco
            });
          }
        }
      }
      // Tech + todas
      const tech = controladas.find((e) => e.segmentoId === 'tecnologia');
      if (tech && controladas.length > 1) {
        const pair = CGL.Data.synergyPairs.find((p) => p.id === 'tech_todas');
        if (pair && !ativas.find((a) => a.pairId === 'tech_todas')) {
          ativas.push({
            id: `${holdingId}:tech_todas`,
            pairId: 'tech_todas',
            nome: pair.nome,
            holdingId,
            empresaA: tech.id,
            empresaB: null,
            receitaMult: pair.receitaMult,
            custoMult: pair.custoMult,
            culturaRisco: pair.culturaRisco
          });
        }
      }

      // Aplica multiplicadores nas controladas
      controladas.forEach((e) => {
        this.ensureCompanyHolding(e, state);
        const related = ativas.filter(
          (a) => a.empresaA === e.id || a.empresaB === e.id || a.pairId === 'tech_todas'
        );
        if (!related.length) {
          e.holding.sinergiaReceitaMult = 1;
          e.holding.sinergiaCustoMult = 1;
          return;
        }
        let r = 1;
        let c = 1;
        related.forEach((a) => {
          r *= a.receitaMult;
          c *= a.custoMult;
        });
        e.holding.sinergiaReceitaMult = Math.min(1.25, r);
        e.holding.sinergiaCustoMult = Math.max(0.8, c);
      });

      // Atualiza lista global (substitui as deste holding)
      state.holding.sinergiasAtivas = (state.holding.sinergiasAtivas || [])
        .filter((s) => s.holdingId !== holdingId)
        .concat(ativas);

      return ativas;
    },

    /* ========== Governança / conselho ========== */

    _maybeInitBoard(empresa, state) {
      this.ensureCompanyHolding(empresa, state);
      const precisa = (empresa.funcionarios || 0) >= BOARD_THRESHOLD_FUNC
        || BOARD_THRESHOLD_PORTE.includes(empresa.porte)
        || !!empresa.ipo?.listada
        || (empresa.isHolding && (empresa.participacoesDetidas || []).length >= 2);
      if (!precisa) return;
      if (empresa.holding.conselho.ativo && empresa.holding.conselho.membros.length) return;

      empresa.holding.conselho.ativo = true;
      const nomes = ['Ana Ribeiro', 'Carlos Mendes', 'Sofia Almeida', 'Paulo Costa', 'Helena Dias'];
      empresa.holding.conselho.membros = [
        { id: CGL.Utils.uuid(), nome: `${state.player?.nome || 'CEO'} ${state.player?.sobrenome || ''}`, papel: 'presidente', independente: false, lealdade: 90 },
        { id: CGL.Utils.uuid(), nome: CGL.Utils.pick(nomes), papel: 'independente', independente: true, lealdade: 55 },
        { id: CGL.Utils.uuid(), nome: CGL.Utils.pick(nomes), papel: 'acionista', independente: false, lealdade: 65 }
      ];
    },

    investGovernance(state, empresaId, policyId) {
      const empresa = CGL.Company.getById(state, empresaId);
      if (!empresa) throw new Error('Empresa inválida.');
      this.ensureCompanyHolding(empresa, state);
      const pol = CGL.Data.getGovPolicyById(policyId);
      if (!pol) throw new Error('Política inválida.');

      if (empresa.holding.governanca.politicasAtivas.includes(policyId)) {
        throw new Error('Política já ativa.');
      }
      if ((empresa.caixa || 0) < pol.custoSemanal * 4) {
        throw new Error('Caixa insuficiente para implantar política.');
      }
      empresa.caixa -= pol.custoSemanal * 4; // setup
      empresa.holding.governanca.politicasAtivas.push(policyId);
      empresa.holding.governanca[policyId] = CGL.Utils.clamp(
        (empresa.holding.governanca[policyId] || 40) + pol.ganho,
        0,
        100
      );
      this._recalcGovScore(empresa);
      this._pushHist(empresa, state, {
        tipo: 'governanca',
        titulo: 'Política implantada',
        descricao: `${pol.nome} ativada.`
      });
      return empresa.holding.governanca;
    },

    _recalcGovScore(empresa) {
      const g = empresa.holding.governanca;
      g.score = Math.round(
        ((g.auditoria || 0) + (g.compliance || 0) + (g.risco || 0) + (g.etica || 0)) / 4
      );
      return g.score;
    },

    addBoardMember(state, empresaId, data = {}) {
      const empresa = CGL.Company.getById(state, empresaId);
      if (!empresa) throw new Error('Empresa inválida.');
      this.ensureCompanyHolding(empresa, state);
      this._maybeInitBoard(empresa, state);
      const membro = {
        id: CGL.Utils.uuid(),
        nome: data.nome || 'Novo conselheiro',
        papel: data.papel || 'independente',
        independente: data.independente != null ? data.independente : true,
        lealdade: data.lealdade != null ? data.lealdade : 50
      };
      empresa.holding.conselho.membros.push(membro);
      empresa.holding.conselho.ativo = true;
      return membro;
    },

    /* ========== Departamentos / escritórios ========== */

    openDepartment(state, holdingId, deptId) {
      const holding = CGL.Company.getById(state, holdingId);
      if (!holding?.isHolding) throw new Error('Apenas holdings.');
      this.ensureCompanyHolding(holding, state);
      const def = CGL.Data.getCorpDeptById(deptId);
      if (!def) throw new Error('Departamento inválido.');
      if (holding.holding.departamentos.find((d) => d.tipo === deptId)) {
        throw new Error('Departamento já existe.');
      }
      const setup = def.custoBase * 3;
      if ((holding.caixa || 0) < setup) throw new Error('Caixa insuficiente.');
      holding.caixa -= setup;
      const dept = {
        id: CGL.Utils.uuid(),
        tipo: deptId,
        nome: def.nome,
        nivel: 1,
        funcionarios: 4 + CGL.Utils.randomInt(0, 6),
        custoSemanal: def.custoBase,
        eficiencia: 50,
        semanaAbertura: state.world?.semanaAtual || 0
      };
      holding.holding.departamentos.push(dept);
      this._pushHist(holding, state, {
        tipo: 'corporativo',
        titulo: 'Departamento aberto',
        descricao: `${def.nome} passou a atender o grupo.`
      });
      return dept;
    },

    openOffice(state, holdingId, officeId, cidadeId) {
      const holding = CGL.Company.getById(state, holdingId);
      if (!holding?.isHolding) throw new Error('Apenas holdings.');
      this.ensureCompanyHolding(holding, state);
      const def = CGL.Data.getCorpOfficeById(officeId);
      if (!def) throw new Error('Escritório inválido.');
      if ((holding.caixa || 0) < def.capex) throw new Error('CAPEX insuficiente.');
      holding.caixa -= def.capex;
      if (holding.finance && CGL.Finance?.debitEmpresa) {
        try {
          CGL.Finance.debitEmpresa(state, holding.id, def.capex, {
            categoria: 'capex_corporativo',
            descricao: def.nome
          });
        } catch (e) { /* ok */ }
      }
      const office = {
        id: CGL.Utils.uuid(),
        tipo: officeId,
        nome: def.nome,
        cidadeId: cidadeId || holding.cidadeSedeId,
        custoSemanal: def.custoBase,
        semanaAbertura: state.world?.semanaAtual || 0
      };
      holding.holding.escritorios.push(office);
      // Efeitos leves
      const ef = def.efeito || {};
      if (ef.governanca) {
        ['auditoria', 'compliance', 'risco', 'etica'].forEach((k) => {
          holding.holding.governanca[k] = CGL.Utils.clamp(
            (holding.holding.governanca[k] || 40) + Math.round(ef.governanca / 4),
            0,
            100
          );
        });
        this._recalcGovScore(holding);
      }
      if (ef.reputacao && holding.reputacao?.geral != null) {
        holding.reputacao.geral = CGL.Utils.clamp(
          holding.reputacao.geral + ef.reputacao, 0, 100
        );
      }
      this._pushHist(holding, state, {
        tipo: 'corporativo',
        titulo: 'Escritório aberto',
        descricao: `${def.nome} inaugurado.`
      });
      return office;
    },

    setBrandStrategy(state, strategyId) {
      this.ensureHolding(state);
      const s = CGL.Data.getBrandStrategyById(strategyId);
      if (!s) throw new Error('Estratégia inválida.');
      state.holding.brandStrategy = s.id;
      return s;
    },

    /* ========== Sucessão / herdeiros ========== */

    syncHeirsFromFamily(state) {
      this.ensureHolding(state);
      const familia = state.player?.familia || state.family || {};
      const membros = Array.isArray(familia)
        ? familia
        : (familia.membros || familia.members || []);
      const herdeiros = [];
      (membros || []).forEach((m) => {
        const rel = (m.parentesco || m.relacao || m.tipo || m.papel || '').toLowerCase();
        if (!/filho|filha|herdeiro|neto/.test(rel) && !m.herdeiro) return;
        herdeiros.push({
          id: m.id || CGL.Utils.uuid(),
          nome: m.nome || 'Herdeiro',
          idade: m.idade || 12,
          formacao: m.formacao || m.curso || 'Em formação',
          inteligencia: m.inteligencia || CGL.Utils.randomInt(40, 85),
          lideranca: m.lideranca || CGL.Utils.randomInt(30, 80),
          interesse: m.interesseNegocio || m.interesse || CGL.Utils.randomInt(20, 90),
          relacaoFamiliar: m.afinidade || m.relacaoFamiliar || CGL.Utils.randomInt(40, 90),
          pronto: (m.idade || 0) >= 21 && (m.interesseNegocio || m.interesse || 50) >= 40
        });
      });
      if (herdeiros.length) {
        state.holding.sucessao.herdeiros = herdeiros;
      }
      return state.holding.sucessao.herdeiros;
    },

    /** Adiciona herdeiro stub (hook até família profunda) */
    addHeirStub(state, data = {}) {
      this.ensureHolding(state);
      const h = {
        id: CGL.Utils.uuid(),
        nome: data.nome || `Herdeiro ${state.holding.sucessao.herdeiros.length + 1}`,
        idade: data.idade || 18,
        formacao: data.formacao || 'Administração',
        inteligencia: data.inteligencia || 60,
        lideranca: data.lideranca || 55,
        interesse: data.interesse || 50,
        relacaoFamiliar: data.relacaoFamiliar || 70,
        pronto: (data.idade || 18) >= 21
      };
      state.holding.sucessao.herdeiros.push(h);
      return h;
    },

    setSuccessionPlan(state, plano) {
      this.ensureHolding(state);
      const valid = ['filho', 'ceo_profissional', 'dividir', 'conselho_familiar'];
      if (!valid.includes(plano)) throw new Error('Plano inválido.');
      state.holding.sucessao.plano = plano;
      if (plano === 'conselho_familiar') {
        state.holding.sucessao.conselhoFamiliar = true;
      }
      return state.holding.sucessao;
    },

    /* ========== Custos / hooks operação ========== */

    weeklyHoldingCostEstimate(empresa, state) {
      this.ensureCompanyHolding(empresa, state);
      let c = 0;
      (empresa.holding.departamentos || []).forEach((d) => {
        c += d.custoSemanal || 0;
      });
      (empresa.holding.escritorios || []).forEach((o) => {
        c += o.custoSemanal || 0;
      });
      (empresa.holding.governanca?.politicasAtivas || []).forEach((pid) => {
        const pol = CGL.Data.getGovPolicyById(pid);
        if (pol) c += pol.custoSemanal;
      });
      // Conselho: honorários
      if (empresa.holding.conselho?.ativo) {
        c += (empresa.holding.conselho.membros || []).length * 800;
      }
      // Aloca parte do custo compartilhado às controladas? Custo fica na holding.
      empresa.holding.custoCompartilhadoSemanal = Math.round(c);
      return Math.round(c);
    },

    /** Benefício de custo compartilhado nas controladas (redução) */
    sharedCostRelief(empresa, state) {
      // Se empresa é controlada por holding com deptos, alívio
      const holders = CGL.Company.listHoldings(state);
      for (const h of holders) {
        const stake = (h.participacoesDetidas || []).find(
          (p) => p.empresaId === empresa.id && p.percentual >= 50
        );
        if (!stake) continue;
        this.ensureCompanyHolding(h, state);
        const nDept = (h.holding.departamentos || []).length;
        if (nDept <= 0) return 1;
        let mult = 1 - Math.min(0.12, nDept * 0.015);
        (h.holding.departamentos || []).forEach((d) => {
          const def = CGL.Data.getCorpDeptById(d.tipo);
          if (def?.efeito?.custoGrupoMult) mult *= def.efeito.custoGrupoMult;
        });
        return Math.max(0.85, mult);
      }
      return 1;
    },

    synergyRevenueMult(empresa) {
      return empresa?.holding?.sinergiaReceitaMult || 1;
    },

    synergyCostMult(empresa) {
      let m = empresa?.holding?.sinergiaCustoMult || 1;
      if ((empresa?.holding?.culturaClash || 0) > 30) {
        m *= 1 + (empresa.holding.culturaClash - 30) * 0.002;
      }
      return m;
    },

    brandDemandMult(state) {
      this.ensureHolding(state);
      const s = CGL.Data.getBrandStrategyById(state.holding.brandStrategy);
      return s?.forcaMarca || 1;
    },

    syncFinanceHook(empresa, state) {
      if (!empresa.finance) return;
      empresa.finance._holdingCustoSemanal = this.weeklyHoldingCostEstimate(empresa, state);
    },

    /* ========== Ranking / dashboard ========== */

    _updateRanking(state) {
      this.ensureHolding(state);
      const playerRow = this._playerEmpireRow(state);
      const npcs = (CGL.Data.globalConglomerates || []).map((n) => ({
        ...n,
        isPlayer: false
      }));
      const all = [...npcs];
      if (playerRow) all.push(playerRow);
      all.sort((a, b) => (b.valorMercado || 0) - (a.valorMercado || 0));
      state.holding.ranking = all.map((r, i) => ({ ...r, posicao: i + 1 }));
      return state.holding.ranking;
    },

    _playerEmpireRow(state) {
      const holdings = CGL.Company.listHoldings(state);
      if (!holdings.length && !CGL.Company.listPlayerCompanies(state).length) return null;
      const root = holdings[0];
      const tree = root ? this.buildOwnershipTree(state, root.id) : { summary: this._emptyTreeSummary() };
      const sum = tree.summary;
      const empresas = CGL.Company.listPlayerCompanies(state);
      const receitaAnual = empresas.reduce((a, e) => a + (e.receitaAcumuladaAno || e.receita * 52 || 0), 0);
      const valor = empresas.reduce((a, e) => a + CGL.Company.calcValuation(e, state), 0);
      let paises = 1;
      empresas.forEach((e) => {
        if (e.international?.presencaPaises) {
          paises = Math.max(paises, e.international.presencaPaises + 1);
        }
      });
      const gov = root ? (root.holding?.governanca?.score || 50) : 50;
      return {
        id: 'player',
        nome: state.holding.nomeGrupo || `Grupo ${state.player?.sobrenome || 'Jogador'}`,
        receitaAnual,
        valorMercado: valor,
        paises,
        funcionarios: sum.funcionarios || empresas.reduce((a, e) => a + (e.funcionarios || 0), 0),
        poder: CGL.Utils.clamp(30 + Math.log10(Math.max(1, valor)) * 8, 10, 99),
        influencia: CGL.Utils.clamp(gov * 0.6 + sum.controladas * 3, 10, 95),
        reputacao: Math.round(
          empresas.reduce((a, e) => a + (e.reputacao?.geral || 50), 0) / Math.max(1, empresas.length)
        ),
        isPlayer: true
      };
    },

    dashboardSummary(state) {
      this.ensureHolding(state);
      const holdings = CGL.Company.listHoldings(state);
      const root = holdings[0];
      const tree = root ? this.buildOwnershipTree(state, root.id) : { summary: this._emptyTreeSummary() };
      const maAtivos = (state.holding.maPipeline || []).filter(
        (d) => d.status === 'ativo' && d.estagio !== 'concluido' && d.estagio !== 'cancelado'
      ).length;
      const rank = (state.holding.ranking || []).find((r) => r.isPlayer);
      return {
        holdings: holdings.length,
        controladas: tree.summary.controladas,
        valorTotal: tree.summary.valorTotal,
        funcionarios: tree.summary.funcionarios,
        sinergias: (state.holding.sinergiasAtivas || []).length,
        maAtivos,
        brandStrategy: state.holding.brandStrategy,
        rankingPos: rank?.posicao || null,
        govScore: root?.holding?.governanca?.score || 0,
        nomeGrupo: state.holding.nomeGrupo
      };
    },

    /* ========== Eventos de império ========== */

    pushEvent(state, ev) {
      this.ensureHolding(state);
      state.holding.eventos.unshift({
        id: CGL.Utils.uuid(),
        semana: state.world?.semanaAtual || 0,
        ...ev
      });
      if (state.holding.eventos.length > EVENT_CAP) {
        state.holding.eventos = state.holding.eventos.slice(0, EVENT_CAP);
      }
      if (CGL.Events?.notify) {
        CGL.Events.notify(
          ev.tipo === 'negativo' ? 'warning' : 'info',
          ev.titulo || 'Império',
          ev.descricao || ''
        );
      }
    },

    _rollEmpireEvents(state) {
      this.ensureHolding(state);
      if (CGL.Utils.randomFloat(0, 1) > 0.12) return;
      const sum = this.dashboardSummary(state);
      const root = CGL.Company.listHoldings(state)[0];
      const candidates = (CGL.Data.empireEvents || []).filter((ev) => {
        if (ev.cond === 'rankingTop20') return sum.rankingPos && sum.rankingPos <= 20;
        if (ev.cond === 'holdingValorAlto') return sum.valorTotal > 5e6;
        if (ev.cond === 'muitasControladas') return sum.controladas >= 3;
        if (ev.cond === 'temControlada') return sum.controladas >= 1;
        if (ev.cond === 'temHerdeiro') return (state.holding.sucessao.herdeiros || []).length >= 1;
        if (ev.cond === 'boardPressaoAlta') {
          return (root?.holding?.conselho?.nivelPressao || 0) > 55;
        }
        if (ev.cond === 'temSinergia') return sum.sinergias >= 1;
        if (ev.cond === 'govBaixa') return sum.govScore > 0 && sum.govScore < 40;
        return true;
      });
      if (!candidates.length) return;
      const pick = CGL.Utils.pick(candidates);
      this.pushEvent(state, {
        tipo: pick.tipo,
        titulo: pick.titulo,
        descricao: pick.descricao,
        eventId: pick.id
      });

      // Efeitos leves
      if (pick.id === 'ataque_subsidiaria' && root) {
        const p = CGL.Utils.pick(root.participacoesDetidas || []);
        const e = p && CGL.Company.getById(state, p.empresaId);
        if (e) e.eficiencia = Math.max(15, (e.eficiencia || 50) - 5);
      }
      if (pick.id === 'escandalo_gov' && root) {
        root.holding.governanca.etica = Math.max(10, (root.holding.governanca.etica || 50) - 10);
        this._recalcGovScore(root);
        if (root.reputacao?.geral != null) {
          root.reputacao.geral = Math.max(10, root.reputacao.geral - 8);
        }
      }
      if (pick.id === 'pressao_sucessao') {
        state.holding.sucessao.conflitos.push({
          id: CGL.Utils.uuid(),
          semana: state.world?.semanaAtual || 0,
          tipo: 'pressao_sucessao',
          descricao: pick.descricao
        });
      }
      if (pick.id === 'conselho_ameaca' && root) {
        root.holding.conselho.nivelPressao = Math.min(
          100,
          (root.holding.conselho.nivelPressao || 0) + 15
        );
      }
    },

    /* ========== Tick semanal ========== */

    weeklyTick(state) {
      this.ensureHolding(state);
      const semana = state.world?.semanaAtual || 0;
      state.holding.semanaUltimoTick = semana;

      this.syncHeirsFromFamily(state);

      const holdings = CGL.Company.listHoldings(state);
      holdings.forEach((h) => {
        this.ensureCompanyHolding(h, state);
        this._maybeInitBoard(h, state);
        this.refreshSynergies(state, h.id);

        // Custo corporativo já entra via company operate hook; aqui métricas
        const custo = this.weeklyHoldingCostEstimate(h, state);
        this.syncFinanceHook(h, state);

        // Governança drift + políticas
        const g = h.holding.governanca;
        (g.politicasAtivas || []).forEach((pid) => {
          const pol = CGL.Data.getGovPolicyById(pid);
          if (pol && g[pid] != null) {
            g[pid] = CGL.Utils.clamp(g[pid] + 0.3, 0, 100);
          }
        });
        // Sem políticas, degrada levemente
        if (!(g.politicasAtivas || []).length) {
          ['auditoria', 'compliance', 'risco'].forEach((k) => {
            g[k] = CGL.Utils.clamp((g[k] || 40) - 0.15, 5, 100);
          });
        }
        this._recalcGovScore(h);

        // Conselho: pressão por lucro fraco do grupo
        if (h.holding.conselho?.ativo) {
          const tree = this.buildOwnershipTree(state, h.id);
          const lucro = tree.summary.lucroTotal;
          if (lucro < 0) {
            h.holding.conselho.nivelPressao = CGL.Utils.clamp(
              (h.holding.conselho.nivelPressao || 0) + 3, 0, 100
            );
          } else if (lucro > 10000) {
            h.holding.conselho.nivelPressao = CGL.Utils.clamp(
              (h.holding.conselho.nivelPressao || 0) - 1.5, 0, 100
            );
          }
          // Boa governança reduz pressão
          if (g.score > 70) {
            h.holding.conselho.nivelPressao = CGL.Utils.clamp(
              h.holding.conselho.nivelPressao - 0.5, 0, 100
            );
          }
        }

        // Cultura clash decai lentamente
        (h.participacoesDetidas || []).forEach((p) => {
          const e = CGL.Company.getById(state, p.empresaId);
          if (!e?.holding) return;
          if (e.holding.culturaClash > 0) {
            e.holding.culturaClash = Math.max(0, e.holding.culturaClash - 1.2);
          }
        });

        // Benefício depts nas controladas (eficiência leve)
        const nDept = (h.holding.departamentos || []).length;
        if (nDept > 0) {
          (h.participacoesDetidas || []).forEach((p) => {
            if (p.percentual < 50) return;
            const e = CGL.Company.getById(state, p.empresaId);
            if (!e?.ativa) return;
            e.eficiencia = CGL.Utils.clamp(
              (e.eficiencia || 50) + 0.05 * nDept, 10, 100
            );
          });
        }

        void custo;
      });

      // Empresas grandes também podem ter conselho
      CGL.Company.listPlayerCompanies(state).forEach((e) => {
        this.ensureCompanyHolding(e, state);
        this._maybeInitBoard(e, state);
      });

      this._updateRanking(state);
      this._rollEmpireEvents(state);

      // Buffs expiram
      state.holding.buffsAtivos = (state.holding.buffsAtivos || [])
        .map((b) => ({ ...b, semanasRestantes: (b.semanasRestantes || 1) - 1 }))
        .filter((b) => b.semanasRestantes > 0);
    },

    /* ========== Utils ========== */

    _pushHist(empresa, state, entry) {
      this.ensureCompanyHolding(empresa, state);
      empresa.holding.historico.unshift({
        id: CGL.Utils.uuid(),
        semana: state.world?.semanaAtual || 0,
        ...entry
      });
      if (empresa.holding.historico.length > HISTORY_CAP) {
        empresa.holding.historico = empresa.holding.historico.slice(0, HISTORY_CAP);
      }
      if (CGL.Company?.addHistory) {
        CGL.Company.addHistory(empresa, state, entry);
      }
    }
  };

  global.CGL = global.CGL || {};
  global.CGL.Holding = Holding;
  global.CGL.Conglomerado = Holding; // alias
})(typeof window !== 'undefined' ? window : globalThis);
