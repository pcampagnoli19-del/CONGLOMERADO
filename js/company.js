/**
 * CONGLOMERADO — Empresas, holdings, filiais e concorrência (Fase 2)
 * Núcleo societário: constituição, valuation, M&A básico, tick semanal.
 */
(function (global) {
  'use strict';

  const BRAND_COLORS = [
    '#2ecc71', '#27ae60', '#1abc9c', '#3498db', '#2980b9',
    '#9b59b6', '#e67e22', '#d35400', '#e74c3c', '#c0392b',
    '#f1c40f', '#d4a84b', '#16a085', '#2c3e50', '#7f8c8d'
  ];

  const Company = {
    /* ========== Registro ========== */

    createEmptyRegistry() {
      return {
        empresas: [],
        holdings: [],
        participacoes: [],
        concorrentes: [],
        mercados: {},
        // Hooks Fase 3+
        finance: {},
        ipoStubs: [],
        internacional: {}
      };
    },

    /** Garante shape completo em saves antigos */
    ensureRegistry(reg) {
      if (!reg || typeof reg !== 'object') return this.createEmptyRegistry();
      return {
        ...this.createEmptyRegistry(),
        ...reg,
        empresas: Array.isArray(reg.empresas) ? reg.empresas : [],
        holdings: Array.isArray(reg.holdings) ? reg.holdings : [],
        participacoes: Array.isArray(reg.participacoes) ? reg.participacoes : [],
        concorrentes: Array.isArray(reg.concorrentes) ? reg.concorrentes : [],
        mercados: reg.mercados || {}
      };
    },

    listAll(state) {
      return this.ensureRegistry(state.companies).empresas;
    },

    getById(state, id) {
      return this.listAll(state).find((e) => e.id === id) || null;
    },

    /** Empresas com participação do jogador (>0%) */
    listPlayerCompanies(state) {
      return this.listAll(state).filter((e) => e.ativa && this.playerStake(e, state.player?.id) > 0);
    },

    listHoldings(state) {
      return this.listPlayerCompanies(state).filter((e) => e.isHolding);
    },

    listCompetitors(state) {
      return this.listAll(state).filter((e) => e.concorrente && e.ativa);
    },

    playerStake(empresa, playerId) {
      if (!empresa?.socios || !playerId) return 0;
      const s = empresa.socios.find((x) => x.tipo === 'jogador' || x.playerId === playerId);
      return s ? Number(s.percentual) || 0 : 0;
    },

    /* ========== CNPJ e logo ========== */

    /** CNPJ fictício único (formato XX.XXX.XXX/XXXX-XX) */
    generateCNPJ(registry) {
      const used = new Set(
        (registry?.empresas || []).map((e) => e.cnpj).filter(Boolean)
      );
      let cnpj;
      let tries = 0;
      do {
        const n = Array.from({ length: 12 }, () => CGL.Utils.randomInt(0, 9));
        // Dígitos verificadores fictícios (não-reais, só gameplay)
        const d1 = (n.reduce((a, b, i) => a + b * (i % 9 + 1), 0) % 11) % 10;
        const d2 = ((d1 * 2 + n.reduce((a, b) => a + b, 0)) % 11) % 10;
        const raw = n.join('') + d1 + d2;
        cnpj = `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}/${raw.slice(8, 12)}-${raw.slice(12)}`;
        tries++;
      } while (used.has(cnpj) && tries < 40);
      return cnpj;
    },

    /** Logo CSS simples a partir do nome */
    generateLogo(nome, cor) {
      const parts = String(nome || 'EM').trim().split(/\s+/).filter(Boolean);
      const initials = parts.length >= 2
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : (parts[0] || 'EM').slice(0, 2).toUpperCase();
      const color = cor || CGL.Utils.pick(BRAND_COLORS);
      const shapes = ['circle', 'rounded', 'diamond'];
      return {
        initials,
        color,
        shape: CGL.Utils.pick(shapes)
      };
    },

    logoHtml(logo, size = 'md') {
      if (!logo) return '';
      const esc = CGL.Utils.escapeHtml(logo.initials || '?');
      return `<span class="company-logo logo-${logo.shape || 'rounded'} logo-${size}" style="--logo-color:${logo.color || '#2ecc71'}" aria-hidden="true">${esc}</span>`;
    },

    /* ========== Criação ========== */

    /**
     * Constitui empresa a partir do formulário.
     * data: { nome, nomeFantasia, razaoSocial, corMarca, cidadeId, segmentoId,
     *         naturezaId, porte, capitalSocial, socios[], administradores[], isHolding? }
     */
    constitute(state, data) {
      const reg = this.ensureRegistry(state.companies);
      state.companies = reg;

      const natureza = CGL.Data.getLegalNatureById(data.naturezaId) || CGL.Data.getLegalNatureById('ltda');
      const segmento = CGL.Data.getSegmentById(data.segmentoId) || CGL.Data.getSegmentById('servicos');
      const city = CGL.Data.getCityById(data.cidadeId);
      if (!city) throw new Error('Cidade da sede inválida.');

      const capital = Math.max(Number(data.capitalSocial) || 0, natureza.capitalMin || 1000);
      const dinheiro = state.player.dinheiro || 0;

      // Participação do jogador no capital (aporte)
      const socios = this._normalizeSocios(data.socios, state.player, natureza);
      const playerPct = socios.find((s) => s.tipo === 'jogador')?.percentual || 100;
      const aporteJogador = capital * (playerPct / 100);

      if (aporteJogador > dinheiro + 0.01) {
        throw new Error(`Capital insuficiente. Você precisa aportar ${CGL.Utils.formatBRL(aporteJogador)}.`);
      }

      const cor = data.corMarca || CGL.Utils.pick(BRAND_COLORS);
      const nome = String(data.nome || '').trim();
      const nomeFantasia = String(data.nomeFantasia || nome).trim();
      const razao = String(data.razaoSocial || `${nome} ${natureza.sigla}`).trim();

      const empresa = {
        id: CGL.Utils.uuid(),
        nome,
        nomeFantasia,
        razaoSocial: razao,
        logo: this.generateLogo(nomeFantasia || nome, cor),
        corMarca: cor,
        cnpj: this.generateCNPJ(reg),
        naturezaId: natureza.id,
        segmentoId: segmento.id,
        porte: data.porte || 'micro',
        cidadeSedeId: city.id,
        estadoSede: city.estado,
        dataFundacao: state.world?.dataAtual || new Date().toISOString(),
        semanaFundacao: state.world?.semanaAtual || 1,
        capitalSocial: capital,
        caixa: capital * 0.85, // parte vira ativo operacional
        patrimonioLiquido: capital,
        receita: 0,
        custos: 0,
        lucro: 0,
        receitaAcumuladaAno: 0,
        endividamento: 0,
        funcionarios: this._initialHeadcount(data.porte || 'micro', natureza),
        participacaoMercado: 0.1,
        reputacao: this._defaultReputation(),
        eficiencia: CGL.Utils.clamp(40 + (state.player.atributos?.organizacao || 5) * 2, 30, 75),
        nivelTech: CGL.Utils.clamp(25 + (state.player.atributos?.criatividade || 5) * 1.5, 15, 60),
        cultura: CGL.Utils.clamp(45 + (state.player.atributos?.lideranca || 5), 30, 80),
        socios,
        administradores: this._normalizeAdmins(data.administradores, socios, state.player),
        filiais: [],
        participacoesDetidas: [], // { empresaId, percentual, tipo }
        isHolding: !!natureza.isHolding || !!data.isHolding,
        holdingTipo: natureza.holdingTipo || null,
        ativa: true,
        concorrente: false,
        fechada: false,
        crescimentoSemanal: 0,
        historico: [],
        // Finanças (Fase 3) — bootstrap após push
        finance: null,
        hr: { departamentos: [] },
        marketing: {},
        rd: {},
        logistics: {},
        international: {},
        holding: {},
        ipo: {
          elegivel: !!natureza.permiteIPO,
          listada: false,
          status: 'privada'
        }
      };

      this.addHistory(empresa, state, {
        tipo: 'fundacao',
        titulo: 'Fundação',
        descricao: `${empresa.nomeFantasia} constituída como ${natureza.nome} em ${city.nome}/${city.estado}. CNPJ ${empresa.cnpj}.`
      });

      // Debita capital do jogador
      state.player.dinheiro = dinheiro - aporteJogador;

      // Sócios NPC aportam "virtualmente" (não afetam caixa do jogador)
      reg.empresas.push(empresa);
      if (empresa.isHolding && !reg.holdings.includes(empresa.id)) {
        reg.holdings.push(empresa.id);
      }

      if (!state.player.empresasIds) state.player.empresasIds = [];
      state.player.empresasIds.push(empresa.id);

      state.statistics.companiesFounded = (state.statistics.companiesFounded || 0) + 1;

      // Fase 3–5: contas PJ + mercado de capitais
      if (CGL.Finance?.onCompanyCreated) {
        try { CGL.Finance.onCompanyCreated(empresa, state); } catch (err) { console.warn(err); }
      }
      if (CGL.Market?.ensureCompanyMarket) {
        try { CGL.Market.ensureCompanyMarket(empresa, state); } catch (err) { /* ok */ }
      }
      if (CGL.Hr?.onCompanyCreated) {
        try { CGL.Hr.onCompanyCreated(empresa, state); } catch (err) { console.warn(err); }
      }
      if (CGL.Marketing?.onCompanyCreated) {
        try { CGL.Marketing.onCompanyCreated(empresa, state); } catch (err) { console.warn(err); }
      }
      if (CGL.Rd?.onCompanyCreated) {
        try { CGL.Rd.onCompanyCreated(empresa, state); } catch (err) { console.warn(err); }
      }
      if (CGL.Logistics?.onCompanyCreated) {
        try { CGL.Logistics.onCompanyCreated(empresa, state); } catch (err) { console.warn(err); }
      }
      if (CGL.International?.onCompanyCreated) {
        try { CGL.International.onCompanyCreated(empresa, state); } catch (err) { console.warn(err); }
      }
      if (CGL.Holding?.onCompanyCreated) {
        try { CGL.Holding.onCompanyCreated(empresa, state); } catch (err) { console.warn(err); }
      }

      CGL.Player.addHistory(state, {
        tipo: 'empresa',
        titulo: 'Empresa fundada',
        descricao: `Fundou ${empresa.nomeFantasia} (${natureza.sigla}) com capital ${CGL.Utils.formatBRL(capital)}.`
      });

      this._recalcPlayerEquity(state);
      this._refreshMarketShares(state);

      return empresa;
    },

    _initialHeadcount(porte, natureza) {
      const map = { micro: 2, pequena: 12, media: 80, grande: 400, corporacao: 2000, conglomerado: 8000 };
      let n = map[porte] || 2;
      if (natureza?.isHolding) n = Math.max(1, Math.floor(n * 0.25));
      return n;
    },

    _defaultReputation() {
      return {
        geral: 50,
        qualidade: 55,
        atendimento: 50,
        salarios: 50,
        sustentabilidade: 45,
        contratos: 55,
        inovacao: 45,
        social: 50,
        escandalos: 0,
        acidentes: 0,
        processos: 0
      };
    },

    _normalizeSocios(input, player, natureza) {
      const list = Array.isArray(input) && input.length
        ? input.map((s) => ({
          id: s.id || CGL.Utils.uuid(),
          nome: s.nome || 'Sócio',
          tipo: s.tipo || 'npc',
          playerId: s.playerId || null,
          percentual: Number(s.percentual) || 0,
          direitoDividendos: s.direitoDividendos !== false,
          poderVoto: Number(s.poderVoto) || Number(s.percentual) || 0,
          influencia: Number(s.influencia) || Number(s.percentual) || 0,
          satisfacao: Number(s.satisfacao) ?? 70
        }))
        : [{
          id: CGL.Utils.uuid(),
          nome: `${player.nome} ${player.sobrenome}`,
          tipo: 'jogador',
          playerId: player.id,
          percentual: 100,
          direitoDividendos: true,
          poderVoto: 100,
          influencia: 100,
          satisfacao: 80
        }];

      // Garante jogador presente
      if (!list.some((s) => s.tipo === 'jogador')) {
        list.unshift({
          id: CGL.Utils.uuid(),
          nome: `${player.nome} ${player.sobrenome}`,
          tipo: 'jogador',
          playerId: player.id,
          percentual: 0,
          direitoDividendos: true,
          poderVoto: 0,
          influencia: 0,
          satisfacao: 80
        });
      }

      // Normaliza percentuais para 100%
      const sum = list.reduce((a, s) => a + s.percentual, 0) || 100;
      list.forEach((s) => {
        s.percentual = Math.round((s.percentual / sum) * 1000) / 10;
        s.poderVoto = s.percentual;
        s.influencia = s.percentual;
      });
      // Ajuste de arredondamento
      const sum2 = list.reduce((a, s) => a + s.percentual, 0);
      if (Math.abs(sum2 - 100) > 0.05) {
        const jog = list.find((s) => s.tipo === 'jogador');
        if (jog) jog.percentual = Math.round((jog.percentual + (100 - sum2)) * 10) / 10;
      }

      const max = natureza?.sociosMax || 50;
      const min = natureza?.sociosMin || 1;
      if (list.length > max) list.length = max;
      if (list.length < min && natureza?.id === 'cooperativa') {
        // Completa cooperados fictícios
        while (list.length < min) {
          const names = CGL.Data.names;
          const n = CGL.Utils.pick(names?.FIRST_M || ['Ana']) + ' ' + CGL.Utils.pick(names?.SURNAMES || ['Silva']);
          list.push({
            id: CGL.Utils.uuid(),
            nome: n,
            tipo: 'npc',
            percentual: 0,
            direitoDividendos: true,
            poderVoto: 0,
            influencia: 0,
            satisfacao: 65
          });
        }
        const eq = Math.floor(1000 / list.length) / 10;
        list.forEach((s) => { s.percentual = eq; s.poderVoto = eq; s.influencia = eq; });
        list[0].percentual = Math.round((100 - eq * (list.length - 1)) * 10) / 10;
      }

      return list;
    },

    _normalizeAdmins(input, socios, player) {
      const jog = socios.find((s) => s.tipo === 'jogador');
      const nomeJog = `${player.nome} ${player.sobrenome}`;
      if (Array.isArray(input) && input.length) {
        return input.map((a) => {
          const linkedJog = a.socioId === jog?.id ||
            (a.nome && a.nome.toLowerCase() === nomeJog.toLowerCase());
          return {
            id: a.id || CGL.Utils.uuid(),
            nome: a.nome,
            cargo: a.cargo || 'Administrador',
            socioId: a.socioId || (linkedJog ? jog?.id : null) || null,
            playerId: linkedJog ? player.id : (a.playerId || null),
            proLaboreMensal: a.proLaboreMensal != null ? a.proLaboreMensal : null,
            ehContratado: a.ehContratado != null ? !!a.ehContratado : !linkedJog,
            satisfacao: a.satisfacao != null ? a.satisfacao : (linkedJog ? 80 : 70)
          };
        });
      }
      return [{
        id: CGL.Utils.uuid(),
        nome: nomeJog,
        cargo: 'Administrador',
        socioId: jog?.id || null,
        playerId: player.id,
        proLaboreMensal: null,
        ehContratado: false,
        satisfacao: 80
      }];
    },

    /* ========== Histórico ========== */

    addHistory(empresa, state, entry) {
      if (!empresa.historico) empresa.historico = [];
      empresa.historico.unshift({
        id: CGL.Utils.uuid(),
        semana: state.world?.semanaAtual || 1,
        data: state.world?.dataAtual || new Date().toISOString(),
        tipo: entry.tipo || 'geral',
        titulo: entry.titulo || 'Evento',
        descricao: entry.descricao || ''
      });
      if (empresa.historico.length > 200) empresa.historico.length = 200;
    },

    /* ========== Valuation ========== */

    /**
     * Valuation dinâmico: patrimônio, caixa, lucro, dívida, reputação, eficiência, mercado.
     */
    calcValuation(empresa, state) {
      if (!empresa || !empresa.ativa) return 0;
      const pl = empresa.patrimonioLiquido || 0;
      const caixa = empresa.caixa || 0;
      const lucroAnualEst = (empresa.lucro || 0) * 52;
      const receitaAnual = empresa.receitaAcumuladaAno || (empresa.receita || 0) * 52;
      const dívida = empresa.endividamento || 0;
      const rep = (empresa.reputacao?.geral ?? 50) / 100;
      const eff = (empresa.eficiencia || 50) / 100;
      const tech = (empresa.nivelTech || 30) / 100;
      const growth = 1 + CGL.Utils.clamp(empresa.crescimentoSemanal || 0, -0.05, 0.08) * 8;
      const market = 1 + ((empresa.participacaoMercado || 0) / 100) * 0.5;

      // Participações detidas (holdings)
      let holdingsValue = 0;
      (empresa.participacoesDetidas || []).forEach((p) => {
        const sub = this.getById(state, p.empresaId);
        if (sub && sub.ativa && sub.id !== empresa.id) {
          // Evita recursão profunda: usa PL + caixa * stake
          const base = (sub.patrimonioLiquido || 0) + (sub.caixa || 0) * 0.5;
          holdingsValue += base * ((p.percentual || 0) / 100);
        }
      });

      const multiple = 4 + rep * 4 + eff * 2 + tech * 2;
      const earningsValue = Math.max(0, lucroAnualEst) * multiple * growth * market;
      const assetValue = pl * 0.7 + caixa * 0.9 + receitaAnual * 0.15 + holdingsValue;
      const raw = assetValue + earningsValue - dívida * 0.8;
      return Math.max(1000, Math.round(raw));
    },

    calcReputationScore(rep) {
      if (!rep) return 50;
      const pos =
        (rep.qualidade || 50) * 0.18 +
        (rep.atendimento || 50) * 0.12 +
        (rep.salarios || 50) * 0.1 +
        (rep.sustentabilidade || 50) * 0.1 +
        (rep.contratos || 50) * 0.15 +
        (rep.inovacao || 50) * 0.12 +
        (rep.social || 50) * 0.08;
      const neg = (rep.escandalos || 0) * 0.4 + (rep.acidentes || 0) * 0.3 + (rep.processos || 0) * 0.25;
      return CGL.Utils.clamp(pos - neg, 0, 100);
    },

    updatePorte(empresa) {
      const receitaAnual = empresa.receitaAcumuladaAno || (empresa.receita || 0) * 52;
      const tiers = CGL.Data.sizeTiers || [];
      let porte = 'micro';
      for (const t of tiers) {
        if (receitaAnual <= t.receitaMax || t.receitaMax === Infinity) {
          porte = t.id;
          break;
        }
      }
      // Conglomerado se holding com várias controladas
      if (empresa.isHolding && (empresa.participacoesDetidas || []).filter((p) => p.percentual >= 50).length >= 3) {
        porte = 'conglomerado';
      }
      if (empresa.porte !== porte) {
        const prev = empresa.porte;
        empresa.porte = porte;
        return { changed: true, from: prev, to: porte };
      }
      return { changed: false };
    },

    /* ========== Filiais ========== */

    openBranch(state, empresaId, cidadeId, opts = {}) {
      const empresa = this.getById(state, empresaId);
      if (!empresa || !empresa.ativa) throw new Error('Empresa inválida.');
      // Concorrentes (IA) abrem filiais sem checagem de controle do jogador
      if (!empresa.concorrente && this.playerStake(empresa, state.player.id) < 50) {
        throw new Error('É preciso controle (≥50%) para abrir filiais.');
      }
      const city = CGL.Data.getCityById(cidadeId);
      if (!city) throw new Error('Cidade inválida.');

      // Custo escala com porte (micro consegue abrir filiais modestas)
      const porteMult = { micro: 0.35, pequena: 0.55, media: 1, grande: 1.4, corporacao: 1.8, conglomerado: 2.2 };
      const pm = porteMult[empresa.porte] || 0.5;
      const area = opts.areaM2 || CGL.Utils.randomInt(80, 280);
      const funcionarios = opts.funcionarios || CGL.Utils.randomInt(2, 10);
      const custo = opts.custo || Math.round((8000 + city.custoVida * 180 + area * 18) * pm);
      if ((empresa.caixa || 0) < custo) {
        throw new Error(`Caixa insuficiente para a filial (custo ~${CGL.Utils.formatBRL(custo)}).`);
      }
      const filial = {
        id: CGL.Utils.uuid(),
        cidadeId: city.id,
        estado: city.estado,
        areaM2: area,
        capacidade: Math.round(area * 0.8),
        funcionarios,
        estoque: Math.round(custo * 0.15),
        receita: 0,
        custos: 0,
        rentabilidade: 0,
        semanaAbertura: state.world?.semanaAtual || 1
      };

      empresa.caixa -= custo;
      empresa.funcionarios = (empresa.funcionarios || 0) + funcionarios;
      empresa.filiais.push(filial);
      empresa.patrimonioLiquido = (empresa.patrimonioLiquido || 0) + custo * 0.4;

      this.addHistory(empresa, state, {
        tipo: 'filial',
        titulo: 'Nova filial',
        descricao: `Filial aberta em ${city.nome}/${city.estado} (${area} m², ${funcionarios} func.).`
      });

      this._recalcPlayerEquity(state);
      return filial;
    },

    /* ========== Holdings / participações ========== */

    classifyStake(pct) {
      if (pct >= 99.9) return 'integral';
      if (pct >= 50) return 'controlada';
      if (pct >= 20) return 'coligada';
      return 'minoritaria';
    },

    /**
     * Holding adquire participação em outra empresa.
     */
    acquireStake(state, holdingId, targetId, percentual, opts = {}) {
      const holding = this.getById(state, holdingId);
      const target = this.getById(state, targetId);
      if (!holding || !target) throw new Error('Empresa não encontrada.');
      if (!holding.ativa || !target.ativa) throw new Error('Empresa inativa.');
      if (holding.id === target.id) throw new Error('Não é possível adquirir a própria empresa.');

      const pct = CGL.Utils.clamp(Number(percentual) || 0, 0.1, 100);
      const valuation = this.calcValuation(target, state);
      const preco = opts.preco ?? Math.round(valuation * (pct / 100) * (opts.premium || 1.05));

      const payer = opts.pagarComCaixaEmpresa !== false ? holding : null;
      if (payer) {
        if ((holding.caixa || 0) < preco) throw new Error('Caixa da holding insuficiente.');
        holding.caixa -= preco;
      } else {
        if ((state.player.dinheiro || 0) < preco) throw new Error('Dinheiro pessoal insuficiente.');
        state.player.dinheiro -= preco;
      }

      // Remove participação de sócios NPC proporcionalmente (simplificado)
      this._diluteAndAssign(target, {
        id: CGL.Utils.uuid(),
        nome: holding.nomeFantasia,
        tipo: 'empresa',
        empresaId: holding.id,
        percentual: pct,
        direitoDividendos: true,
        poderVoto: pct,
        influencia: pct,
        satisfacao: 70
      });

      const tipo = this.classifyStake(this._stakeOfEntity(target, holding.id));
      const existing = (holding.participacoesDetidas || []).find((p) => p.empresaId === target.id);
      const totalPct = this._stakeOfEntity(target, holding.id);
      if (existing) {
        existing.percentual = totalPct;
        existing.tipo = this.classifyStake(totalPct);
      } else {
        holding.participacoesDetidas = holding.participacoesDetidas || [];
        holding.participacoesDetidas.push({
          empresaId: target.id,
          percentual: totalPct,
          tipo: this.classifyStake(totalPct)
        });
      }

      const reg = this.ensureRegistry(state.companies);
      reg.participacoes.push({
        id: CGL.Utils.uuid(),
        de: holding.id,
        para: target.id,
        percentual: totalPct,
        tipo,
        semana: state.world?.semanaAtual || 1
      });

      this.addHistory(holding, state, {
        tipo: 'aquisicao',
        titulo: 'Participação adquirida',
        descricao: `Adquiriu ${pct}% de ${target.nomeFantasia} por ${CGL.Utils.formatBRL(preco)} (${tipo}).`
      });
      this.addHistory(target, state, {
        tipo: 'societario',
        titulo: 'Mudança societária',
        descricao: `${holding.nomeFantasia} passou a deter participação relevante.`
      });

      this._recalcPlayerEquity(state);
      return { preco, tipo, percentual: totalPct };
    },

    _stakeOfEntity(empresa, entityId) {
      return (empresa.socios || [])
        .filter((s) => s.empresaId === entityId || s.id === entityId)
        .reduce((a, s) => a + (s.percentual || 0), 0);
    },

    _diluteAndAssign(empresa, newSocio) {
      const pct = newSocio.percentual;
      const others = (empresa.socios || []).filter((s) => !(s.tipo === 'empresa' && s.empresaId === newSocio.empresaId));
      const keep = 100 - pct;
      const sum = others.reduce((a, s) => a + s.percentual, 0) || 1;
      others.forEach((s) => {
        s.percentual = Math.round((s.percentual / sum) * keep * 10) / 10;
        s.poderVoto = s.percentual;
        s.influencia = s.percentual;
      });
      const existing = (empresa.socios || []).find((s) => s.tipo === 'empresa' && s.empresaId === newSocio.empresaId);
      if (existing) {
        existing.percentual = Math.round((existing.percentual + pct) * 10) / 10;
        existing.poderVoto = existing.percentual;
        existing.influencia = existing.percentual;
        empresa.socios = [...others.filter((s) => s !== existing), existing];
      } else {
        empresa.socios = [...others, newSocio];
      }
      // Renormaliza
      const total = empresa.socios.reduce((a, s) => a + s.percentual, 0);
      if (Math.abs(total - 100) > 0.2) {
        empresa.socios.forEach((s) => {
          s.percentual = Math.round((s.percentual / total) * 1000) / 10;
        });
      }
    },

    /* ========== Compra / venda / fusão / encerramento ========== */

    buyCompany(state, targetId, opts = {}) {
      const target = this.getById(state, targetId);
      if (!target || !target.ativa) throw new Error('Empresa indisponível.');
      const valuation = this.calcValuation(target, state);
      const preco = opts.preco ?? Math.round(valuation * 1.08);
      const buyerHoldingId = opts.holdingId || null;

      if (buyerHoldingId) {
        return this.acquireStake(state, buyerHoldingId, targetId, 100, { preco, premium: 1 });
      }

      if ((state.player.dinheiro || 0) < preco) throw new Error('Dinheiro insuficiente.');
      state.player.dinheiro -= preco;

      // Jogador assume 100%
      target.socios = [{
        id: CGL.Utils.uuid(),
        nome: `${state.player.nome} ${state.player.sobrenome}`,
        tipo: 'jogador',
        playerId: state.player.id,
        percentual: 100,
        direitoDividendos: true,
        poderVoto: 100,
        influencia: 100,
        satisfacao: 80
      }];
      target.concorrente = false;
      target.administradores = [{
        id: CGL.Utils.uuid(),
        nome: `${state.player.nome} ${state.player.sobrenome}`,
        cargo: 'Administrador',
        socioId: target.socios[0].id
      }];

      if (!state.player.empresasIds.includes(target.id)) {
        state.player.empresasIds.push(target.id);
      }

      const reg = this.ensureRegistry(state.companies);
      reg.concorrentes = reg.concorrentes.filter((id) => id !== target.id);

      this.addHistory(target, state, {
        tipo: 'aquisicao',
        titulo: 'Empresa adquirida',
        descricao: `Adquirida pelo jogador por ${CGL.Utils.formatBRL(preco)}.`
      });
      CGL.Player.addHistory(state, {
        tipo: 'empresa',
        titulo: 'Aquisição',
        descricao: `Comprou ${target.nomeFantasia} por ${CGL.Utils.formatBRL(preco)}.`
      });

      this._recalcPlayerEquity(state);
      return { preco, empresa: target };
    },

    sellCompany(state, empresaId, opts = {}) {
      const empresa = this.getById(state, empresaId);
      if (!empresa || !empresa.ativa) throw new Error('Empresa inválida.');
      const stake = this.playerStake(empresa, state.player.id);
      if (stake <= 0) throw new Error('Você não possui participação.');

      const valuation = this.calcValuation(empresa, state);
      const preco = opts.preco ?? Math.round(valuation * (stake / 100) * 0.95);
      // Canal formal PF: venda de participação (não mistura caixa PJ)
      if (CGL.Finance?.creditEquitySale) {
        CGL.Finance.creditEquitySale(state, preco, empresa.nomeFantasia);
      } else {
        state.player.dinheiro = (state.player.dinheiro || 0) + preco;
      }

      if (stake >= 99 || opts.venderTudo) {
        // Vende a terceiros (vira concorrente ou fecha no mercado)
        empresa.socios = [{
          id: CGL.Utils.uuid(),
          nome: opts.compradorNome || 'Grupo investidor privado',
          tipo: 'npc',
          percentual: 100,
          direitoDividendos: true,
          poderVoto: 100,
          influencia: 100,
          satisfacao: 60
        }];
        empresa.concorrente = true;
        const reg = this.ensureRegistry(state.companies);
        if (!reg.concorrentes.includes(empresa.id)) reg.concorrentes.push(empresa.id);
        state.player.empresasIds = (state.player.empresasIds || []).filter((id) => id !== empresa.id);
      } else {
        const jog = empresa.socios.find((s) => s.tipo === 'jogador');
        const sold = stake;
        jog.percentual = 0;
        empresa.socios = empresa.socios.filter((s) => s.percentual > 0 || s.tipo !== 'jogador');
        // Redistribui ao mercado NPC
        const npc = {
          id: CGL.Utils.uuid(),
          nome: 'Investidores de mercado',
          tipo: 'npc',
          percentual: sold,
          direitoDividendos: true,
          poderVoto: sold,
          influencia: sold,
          satisfacao: 55
        };
        empresa.socios.push(npc);
      }

      this.addHistory(empresa, state, {
        tipo: 'venda',
        titulo: 'Venda de participação',
        descricao: `Participação vendida por ${CGL.Utils.formatBRL(preco)}.`
      });
      this._recalcPlayerEquity(state);
      return { preco };
    },

    mergeCompanies(state, survivorId, absorbedId) {
      const a = this.getById(state, survivorId);
      const b = this.getById(state, absorbedId);
      if (!a || !b || !a.ativa || !b.ativa) throw new Error('Empresas inválidas para fusão.');
      if (this.playerStake(a, state.player.id) < 50 || this.playerStake(b, state.player.id) < 50) {
        throw new Error('É preciso controle de ambas para fusionar.');
      }

      a.caixa += b.caixa || 0;
      a.patrimonioLiquido += b.patrimonioLiquido || 0;
      a.funcionarios += b.funcionarios || 0;
      a.endividamento += b.endividamento || 0;
      a.filiais = [...(a.filiais || []), ...(b.filiais || [])];
      a.capitalSocial += b.capitalSocial || 0;
      a.eficiencia = Math.round(((a.eficiencia || 50) + (b.eficiencia || 50)) / 2 * 0.95);
      a.cultura = Math.round(((a.cultura || 50) + (b.cultura || 50)) / 2);

      b.ativa = false;
      b.fechada = true;
      b.caixa = 0;

      this.addHistory(a, state, {
        tipo: 'fusao',
        titulo: 'Fusão',
        descricao: `${b.nomeFantasia} incorporada. Sinergias parciais aplicadas.`
      });
      this.addHistory(b, state, {
        tipo: 'fusao',
        titulo: 'Incorporada',
        descricao: `Incorporada por ${a.nomeFantasia}.`
      });

      state.player.empresasIds = (state.player.empresasIds || []).filter((id) => id !== b.id);
      this._recalcPlayerEquity(state);
      this._refreshMarketShares(state);
      return a;
    },

    closeCompany(state, empresaId) {
      const empresa = this.getById(state, empresaId);
      if (!empresa || !empresa.ativa) throw new Error('Empresa inválida.');
      if (this.playerStake(empresa, state.player.id) < 50) {
        throw new Error('Controle necessário para encerrar.');
      }

      const residual = Math.max(0, (empresa.caixa || 0) - (empresa.endividamento || 0) * 0.5);
      const stake = this.playerStake(empresa, state.player.id) / 100;
      const payout = Math.round(residual * stake);
      // Liquidação = restituição residual (canal formal PF; não mistura gasto livre)
      if (payout > 0) {
        const debitavel = Math.min(payout, empresa.caixa || 0);
        try {
          if (debitavel > 0 && empresa.finance && CGL.Finance?.debitEmpresa) {
            CGL.Finance.debitEmpresa(state, empresaId, debitavel, {
              categoria: 'restituicao_capital',
              descricao: 'Liquidação — restituição ao sócio'
            });
          }
          if (CGL.Finance?.creditPersonal) {
            CGL.Finance.creditPersonal(state, payout, {
              categoria: 'restituicao_capital_recebida',
              descricao: `Liquidação — ${empresa.nomeFantasia}`
            });
          } else {
            state.player.dinheiro = (state.player.dinheiro || 0) + payout;
          }
        } catch (e) {
          state.player.dinheiro = (state.player.dinheiro || 0) + payout;
        }
      }

      empresa.ativa = false;
      empresa.fechada = true;
      empresa.caixa = 0;

      this.addHistory(empresa, state, {
        tipo: 'encerramento',
        titulo: 'Encerramento',
        descricao: `Atividades encerradas. Liquidação ao jogador: ${CGL.Utils.formatBRL(payout)}.`
      });
      CGL.Player.addHistory(state, {
        tipo: 'empresa',
        titulo: 'Empresa encerrada',
        descricao: `${empresa.nomeFantasia} encerrou atividades.`
      });

      state.player.empresasIds = (state.player.empresasIds || []).filter((id) => id !== empresa.id);
      this._recalcPlayerEquity(state);
      return { payout };
    },

    /* ========== Concorrentes (IA stub) ========== */

    spawnCompetitor(state, segmentoId, cidadeId) {
      const reg = this.ensureRegistry(state.companies);
      const segmento = CGL.Data.getSegmentById(segmentoId) || CGL.Utils.pick(CGL.Data.segments);
      const city = CGL.Data.getCityById(cidadeId) || CGL.Utils.pick(CGL.Data.cities);
      const prefix = CGL.Utils.pick(['Grupo', 'Cia', 'Empresa', 'Indústria', 'Serviços', 'Tech', 'Brasil']);
      const suffix = CGL.Utils.pick(['Norte', 'Sul', 'Prime', 'Max', 'Global', 'Nacional', 'Plus', 'Alpha', 'Delta']);
      const root = CGL.Utils.pick(['Atlas', 'Vertex', 'Lumina', 'Forge', 'Nexus', 'Pulse', 'Horizon', 'Summit', 'Cascade', 'Pioneer']);
      const nome = `${prefix} ${root} ${suffix}`;
      const cor = CGL.Utils.pick(BRAND_COLORS);
      const capital = Math.round((segmento.capitalMin || 30000) * CGL.Utils.randomFloat(0.8, 3));

      const empresa = {
        id: CGL.Utils.uuid(),
        nome,
        nomeFantasia: nome,
        razaoSocial: `${nome} Ltda.`,
        logo: this.generateLogo(nome, cor),
        corMarca: cor,
        cnpj: this.generateCNPJ(reg),
        naturezaId: 'ltda',
        segmentoId: segmento.id,
        porte: 'pequena',
        cidadeSedeId: city.id,
        estadoSede: city.estado,
        dataFundacao: state.world?.dataAtual,
        semanaFundacao: state.world?.semanaAtual || 1,
        capitalSocial: capital,
        caixa: capital * 0.7,
        patrimonioLiquido: capital,
        receita: capital * 0.02,
        custos: capital * 0.015,
        lucro: capital * 0.005,
        receitaAcumuladaAno: 0,
        endividamento: CGL.Utils.randomInt(0, capital * 0.3),
        funcionarios: CGL.Utils.randomInt(8, 60),
        participacaoMercado: CGL.Utils.randomFloat(0.5, 4),
        reputacao: this._defaultReputation(),
        eficiencia: CGL.Utils.randomInt(40, 70),
        nivelTech: CGL.Utils.randomInt(25, 65),
        cultura: CGL.Utils.randomInt(40, 70),
        socios: [{
          id: CGL.Utils.uuid(),
          nome: 'Controladores privados',
          tipo: 'npc',
          percentual: 100,
          direitoDividendos: true,
          poderVoto: 100,
          influencia: 100,
          satisfacao: 60
        }],
        administradores: [{ id: CGL.Utils.uuid(), nome: 'Diretoria IA', cargo: 'CEO', socioId: null }],
        filiais: [],
        participacoesDetidas: [],
        isHolding: false,
        holdingTipo: null,
        ativa: true,
        concorrente: true,
        fechada: false,
        crescimentoSemanal: 0,
        historico: [],
        finance: {},
        hr: {},
        marketing: {},
        rd: {},
        logistics: {},
        international: {},
        ipo: { elegivel: false, listada: false, status: 'privada' },
        ai: {
          agressividade: CGL.Utils.randomFloat(0.3, 0.9),
          foco: CGL.Utils.pick(['crescimento', 'preco', 'qualidade', 'expansao']),
          personality: null
        }
      };
      if (CGL.Difficulty?.ensureCompetitorAI) {
        try { CGL.Difficulty.ensureCompetitorAI(empresa); } catch (err) { /* ok */ }
      }
      if (CGL.Market?.ensureCompanyMarket) {
        try { CGL.Market.ensureCompanyMarket(empresa, state); } catch (err) { /* ok */ }
      }
      if (CGL.Marketing?.ensureCompanyMarketing) {
        try { CGL.Marketing.ensureCompanyMarketing(empresa, state); } catch (err) { /* ok */ }
      }

      this.addHistory(empresa, state, {
        tipo: 'fundacao',
        titulo: 'Entrada no mercado',
        descricao: `Concorrente ${nome} surgiu em ${city.nome}/${city.estado} (${segmento.nome}).`
      });

      reg.empresas.push(empresa);
      reg.concorrentes.push(empresa.id);
      this._refreshMarketShares(state);
      return empresa;
    },

    /* ========== Tick semanal ========== */

    weeklyTick(state) {
      const reg = this.ensureRegistry(state.companies);
      state.companies = reg;

      // Chance de nascer concorrente (modulada pela dificuldade / sandbox)
      const spawnChance = CGL.Difficulty?.competitorSpawnChance
        ? CGL.Difficulty.competitorSpawnChance(state)
        : 0.08;
      if (spawnChance > 0
        && Math.random() < spawnChance
        && reg.empresas.filter((e) => e.concorrente && e.ativa).length < 40) {
        const seg = CGL.Utils.pick(CGL.Data.segments.filter((s) => s.id !== 'holding'));
        const city = CGL.Utils.pick(CGL.Data.cities.slice(0, 80));
        const c = this.spawnCompetitor(state, seg.id, city.id);
        if (Math.random() < 0.35) {
          CGL.Events.notify('alert', 'Novo concorrente', `${c.nomeFantasia} entrou em ${seg.nome}.`);
        }
      }

      reg.empresas.forEach((empresa) => {
        if (!empresa.ativa) return;
        this._weeklyOperate(empresa, state);
        if (empresa.concorrente) this._weeklyCompetitorAI(empresa, state);
      });

      this._refreshMarketShares(state);
      this._recalcPlayerEquity(state);
      return reg;
    },

    _weeklyOperate(empresa, state) {
      const seg = CGL.Data.getSegmentById(empresa.segmentoId);
      const stateMult = CGL.Data.stateProfitMult(empresa.estadoSede) || 1;
      const natureza = CGL.Data.getLegalNatureById(empresa.naturezaId);
      const rep = this.calcReputationScore(empresa.reputacao);
      empresa.reputacao.geral = rep;

      // Receita base: capital + headcount (micro começa perto do break-even)
      const base = (empresa.capitalSocial || 10000) * 0.012 + (empresa.funcionarios || 1) * 950;
      let eff = (empresa.eficiencia || 50) / 100;
      let tech = (empresa.nivelTech || 30) / 100;
      const culture = (empresa.cultura || 50) / 100;
      const marginBase = (seg?.margem || 0.12) * (natureza?.impostoMult ? (2 - natureza.impostoMult) : 1);
      // Fase 8: demanda por marca/preço/qualidade/distribuição/ads/concorrência — não só por existir
      let mktDemand = 1;
      let marginMult = 1;
      let mktCost = 0;
      if (CGL.Marketing?.calcDemandFactors) {
        try {
          CGL.Marketing.ensureCompanyMarketing(empresa, state);
          const dem = CGL.Marketing.calcDemandFactors(empresa, state);
          mktDemand = dem?.fator || 1;
          marginMult = CGL.Marketing.calcMarginMult(empresa) || 1;
          mktCost = CGL.Marketing.weeklyMarketingCostEstimate(empresa) || 0;
          if (empresa.marketing) empresa.marketing.custoSemanal = Math.round(mktCost);
          if (CGL.Marketing.syncFinanceHook) CGL.Marketing.syncFinanceHook(empresa, state);
        } catch (e) { /* fallback legado */ }
      }
      // Fase 9: P&D — eficiência, tech, demanda de produtos, custos e obsolescência
      let rdCost = 0;
      let rdCostCut = 0;
      if (CGL.Rd?.ensureCompanyRd) {
        try {
          CGL.Rd.ensureCompanyRd(empresa, state);
          const effM = CGL.Rd.efficiencyMult(empresa) || 1;
          eff = CGL.Utils.clamp(eff * effM, 0.1, 1.4);
          tech = CGL.Utils.clamp((empresa.rd.dept.nivelTech || empresa.nivelTech || 30) / 100, 0.05, 1);
          mktDemand *= CGL.Rd.productDemandBoost(empresa) || 1;
          rdCostCut = CGL.Rd.costReduction(empresa) || 0;
          rdCost = CGL.Rd.weeklyRdCostEstimate(empresa) || 0;
          if (CGL.Rd.syncFinanceHook) CGL.Rd.syncFinanceHook(empresa, state);
        } catch (e) { /* ok */ }
      }
      // Fase 10: logística — produção depende de materiais; distribuição e custos
      let logCost = 0;
      let logProd = 1;
      if (CGL.Logistics?.ensureCompanyLogistics) {
        try {
          CGL.Logistics.ensureCompanyLogistics(empresa, state);
          CGL.Logistics._updateChainHealth(empresa);
          logProd = CGL.Logistics.productionMult(empresa) || 1;
          mktDemand *= CGL.Logistics.distributionBoost(empresa) || 1;
          logCost = CGL.Logistics.weeklyLogisticsCostEstimate(empresa, state) || 0;
          if (CGL.Logistics.syncFinanceHook) CGL.Logistics.syncFinanceHook(empresa, state);
        } catch (e) { /* ok */ }
      }
      // Fase 11: internacional — receita/custo EXIM + boost de demanda global
      let intlCost = 0;
      let intlRev = 0;
      if (CGL.International?.ensureCompanyIntl) {
        try {
          CGL.International.ensureCompanyIntl(empresa, state);
          mktDemand *= CGL.International.intlDemandBoost(empresa, state) || 1;
          intlCost = CGL.International.weeklyIntlCostEstimate(empresa, state) || 0;
          intlRev = CGL.International.weeklyIntlRevenue(empresa, state) || 0;
          if (CGL.International.syncFinanceHook) CGL.International.syncFinanceHook(empresa, state);
        } catch (e) { /* ok */ }
      }
      // Fase 12: holding — sinergias, marca do grupo, custos corporativos compartilhados
      let holdingCost = 0;
      let synRev = 1;
      let synCost = 1;
      let sharedRelief = 1;
      if (CGL.Holding?.ensureCompanyHolding) {
        try {
          CGL.Holding.ensureCompanyHolding(empresa, state);
          synRev = CGL.Holding.synergyRevenueMult(empresa) || 1;
          synCost = CGL.Holding.synergyCostMult(empresa) || 1;
          sharedRelief = CGL.Holding.sharedCostRelief(empresa, state) || 1;
          if (empresa.isHolding) {
            holdingCost = CGL.Holding.weeklyHoldingCostEstimate(empresa, state) || 0;
          }
          mktDemand *= CGL.Holding.brandDemandMult(state) || 1;
          if (CGL.Holding.syncFinanceHook) CGL.Holding.syncFinanceHook(empresa, state);
        } catch (e) { /* ok */ }
      }
      const diffMargin = CGL.Difficulty?.marginMult
        ? CGL.Difficulty.marginMult(state)
        : 1;
      const diffTax = CGL.Difficulty?.taxMult
        ? CGL.Difficulty.taxMult(state)
        : 1;
      const margin = marginBase * marginMult * diffMargin;
      const demand = (seg?.crescimento || 1) * stateMult * (0.55 + rep / 350) * mktDemand;

      // Filiais
      let branchRev = 0;
      let branchCost = 0;
      (empresa.filiais || []).forEach((f) => {
        const fm = CGL.Data.stateProfitMult(f.estado) || 1;
        const rev = (f.capacidade || 100) * 15 * fm * (0.8 + eff * 0.4) * (0.7 + mktDemand * 0.3);
        const cost = rev * (0.75 - margin * 0.3) + (f.funcionarios || 0) * 600;
        f.receita = rev;
        f.custos = cost;
        f.rentabilidade = rev > 0 ? (rev - cost) / rev : 0;
        branchRev += rev;
        branchCost += cost;
      });

      let receita = base * demand * (0.75 + eff * 0.45 + tech * 0.2) * logProd + branchRev + intlRev;
      receita *= synRev;
      if (empresa.isHolding && natureza?.holdingTipo === 'patrimonial') {
        receita *= 0.35; // holding patrimonial: receita baixa operacional
      }

      // Custos: margem do segmento + cultura + marketing + P&D + logística + intl + holding − redução tech
      let custos = receita * (1 - margin * (0.85 + culture * 0.25)) + branchCost;
      custos += (empresa.endividamento || 0) * 0.002; // juros simplificados
      custos += mktCost;
      custos += rdCost;
      custos += logCost;
      custos += intlCost;
      custos += holdingCost;
      custos *= synCost;
      custos *= sharedRelief;
      custos *= 1 - Math.min(0.35, rdCostCut);
      custos *= (natureza?.impostoMult || 1) * (empresa.concorrente ? 1 : diffTax);
      if (!empresa.concorrente && (empresa.porte === 'micro' || empresa.porte === 'pequena')) {
        custos *= 0.92;
      }
      // Produtividade RH (dificuldade) — só jogador
      if (!empresa.concorrente && CGL.Difficulty?.hrProductivityMult) {
        receita *= 0.85 + 0.15 * CGL.Difficulty.hrProductivityMult(state);
      }
      // Concorrentes crescem conforme parâmetro
      if (empresa.concorrente && CGL.Difficulty?.mult) {
        const g = CGL.Difficulty.mult(state, 'crescimentoConcorrentes');
        receita *= 0.9 + 0.1 * g;
      }

      // Concorrência estrutural no segmento (pressão comercial extra já está em mktDemand)
      const rivals = this.listAll(state).filter(
        (e) => e.ativa && e.segmentoId === empresa.segmentoId && e.id !== empresa.id
      );
      const pressure = Math.min(0.25, rivals.length * 0.01 * (seg?.concorrencia || 0.5));
      receita *= 1 - pressure;

      const lucro = receita - custos;
      empresa.receita = Math.round(receita);
      empresa.custos = Math.round(custos);
      empresa.lucro = Math.round(lucro);
      empresa.caixa = Math.max(0, (empresa.caixa || 0) + lucro);
      empresa.patrimonioLiquido = Math.max(
        0,
        (empresa.patrimonioLiquido || 0) + lucro * 0.4
      );
      empresa.receitaAcumuladaAno = (empresa.receitaAcumuladaAno || 0) + receita;
      // Reset anual aproximado
      if ((state.world?.semanaAtual || 1) % 52 === 1 && state.world.semanaAtual > 1) {
        empresa.receitaAcumuladaAno = receita;
      }

      empresa.crescimentoSemanal = receita > 0
        ? CGL.Utils.clamp(lucro / Math.max(receita, 1), -0.2, 0.25)
        : 0;

      // Drift leve de atributos
      empresa.eficiencia = CGL.Utils.clamp(
        empresa.eficiencia + CGL.Utils.randomFloat(-0.8, 0.9) + (culture - 0.5),
        10,
        98
      );
      empresa.nivelTech = CGL.Utils.clamp(
        empresa.nivelTech + CGL.Utils.randomFloat(-0.3, 0.5),
        5,
        98
      );
      empresa.reputacao.qualidade = CGL.Utils.clamp(
        empresa.reputacao.qualidade + CGL.Utils.randomFloat(-0.5, 0.6),
        0,
        100
      );

      // Satisfação de sócios
      (empresa.socios || []).forEach((s) => {
        if (s.tipo === 'jogador') return;
        const delta = lucro > 0 ? CGL.Utils.randomFloat(0, 1.2) : CGL.Utils.randomFloat(-2, 0.2);
        s.satisfacao = CGL.Utils.clamp((s.satisfacao || 60) + delta, 0, 100);
      });

      const porteChange = this.updatePorte(empresa);
      if (porteChange.changed && !empresa.concorrente) {
        const tier = CGL.Data.getSizeTierById(porteChange.to);
        this.addHistory(empresa, state, {
          tipo: 'crescimento',
          titulo: 'Novo porte',
          descricao: `Evoluiu de ${porteChange.from} para ${tier?.nome || porteChange.to}.`
        });
        CGL.Events.notify('success', empresa.nomeFantasia, `Novo porte: ${tier?.nome || porteChange.to}`);
      }

      // Falência instantânea só para concorrentes IA.
      // Empresas do jogador usam estágios em CGL.Finance.advanceBankruptcy.
      if (empresa.concorrente) {
        if (empresa.caixa <= 0 && empresa.endividamento > empresa.patrimonioLiquido * 2 && lucro < 0) {
          if (Math.random() < 0.05) {
            empresa.ativa = false;
            empresa.fechada = true;
            this.addHistory(empresa, state, {
              tipo: 'falencia',
              titulo: 'Falência',
              descricao: 'A empresa não suportou o endividamento e encerrou atividades.'
            });
          }
        }
      }

      // Recordes ocasionais
      if (lucro > 50000 && Math.random() < 0.08) {
        this.addHistory(empresa, state, {
          tipo: 'recorde',
          titulo: 'Recorde de resultado',
          descricao: `Lucro semanal de ${CGL.Utils.formatBRL(lucro)}.`
        });
      }
    },

    _weeklyCompetitorAI(empresa, state) {
      if (CGL.Difficulty && !CGL.Difficulty.isSandboxSystemOn(state, 'iaConcorrente')) return;
      if (CGL.Difficulty?.ensureCompetitorAI) CGL.Difficulty.ensureCompetitorAI(empresa);
      const ai = empresa.ai || { agressividade: 0.5, foco: 'crescimento' };
      const agg = (ai.agressividade || 0.5) * (CGL.Difficulty?.mult
        ? CGL.Difficulty.mult(state, 'agressividadeIA')
        : 1);
      const roll = Math.random();

      if (ai.foco === 'expansao' && roll < 0.04 * agg && (empresa.filiais || []).length < 8) {
        try {
          const cities = CGL.Data.cities.filter((c) => c.estado !== empresa.estadoSede).slice(0, 100);
          const city = CGL.Utils.pick(cities);
          if (city && empresa.caixa > 40000) {
            this.openBranch(state, empresa.id, city.id, { funcionarios: CGL.Utils.randomInt(4, 12) });
          }
        } catch (e) { /* ignore */ }
      }

      if (ai.foco === 'crescimento' && roll < 0.1) {
        empresa.funcionarios += CGL.Utils.randomInt(0, 3);
        empresa.caixa = Math.max(0, empresa.caixa - 2000);
      }

      if (ai.foco === 'qualidade' && roll < 0.12) {
        empresa.reputacao.qualidade = CGL.Utils.clamp(empresa.reputacao.qualidade + 1, 0, 100);
        empresa.caixa = Math.max(0, empresa.caixa - 1500);
      }

      if (ai.foco === 'preco' && roll < 0.1 && empresa.marketing?.precificacao) {
        empresa.marketing.precificacao.estrategia = 'penetracao';
        empresa.marketing.precificacao.indicePreco = 0.75;
      }

      // Chance rara de falir
      if (empresa.caixa < 5000 && roll < 0.02) {
        empresa.ativa = false;
        empresa.fechada = true;
        this.addHistory(empresa, state, {
          tipo: 'falencia',
          titulo: 'Concorrente faliu',
          descricao: `${empresa.nomeFantasia} saiu do mercado.`
        });
      }
    },

    _refreshMarketShares(state) {
      const bySeg = {};
      this.listAll(state).filter((e) => e.ativa).forEach((e) => {
        bySeg[e.segmentoId] = bySeg[e.segmentoId] || [];
        bySeg[e.segmentoId].push(e);
      });
      Object.values(bySeg).forEach((list) => {
        const total = list.reduce((a, e) => a + Math.max(1, e.receita || e.capitalSocial * 0.01), 0);
        list.forEach((e) => {
          const w = Math.max(1, e.receita || e.capitalSocial * 0.01);
          e.participacaoMercado = Math.round((w / total) * 1000) / 10;
        });
      });
      const reg = this.ensureRegistry(state.companies);
      reg.mercados = {};
      Object.keys(bySeg).forEach((seg) => {
        reg.mercados[seg] = bySeg[seg].map((e) => ({
          id: e.id,
          nome: e.nomeFantasia,
          share: e.participacaoMercado
        }));
      });
    },

    /** Recalcula patrimônio empresarial do jogador (público para load/save) */
    syncPlayerEquity(state) {
      return this._recalcPlayerEquity(state);
    },

    _recalcPlayerEquity(state) {
      if (!state?.player) return 0;
      let equity = 0;
      this.listPlayerCompanies(state).forEach((e) => {
        const stake = this.playerStake(e, state.player.id) / 100;
        equity += this.calcValuation(e, state) * stake;
      });
      state.player.patrimonioEmpresarial = Math.round(equity);
      state.player.patrimonio = CGL.Player.calcNetWorth(state.player);
      return state.player.patrimonioEmpresarial;
    },

    /** Sugestões de razão social */
    suggestRazaoSocial(nome, naturezaId) {
      const n = CGL.Data.getLegalNatureById(naturezaId);
      const sigla = n?.sigla || 'Ltda.';
      return `${String(nome || 'Empresa').trim()} ${sigla}`;
    }
  };

  global.CGL = global.CGL || {};
  global.CGL.Company = Company;
})(typeof window !== 'undefined' ? window : globalThis);
