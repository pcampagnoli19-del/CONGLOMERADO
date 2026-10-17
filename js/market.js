/**
 * CONGLOMERADO — Mercado de capitais (Fase 5)
 * Estrutura de capital, rating, bancos, investidores, valuation, IPO, bolsa,
 * confiança do mercado, M&A avançado (hooks), reservas de caixa.
 */
(function (global) {
  'use strict';

  const PORTE_RANK = { micro: 0, pequena: 1, media: 2, grande: 3, conglomerado: 4 };
  /** Base de ações no IPO — mantém preços legíveis no jogo simplificado */
  const ACOES_BASE_IPO = 1_000_000;
  const HIST_PRECO_CAP = 104;
  const OFERTA_TTL_SEM = 8;

  const Market = {
    /* ========== Bootstrap ========== */

    createEmptyMarket() {
      return {
        version: 5,
        bolsa: {
          indice: 120000,
          historico: [],
          listadas: []
        },
        investidores: [],
        ofertasPendentes: [],
        carteiraJogador: [],
        confianca: {},
        historicoOps: [],
        ma: {
          ofertasHostis: [],
          dueDiligence: [],
          integracoes: []
        },
        semanaUltimoTick: 0
      };
    },

    ensureMarket(state) {
      if (!state.market || typeof state.market !== 'object' || !state.market.bolsa) {
        state.market = this.createEmptyMarket();
      } else {
        const base = this.createEmptyMarket();
        state.market = {
          ...base,
          ...state.market,
          bolsa: { ...base.bolsa, ...(state.market.bolsa || {}) },
          ma: { ...base.ma, ...(state.market.ma || {}) },
          investidores: Array.isArray(state.market.investidores) ? state.market.investidores : [],
          ofertasPendentes: Array.isArray(state.market.ofertasPendentes)
            ? state.market.ofertasPendentes
            : [],
          carteiraJogador: Array.isArray(state.market.carteiraJogador)
            ? state.market.carteiraJogador
            : [],
          confianca: state.market.confianca || {},
          historicoOps: Array.isArray(state.market.historicoOps) ? state.market.historicoOps : [],
          version: 5
        };
        state.market.bolsa.listadas = Array.isArray(state.market.bolsa.listadas)
          ? state.market.bolsa.listadas
          : [];
        state.market.bolsa.historico = Array.isArray(state.market.bolsa.historico)
          ? state.market.bolsa.historico
          : [];
      }
      if (!state.market.investidores.length) {
        this._seedInvestorsInto(state.market);
      }
      return state.market;
    },

    migrateAll(state) {
      this.ensureMarket(state);
      CGL.Company.listAll(state).forEach((e) => this.ensureCompanyMarket(e, state));
      return state.market;
    },

    /** Popula pool de investidores sem reentrar em ensureMarket */
    _seedInvestorsInto(market) {
      const types = (CGL.Data.investorTypes || []).map((t) => t.id);
      if (!types.length) return;
      for (let i = 0; i < 12; i++) {
        const tid = types[i % types.length];
        market.investidores.push(CGL.Data.createInvestorInstance(tid));
      }
    },

    seedInvestors(state) {
      const m = this.ensureMarket(state);
      if (!m.investidores.length) this._seedInvestorsInto(m);
      return m.investidores;
    },

    ensureCompanyMarket(empresa, state) {
      if (!empresa) return null;
      if (!empresa.ipo || typeof empresa.ipo !== 'object') {
        const nat = CGL.Data.getLegalNatureById?.(empresa.naturezaId);
        empresa.ipo = {
          elegivel: !!nat?.permiteIPO,
          listada: false,
          status: 'privada',
          ticker: null,
          acoes: 0,
          preco: 0,
          marketCap: 0,
          liquidez: 0,
          volumeSemanal: 0,
          historicoPrecos: [],
          freeFloat: 0,
          bancoCoordenadorId: null,
          conselhoPressao: 0,
          dividendYield: 0,
          plRatio: 0,
          lpa: 0
        };
      } else {
        const base = {
          elegivel: false,
          listada: false,
          status: 'privada',
          ticker: null,
          acoes: 0,
          preco: 0,
          marketCap: 0,
          liquidez: 0,
          volumeSemanal: 0,
          historicoPrecos: [],
          freeFloat: 0,
          bancoCoordenadorId: null,
          conselhoPressao: 0,
          dividendYield: 0,
          plRatio: 0,
          lpa: 0
        };
        empresa.ipo = { ...base, ...empresa.ipo };
        empresa.ipo.historicoPrecos = Array.isArray(empresa.ipo.historicoPrecos)
          ? empresa.ipo.historicoPrecos
          : [];
      }

      if (!empresa.rating || typeof empresa.rating !== 'object') {
        empresa.rating = { nota: 'BBB', score: 55, historico: [] };
      } else {
        empresa.rating.historico = Array.isArray(empresa.rating.historico)
          ? empresa.rating.historico
          : [];
      }

      if (!empresa.estruturaCapital || typeof empresa.estruturaCapital !== 'object') {
        empresa.estruturaCapital = {
          equity: 0,
          debt: 0,
          wacc: 0.12,
          custoEquity: 0.14,
          custoDebt: 0.1,
          debtRatio: 0
        };
      }

      if (empresa.confiancaMercado == null) empresa.confiancaMercado = 50;

      if (!empresa.relacionamentoBancos || typeof empresa.relacionamentoBancos !== 'object') {
        empresa.relacionamentoBancos = {};
      }

      if (!empresa.reservasEstrategicas || typeof empresa.reservasEstrategicas !== 'object') {
        empresa.reservasEstrategicas = {
          alvoCaixa: 0,
          modo: 'normal', // conservador | normal | agressivo
          tradeoffRentabilidade: 0,
          tradeoffRisco: 0
        };
      }

      if (!empresa.boardPressure || typeof empresa.boardPressure !== 'object') {
        empresa.boardPressure = {
          nivel: 0,
          metasCrescimento: 0.02,
          ultimaPressao: null
        };
      }

      return empresa;
    },

    /* ========== Rating de crédito ========== */

    calcRatingScore(empresa, state) {
      this.ensureCompanyMarket(empresa, state);
      if (CGL.Finance?.ensureCompanyFinance && !empresa.concorrente) {
        try { CGL.Finance.ensureCompanyFinance(empresa, state); } catch (e) { /* ok */ }
      }
      const ind = empresa.finance?.indicadores || {};
      const idadeSem = Math.max(
        1,
        (state.world?.semanaAtual || 1) - (empresa.semanaFundacao || 1) + 1
      );
      const idadeScore = CGL.Utils.clamp(idadeSem / 104, 0, 1) * 12;
      const rep = (empresa.reputacao?.geral ?? 50) / 100;
      const endiv = ind.endividamento != null
        ? ind.endividamento
        : (empresa.endividamento || 0) / Math.max(empresa.patrimonioLiquido || 1, 1);
      const liq = ind.liquidez != null ? ind.liquidez : 1;
      const margem = ind.margemLucro != null ? ind.margemLucro : 0;
      const crescimento = empresa.crescimentoSemanal || 0;
      const pl = empresa.patrimonioLiquido || 0;
      const fal = empresa.finance?.falencia?.estagio || 0;
      const atraso = empresa.finance?.inadimplencia?.emprestimosAtraso || 0;
      const contratos = (empresa.reputacao?.contratos ?? 50) / 100;

      let score =
        40 +
        rep * 18 +
        CGL.Utils.clamp(1.2 - endiv, 0, 1.2) * 16 +
        CGL.Utils.clamp(liq / 2, 0, 1) * 12 +
        CGL.Utils.clamp(margem + 0.1, 0, 0.4) * 30 +
        CGL.Utils.clamp(crescimento * 20, -8, 10) +
        CGL.Utils.clamp(pl / 500000, 0, 1) * 8 +
        idadeScore +
        contratos * 8 -
        fal * 5 -
        atraso * 2;

      // Confiança do mercado reforça rating
      score += ((empresa.confiancaMercado || 50) - 50) * 0.15;

      return CGL.Utils.clamp(Math.round(score * 10) / 10, 0, 100);
    },

    updateCreditRating(empresa, state) {
      this.ensureCompanyMarket(empresa, state);
      const score = this.calcRatingScore(empresa, state);
      const rating = CGL.Data.getRatingByScore(score);
      const prev = empresa.rating.nota;
      empresa.rating.score = score;
      empresa.rating.nota = rating.id;
      if (prev && prev !== rating.id) {
        empresa.rating.historico.push({
          semana: state.world?.semanaAtual || 0,
          de: prev,
          para: rating.id,
          score
        });
        if (empresa.rating.historico.length > 40) empresa.rating.historico.shift();
        if (!empresa.concorrente) {
          const up = creditRank(rating.id) > creditRank(prev);
          CGL.Events?.notify?.(
            up ? 'success' : 'alert',
            up ? 'Rating elevado' : 'Rating rebaixado',
            `${empresa.nomeFantasia}: ${prev} → ${rating.id}`
          );
          CGL.Company.addHistory(empresa, state, {
            tipo: 'financeiro',
            titulo: up ? 'Upgrade de rating' : 'Downgrade de rating',
            descricao: `Classificação ${prev} → ${rating.id} (score ${score}).`
          });
        }
      }
      return empresa.rating;
    },

    /* ========== Estrutura / custo de capital ========== */

    calcCapitalStructure(empresa, state) {
      this.ensureCompanyMarket(empresa, state);
      const equity = Math.max(
        1000,
        (empresa.patrimonioLiquido || 0) + (empresa.finance?.lucrosAcumulados || 0) * 0.3
      );
      let debt = empresa.endividamento || 0;
      if (empresa.finance) {
        const emp = (empresa.finance.emprestimos || [])
          .filter((l) => l.status === 'ativo' || l.status === 'atraso')
          .reduce((a, l) => a + (l.saldo || 0), 0);
        const fin = (empresa.finance.financiamentos || [])
          .filter((l) => l.status === 'ativo' || l.status === 'atraso')
          .reduce((a, l) => a + (l.saldo || 0), 0);
        const deb = (empresa.finance.debentures || [])
          .filter((d) => d.status === 'ativa')
          .reduce((a, d) => a + (d.saldo || 0), 0);
        debt = emp + fin + deb;
      }
      const total = equity + debt || 1;
      const debtRatio = debt / total;

      const rating = CGL.Data.getRatingById(empresa.rating?.nota || 'BBB');
      const econ = state.economy || {};
      const rf = (econ.taxaJuros || 0.1);
      const rp = 0.05 + (1 - (empresa.confiancaMercado || 50) / 100) * 0.08;
      const beta = 0.8 + debtRatio * 0.9 + ((100 - (empresa.reputacao?.geral ?? 50)) / 100) * 0.3;
      const custoEquity = rf + beta * rp;
      const custoDebt = rf + (rating.jurosSpread || 0.01) + debtRatio * 0.02;
      const wacc = (equity / total) * custoEquity + (debt / total) * custoDebt * 0.85;

      empresa.estruturaCapital = {
        equity: Math.round(equity),
        debt: Math.round(debt),
        debtRatio: Math.round(debtRatio * 1000) / 1000,
        custoEquity: Math.round(custoEquity * 10000) / 10000,
        custoDebt: Math.round(custoDebt * 10000) / 10000,
        wacc: Math.round(wacc * 10000) / 10000
      };
      return empresa.estruturaCapital;
    },

    /** Ajuste de taxa de empréstimo pelo rating + relacionamento (hook Finance) */
    loanRateMultiplier(empresa, bankId) {
      const rating = CGL.Data.getRatingById(empresa?.rating?.nota || 'BBB');
      const rel = this.getBankRelationship(empresa, bankId);
      const bank = CGL.Data.getBankById(bankId);
      let mult = 1 + (rating.jurosSpread || 0) * 8;
      mult *= 1 - (rel - 50) / 400;
      if (bank?.perfil === 'agressivo') mult *= 0.97;
      if (bank?.perfil === 'conservador') mult *= 1.03;
      if (bank?.setoresPreferidos?.includes(empresa?.segmentoId)) mult *= 0.96;
      return Math.max(0.7, mult);
    },

    /* ========== Relacionamento bancário ========== */

    getBankRelationship(empresa, bankId) {
      if (!empresa) return 50;
      this.ensureCompanyMarket(empresa, null);
      if (empresa.relacionamentoBancos[bankId] != null) {
        return empresa.relacionamentoBancos[bankId];
      }
      // Espelha conta PJ se existir
      const conta = empresa.finance?.contas?.find((c) => c.bancoId === bankId);
      const bank = CGL.Data.getBankById(bankId);
      const v = conta?.relacionamento ?? bank?.relacionamentoInicial ?? 50;
      empresa.relacionamentoBancos[bankId] = v;
      return v;
    },

    adjustBankRelationship(empresa, bankId, delta, state) {
      this.ensureCompanyMarket(empresa, state);
      const cur = this.getBankRelationship(empresa, bankId);
      const next = CGL.Utils.clamp(cur + delta, 0, 100);
      empresa.relacionamentoBancos[bankId] = next;
      const conta = empresa.finance?.contas?.find((c) => c.bancoId === bankId);
      if (conta) conta.relacionamento = next;
      return next;
    },

    syncBankRelationshipsFromAccounts(empresa, state) {
      this.ensureCompanyMarket(empresa, state);
      (empresa.finance?.contas || []).forEach((c) => {
        if (c.bancoId && c.relacionamento != null) {
          empresa.relacionamentoBancos[c.bancoId] = c.relacionamento;
        }
      });
    },

    /* ========== Valuation dinâmico ========== */

    calcValuation(empresa, state) {
      this.ensureCompanyMarket(empresa, state);
      const base = CGL.Company.calcValuation(empresa, state);
      const conf = (empresa.confiancaMercado || 50) / 100;
      const ratingBonus = (empresa.rating?.score || 55) / 100;
      const wacc = empresa.estruturaCapital?.wacc || 0.12;
      const growthAdj = 1 + CGL.Utils.clamp((empresa.crescimentoSemanal || 0) * 6, -0.25, 0.4);
      const econ = state.economy || {};
      const macro = 0.9 + ((econ.indiceConfianca || 50) / 100) * 0.25;
      const listPremium = empresa.ipo?.listada ? 1.08 : 1;
      const cashDrag = this._cashReserveDrag(empresa);
      const raw = base * (0.75 + conf * 0.35) * (0.85 + ratingBonus * 0.3) *
        growthAdj * macro * listPremium * (1 - cashDrag * 0.08) *
        (1 / (0.85 + wacc));
      return Math.max(1000, Math.round(raw));
    },

    /* ========== Confiança do mercado ========== */

    updateMarketConfidence(empresa, state) {
      this.ensureCompanyMarket(empresa, state);
      const m = this.ensureMarket(state);
      const rep = empresa.reputacao?.geral ?? 50;
      const rating = empresa.rating?.score || 55;
      const lucro = empresa.lucro || 0;
      const fal = empresa.finance?.falencia?.estagio || 0;
      const pol = empresa.finance?.politicaDividendos || 'nunca';
      const polData = CGL.Data.getDividendPolicyById?.(pol);
      let conf = 35 + rep * 0.25 + rating * 0.3;
      conf += lucro > 0 ? 8 : -10;
      conf -= fal * 4;
      if (empresa.ipo?.listada) {
        conf += 5;
        conf += (polData?.satisfacaoDelta || 0) * 4;
        conf -= (empresa.boardPressure?.nivel || 0) * 0.2;
      }
      conf += ((state.economy?.indiceConfianca || 50) - 50) * 0.15;
      conf = CGL.Utils.clamp(Math.round(conf), 0, 100);
      empresa.confiancaMercado = conf;
      m.confianca[empresa.id] = conf;
      return conf;
    },

    /* ========== Reservas de caixa (tradeoff) ========== */

    _cashReserveDrag(empresa) {
      const modo = empresa.reservasEstrategicas?.modo || 'normal';
      const caixa = empresa.caixa || 0;
      const receita = Math.max(empresa.receita || 1, 1);
      const semanasCaixa = caixa / receita;
      const alvo = modo === 'conservador' ? 16 : modo === 'agressivo' ? 4 : 8;
      empresa.reservasEstrategicas.alvoCaixa = Math.round(receita * alvo);
      // Excessivo → reduz rentabilidade; baixo → aumenta risco
      if (semanasCaixa > alvo * 1.8) {
        empresa.reservasEstrategicas.tradeoffRentabilidade = -0.15;
        empresa.reservasEstrategicas.tradeoffRisco = -0.1;
        return 0.6;
      }
      if (semanasCaixa < alvo * 0.4) {
        empresa.reservasEstrategicas.tradeoffRentabilidade = 0.05;
        empresa.reservasEstrategicas.tradeoffRisco = 0.25;
        return 0;
      }
      empresa.reservasEstrategicas.tradeoffRentabilidade = 0;
      empresa.reservasEstrategicas.tradeoffRisco = 0;
      return 0.15;
    },

    setCashReserveMode(state, empresaId, modo) {
      const empresa = CGL.Company.getById(state, empresaId);
      if (!empresa) throw new Error('Empresa inválida.');
      this.ensureCompanyMarket(empresa, state);
      if (!['conservador', 'normal', 'agressivo'].includes(modo)) {
        throw new Error('Modo inválido.');
      }
      empresa.reservasEstrategicas.modo = modo;
      this._cashReserveDrag(empresa);
      CGL.Company.addHistory(empresa, state, {
        tipo: 'financeiro',
        titulo: 'Política de reservas',
        descricao: `Modo de caixa: ${modo}.`
      });
      return empresa.reservasEstrategicas;
    },

    /* ========== Investidores / ofertas ========== */

    generateSpontaneousOffer(state, empresa, opts = {}) {
      this.ensureMarket(state);
      this.ensureCompanyMarket(empresa, state);
      if (!empresa.ativa || empresa.concorrente || empresa.ipo?.listada) return null;

      const valuation = this.calcValuation(empresa, state);
      const conf = empresa.confiancaMercado || 50;
      if (!opts.force && conf < 35 && Math.random() > 0.2) return null;

      let candidates = state.market.investidores.filter((inv) => {
        if (inv.ticketDisponivel < 20000) return false;
        if (inv.setores && !inv.setores.includes(empresa.segmentoId)) return false;
        if (inv.porteMin) {
          if ((PORTE_RANK[empresa.porte] || 0) < (PORTE_RANK[inv.porteMin] || 0)) return false;
        }
        // Apetite a risco vs risco da empresa
        const riscoEmp = (empresa.finance?.indicadores?.riscoFinanceiro || 40) / 100;
        if (!opts.force && riscoEmp > inv.risco + 0.25) return false;
        return true;
      });
      if (!candidates.length && opts.force) {
        candidates = state.market.investidores.filter((inv) => inv.ticketDisponivel >= 20000);
      }
      if (!candidates.length) {
        // Garante pelo menos um anjo fresco para ofertas
        const fresh = CGL.Data.createInvestorInstance('anjo');
        state.market.investidores.push(fresh);
        candidates = [fresh];
      }

      const inv = CGL.Utils.pick(candidates);
      const equityPct = CGL.Utils.clamp(
        inv.equityAlvoMin + Math.random() * (inv.equityAlvoMax - inv.equityAlvoMin),
        3,
        45
      );
      let valor = Math.min(
        inv.ticketDisponivel,
        Math.round(valuation * (equityPct / 100) * (0.9 + Math.random() * 0.25))
      );
      if (valor < 15000) {
        if (!opts.force) return null;
        valor = Math.min(inv.ticketDisponivel, 50000);
      }

      const oferta = {
        id: CGL.Utils.uuid(),
        empresaId: empresa.id,
        investidorId: inv.id,
        investidorNome: inv.nome,
        tipoId: inv.tipoId,
        tipoNome: inv.tipoNome,
        valor,
        percentual: Math.round(equityPct * 10) / 10,
        assentoConselho: !!inv.exigeConselho || equityPct >= 15,
        preferenciaDividendos: inv.preferenciaDividendos > 0.3,
        poderVoto: Math.round(equityPct),
        status: 'pendente', // pendente | aceita | recusada | negociada | expirada
        semanaCriacao: state.world?.semanaAtual || 0,
        expiresSemana: (state.world?.semanaAtual || 0) + OFERTA_TTL_SEM,
        valuationRef: valuation
      };
      state.market.ofertasPendentes.push(oferta);
      inv.historicoOfertas = (inv.historicoOfertas || 0) + 1;
      if (!empresa.concorrente) {
        CGL.Events?.notify?.(
          'info',
          'Oferta de investimento',
          `${inv.nome} (${inv.tipoNome}) oferece ${CGL.Utils.formatBRL(valor)} por ${oferta.percentual}% de ${empresa.nomeFantasia}.`
        );
      }
      return oferta;
    },

    listPendingOffers(state, empresaId) {
      const m = this.ensureMarket(state);
      return m.ofertasPendentes.filter(
        (o) => o.status === 'pendente' && (!empresaId || o.empresaId === empresaId)
      );
    },

    /**
     * Aceita / negocia / recusa aporte externo.
     * opts: { valor?, percentual?, assentoConselho?, preferenciaDividendos? }
     */
    respondToOffer(state, ofertaId, action, opts = {}) {
      const m = this.ensureMarket(state);
      const oferta = m.ofertasPendentes.find((o) => o.id === ofertaId);
      if (!oferta || oferta.status !== 'pendente') throw new Error('Oferta inválida.');
      const empresa = CGL.Company.getById(state, oferta.empresaId);
      if (!empresa?.ativa) throw new Error('Empresa inválida.');
      this.ensureCompanyMarket(empresa, state);

      if (action === 'recusar') {
        oferta.status = 'recusada';
        const inv = m.investidores.find((i) => i.id === oferta.investidorId);
        if (inv) inv.humor = CGL.Utils.clamp((inv.humor || 50) - 5, 0, 100);
        CGL.Company.addHistory(empresa, state, {
          tipo: 'financeiro',
          titulo: 'Oferta recusada',
          descricao: `Recusou aporte de ${oferta.investidorNome}.`
        });
        return { ok: true, action: 'recusar', oferta };
      }

      let valor = opts.valor != null ? Math.round(Number(opts.valor)) : oferta.valor;
      let pct = opts.percentual != null ? Number(opts.percentual) : oferta.percentual;
      let assento = opts.assentoConselho != null ? !!opts.assentoConselho : oferta.assentoConselho;
      let prefDiv = opts.preferenciaDividendos != null
        ? !!opts.preferenciaDividendos
        : oferta.preferenciaDividendos;

      if (action === 'negociar') {
        // Investidor aceita negociação se desvio for razoável
        const desvioValor = Math.abs(valor - oferta.valor) / Math.max(oferta.valor, 1);
        const desvioPct = Math.abs(pct - oferta.percentual) / Math.max(oferta.percentual, 1);
        const inv = m.investidores.find((i) => i.id === oferta.investidorId);
        const humor = (inv?.humor || 50) / 100;
        if (desvioValor > 0.25 + humor * 0.15 || desvioPct > 0.3 + humor * 0.1) {
          oferta.status = 'recusada';
          if (inv) inv.humor = CGL.Utils.clamp((inv.humor || 50) - 8, 0, 100);
          throw new Error('Investidor rejeitou os termos negociados.');
        }
        oferta.status = 'negociada';
        oferta.valor = valor;
        oferta.percentual = pct;
        oferta.assentoConselho = assento;
        oferta.preferenciaDividendos = prefDiv;
      } else {
        oferta.status = 'aceita';
      }

      const result = this.applyEquityInjection(state, empresa.id, {
        valor: oferta.valor,
        percentual: oferta.percentual,
        investidorNome: oferta.investidorNome,
        tipoId: oferta.tipoId,
        assentoConselho: oferta.assentoConselho,
        preferenciaDividendos: oferta.preferenciaDividendos,
        poderVoto: oferta.poderVoto || oferta.percentual
      });

      const inv = m.investidores.find((i) => i.id === oferta.investidorId);
      if (inv) {
        inv.ticketDisponivel = Math.max(0, inv.ticketDisponivel - oferta.valor);
        inv.humor = CGL.Utils.clamp((inv.humor || 50) + 6, 0, 100);
      }

      m.historicoOps.push({
        semana: state.world?.semanaAtual || 0,
        tipo: 'aporte_externo',
        empresaId: empresa.id,
        valor: oferta.valor,
        percentual: oferta.percentual,
        contra: oferta.investidorNome
      });

      return { ok: true, action, oferta, ...result };
    },

    /** Injeta equity externo, dilui sócios, credita caixa PJ */
    applyEquityInjection(state, empresaId, opts) {
      const empresa = CGL.Company.getById(state, empresaId);
      if (!empresa?.ativa) throw new Error('Empresa inválida.');
      this.ensureCompanyMarket(empresa, state);
      const valor = Math.round(Number(opts.valor) || 0);
      const pct = Number(opts.percentual) || 0;
      if (valor < 1000 || pct <= 0 || pct >= 80) {
        throw new Error('Termos de aporte inválidos.');
      }

      const jog = (empresa.socios || []).find(
        (s) => s.tipo === 'jogador' || s.playerId === state.player?.id
      );
      const stakeJog = jog ? jog.percentual : 0;
      if (pct >= stakeJog && stakeJog > 0) {
        // Permite diluição forte, mas avisa via histórico
      }

      // Dilui todos os sócios existentes proporcionalmente
      const fator = (100 - pct) / 100;
      (empresa.socios || []).forEach((s) => {
        s.percentual = Math.round(s.percentual * fator * 100) / 100;
        s.poderVoto = Math.round((s.poderVoto != null ? s.poderVoto : s.percentual) * fator * 100) / 100;
      });

      const novo = {
        id: CGL.Utils.uuid(),
        nome: opts.investidorNome || 'Investidor externo',
        tipo: 'investidor',
        tipoInvestidor: opts.tipoId || 'fundo',
        percentual: pct,
        direitoDividendos: true,
        preferenciaDividendos: !!opts.preferenciaDividendos,
        poderVoto: opts.poderVoto != null ? opts.poderVoto : pct,
        influencia: pct,
        satisfacao: 70,
        assentoConselho: !!opts.assentoConselho
      };
      empresa.socios.push(novo);

      // Renormaliza para ~100%
      const soma = empresa.socios.reduce((a, s) => a + (s.percentual || 0), 0);
      if (Math.abs(soma - 100) > 0.5) {
        empresa.socios.forEach((s) => {
          s.percentual = Math.round((s.percentual / soma) * 10000) / 100;
        });
      }

      empresa.capitalSocial = (empresa.capitalSocial || 0) + valor;
      if (CGL.Finance?.creditEmpresa) {
        CGL.Finance.creditEmpresa(state, empresaId, valor, {
          categoria: 'aporte_externo',
          descricao: `Aporte de ${novo.nome} (${pct}%)`
        });
      } else {
        empresa.caixa = (empresa.caixa || 0) + valor;
      }

      if (novo.assentoConselho) {
        empresa.boardPressure.nivel = CGL.Utils.clamp(
          (empresa.boardPressure.nivel || 0) + 8,
          0,
          100
        );
        empresa.ipo.conselhoPressao = empresa.boardPressure.nivel;
      }

      this.updateMarketConfidence(empresa, state);
      CGL.Company.addHistory(empresa, state, {
        tipo: 'societario',
        titulo: 'Aporte externo',
        descricao: `${novo.nome} investiu ${CGL.Utils.formatBRL(valor)} por ${pct}%` +
          (novo.assentoConselho ? ' (+ assento no conselho)' : '') + '.'
      });
      CGL.Events?.notify?.(
        'success',
        'Aporte recebido',
        `${empresa.nomeFantasia} captou ${CGL.Utils.formatBRL(valor)}.`
      );

      return { socio: novo, valor, percentual: pct, valuation: this.calcValuation(empresa, state) };
    },

    /* ========== IPO ========== */

    checkIpoRequirements(empresa, state) {
      this.ensureCompanyMarket(empresa, state);
      if (CGL.Finance?.ensureCompanyFinance && !empresa.concorrente) {
        try { CGL.Finance.ensureCompanyFinance(empresa, state); } catch (e) { /* ok */ }
      }
      const nat = CGL.Data.getLegalNatureById?.(empresa.naturezaId);
      const receitaAnual = empresa.receitaAcumuladaAno || (empresa.receita || 0) * 52;
      const idadeSem = Math.max(
        0,
        (state.world?.semanaAtual || 1) - (empresa.semanaFundacao || 1)
      );
      const ind = empresa.finance?.indicadores || {};
      const reqs = [
        {
          id: 'natureza',
          ok: !!(nat?.permiteIPO || empresa.naturezaId === 'sa_fechada' || empresa.naturezaId === 'sa_aberta'),
          label: 'Natureza jurídica permite IPO (S.A.)'
        },
        {
          id: 'porte',
          ok: (PORTE_RANK[empresa.porte] || 0) >= PORTE_RANK.media,
          label: 'Porte mínimo: média'
        },
        {
          id: 'faturamento',
          ok: receitaAnual >= 2_000_000,
          label: 'Faturamento anual ≥ R$ 2 mi'
        },
        {
          id: 'idade',
          ok: idadeSem >= 26,
          label: 'Pelo menos 26 semanas de operação'
        },
        {
          id: 'reputacao',
          ok: (empresa.reputacao?.geral ?? 0) >= 45,
          label: 'Reputação ≥ 45'
        },
        {
          id: 'governanca',
          ok: (empresa.administradores || []).length >= 1 && (empresa.socios || []).length >= 1,
          label: 'Governança básica (admins + sócios)'
        },
        {
          id: 'financas',
          ok: !!(empresa.finance?.contas?.length) || !!empresa.concorrente,
          label: 'Organização financeira (contas PJ)'
        },
        {
          id: 'rating',
          ok: (empresa.rating?.score || 0) >= 40 || creditRank(empresa.rating?.nota || 'CCC') >= creditRank('BB'),
          label: 'Rating mínimo BB'
        },
        {
          id: 'falencia',
          ok: (empresa.finance?.falencia?.estagio || 0) <= 2,
          label: 'Sem crise severa de insolvência'
        },
        {
          id: 'endividamento',
          ok: (ind.endividamento == null || ind.endividamento < 0.85),
          label: 'Endividamento controlado (< 85%)'
        }
      ];
      const ok = reqs.every((r) => r.ok);
      empresa.ipo.elegivel = ok && !empresa.ipo.listada;
      return { ok, requisitos: reqs, elegivel: empresa.ipo.elegivel };
    },

    prepareIpo(state, empresaId, opts = {}) {
      const empresa = CGL.Company.getById(state, empresaId);
      if (!empresa?.ativa) throw new Error('Empresa inválida.');
      if (empresa.ipo?.listada) throw new Error('Empresa já listada.');
      this.ensureCompanyMarket(empresa, state);
      this.updateCreditRating(empresa, state);
      const check = this.checkIpoRequirements(empresa, state);
      if (!check.ok && !opts.force) {
        const faltam = check.requisitos.filter((r) => !r.ok).map((r) => r.label);
        throw new Error('Requisitos de IPO não cumpridos: ' + faltam.join('; '));
      }
      const bankId = opts.bancoCoordenadorId ||
        (CGL.Data.banks || []).find((b) => b.coordenaIPO)?.id ||
        'btg';
      const bank = CGL.Data.getBankById(bankId);
      if (!bank?.coordenaIPO) throw new Error('Banco não coordena IPOs.');

      const pct = CGL.Utils.clamp(Number(opts.percentual) || 20, 10, 40);
      const valuation = opts.valuation || this.calcValuation(empresa, state);

      empresa.ipo.status = 'preparando';
      empresa.ipo.bancoCoordenadorId = bankId;
      empresa.ipo.freeFloat = pct;
      empresa.ipo._prep = {
        percentual: pct,
        valuation,
        semanaPrep: state.world?.semanaAtual || 0
      };

      CGL.Company.addHistory(empresa, state, {
        tipo: 'financeiro',
        titulo: 'IPO em preparação',
        descricao: `Coordenador: ${bank.nome}. Oferta planejada: ${pct}% · valuation ${CGL.Utils.formatBRL(valuation)}.`
      });
      return { empresa, check, valuation, percentual: pct, banco: bank };
    },

    /**
     * Executa IPO: vende stake ao mercado, cria acionistas flutuantes, lista na bolsa.
     */
    executeIpo(state, empresaId, opts = {}) {
      const empresa = CGL.Company.getById(state, empresaId);
      if (!empresa?.ativa) throw new Error('Empresa inválida.');
      this.ensureCompanyMarket(empresa, state);
      if (empresa.ipo.listada) throw new Error('Já listada.');

      if (empresa.ipo.status !== 'preparando') {
        this.prepareIpo(state, empresaId, opts);
      }

      const prep = empresa.ipo._prep || {};
      const pct = CGL.Utils.clamp(
        Number(opts.percentual) || prep.percentual || 20,
        10,
        40
      );
      const valuation = Number(opts.valuation) || prep.valuation || this.calcValuation(empresa, state);
      const conf = empresa.confiancaMercado || 50;
      const demanda = 0.7 + conf / 200 + Math.random() * 0.35;
      let outcome = 'bem_avaliado';
      if (demanda >= 1.15) outcome = 'sucesso';
      else if (demanda < 0.8) outcome = 'subavaliado';
      else if (demanda < 0.65) outcome = 'fracasso';

      if (outcome === 'fracasso' && !opts.force) {
        empresa.ipo.status = 'privada';
        empresa.ipo._prep = null;
        empresa.confiancaMercado = CGL.Utils.clamp((empresa.confiancaMercado || 50) - 12, 0, 100);
        CGL.Company.addHistory(empresa, state, {
          tipo: 'financeiro',
          titulo: 'IPO fracassou',
          descricao: 'Demanda insuficiente — oferta cancelada.'
        });
        CGL.Events?.notify?.('error', 'IPO fracassou', `${empresa.nomeFantasia}: demanda insuficiente.`);
        return { ok: false, outcome };
      }

      const precoOferta = Math.round((valuation / ACOES_BASE_IPO) * demanda * 100) / 100;
      const acoesVendidas = Math.round(ACOES_BASE_IPO * (pct / 100));
      const captado = Math.round(precoOferta * acoesVendidas);

      // Dilui sócios e cria bloco "Mercado"
      const fator = (100 - pct) / 100;
      (empresa.socios || []).forEach((s) => {
        s.percentual = Math.round(s.percentual * fator * 100) / 100;
        s.poderVoto = Math.round((s.poderVoto != null ? s.poderVoto : s.percentual) * fator * 100) / 100;
      });
      empresa.socios.push({
        id: CGL.Utils.uuid(),
        nome: 'Acionistas de mercado',
        tipo: 'mercado',
        percentual: pct,
        direitoDividendos: true,
        poderVoto: pct * 0.8,
        influencia: pct * 0.5,
        satisfacao: 55 + (outcome === 'sucesso' ? 15 : 0)
      });

      if (CGL.Finance?.creditEmpresa) {
        CGL.Finance.creditEmpresa(state, empresaId, captado, {
          categoria: 'ipo',
          descricao: `Captação IPO (${pct}% @ ${CGL.Utils.formatBRL(precoOferta)}/ação)`
        });
      } else {
        empresa.caixa = (empresa.caixa || 0) + captado;
      }
      empresa.capitalSocial = (empresa.capitalSocial || 0) + captado;

      // Natureza → S.A. aberta se fechada
      if (empresa.naturezaId === 'sa_fechada' || empresa.naturezaId === 'ltda') {
        empresa.naturezaId = 'sa_aberta';
      }

      const ticker = this._makeTicker(empresa);
      empresa.ipo = {
        ...empresa.ipo,
        listada: true,
        elegivel: false,
        status: 'listada',
        ticker,
        acoes: ACOES_BASE_IPO,
        preco: precoOferta,
        marketCap: Math.round(precoOferta * ACOES_BASE_IPO),
        liquidez: CGL.Utils.clamp(40 + conf * 0.4, 20, 95),
        volumeSemanal: Math.round(acoesVendidas * 0.05),
        historicoPrecos: [{
          semana: state.world?.semanaAtual || 0,
          preco: precoOferta,
          volume: Math.round(acoesVendidas * 0.05)
        }],
        freeFloat: pct,
        bancoCoordenadorId: empresa.ipo.bancoCoordenadorId || opts.bancoCoordenadorId || 'btg',
        conselhoPressao: 25,
        dividendYield: 0,
        plRatio: 0,
        lpa: 0,
        outcome,
        _prep: null
      };

      empresa.boardPressure.nivel = CGL.Utils.clamp(
        (empresa.boardPressure.nivel || 0) + 25,
        0,
        100
      );
      empresa.boardPressure.metasCrescimento = 0.025;
      empresa.boardPressure.ultimaPressao = 'ipo';

      const m = this.ensureMarket(state);
      if (!m.bolsa.listadas.includes(empresa.id)) m.bolsa.listadas.push(empresa.id);

      this.updateMarketConfidence(empresa, state);
      this._updateListedMetrics(empresa, state);

      CGL.Company.addHistory(empresa, state, {
        tipo: 'financeiro',
        titulo: 'IPO realizado',
        descricao: `${ticker} listada. Captou ${CGL.Utils.formatBRL(captado)} (${outcome}). Free float ${pct}%.`
      });
      CGL.Events?.notify?.(
        'success',
        'IPO concluído',
        `${empresa.nomeFantasia} (${ticker}) estreou a R$ ${precoOferta.toFixed(2)}.`
      );

      // Hooks follow-on / recompra / fechamento (estrutura)
      empresa.ipo.hooks = {
        followOn: false,
        recompra: false,
        fechamento: false,
        ofertaSecundaria: false
      };

      return {
        ok: true,
        outcome,
        ticker,
        preco: precoOferta,
        captado,
        percentual: pct,
        marketCap: empresa.ipo.marketCap
      };
    },

    _makeTicker(empresa) {
      const base = String(empresa.nomeFantasia || empresa.nome || 'EMP')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Za-z0-9]/g, '')
        .toUpperCase()
        .slice(0, 4) || 'EMP';
      return base.length >= 4 ? base : (base + 'X').slice(0, 4);
    },

    /* ========== Bolsa simplificada ========== */

    listListed(state) {
      const m = this.ensureMarket(state);
      return m.bolsa.listadas
        .map((id) => CGL.Company.getById(state, id))
        .filter((e) => e && e.ativa && e.ipo?.listada);
    },

    /** Lista concorrente maduro na bolsa (para o jogador negociar) */
    listCompetitorOnExchange(state, empresa, opts = {}) {
      if (!empresa?.concorrente || !empresa.ativa) return null;
      this.ensureCompanyMarket(empresa, state);
      if (empresa.ipo.listada) return empresa;
      const valuation = this.calcValuation(empresa, state);
      const preco = Math.max(0.5, Math.round((valuation / ACOES_BASE_IPO) * 100) / 100);
      const pct = opts.freeFloat || 25;
      empresa.ipo = {
        ...empresa.ipo,
        listada: true,
        status: 'listada',
        ticker: this._makeTicker(empresa),
        acoes: ACOES_BASE_IPO,
        preco,
        marketCap: Math.round(preco * ACOES_BASE_IPO),
        liquidez: CGL.Utils.randomInt(30, 80),
        volumeSemanal: CGL.Utils.randomInt(5000, 80000),
        historicoPrecos: [{
          semana: state.world?.semanaAtual || 0,
          preco,
          volume: 10000
        }],
        freeFloat: pct,
        conselhoPressao: 15
      };
      const m = this.ensureMarket(state);
      if (!m.bolsa.listadas.includes(empresa.id)) m.bolsa.listadas.push(empresa.id);
      return empresa;
    },

    _updateListedMetrics(empresa, state) {
      if (!empresa.ipo?.listada) return;
      const lucroAnual = (empresa.lucro || 0) * 52;
      const lpa = empresa.ipo.acoes > 0 ? lucroAnual / empresa.ipo.acoes : 0;
      empresa.ipo.lpa = Math.round(lpa * 10000) / 10000;
      empresa.ipo.plRatio = lpa > 0
        ? Math.round((empresa.ipo.preco / lpa) * 10) / 10
        : 0;
      const pol = CGL.Data.getDividendPolicyById?.(
        empresa.finance?.politicaDividendos || 'nunca'
      );
      const divAnualEst = Math.max(0, lucroAnual) * (pol?.payout || 0);
      empresa.ipo.dividendYield = empresa.ipo.marketCap > 0
        ? Math.round((divAnualEst / empresa.ipo.marketCap) * 10000) / 10000
        : 0;
      empresa.ipo.marketCap = Math.round(empresa.ipo.preco * empresa.ipo.acoes);
    },

    tickListedPrices(state) {
      const listadas = this.listListed(state);
      const econ = state.economy || {};
      const m = this.ensureMarket(state);
      let idxDelta = 0;

      listadas.forEach((empresa) => {
        this.ensureCompanyMarket(empresa, state);
        const conf = (empresa.confiancaMercado || 50) / 100;
        const lucroSignal = CGL.Utils.clamp((empresa.lucro || 0) / Math.max(empresa.receita || 1, 1), -0.3, 0.3);
        const macro = ((econ.indiceConfianca || 50) - 50) / 500;
        const noise = (Math.random() - 0.5) * 0.06;
        const pressao = -((empresa.boardPressure?.nivel || 0) / 100) * 0.01;
        const delta = lucroSignal * 0.15 + (conf - 0.5) * 0.04 + macro + noise + pressao;
        const prev = empresa.ipo.preco || 1;
        const next = Math.max(0.1, Math.round(prev * (1 + delta) * 100) / 100);
        const volume = Math.round(
          (empresa.ipo.liquidez || 40) * 200 * (0.5 + Math.abs(delta) * 8)
        );
        empresa.ipo.preco = next;
        empresa.ipo.volumeSemanal = volume;
        empresa.ipo.historicoPrecos.push({
          semana: state.world?.semanaAtual || 0,
          preco: next,
          volume
        });
        if (empresa.ipo.historicoPrecos.length > HIST_PRECO_CAP) {
          empresa.ipo.historicoPrecos.shift();
        }
        this._updateListedMetrics(empresa, state);
        idxDelta += delta;
      });

      if (listadas.length) {
        const avg = idxDelta / listadas.length;
        m.bolsa.indice = Math.max(
          1000,
          Math.round(m.bolsa.indice * (1 + avg * 0.5 + (Math.random() - 0.5) * 0.01))
        );
      } else {
        m.bolsa.indice = Math.round(
          m.bolsa.indice * (1 + ((econ.indiceConfianca || 50) - 50) / 2000 + (Math.random() - 0.5) * 0.008)
        );
      }
      m.bolsa.historico.push({
        semana: state.world?.semanaAtual || 0,
        indice: m.bolsa.indice
      });
      if (m.bolsa.historico.length > HIST_PRECO_CAP) m.bolsa.historico.shift();
    },

    /* ========== Compra / venda de ações ========== */

    getPlayerPosition(state, empresaId) {
      const m = this.ensureMarket(state);
      return m.carteiraJogador.find((p) => p.empresaId === empresaId) || null;
    },

    buyShares(state, empresaId, quantidade, opts = {}) {
      const m = this.ensureMarket(state);
      const empresa = CGL.Company.getById(state, empresaId);
      if (!empresa?.ipo?.listada) throw new Error('Empresa não listada.');
      const qtd = Math.floor(Number(quantidade) || 0);
      if (qtd <= 0) throw new Error('Quantidade inválida.');
      const preco = empresa.ipo.preco;
      const custo = Math.round(preco * qtd * 100) / 100;
      const taxa = Math.max(5, Math.round(custo * 0.0025));
      const total = custo + taxa;

      // Compra via PF
      if (CGL.Finance?.debitPersonal) {
        CGL.Finance.debitPersonal(state, total, {
          categoria: 'acoes_compra',
          descricao: `Compra ${qtd} ${empresa.ipo.ticker}`
        });
      } else {
        if ((state.player.dinheiro || 0) < total) throw new Error('Saldo PF insuficiente.');
        state.player.dinheiro -= total;
      }

      let pos = m.carteiraJogador.find((p) => p.empresaId === empresaId);
      if (!pos) {
        pos = { empresaId, acoes: 0, custoMedio: 0, ticker: empresa.ipo.ticker };
        m.carteiraJogador.push(pos);
      }
      const novoCusto = pos.acoes * pos.custoMedio + custo;
      pos.acoes += qtd;
      pos.custoMedio = pos.acoes > 0 ? Math.round((novoCusto / pos.acoes) * 100) / 100 : 0;
      pos.ticker = empresa.ipo.ticker;

      // Participação societária aproximada (free float)
      this._syncPlayerListedStake(state, empresa, pos);

      empresa.ipo.volumeSemanal = (empresa.ipo.volumeSemanal || 0) + qtd;
      // Leve pressão de alta
      empresa.ipo.preco = Math.round(empresa.ipo.preco * (1 + Math.min(0.02, qtd / empresa.ipo.acoes)) * 100) / 100;
      this._updateListedMetrics(empresa, state);

      m.historicoOps.push({
        semana: state.world?.semanaAtual || 0,
        tipo: 'compra_acoes',
        empresaId,
        qtd,
        preco,
        total
      });

      // Hook M&A hostil: participação relevante
      const stakePct = (pos.acoes / empresa.ipo.acoes) * 100;
      if (stakePct >= 10 && empresa.concorrente) {
        m.ma.ofertasHostis.push({
          id: CGL.Utils.uuid(),
          alvoId: empresaId,
          semana: state.world?.semanaAtual || 0,
          stakePct: Math.round(stakePct * 10) / 10,
          status: 'observacao'
        });
      }

      return { qtd, preco, total, taxa, posicao: pos, stakePct: Math.round(stakePct * 100) / 100 };
    },

    sellShares(state, empresaId, quantidade) {
      const m = this.ensureMarket(state);
      const empresa = CGL.Company.getById(state, empresaId);
      if (!empresa?.ipo?.listada) throw new Error('Empresa não listada.');
      const pos = m.carteiraJogador.find((p) => p.empresaId === empresaId);
      const qtd = Math.floor(Number(quantidade) || 0);
      if (!pos || qtd <= 0 || qtd > pos.acoes) throw new Error('Posição insuficiente.');

      const preco = empresa.ipo.preco;
      const bruto = Math.round(preco * qtd * 100) / 100;
      const taxa = Math.max(5, Math.round(bruto * 0.0025));
      const liquido = bruto - taxa;

      if (CGL.Finance?.creditPersonal) {
        CGL.Finance.creditPersonal(state, liquido, {
          categoria: 'acoes_venda',
          descricao: `Venda ${qtd} ${empresa.ipo.ticker}`
        });
      } else {
        state.player.dinheiro = (state.player.dinheiro || 0) + liquido;
      }

      pos.acoes -= qtd;
      if (pos.acoes <= 0) {
        m.carteiraJogador = m.carteiraJogador.filter((p) => p.empresaId !== empresaId);
      }
      this._syncPlayerListedStake(state, empresa, pos.acoes > 0 ? pos : null);

      empresa.ipo.volumeSemanal = (empresa.ipo.volumeSemanal || 0) + qtd;
      empresa.ipo.preco = Math.max(
        0.1,
        Math.round(empresa.ipo.preco * (1 - Math.min(0.02, qtd / empresa.ipo.acoes)) * 100) / 100
      );
      this._updateListedMetrics(empresa, state);

      m.historicoOps.push({
        semana: state.world?.semanaAtual || 0,
        tipo: 'venda_acoes',
        empresaId,
        qtd,
        preco,
        liquido
      });

      return { qtd, preco, liquido, taxa };
    },

    _syncPlayerListedStake(state, empresa, pos) {
      // Mantém sócio tipo jogador alinhado com ações + participação privada residual
      if (!empresa || empresa.concorrente) return;
      const jog = (empresa.socios || []).find(
        (s) => s.tipo === 'jogador' || s.playerId === state.player?.id
      );
      if (!jog || !empresa.ipo?.acoes) return;
      // Não sobrescreve controle privado; só anota posição em bolsa
      jog.acoesBolsa = pos ? pos.acoes : 0;
    },

    portfolioValue(state) {
      const m = this.ensureMarket(state);
      let total = 0;
      m.carteiraJogador.forEach((p) => {
        const e = CGL.Company.getById(state, p.empresaId);
        if (e?.ipo?.listada) total += p.acoes * e.ipo.preco;
      });
      return Math.round(total);
    },

    /* ========== Reação a política de dividendos (listadas) ========== */

    onDividendPolicyChange(state, empresaId, policyId) {
      const empresa = CGL.Company.getById(state, empresaId);
      if (!empresa?.ipo?.listada) return null;
      this.ensureCompanyMarket(empresa, state);
      const pol = CGL.Data.getDividendPolicyById(policyId);
      const deltaConf = (pol.satisfacaoDelta || 0) * 5;
      empresa.confiancaMercado = CGL.Utils.clamp(
        (empresa.confiancaMercado || 50) + deltaConf,
        0,
        100
      );
      // Preço reage: payout alto → alta imediata; reinvestimento → leve queda curto prazo
      const priceDelta = pol.payout >= 0.4 ? 0.02 + pol.payout * 0.02 : -0.015;
      empresa.ipo.preco = Math.max(
        0.1,
        Math.round(empresa.ipo.preco * (1 + priceDelta) * 100) / 100
      );
      const mercado = (empresa.socios || []).find((s) => s.tipo === 'mercado');
      if (mercado) {
        mercado.satisfacao = CGL.Utils.clamp(
          (mercado.satisfacao || 55) + pol.satisfacaoDelta * 3,
          0,
          100
        );
      }
      empresa.boardPressure.nivel = CGL.Utils.clamp(
        (empresa.boardPressure.nivel || 0) + (pol.payout < 0.15 ? 5 : -3),
        0,
        100
      );
      this._updateListedMetrics(empresa, state);
      return {
        confianca: empresa.confiancaMercado,
        preco: empresa.ipo.preco,
        pressao: empresa.boardPressure.nivel
      };
    },

    /* ========== M&A avançado (hooks) ========== */

    /**
     * Hooks para Fase futura: due diligence, hostil, integração.
     * Aquisição via bolsa se stake listada for alta o bastante.
     */
    hostileTakeoverHook(state, alvoId) {
      const m = this.ensureMarket(state);
      const alvo = CGL.Company.getById(state, alvoId);
      if (!alvo?.ipo?.listada) throw new Error('Alvo não listado.');
      const pos = this.getPlayerPosition(state, alvoId);
      const stakePct = pos ? (pos.acoes / alvo.ipo.acoes) * 100 : 0;
      const hook = {
        id: CGL.Utils.uuid(),
        alvoId,
        semana: state.world?.semanaAtual || 0,
        stakePct: Math.round(stakePct * 10) / 10,
        status: stakePct >= 30 ? 'oferta_possivel' : 'insuficiente',
        precoSugerido: Math.round(this.calcValuation(alvo, state) * 1.15),
        dueDiligence: false,
        aprovacaoSocietaria: false,
        integracao: false
      };
      m.ma.ofertasHostis.push(hook);
      return hook;
    },

    startDueDiligence(state, alvoId) {
      const m = this.ensureMarket(state);
      const alvo = CGL.Company.getById(state, alvoId);
      if (!alvo) throw new Error('Alvo inválido.');
      const dd = {
        id: CGL.Utils.uuid(),
        alvoId,
        semana: state.world?.semanaAtual || 0,
        valuation: this.calcValuation(alvo, state),
        rating: alvo.rating?.nota || 'N/A',
        riscos: [],
        status: 'em_andamento'
      };
      if ((alvo.finance?.falencia?.estagio || 0) >= 2) dd.riscos.push('insolvencia');
      if ((alvo.rating?.score || 50) < 45) dd.riscos.push('rating_baixo');
      if ((alvo.endividamento || 0) > (alvo.patrimonioLiquido || 1)) dd.riscos.push('alavancagem');
      m.ma.dueDiligence.push(dd);
      return dd;
    },

    /* ========== Tick semanal ========== */

    weeklyTick(state) {
      const m = this.ensureMarket(state);
      const semana = state.world?.semanaAtual || 0;
      m.semanaUltimoTick = semana;

      const empresas = CGL.Company.listAll(state).filter((e) => e.ativa);
      empresas.forEach((empresa) => {
        this.ensureCompanyMarket(empresa, state);
        this.syncBankRelationshipsFromAccounts(empresa, state);
        this.updateCreditRating(empresa, state);
        this.calcCapitalStructure(empresa, state);
        this.updateMarketConfidence(empresa, state);
        this._cashReserveDrag(empresa);

        // Pressão do conselho em listadas
        if (empresa.ipo?.listada) {
          const crescimento = empresa.crescimentoSemanal || 0;
          const meta = empresa.boardPressure?.metasCrescimento || 0.02;
          if (crescimento < meta * 0.5) {
            empresa.boardPressure.nivel = CGL.Utils.clamp(
              (empresa.boardPressure.nivel || 0) + 2,
              0,
              100
            );
          } else if (crescimento > meta) {
            empresa.boardPressure.nivel = CGL.Utils.clamp(
              (empresa.boardPressure.nivel || 0) - 1.5,
              0,
              100
            );
          }
          empresa.ipo.conselhoPressao = empresa.boardPressure.nivel;
        }
      });

      // Ofertas espontâneas (jogadores)
      CGL.Company.listPlayerCompanies(state).forEach((empresa) => {
        if (empresa.ipo?.listada) return;
        const chance = 0.08 + ((empresa.confiancaMercado || 50) - 40) / 400;
        if (Math.random() < chance) {
          try { this.generateSpontaneousOffer(state, empresa); } catch (e) { /* ignore */ }
        }
      });

      // Expira ofertas
      m.ofertasPendentes.forEach((o) => {
        if (o.status === 'pendente' && semana > (o.expiresSemana || 0)) {
          o.status = 'expirada';
        }
      });

      // Lista alguns concorrentes maduros na bolsa
      const concorrentes = CGL.Company.listCompetitors(state);
      const listadosConc = concorrentes.filter((c) => c.ipo?.listada).length;
      if (listadosConc < 3 && concorrentes.length) {
        const cand = concorrentes
          .filter((c) => !c.ipo?.listada && (c.receita || 0) > 5000)
          .sort((a, b) => (b.receita || 0) - (a.receita || 0));
        if (cand[0] && Math.random() < 0.15) {
          this.listCompetitorOnExchange(state, cand[0]);
        }
      }

      this.tickListedPrices(state);

      // Dividendos de ações de terceiros na carteira (yield semanal aproximado)
      this._payPortfolioDividends(state);

      return m;
    },

    _payPortfolioDividends(state) {
      const m = this.ensureMarket(state);
      m.carteiraJogador.forEach((pos) => {
        const e = CGL.Company.getById(state, pos.empresaId);
        if (!e?.ipo?.listada || !pos.acoes) return;
        const y = e.ipo.dividendYield || 0;
        if (y <= 0) return;
        const semanal = Math.round(pos.acoes * e.ipo.preco * (y / 52));
        if (semanal < 1) return;
        if (CGL.Finance?.creditPersonal) {
          try {
            CGL.Finance.creditPersonal(state, semanal, {
              categoria: 'dividendos_acoes',
              descricao: `Proventos ${e.ipo.ticker}`
            });
          } catch (err) { /* ignore */ }
        }
      });
    },

    /* ========== Resumo UI ========== */

    dashboardSummary(state) {
      this.ensureMarket(state);
      const listadas = this.listListed(state);
      const ofertas = this.listPendingOffers(state);
      return {
        indice: state.market.bolsa.indice,
        listadas: listadas.length,
        ofertasPendentes: ofertas.length,
        carteira: this.portfolioValue(state),
        confiancaMedia: listadas.length
          ? Math.round(
            listadas.reduce((a, e) => a + (e.confiancaMercado || 50), 0) / listadas.length
          )
          : Math.round(state.economy?.indiceConfianca || 50)
      };
    }
  };

  function creditRank(nota) {
    const order = ['CCC', 'B', 'BB', 'BBB', 'A', 'AA', 'AAA'];
    const i = order.indexOf(nota);
    return i < 0 ? 0 : i;
  }

  global.CGL = global.CGL || {};
  global.CGL.Market = Market;
})(typeof window !== 'undefined' ? window : globalThis);
