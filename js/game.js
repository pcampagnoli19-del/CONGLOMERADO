/**
 * CONGLOMERADO — Engine central do jogo
 * Estado global expansível + avanço semanal central.
 */
(function (global) {
  'use strict';

  const Game = {
    state: null,
    phase: 'boot', // boot | menu | creation | playing

    /** Cria estado global completo (slots vazios para fases futuras) */
    createEmptyState() {
      return {
        meta: {
          version: CGL.Save.CURRENT_VERSION,
          createdAt: new Date().toISOString(),
          lastPlayedAt: new Date().toISOString(),
          difficulty: 'normal',
          gameMode: 'empreendedor',
          cheats: false
        },
        player: null,
        companies: CGL.Company.createEmptyRegistry(),
        employees: [],
        board: [],
        assets: {
          imoveis: [],
          veiculos: [],
          investimentos: []
        },
        economy: CGL.Economy.createInitial(),
        world: CGL.World.createInitial(),
        events: {
          fila: [],
          historico: []
        },
        history: {
          global: []
        },
        settings: this.defaultSettings(),
        statistics: {
          weeksPlayed: 0,
          companiesFounded: 0,
          peakNetWorth: 0
        },
        // Mercado de capitais (Fase 5) — bootstrap em Market.ensureMarket
        market: CGL.Market?.createEmptyMarket ? CGL.Market.createEmptyMarket() : {},
        // Dívida / captação (Fase 6)
        debt: CGL.Debt?.createEmptyDebtState ? CGL.Debt.createEmptyDebtState() : {},
        // RH / cultura (Fase 7)
        hr: CGL.Hr?.createEmptyHrState ? CGL.Hr.createEmptyHrState() : {},
        // Marketing / marca (Fase 8)
        marketing: CGL.Marketing?.createEmptyMarketingState
          ? CGL.Marketing.createEmptyMarketingState() : {},
        // P&D / inovação (Fase 9)
        rd: CGL.Rd?.createEmptyRdState ? CGL.Rd.createEmptyRdState() : {},
        // Logística / cadeia (Fase 10)
        logistics: CGL.Logistics?.createEmptyLogisticsState
          ? CGL.Logistics.createEmptyLogisticsState() : {},
        // Internacional / EXIM (Fase 11)
        international: CGL.International?.createEmptyIntlState
          ? CGL.International.createEmptyIntlState() : {},
        // Holding / governança / conglomerado (Fase 12)
        holding: CGL.Holding?.createEmptyHoldingState
          ? CGL.Holding.createEmptyHoldingState() : {},
        finance: {},
        holdings: {}, // espelho leve; fonte da verdade em companies.holdings + state.holding
        ai: {},
        achievements: []
      };
    },

    defaultSettings() {
      return {
        animationSpeed: 1, // 0.5 | 1 | 1.5 | 2
        volume: 0.7,
        darkMode: true,
        confirmImportant: true,
        language: 'pt-BR',
        reduceMotion: false,
        autosave: true
      };
    },

    /** Inicialização */
    init() {
      this.applySettingsToDOM(this.defaultSettings());
      if (CGL.Save.hasSave()) {
        this.phase = 'menu';
      } else {
        this.phase = 'menu';
      }
      if (CGL.UI) CGL.UI.showBoot();
    },

    /** Novo jogo → criação de personagem */
    startNewGame() {
      this.state = this.createEmptyState();
      this.phase = 'creation';
      if (CGL.UI) CGL.UI.showCharacterCreation();
    },

    /** Continuar save */
    continueGame() {
      const payload = CGL.Save.load();
      if (!payload || !payload.state || !payload.state.player) {
        CGL.Events.notify('error', 'Save inválido', 'Não foi possível carregar o jogo salvo.');
        return false;
      }
      this.state = payload.state;
      // Garante settings e registro de empresas (migração leve Fase 2/3)
      this.state.settings = { ...this.defaultSettings(), ...(this.state.settings || {}) };
      this.state.companies = CGL.Company.ensureRegistry(this.state.companies);
      if (this.state.player && this.state.player.patrimonioEmpresarial == null) {
        this.state.player.patrimonioEmpresarial = 0;
      }
      if (CGL.Finance?.migrateAll) {
        try { CGL.Finance.migrateAll(this.state); } catch (e) { /* ignore */ }
      }
      if (CGL.Market?.migrateAll) {
        try { CGL.Market.migrateAll(this.state); } catch (e) { /* ignore */ }
      }
      if (CGL.Debt?.migrateAll) {
        try { CGL.Debt.migrateAll(this.state); } catch (e) { /* ignore */ }
      }
      if (CGL.Hr?.migrateAll) {
        try { CGL.Hr.migrateAll(this.state); } catch (e) { /* ignore */ }
      }
      if (CGL.Marketing?.migrateAll) {
        try { CGL.Marketing.migrateAll(this.state); } catch (e) { /* ignore */ }
      }
      if (CGL.Rd?.migrateAll) {
        try { CGL.Rd.migrateAll(this.state); } catch (e) { /* ignore */ }
      }
      if (CGL.Logistics?.migrateAll) {
        try { CGL.Logistics.migrateAll(this.state); } catch (e) { /* ignore */ }
      }
      if (CGL.International?.migrateAll) {
        try { CGL.International.migrateAll(this.state); } catch (e) { /* ignore */ }
      }
      if (CGL.Holding?.migrateAll) {
        try { CGL.Holding.migrateAll(this.state); } catch (e) { /* ignore */ }
      }
      try { CGL.Company.syncPlayerEquity(this.state); } catch (e) { /* ignore */ }
      this.applySettingsToDOM(this.state.settings);
      this.phase = 'playing';
      CGL.Events.notify('success', 'Bem-vindo de volta', 'Jogo carregado com sucesso.');
      if (CGL.UI) CGL.UI.enterGame();
      return true;
    },

    /** Finaliza criação e entra no Dashboard */
    finishCharacterCreation(creationData) {
      if (!this.state) this.state = this.createEmptyState();
      this.state.player = CGL.Player.createFromCreation(creationData);
      this.state.world = CGL.World.createInitial(this.state.player.cidadeMoradiaId);
      this.state.statistics.peakNetWorth = this.state.player.patrimonio;
      if (CGL.Finance?.ensurePersonal) {
        try { CGL.Finance.ensurePersonal(this.state); } catch (e) { /* ignore */ }
      }
      if (CGL.Market?.ensureMarket) {
        try { CGL.Market.ensureMarket(this.state); } catch (e) { /* ignore */ }
      }
      if (CGL.Debt?.ensureDebt) {
        try { CGL.Debt.ensureDebt(this.state); } catch (e) { /* ignore */ }
      }
      if (CGL.Hr?.ensureHr) {
        try { CGL.Hr.ensureHr(this.state); } catch (e) { /* ignore */ }
      }
      if (CGL.Marketing?.ensureMarketing) {
        try { CGL.Marketing.ensureMarketing(this.state); } catch (e) { /* ignore */ }
      }
      if (CGL.Rd?.ensureRd) {
        try { CGL.Rd.ensureRd(this.state); } catch (e) { /* ignore */ }
      }
      if (CGL.Logistics?.ensureLogistics) {
        try { CGL.Logistics.ensureLogistics(this.state); } catch (e) { /* ignore */ }
      }
      if (CGL.International?.ensureInternational) {
        try { CGL.International.ensureInternational(this.state); } catch (e) { /* ignore */ }
      }
      if (CGL.Holding?.ensureHolding) {
        try { CGL.Holding.ensureHolding(this.state); } catch (e) { /* ignore */ }
      }
      this.phase = 'playing';
      this.save();
      CGL.Events.notify(
        'success',
        'Campanha iniciada',
        `${this.state.player.nome} ${this.state.player.sobrenome} está pronto para construir um império.`
      );
      if (CGL.UI) CGL.UI.enterGame();
    },

    /** Persiste estado */
    save(manual = false) {
      if (!this.state || !this.state.player) return false;
      this.state.meta.lastPlayedAt = new Date().toISOString();
      const ok = CGL.Save.autosave(this.state);
      if (manual && ok) {
        CGL.Events.notify('success', 'Jogo salvo', 'Progresso gravado no navegador.');
      }
      if (manual && !ok) {
        CGL.Events.notify('error', 'Falha ao salvar', 'Verifique o espaço do navegador.');
      }
      if (CGL.UI) CGL.UI.refreshTopbar();
      return ok;
    },

    /**
     * FUNÇÃO CENTRAL DE AVANÇO DE TEMPO
     * Todos os sistemas futuros devem se registrar aqui.
     */
    advanceWeek() {
      if (!this.state || this.phase !== 'playing') return;

      const run = () => {
        const s = this.state;

        // 1. Tempo
        CGL.World.advanceWeek(s.world);

        // 2. Economia
        CGL.Economy.weeklyTick(s.economy);

        // 3. Jogador (necessidades, idade)
        CGL.Player.weeklyNeeds(s);

        // 4. Família
        const familyLogs = CGL.Family.weeklyTick(s);
        familyLogs.slice(0, 2).forEach((msg) => {
          CGL.Events.notify('info', 'Família', msg);
        });

        // 5. Empresas, holdings, concorrência (Fase 2) — demanda usa Marketing
        CGL.Company.weeklyTick(s);

        // 5b. Finanças empresariais / pessoais (Fase 3–4)
        if (CGL.Finance?.weeklyTick) CGL.Finance.weeklyTick(s);

        // 5c. Mercado de capitais (Fase 5)
        if (CGL.Market?.weeklyTick) CGL.Market.weeklyTick(s);

        // 5d. RH / clima / folha métricas (Fase 7) — após Finance (DRE já pode usar folha RH)
        if (CGL.Hr?.weeklyTick) CGL.Hr.weeklyTick(s);

        // 5e. Marketing / marca / campanhas / crises (Fase 8) — após vendas da semana
        if (CGL.Marketing?.weeklyTick) CGL.Marketing.weeklyTick(s);

        // 5e2. P&D / inovação / obsolescência (Fase 9) — após mkt (lançamentos)
        if (CGL.Rd?.weeklyTick) CGL.Rd.weeklyTick(s);

        // 5e3. Logística / cadeia / estoque / frota (Fase 10) — após P&D (obsolescência afeta frota)
        if (CGL.Logistics?.weeklyTick) CGL.Logistics.weeklyTick(s);

        // 5e4. Internacional / FX / EXIM / subsidiárias (Fase 11) — após logística (frete intl)
        if (CGL.International?.weeklyTick) CGL.International.weeklyTick(s);

        // 5e5. Holding / governança / M&A / sinergias (Fase 12) — após intl (árvore pode incluir subs)
        if (CGL.Holding?.weeklyTick) CGL.Holding.weeklyTick(s);

        // 5f. Dívida / captação (Fase 6) — agenda usa folha RH + mkt + P&D + logística + intl + holding
        if (CGL.Debt?.weeklyTick) CGL.Debt.weeklyTick(s);

        // 6. Eventos aleatórios
        CGL.Events.weeklyTick(s);

        // 7. Estatísticas
        s.statistics.weeksPlayed = (s.statistics.weeksPlayed || 0) + 1;
        const nw = CGL.Player.calcNetWorth(s.player);
        if (nw > (s.statistics.peakNetWorth || 0)) s.statistics.peakNetWorth = nw;
        s.player.patrimonio = nw;

        // 8. Autosave
        if (s.settings?.autosave !== false) {
          this.save(false);
        }

        // 9. UI
        if (CGL.UI) {
          CGL.UI.refreshTopbar();
          CGL.UI.refreshCurrentScreen();
          CGL.UI.flashWeekAdvance();
        }

        CGL.Events.notify(
          'info',
          'Nova semana',
          CGL.World.formatGameDate(s.world)
        );
      };

      if (this.state.settings?.confirmImportant && this.state.settings?.confirmWeek) {
        CGL.UI.confirm('Avançar semana?', 'O tempo avançará e eventos serão processados.', run);
      } else {
        run();
      }
    },

    updateSettings(partial) {
      if (!this.state) return;
      this.state.settings = { ...this.state.settings, ...partial };
      this.applySettingsToDOM(this.state.settings);
      this.save(false);
    },

    applySettingsToDOM(settings) {
      const root = document.documentElement;
      root.dataset.theme = settings.darkMode ? 'dark' : 'light';
      root.style.setProperty('--anim-speed', String(settings.animationSpeed || 1));
      if (settings.reduceMotion) {
        root.classList.add('reduce-motion');
      } else {
        root.classList.remove('reduce-motion');
      }
    },

    getState() {
      return this.state;
    }
  };

  global.CGL = global.CGL || {};
  global.CGL.Game = Game;
})(typeof window !== 'undefined' ? window : globalThis);
