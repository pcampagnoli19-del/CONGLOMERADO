/**
 * CONGLOMERADO — Marketing, vendas, marca e CRM (Fase 8)
 * Demanda depende de marca, preço, qualidade, distribuição, ads e concorrência.
 */
(function (global) {
  'use strict';

  const EVENT_CAP = 50;
  const HISTORY_CAP = 60;
  const CAMPAIGN_CAP = 40;
  const CRISIS_CAP = 20;

  const Marketing = {
    /* ========== Bootstrap ========== */

    createEmptyMarketingState() {
      return {
        version: 8,
        semanaUltimoTick: 0,
        eventos: [],
        acoesConcorrentes: []
      };
    },

    defaultBrand(empresa) {
      const porte = empresa?.porte || 'micro';
      const baseAware = { micro: 8, pequena: 15, media: 28, grande: 45, corporacao: 60, conglomerado: 70 }[porte] || 12;
      return {
        awareness: baseAware,
        reputacao: 50,
        confianca: 48,
        valorPercebido: 50,
        fidelidade: 25,
        posicionamento: 'popular',
        valorMarca: 0
      };
    },

    defaultPricing() {
      return {
        estrategia: 'competitivo',
        indicePreco: 1.0,
        descontoAtivo: 0,
        promocaoSemanas: 0
      };
    },

    defaultDistribution(empresa) {
      const porte = empresa?.porte || 'micro';
      const base = { micro: 0.15, pequena: 0.25, media: 0.4, grande: 0.55, corporacao: 0.7, conglomerado: 0.8 }[porte] || 0.2;
      return {
        lojas: base * 0.6,
        ecommerce: base * 0.5,
        apps: base * 0.2,
        franquias: 0,
        corporativo: base * 0.3,
        governo: 0,
        grandes_clientes: base * 0.15,
        distribuidores: base * 0.35,
        score: Math.round(base * 55)
      };
    },

    defaultCrm() {
      return {
        nivel: 0,
        investimentoSemanal: 0,
        satisfacao: 50,
        retencao: 35,
        cac: 0,
        nps: 0
      };
    },

    ensureMarketing(state) {
      if (!state.marketing || typeof state.marketing !== 'object') {
        state.marketing = this.createEmptyMarketingState();
      } else {
        const base = this.createEmptyMarketingState();
        state.marketing = {
          ...base,
          ...state.marketing,
          eventos: Array.isArray(state.marketing.eventos) ? state.marketing.eventos : [],
          acoesConcorrentes: Array.isArray(state.marketing.acoesConcorrentes)
            ? state.marketing.acoesConcorrentes : [],
          version: 8
        };
      }
      return state.marketing;
    },

    ensureCompanyMarketing(empresa, state) {
      if (!empresa) return null;
      if (!empresa.marketing || typeof empresa.marketing !== 'object') empresa.marketing = {};
      const m = empresa.marketing;
      if (!m.marca) m.marca = this.defaultBrand(empresa);
      else {
        const def = this.defaultBrand(empresa);
        m.marca = { ...def, ...m.marca };
      }
      if (!m.precificacao) m.precificacao = this.defaultPricing();
      if (!m.distribuicao) m.distribuicao = this.defaultDistribution(empresa);
      if (m.qualidade == null) m.qualidade = empresa.reputacao?.qualidade ?? 55;
      if (!m.crm) m.crm = this.defaultCrm();
      if (!Array.isArray(m.campanhas)) m.campanhas = [];
      if (!Array.isArray(m.pesquisas)) m.pesquisas = [];
      if (!Array.isArray(m.influenciadores)) m.influenciadores = [];
      if (!Array.isArray(m.patrocinios)) m.patrocinios = [];
      if (!Array.isArray(m.crises)) m.crises = [];
      if (!Array.isArray(m.lancamentos)) m.lancamentos = [];
      if (!m.kpis) m.kpis = {};
      if (!m.demandaUltima) m.demandaUltima = { fator: 1, fatores: {} };
      if (m.custoSemanal == null) m.custoSemanal = 0;
      if (!Array.isArray(m.historico)) m.historico = [];
      if (!m.insights) m.insights = {};
      if (m.pressaoConcorrencia == null) m.pressaoConcorrencia = 0;
      if (m.seeded == null) m.seeded = false;
      this._recalcDistributionScore(m);
      this._recalcBrandValue(empresa);
      return m;
    },

    migrateAll(state) {
      this.ensureMarketing(state);
      (state.companies?.empresas || []).forEach((e) => {
        this.ensureCompanyMarketing(e, state);
        e.marketing.seeded = true;
      });
      return state.marketing;
    },

    onCompanyCreated(empresa, state) {
      this.ensureCompanyMarketing(empresa, state);
      empresa.marketing.seeded = true;
      this.addHistory(empresa, state, {
        tipo: 'marca',
        titulo: 'Marca constituída',
        descricao: `Posicionamento inicial: ${CGL.Data.getBrandPositionById(empresa.marketing.marca.posicionamento).nome}.`
      });
      return empresa.marketing;
    },

    /* ========== Histórico / eventos ========== */

    addHistory(empresa, state, entry) {
      const m = this.ensureCompanyMarketing(empresa, state);
      m.historico.unshift({
        id: CGL.Utils.uuid(),
        semana: state.world?.semanaAtual || 0,
        ...entry
      });
      if (m.historico.length > HISTORY_CAP) m.historico.length = HISTORY_CAP;
    },

    pushEvent(state, ev) {
      const mk = this.ensureMarketing(state);
      mk.eventos.unshift({
        id: CGL.Utils.uuid(),
        semana: state.world?.semanaAtual || 0,
        ...ev
      });
      if (mk.eventos.length > EVENT_CAP) mk.eventos.length = EVENT_CAP;
    },

    /* ========== Cálculos de marca / demanda ========== */

    _recalcDistributionScore(m) {
      const d = m.distribuicao;
      const keys = ['lojas', 'ecommerce', 'apps', 'franquias', 'corporativo', 'governo', 'grandes_clientes', 'distribuidores'];
      const avg = keys.reduce((s, k) => s + (Number(d[k]) || 0), 0) / keys.length;
      d.score = CGL.Utils.clamp(Math.round(avg * 100), 0, 100);
      return d.score;
    },

    _recalcBrandValue(empresa) {
      const m = empresa.marketing;
      if (!m?.marca) return 0;
      const b = m.marca;
      const receita = empresa.receita || empresa.capitalSocial * 0.01 || 1000;
      const score = (
        b.awareness * 0.25 +
        b.reputacao * 0.2 +
        b.confianca * 0.2 +
        b.valorPercebido * 0.2 +
        b.fidelidade * 0.15
      ) / 100;
      b.valorMarca = Math.round(receita * 12 * score * (1 + (empresa.participacaoMercado || 0) / 100));
      return b.valorMarca;
    },

    /**
     * Fator de demanda composto — NÃO vende só por existir.
     * Retorna { fator, fatores } usado por Company._weeklyOperate.
     */
    calcDemandFactors(empresa, state) {
      this.ensureCompanyMarketing(empresa, state);
      const m = empresa.marketing;
      const b = m.marca;
      const pos = CGL.Data.getBrandPositionById(b.posicionamento);
      const price = CGL.Data.getPricingStrategyById(m.precificacao.estrategia);
      const indice = (m.precificacao.indicePreco || price.indice) * (1 - (m.precificacao.descontoAtivo || 0));

      // Marca
      const brandScore = (
        b.awareness * 0.3 +
        b.reputacao * 0.2 +
        b.confianca * 0.2 +
        b.valorPercebido * 0.15 +
        b.fidelidade * 0.15
      ) / 100;
      const brandFactor = 0.35 + brandScore * 1.1 * (pos.awarenessBoost || 1);

      // Preço vs posicionamento ideal
      const ideal = pos.precoIdeal || 1;
      const priceGap = Math.abs(indice - ideal);
      const priceFit = CGL.Utils.clamp(1.15 - priceGap * 0.55, 0.45, 1.25);
      const priceFactor = priceFit * (price.volume || 1);

      // Qualidade
      const qual = ((m.qualidade || 50) + (empresa.reputacao?.qualidade || 50)) / 2;
      const qualityFactor = 0.5 + (qual / 100) * 0.9;

      // Distribuição
      const dist = m.distribuicao.score || 30;
      const distributionFactor = 0.4 + (dist / 100) * 0.9;

      // Publicidade ativa
      const adsBoost = this._activeAdsBoost(empresa);
      const adsFactor = 0.75 + adsBoost;

      // Concorrência comercial
      const rivals = (CGL.Company.listAll(state) || []).filter(
        (e) => e.ativa && e.segmentoId === empresa.segmentoId && e.id !== empresa.id
      );
      const rivalPressure = Math.min(0.4, rivals.length * 0.012);
      const commercialPressure = Math.min(0.35, m.pressaoConcorrencia || 0);
      const competitionFactor = CGL.Utils.clamp(1 - rivalPressure - commercialPressure, 0.4, 1.05);

      // Economia / CRM
      const eco = state.economy || {};
      const conf = eco.indiceConfianca != null ? eco.indiceConfianca : 50;
      const ecoFactor = 0.9 + (conf / 100) * 0.25;
      const crmFactor = 1 + ((m.crm.retencao || 0) / 100) * 0.15;

      // Crise ativa
      const activeCrisis = (m.crises || []).filter((c) => c.status === 'ativa' && !c.positivo);
      const crisisPenalty = activeCrisis.reduce((s, c) => s + (c.severidadeRestante || 0) / 400, 0);
      const crisisFactor = CGL.Utils.clamp(1 - crisisPenalty, 0.35, 1);

      // Lançamentos em fase de lançamento
      const launchBoost = (m.lancamentos || []).some((l) => l.estagio === 'lancamento' && l.status === 'ativo')
        ? 1.12 : 1;

      // Fase 9: inovação / produtos / obsolescência
      let rdFactor = 1;
      if (CGL.Rd?.productDemandBoost) {
        try {
          CGL.Rd.ensureCompanyRd(empresa, state);
          rdFactor = CGL.Rd.productDemandBoost(empresa) || 1;
          // Posicionamento inovadora ganha com índice alto
          if (b.posicionamento === 'inovadora' && (empresa.rd?.indiceInovacao || 0) > 50) {
            rdFactor *= 1.06;
          }
        } catch (e) { /* ok */ }
      }

      // Fase 10: alcance logístico reforça distribuição efetiva
      let logFactor = 1;
      if (CGL.Logistics?.distributionBoost) {
        try {
          CGL.Logistics.ensureCompanyLogistics(empresa, state);
          logFactor = CGL.Logistics.distributionBoost(empresa) || 1;
        } catch (e) { /* ok */ }
      }

      let fator = brandFactor * priceFactor * qualityFactor * distributionFactor
        * adsFactor * competitionFactor * ecoFactor * crmFactor * crisisFactor
        * launchBoost * rdFactor * logFactor;

      // Holdings patrimoniais: demanda operacional baixa
      if (empresa.isHolding) fator *= 0.4;

      fator = CGL.Utils.clamp(fator, 0.15, 2.8);

      const fatores = {
        marca: Math.round(brandFactor * 100) / 100,
        preco: Math.round(priceFactor * 100) / 100,
        qualidade: Math.round(qualityFactor * 100) / 100,
        distribuicao: Math.round(distributionFactor * 100) / 100,
        ads: Math.round(adsFactor * 100) / 100,
        concorrencia: Math.round(competitionFactor * 100) / 100,
        economia: Math.round(ecoFactor * 100) / 100,
        crm: Math.round(crmFactor * 100) / 100,
        crise: Math.round(crisisFactor * 100) / 100,
        inovacao: Math.round(rdFactor * 100) / 100,
        logistica: Math.round(logFactor * 100) / 100
      };

      m.demandaUltima = { fator: Math.round(fator * 1000) / 1000, fatores };
      return m.demandaUltima;
    },

    _activeAdsBoost(empresa) {
      // Presença orgânica mínima; campanhas/influenciadores/patrocínios somam acima
      let boost = 0.05;
      const ativos = (empresa.marketing.campanhas || []).filter((c) => c.status === 'ativa');
      ativos.forEach((c) => {
        const ch = CGL.Data.getAdChannelById(c.canalId);
        const goal = CGL.Data.getCampaignGoalById(c.objetivoId);
        const budgetNorm = Math.min(1.8, (c.orcamentoSemanal || 0) / 25000);
        const peso = Math.max(goal?.pesoVendas || 1, goal?.pesoMarca || 1);
        boost += (ch?.alcance || 0.4) * 0.35 * budgetNorm * peso;
      });
      (empresa.marketing.influenciadores || []).filter((i) => i.status === 'ativo').forEach((inf) => {
        boost += (inf.publico || 0.3) * 0.12;
      });
      (empresa.marketing.patrocinios || []).filter((p) => p.status === 'ativo').forEach((p) => {
        const t = CGL.Data.getSponsorshipTypeById(p.tipoId);
        boost += ((t?.awareness || 1) / 20);
      });
      return Math.min(0.9, boost);
    },

    /** Margem ajustada pela estratégia de preço */
    calcMarginMult(empresa) {
      this.ensureCompanyMarketing(empresa);
      const price = CGL.Data.getPricingStrategyById(empresa.marketing.precificacao.estrategia);
      const desc = empresa.marketing.precificacao.descontoAtivo || 0;
      return (price.margem || 1) * (1 - desc * 0.5);
    },

    /* ========== Campanhas ========== */

    createCampaign(empresa, state, opts = {}) {
      this.ensureCompanyMarketing(empresa, state);
      if (empresa.concorrente) throw new Error('Concorrentes não usam esta API.');
      const canal = CGL.Data.getAdChannelById(opts.canalId || 'social');
      if (!canal) throw new Error('Canal inválido.');
      const goal = CGL.Data.getCampaignGoalById(opts.objetivoId || 'vendas');
      const duracao = CGL.Utils.clamp(Number(opts.duracao) || 4, 1, 26);
      const orcamento = Math.max(500, Number(opts.orcamento) || canal.custoBase);
      const orcamentoSemanal = Math.round(orcamento / duracao);
      const publico = opts.publicoId || (canal.publico && canal.publico[0]) || 'classe_media';
      const mensagem = (opts.mensagem || 'Conheça nossa marca').slice(0, 120);

      // Custo semanal entra no tick operacional (Company) + DRE — evita double-debit
      if ((empresa.caixa || 0) < orcamentoSemanal * 0.5) {
        throw new Error('Caixa insuficiente para iniciar a campanha.');
      }

      const camp = {
        id: CGL.Utils.uuid(),
        canalId: canal.id,
        objetivoId: goal.id,
        publicoId: publico,
        mensagem,
        orcamento,
        orcamentoSemanal,
        duracao,
        semanasRestantes: duracao,
        status: 'ativa',
        semanaInicio: state.world?.semanaAtual || 0,
        resultado: null,
        awarenessGain: 0,
        vendasGain: 0
      };
      empresa.marketing.campanhas.unshift(camp);
      if (empresa.marketing.campanhas.length > CAMPAIGN_CAP) {
        empresa.marketing.campanhas.length = CAMPAIGN_CAP;
      }
      this.addHistory(empresa, state, {
        tipo: 'campanha',
        titulo: 'Campanha lançada',
        descricao: `${canal.nome} · ${goal.nome} · ${CGL.Utils.formatBRL(orcamento)} / ${duracao} sem.`
      });
      this.pushEvent(state, {
        tipo: 'campanha',
        empresaId: empresa.id,
        empresaNome: empresa.nomeFantasia,
        mensagem: `Campanha em ${canal.nome}: "${mensagem}"`
      });
      CGL.Events?.notify?.('success', 'Campanha', `${empresa.nomeFantasia}: campanha em ${canal.nome} ativa.`);
      return camp;
    },

    _tickCampaigns(empresa, state) {
      const m = empresa.marketing;
      let custo = 0;
      m.campanhas.forEach((c) => {
        if (c.status !== 'ativa') return;
        custo += c.orcamentoSemanal || 0;
        // Sem caixa para manter → pausa (custo já no operacional da Company)
        if ((empresa.caixa || 0) < (c.orcamentoSemanal || 0) * 0.15) {
          c.status = 'pausada';
          c.resultado = 'sem_caixa';
          return;
        }

        const ch = CGL.Data.getAdChannelById(c.canalId);
        const goal = CGL.Data.getCampaignGoalById(c.objetivoId);
        const budgetNorm = Math.min(1.8, (c.orcamentoSemanal || 0) / 40000);
        const reach = (ch?.alcance || 0.4) * budgetNorm;

        // Efeitos de marca
        const aw = reach * 3 * (goal.pesoMarca || 1) * (0.7 + Math.random() * 0.6);
        const rep = reach * 1.2 * (goal.pesoMarca || 1) * (Math.random() - 0.35);
        m.marca.awareness = CGL.Utils.clamp(m.marca.awareness + aw, 0, 100);
        m.marca.reputacao = CGL.Utils.clamp(m.marca.reputacao + rep, 0, 100);
        m.marca.valorPercebido = CGL.Utils.clamp(
          m.marca.valorPercebido + reach * 1.5 * (goal.pesoMarca || 1) * 0.5,
          0, 100
        );
        c.awarenessGain = (c.awarenessGain || 0) + aw;
        c.vendasGain = (c.vendasGain || 0) + reach * (goal.pesoVendas || 1);

        // Outcomes especiais
        const roll = Math.random();
        if (roll < (ch?.viral || 0.1) * 0.08) {
          m.marca.awareness = CGL.Utils.clamp(m.marca.awareness + 8, 0, 100);
          c.resultado = c.resultado || 'viral';
          this.pushEvent(state, {
            tipo: 'viral',
            empresaId: empresa.id,
            empresaNome: empresa.nomeFantasia,
            mensagem: `Campanha viralizou: "${c.mensagem}"`
          });
          if (!empresa.concorrente) {
            CGL.Events?.notify?.('success', 'Viral!', `${empresa.nomeFantasia}: campanha explodiu nas redes.`);
          }
        } else if (roll < (ch?.backlash || 0.1) * 0.06 + 0.01) {
          this._spawnCrisis(empresa, state, 'propaganda_critica', {
            origem: 'campanha',
            campanhaId: c.id
          });
          c.resultado = 'backlash';
        }

        c.semanasRestantes = Math.max(0, (c.semanasRestantes || 1) - 1);
        if (c.semanasRestantes <= 0) {
          c.status = 'encerrada';
          if (!c.resultado) c.resultado = c.awarenessGain > 5 ? 'sucesso' : 'modesto';
          this.addHistory(empresa, state, {
            tipo: 'campanha',
            titulo: 'Campanha encerrada',
            descricao: `"${c.mensagem}" — ${c.resultado} (awareness +${Math.round(c.awarenessGain || 0)}).`
          });
        }
      });
      return custo;
    },

    /* ========== Pesquisas ========== */

    startResearch(empresa, state, tipoId) {
      this.ensureCompanyMarketing(empresa, state);
      const tipo = CGL.Data.getResearchTypeById(tipoId);
      if (!tipo) throw new Error('Tipo de pesquisa inválido.');
      if (CGL.Finance?.debitEmpresa) {
        CGL.Finance.debitEmpresa(state, empresa.id, tipo.custo, {
          categoria: 'marketing',
          descricao: `Pesquisa: ${tipo.nome}`
        });
      }
      const r = {
        id: CGL.Utils.uuid(),
        tipoId: tipo.id,
        semanasRestantes: tipo.semanas,
        status: 'ativa',
        unlock: tipo.unlock
      };
      empresa.marketing.pesquisas.unshift(r);
      this.addHistory(empresa, state, {
        tipo: 'pesquisa',
        titulo: 'Pesquisa iniciada',
        descricao: `${tipo.nome} (${CGL.Utils.formatBRL(tipo.custo)}).`
      });
      return r;
    },

    _tickResearch(empresa, state) {
      empresa.marketing.pesquisas.forEach((r) => {
        if (r.status !== 'ativa') return;
        r.semanasRestantes = Math.max(0, (r.semanasRestantes || 1) - 1);
        if (r.semanasRestantes <= 0) {
          r.status = 'concluida';
          (r.unlock || []).forEach((k) => {
            empresa.marketing.insights[k] = true;
          });
          // Insights melhoram decisões: pequeno boost em valor percebido / confiança
          empresa.marketing.marca.confianca = CGL.Utils.clamp(
            empresa.marketing.marca.confianca + 2, 0, 100
          );
          this.addHistory(empresa, state, {
            tipo: 'pesquisa',
            titulo: 'Pesquisa concluída',
            descricao: `Insights desbloqueados: ${(r.unlock || []).join(', ')}.`
          });
          if (!empresa.concorrente) {
            CGL.Events?.notify?.('info', 'Pesquisa', `${empresa.nomeFantasia}: pesquisa de mercado concluída.`);
          }
        }
      });
    },

    /* ========== Influenciadores ========== */

    generateInfluencerPool(n = 6) {
      const names = CGL.Data.names || {};
      const pool = [];
      for (let i = 0; i < n; i++) {
        const arch = CGL.Utils.pick(CGL.Data.influencerArchetypes);
        const first = CGL.Utils.pick(names.FIRST_F || names.FIRST_M || ['Alex']);
        const last = CGL.Utils.pick(names.SURNAMES || ['Costa']);
        const custo = Math.round(8000 * arch.custoMult * CGL.Utils.randomFloat(0.8, 1.3));
        pool.push({
          id: CGL.Utils.uuid(),
          nome: `${first} ${last}`,
          archetypeId: arch.id,
          publico: arch.publico * CGL.Utils.randomFloat(0.85, 1.15),
          reputacao: CGL.Utils.clamp(arch.reputacao + CGL.Utils.randomInt(-10, 10), 20, 95),
          custoSemanal: custo,
          riscoEscandalo: arch.riscoEscandalo,
          status: 'disponivel',
          semanasRestantes: 0
        });
      }
      return pool;
    },

    hireInfluencer(empresa, state, influencerOrOpts, semanas = 8) {
      this.ensureCompanyMarketing(empresa, state);
      let inf;
      if (influencerOrOpts && influencerOrOpts.nome) {
        inf = { ...influencerOrOpts };
      } else {
        const pool = this.generateInfluencerPool(1)[0];
        const archId = influencerOrOpts?.archetypeId || pool.archetypeId;
        const arch = CGL.Data.getInfluencerArchetypeById(archId) || CGL.Data.influencerArchetypes[1];
        inf = { ...pool, archetypeId: arch.id, custoSemanal: Math.round(8000 * arch.custoMult) };
      }
      inf.status = 'ativo';
      inf.semanasRestantes = CGL.Utils.clamp(Number(semanas) || 8, 2, 52);
      inf.empresaId = empresa.id;
      if ((empresa.caixa || 0) < (inf.custoSemanal || 0) * 0.5) {
        throw new Error('Caixa insuficiente para contratar o influenciador.');
      }
      empresa.marketing.influenciadores.unshift(inf);
      this.addHistory(empresa, state, {
        tipo: 'influencer',
        titulo: 'Influenciador contratado',
        descricao: `${inf.nome} por ${inf.semanasRestantes} semanas.`
      });
      return inf;
    },

    _tickInfluencers(empresa, state) {
      let custo = 0;
      empresa.marketing.influenciadores.forEach((inf) => {
        if (inf.status !== 'ativo') return;
        custo += inf.custoSemanal || 0;
        if ((empresa.caixa || 0) < (inf.custoSemanal || 0) * 0.15) {
          inf.status = 'encerrado';
          return;
        }

        empresa.marketing.marca.awareness = CGL.Utils.clamp(
          empresa.marketing.marca.awareness + (inf.publico || 0.3) * 2.5, 0, 100
        );
        empresa.marketing.marca.valorPercebido = CGL.Utils.clamp(
          empresa.marketing.marca.valorPercebido + (inf.reputacao || 50) / 80, 0, 100
        );

        if (Math.random() < (inf.riscoEscandalo || 0.1) * 0.04) {
          inf.status = 'escandalo';
          this._spawnCrisis(empresa, state, 'influencer_escandalo', {
            origem: 'influencer',
            influencerId: inf.id,
            nome: inf.nome
          });
        }

        inf.semanasRestantes = Math.max(0, (inf.semanasRestantes || 1) - 1);
        if (inf.semanasRestantes <= 0 && inf.status === 'ativo') {
          inf.status = 'encerrado';
        }
      });
      return custo;
    },

    /* ========== Patrocínios ========== */

    startSponsorship(empresa, state, tipoId, semanas) {
      this.ensureCompanyMarketing(empresa, state);
      const tipo = CGL.Data.getSponsorshipTypeById(tipoId);
      if (!tipo) throw new Error('Tipo de patrocínio inválido.');
      const dur = Math.max(tipo.duracaoMin || 4, Number(semanas) || tipo.duracaoMin || 8);
      if ((empresa.caixa || 0) < tipo.custoSemanal * 0.5) {
        throw new Error('Caixa insuficiente para o patrocínio.');
      }
      const p = {
        id: CGL.Utils.uuid(),
        tipoId: tipo.id,
        custoSemanal: tipo.custoSemanal,
        semanasRestantes: dur,
        status: 'ativo'
      };
      empresa.marketing.patrocinios.unshift(p);
      this.addHistory(empresa, state, {
        tipo: 'patrocinio',
        titulo: 'Patrocínio firmado',
        descricao: `${tipo.nome} por ${dur} semanas.`
      });
      return p;
    },

    _tickSponsorships(empresa, state) {
      let custo = 0;
      empresa.marketing.patrocinios.forEach((p) => {
        if (p.status !== 'ativo') return;
        const tipo = CGL.Data.getSponsorshipTypeById(p.tipoId);
        custo += p.custoSemanal || 0;
        if ((empresa.caixa || 0) < (p.custoSemanal || 0) * 0.15) {
          p.status = 'encerrado';
          return;
        }

        empresa.marketing.marca.awareness = CGL.Utils.clamp(
          empresa.marketing.marca.awareness + (tipo?.awareness || 1) * 0.6, 0, 100
        );
        if (tipo?.confianca) {
          empresa.marketing.marca.confianca = CGL.Utils.clamp(
            empresa.marketing.marca.confianca + tipo.confianca * 0.15, 0, 100
          );
        }
        if (tipo?.reputacao) {
          empresa.marketing.marca.reputacao = CGL.Utils.clamp(
            empresa.marketing.marca.reputacao + tipo.reputacao * 0.15, 0, 100
          );
        }

        p.semanasRestantes = Math.max(0, (p.semanasRestantes || 1) - 1);
        if (p.semanasRestantes <= 0) p.status = 'encerrado';
      });
      return custo;
    },

    /* ========== Preço / posicionamento / distribuição / CRM ========== */

    setPricing(empresa, state, estrategiaId, opts = {}) {
      this.ensureCompanyMarketing(empresa, state);
      const strat = CGL.Data.getPricingStrategyById(estrategiaId);
      if (!strat) throw new Error('Estratégia inválida.');
      empresa.marketing.precificacao.estrategia = strat.id;
      empresa.marketing.precificacao.indicePreco = opts.indice != null ? Number(opts.indice) : strat.indice;
      empresa.marketing.precificacao.descontoAtivo = CGL.Utils.clamp(Number(opts.desconto) || 0, 0, 0.5);
      if (strat.id === 'promocao' && opts.semanas) {
        empresa.marketing.precificacao.promocaoSemanas = Number(opts.semanas) || 4;
      }
      // Percepção de marca
      const delta = (strat.percepcao - 1) * 3;
      empresa.marketing.marca.valorPercebido = CGL.Utils.clamp(
        empresa.marketing.marca.valorPercebido + delta, 0, 100
      );
      this.addHistory(empresa, state, {
        tipo: 'preco',
        titulo: 'Estratégia de preço',
        descricao: `${strat.nome} (índice ${empresa.marketing.precificacao.indicePreco}).`
      });
      return empresa.marketing.precificacao;
    },

    setPositioning(empresa, state, posId) {
      this.ensureCompanyMarketing(empresa, state);
      const pos = CGL.Data.getBrandPositionById(posId);
      if (!pos) throw new Error('Posicionamento inválido.');
      empresa.marketing.marca.posicionamento = pos.id;
      this.addHistory(empresa, state, {
        tipo: 'marca',
        titulo: 'Reposicionamento',
        descricao: `Marca agora posicionada como ${pos.nome}.`
      });
      return empresa.marketing.marca;
    },

    setDistribution(empresa, state, channelId, nivel) {
      this.ensureCompanyMarketing(empresa, state);
      const ch = CGL.Data.getSalesChannelById(channelId);
      if (!ch) throw new Error('Canal inválido.');
      const n = CGL.Utils.clamp(Number(nivel), 0, 1);
      empresa.marketing.distribuicao[channelId] = n;
      this._recalcDistributionScore(empresa.marketing);
      // Custo de expansão
      const custo = Math.round(ch.custoFixo * n * 4);
      if (custo > 0 && CGL.Finance?.debitEmpresa) {
        CGL.Finance.debitEmpresa(state, empresa.id, custo, {
          categoria: 'marketing',
          descricao: `Expansão canal ${ch.nome}`
        });
      }
      return empresa.marketing.distribuicao;
    },

    setCrmLevel(empresa, state, nivel) {
      this.ensureCompanyMarketing(empresa, state);
      const lv = CGL.Data.getCrmLevel(nivel);
      empresa.marketing.crm.nivel = lv.id;
      empresa.marketing.crm.investimentoSemanal = lv.custoSem;
      empresa.marketing.crm.retencao = CGL.Utils.clamp(
        35 + lv.retencao, 0, 95
      );
      empresa.marketing.crm.satisfacao = CGL.Utils.clamp(
        50 + lv.satisfacao, 0, 95
      );
      this.addHistory(empresa, state, {
        tipo: 'crm',
        titulo: 'CRM atualizado',
        descricao: `Nível ${lv.nome}.`
      });
      return empresa.marketing.crm;
    },

    _tickCrm(empresa, state) {
      const crm = empresa.marketing.crm;
      const lv = CGL.Data.getCrmLevel(crm.nivel);
      const custo = lv.custoSem || 0;
      // Custo CRM no operacional da Company via weeklyMarketingCostEstimate
      empresa.marketing.marca.fidelidade = CGL.Utils.clamp(
        empresa.marketing.marca.fidelidade + (lv.retencao || 0) * 0.08, 0, 100
      );
      crm.satisfacao = CGL.Utils.clamp(
        crm.satisfacao + (lv.satisfacao || 0) * 0.05 + CGL.Utils.randomFloat(-1, 1),
        0, 100
      );
      crm.nps = Math.round((crm.satisfacao - 50) * 1.2);
      crm.retencao = CGL.Utils.clamp(35 + (lv.retencao || 0) + empresa.marketing.marca.fidelidade * 0.2, 0, 98);
      // CAC estimado
      const ads = empresa.marketing.custoSemanal || 1;
      const vendas = Math.max(1, empresa.receita || 1);
      crm.cac = Math.round((ads / Math.max(1, vendas / 500)) * 10) / 10;
      return custo;
    },

    /* ========== Crises ========== */

    _spawnCrisis(empresa, state, defId, meta = {}) {
      const def = CGL.Data.getCrisisDefById(defId) || CGL.Data.crisisDefs[0];
      const crisis = {
        id: CGL.Utils.uuid(),
        defId: def.id,
        nome: def.nome,
        severidade: def.severidade,
        severidadeRestante: Math.abs(def.severidade),
        positivo: !!def.positivo,
        alvos: def.alvo || [],
        status: def.positivo ? 'resolvida' : 'ativa',
        respostaId: null,
        ...meta
      };

      if (def.positivo) {
        // Boost imediato
        (def.alvo || []).forEach((k) => {
          if (empresa.marketing.marca[k] != null) {
            empresa.marketing.marca[k] = CGL.Utils.clamp(
              empresa.marketing.marca[k] + Math.abs(def.severidade) * 0.25, 0, 100
            );
          }
        });
        CGL.Events?.notify?.('success', 'Sucesso viral', `${empresa.nomeFantasia}: ${def.nome}`);
      } else {
        (def.alvo || []).forEach((k) => {
          if (k === 'qualidade') {
            empresa.marketing.qualidade = CGL.Utils.clamp(
              (empresa.marketing.qualidade || 50) - def.severidade * 0.15, 0, 100
            );
            if (empresa.reputacao) {
              empresa.reputacao.qualidade = CGL.Utils.clamp(
                empresa.reputacao.qualidade - def.severidade * 0.1, 0, 100
              );
            }
          } else if (empresa.marketing.marca[k] != null) {
            empresa.marketing.marca[k] = CGL.Utils.clamp(
              empresa.marketing.marca[k] - def.severidade * 0.2, 0, 100
            );
          }
        });
        if (empresa.reputacao) {
          empresa.reputacao.social = CGL.Utils.clamp(
            (empresa.reputacao.social || 50) - def.severidade * 0.15, 0, 100
          );
          empresa.reputacao.escandalos = (empresa.reputacao.escandalos || 0) + 1;
        }
        if (!empresa.concorrente) {
          CGL.Events?.notify?.('error', 'Crise de imagem', `${empresa.nomeFantasia}: ${def.nome}`);
        }
      }

      empresa.marketing.crises.unshift(crisis);
      if (empresa.marketing.crises.length > CRISIS_CAP) empresa.marketing.crises.length = CRISIS_CAP;
      this.pushEvent(state, {
        tipo: def.positivo ? 'viral' : 'crise',
        empresaId: empresa.id,
        empresaNome: empresa.nomeFantasia,
        mensagem: def.nome,
        crisisId: crisis.id
      });
      this.addHistory(empresa, state, {
        tipo: 'crise',
        titulo: def.positivo ? 'Boom de imagem' : 'Crise de imagem',
        descricao: def.nome
      });
      return crisis;
    },

    /** Expõe spawn para smoke / eventos externos */
    triggerCrisis(empresa, state, defId) {
      this.ensureCompanyMarketing(empresa, state);
      return this._spawnCrisis(empresa, state, defId || 'produto_defeito');
    },

    respondCrisis(empresa, state, crisisId, responseId) {
      this.ensureCompanyMarketing(empresa, state);
      const crisis = (empresa.marketing.crises || []).find((c) => c.id === crisisId);
      if (!crisis || crisis.status !== 'ativa') throw new Error('Crise não encontrada ou já resolvida.');
      const resp = CGL.Data.getCrisisResponseById(responseId);
      if (!resp) throw new Error('Resposta inválida.');

      if (resp.custo > 0 && CGL.Finance?.debitEmpresa) {
        CGL.Finance.debitEmpresa(state, empresa.id, resp.custo, {
          categoria: 'marketing',
          descricao: `Crise: ${resp.nome}`
        });
      }

      crisis.respostaId = resp.id;
      const roll = Math.random();
      if (roll < resp.riscoPiora) {
        crisis.severidadeRestante = Math.round(crisis.severidadeRestante * 1.25);
        crisis.status = 'ativa';
        empresa.marketing.marca.reputacao = CGL.Utils.clamp(
          empresa.marketing.marca.reputacao - 5, 0, 100
        );
        CGL.Events?.notify?.('warning', 'Crise', 'A resposta piorou a percepção pública.');
      } else {
        const heal = crisis.severidadeRestante * resp.eficacia;
        crisis.severidadeRestante = Math.max(0, Math.round(crisis.severidadeRestante - heal));
        empresa.marketing.marca.confianca = CGL.Utils.clamp(
          empresa.marketing.marca.confianca + resp.eficacia * 8, 0, 100
        );
        empresa.marketing.marca.reputacao = CGL.Utils.clamp(
          empresa.marketing.marca.reputacao + resp.eficacia * 5, 0, 100
        );
        if (crisis.severidadeRestante <= 15 || resp.eficacia >= 0.8) {
          crisis.status = 'resolvida';
          CGL.Events?.notify?.('success', 'Crise contida', `${empresa.nomeFantasia}: ${resp.nome}.`);
        } else {
          CGL.Events?.notify?.('info', 'Crise', 'Situação melhorou, mas ainda exige atenção.');
        }
      }
      this.addHistory(empresa, state, {
        tipo: 'crise',
        titulo: `Resposta: ${resp.nome}`,
        descricao: `${crisis.nome} — status ${crisis.status}.`
      });
      return crisis;
    },

    _tickCrises(empresa, state) {
      empresa.marketing.crises.forEach((c) => {
        if (c.status !== 'ativa') return;
        // Decai lento se ignorada; pressiona marca
        c.severidadeRestante = Math.max(0, c.severidadeRestante - 2);
        empresa.marketing.marca.confianca = CGL.Utils.clamp(
          empresa.marketing.marca.confianca - 0.8, 0, 100
        );
        if (c.severidadeRestante <= 0) {
          c.status = 'resolvida';
        }
        // Chance de escalar se sem resposta
        if (!c.respostaId && Math.random() < 0.08) {
          c.severidadeRestante = Math.min(100, c.severidadeRestante + 8);
        }
      });
    },

    /* ========== Lançamentos ========== */

    startLaunch(empresa, state, nome) {
      this.ensureCompanyMarketing(empresa, state);
      const stage = CGL.Data.launchStages[0];
      if (CGL.Finance?.debitEmpresa) {
        CGL.Finance.debitEmpresa(state, empresa.id, stage.custo, {
          categoria: 'marketing',
          descricao: `Lançamento: pesquisa — ${nome || 'Novo produto'}`
        });
      }
      const launch = {
        id: CGL.Utils.uuid(),
        nome: (nome || 'Novo produto').slice(0, 60),
        estagio: stage.id,
        semanasNoEstagio: 0,
        status: 'ativo',
        score: 50,
        resultado: null
      };
      empresa.marketing.lancamentos.unshift(launch);
      this.addHistory(empresa, state, {
        tipo: 'lancamento',
        titulo: 'Pipeline de lançamento',
        descricao: `${launch.nome} entrou em ${stage.nome}.`
      });
      return launch;
    },

    _tickLaunches(empresa, state) {
      const stages = CGL.Data.launchStages || [];
      empresa.marketing.lancamentos.forEach((l) => {
        if (l.status !== 'ativo') return;
        const stage = CGL.Data.getLaunchStageById(l.estagio);
        if (!stage) { l.status = 'encerrado'; return; }
        l.semanasNoEstagio = (l.semanasNoEstagio || 0) + 1;
        l.score = CGL.Utils.clamp(l.score + CGL.Utils.randomFloat(-3, 5), 10, 98);

        if (l.semanasNoEstagio >= stage.semanas) {
          const idx = stages.findIndex((s) => s.id === l.estagio);
          if (idx < stages.length - 1) {
            const next = stages[idx + 1];
            l.estagio = next.id;
            l.semanasNoEstagio = 0;
            if (CGL.Finance?.debitEmpresa) {
              try {
                CGL.Finance.debitEmpresa(state, empresa.id, next.custo, {
                  categoria: 'marketing',
                  descricao: `Lançamento ${l.nome}: ${next.nome}`
                });
              } catch (e) {
                l.status = 'cancelado';
                l.resultado = 'sem_caixa';
                return;
              }
            }
          } else {
            // Avaliação final
            l.status = 'concluido';
            if (l.score >= 75) {
              l.resultado = 'sucesso_historico';
              empresa.marketing.marca.awareness = CGL.Utils.clamp(empresa.marketing.marca.awareness + 12, 0, 100);
              empresa.marketing.qualidade = CGL.Utils.clamp((empresa.marketing.qualidade || 50) + 8, 0, 100);
              CGL.Events?.notify?.('success', 'Lançamento', `${l.nome}: sucesso histórico!`);
            } else if (l.score >= 50) {
              l.resultado = 'sucesso';
              empresa.marketing.marca.awareness = CGL.Utils.clamp(empresa.marketing.marca.awareness + 5, 0, 100);
            } else if (l.score >= 35) {
              l.resultado = 'morno';
            } else {
              l.resultado = 'fracasso';
              empresa.marketing.marca.reputacao = CGL.Utils.clamp(empresa.marketing.marca.reputacao - 8, 0, 100);
              CGL.Events?.notify?.('warning', 'Lançamento', `${l.nome}: fracasso de mercado.`);
            }
            this.addHistory(empresa, state, {
              tipo: 'lancamento',
              titulo: `Lançamento: ${l.resultado}`,
              descricao: `${l.nome} (score ${Math.round(l.score)}).`
            });
          }
        }
      });
    },

    /* ========== Concorrência comercial ========== */

    _tickCompetitorCommercial(state) {
      const mk = this.ensureMarketing(state);
      const rivals = (state.companies?.empresas || []).filter((e) => e.concorrente && e.ativa);
      rivals.forEach((rival) => {
        this.ensureCompanyMarketing(rival, state);
        if (Math.random() > 0.12) return;
        const action = CGL.Utils.pick(CGL.Data.competitorActions);
        // Aplica em empresas do jogador no mesmo segmento
        const players = CGL.Company.listPlayerCompanies(state).filter(
          (e) => e.ativa && e.segmentoId === rival.segmentoId
        );
        players.forEach((p) => {
          this.ensureCompanyMarketing(p, state);
          const ef = action.efeito || {};
          p.marketing.pressaoConcorrencia = Math.min(
            0.5,
            (p.marketing.pressaoConcorrencia || 0) + (ef.pressaoPreco || 0) + (ef.pressaoAds || 0)
              + (ef.pressaoQualidade || 0) + (ef.pressaoMarca || 0)
          );
          if (ef.shareSteal) {
            p.participacaoMercado = Math.max(0.1, (p.participacaoMercado || 1) - ef.shareSteal * 10);
          }
          if (ef.pressaoRh && CGL.Hr?.listActive) {
            // Poaching simbólico: moral cai
            if (p.hr?.clima) p.hr.clima.moral = CGL.Utils.clamp((p.hr.clima.moral || 50) - 2, 0, 100);
          }
        });
        // Rival melhora um pouco
        if (action.id === 'corte_preco') {
          rival.marketing.precificacao.estrategia = 'penetracao';
          rival.marketing.precificacao.indicePreco = 0.75;
        } else if (action.id === 'campanha_agressiva') {
          rival.marketing.marca.awareness = CGL.Utils.clamp(rival.marketing.marca.awareness + 3, 0, 100);
        }
        mk.acoesConcorrentes.unshift({
          id: CGL.Utils.uuid(),
          semana: state.world?.semanaAtual || 0,
          rivalId: rival.id,
          rivalNome: rival.nomeFantasia,
          actionId: action.id,
          nome: action.nome,
          segmentoId: rival.segmentoId
        });
        if (mk.acoesConcorrentes.length > 30) mk.acoesConcorrentes.length = 30;
        if (players.length && Math.random() < 0.4) {
          CGL.Events?.notify?.('alert', 'Concorrência', `${rival.nomeFantasia}: ${action.nome}.`);
        }
      });
      // Decai pressão
      CGL.Company.listPlayerCompanies(state).forEach((p) => {
        if (p.marketing) {
          p.marketing.pressaoConcorrencia = Math.max(0, (p.marketing.pressaoConcorrencia || 0) * 0.85);
        }
      });
    },

    /* ========== KPIs / custos ========== */

    updateKpis(empresa, state) {
      const m = this.ensureCompanyMarketing(empresa, state);
      const receita = empresa.receita || 0;
      const prev = m.kpis.faturamentoSemanal || receita;
      m.kpis = {
        faturamento: receita,
        faturamentoSemanal: receita,
        crescimentoVendas: prev > 0 ? Math.round(((receita - prev) / prev) * 1000) / 10 : 0,
        participacaoMercado: empresa.participacaoMercado || 0,
        cac: m.crm.cac || 0,
        fidelizacao: Math.round(m.marca.fidelidade),
        satisfacao: Math.round(m.crm.satisfacao),
        valorMarca: m.marca.valorMarca || this._recalcBrandValue(empresa),
        demanda: m.demandaUltima?.fator || 1
      };
      return m.kpis;
    },

    weeklyMarketingCostEstimate(empresa) {
      this.ensureCompanyMarketing(empresa);
      const m = empresa.marketing;
      let c = 0;
      m.campanhas.filter((x) => x.status === 'ativa').forEach((x) => { c += x.orcamentoSemanal || 0; });
      m.influenciadores.filter((x) => x.status === 'ativo').forEach((x) => { c += x.custoSemanal || 0; });
      m.patrocinios.filter((x) => x.status === 'ativo').forEach((x) => { c += x.custoSemanal || 0; });
      c += CGL.Data.getCrmLevel(m.crm.nivel).custoSem || 0;
      return c;
    },

    syncFinanceHook(empresa, state) {
      const custo = empresa.marketing?.custoSemanal || this.weeklyMarketingCostEstimate(empresa);
      if (CGL.Finance?.ensureCompanyFinance) {
        try {
          const fin = CGL.Finance.ensureCompanyFinance(empresa, state);
          fin._mktCustoSemanal = custo;
        } catch (e) { /* ok */ }
      }
      return custo;
    },

    /* ========== Tick semanal ========== */

    weeklyTick(state) {
      this.ensureMarketing(state);
      const mk = state.marketing;
      const semana = state.world?.semanaAtual || 0;
      if (mk.semanaUltimoTick === semana) return mk;
      mk.semanaUltimoTick = semana;

      (state.companies?.empresas || []).forEach((empresa) => {
        if (!empresa.ativa) return;
        this.ensureCompanyMarketing(empresa, state);
        if (empresa.concorrente) {
          // Drift leve de marca IA
          empresa.marketing.marca.awareness = CGL.Utils.clamp(
            empresa.marketing.marca.awareness + CGL.Utils.randomFloat(-0.3, 0.8), 0, 100
          );
          return;
        }

        let custo = 0;
        custo += this._tickCampaigns(empresa, state);
        this._tickResearch(empresa, state);
        custo += this._tickInfluencers(empresa, state);
        custo += this._tickSponsorships(empresa, state);
        custo += this._tickCrm(empresa, state);
        this._tickCrises(empresa, state);
        this._tickLaunches(empresa, state);

        // Promoções expiram
        if (empresa.marketing.precificacao.promocaoSemanas > 0) {
          empresa.marketing.precificacao.promocaoSemanas -= 1;
          if (empresa.marketing.precificacao.promocaoSemanas <= 0) {
            empresa.marketing.precificacao.descontoAtivo = 0;
            if (empresa.marketing.precificacao.estrategia === 'promocao') {
              empresa.marketing.precificacao.estrategia = 'competitivo';
              empresa.marketing.precificacao.indicePreco = 1;
            }
          }
        }

        // Drift natural de marca (sem investimento cai awareness)
        const ads = this._activeAdsBoost(empresa);
        if (ads < 0.15) {
          empresa.marketing.marca.awareness = CGL.Utils.clamp(
            empresa.marketing.marca.awareness - 0.4, 0, 100
          );
        }
        // Sync qualidade com reputação
        if (empresa.reputacao) {
          empresa.reputacao.qualidade = CGL.Utils.clamp(
            empresa.reputacao.qualidade * 0.9 + (empresa.marketing.qualidade || 50) * 0.1,
            0, 100
          );
          // Marca alimenta reputação social/geral leve
          empresa.reputacao.social = CGL.Utils.clamp(
            empresa.reputacao.social * 0.92 + empresa.marketing.marca.reputacao * 0.08,
            0, 100
          );
        }

        empresa.marketing.custoSemanal = Math.round(
          this.weeklyMarketingCostEstimate(empresa)
        );
        this._recalcBrandValue(empresa);
        this.updateKpis(empresa, state);
        this.syncFinanceHook(empresa, state);

        // Chance de crise / viral orgânico
        if (Math.random() < 0.04) {
          const defs = CGL.Data.crisisDefs.filter((d) => !d.positivo);
          this._spawnCrisis(empresa, state, CGL.Utils.pick(defs).id);
        } else if (Math.random() < 0.02 && ads > 0.3) {
          this._spawnCrisis(empresa, state, 'sucesso_viral');
        }
      });

      this._tickCompetitorCommercial(state);
      return mk;
    },

    /* ========== Dashboard ========== */

    dashboardSummary(state) {
      this.ensureMarketing(state);
      const companies = CGL.Company.listPlayerCompanies(state);
      let awareness = 0;
      let valorMarca = 0;
      let campanhas = 0;
      let crises = 0;
      companies.forEach((e) => {
        this.ensureCompanyMarketing(e, state);
        awareness += e.marketing.marca.awareness;
        valorMarca += e.marketing.marca.valorMarca || 0;
        campanhas += e.marketing.campanhas.filter((c) => c.status === 'ativa').length;
        crises += e.marketing.crises.filter((c) => c.status === 'ativa').length;
      });
      const n = Math.max(1, companies.length);
      return {
        empresas: companies.length,
        awarenessMedia: Math.round(awareness / n),
        valorMarca,
        campanhasAtivas: campanhas,
        crisesAtivas: crises,
        eventos: (state.marketing.eventos || []).length
      };
    }
  };

  global.CGL = global.CGL || {};
  global.CGL.Marketing = Marketing;
})(typeof window !== 'undefined' ? window : globalThis);
