/**
 * CONGLOMERADO — Dificuldade, IA, automação, conquistas, cheats e sandbox (Fase 13)
 * Multiplicadores unificados; tick semanal; balanceamento anti-dinheiro-infinito.
 */
(function (global) {
  'use strict';

  function cloneParams(base) {
    return { ...(base || CGL.Data.DEFAULT_DIFFICULTY_PARAMS) };
  }

  function mergeParams(...layers) {
    const out = cloneParams(CGL.Data.DEFAULT_DIFFICULTY_PARAMS);
    layers.forEach((layer) => {
      if (!layer || typeof layer !== 'object') return;
      Object.keys(layer).forEach((k) => {
        if (layer[k] != null) out[k] = layer[k];
      });
    });
    return out;
  }

  function defaultAutomation() {
    const areas = {};
    (CGL.Data.automationAreas || []).forEach((a) => {
      areas[a.id] = 'manual';
    });
    return areas;
  }

  function defaultSandbox() {
    const toggles = {};
    (CGL.Data.sandboxToggles || []).forEach((t) => {
      toggles[t.id] = t.default !== false;
    });
    return toggles;
  }

  const Difficulty = {
    /* ========== Bootstrap ========== */

    createEmptyDifficultyState() {
      return {
        version: 13,
        levelId: 'normal',
        presetId: null,
        custom: false,
        params: cloneParams(),
        startModeId: 'empreendedor',
        sandbox: false,
        sandboxToggles: defaultSandbox(),
        cheatsMode: false,
        cheatFlags: {},
        dynamic: {
          enabled: true,
          score: 0,          // >0 sucesso → aperta; <0 falha → alivia
          weeksTrend: 0,
          lastNetWorth: 0,
          pressureMult: 1
        },
        automation: {
          profileId: null,
          areas: defaultAutomation(),
          suggestions: [],
          log: []
        },
        achievementsUnlocked: [],
        achievementsProgress: {},
        aiLog: [],
        balanceLog: [],
        semanaUltimoTick: 0,
        pendingSetup: null // nível/modo escolhidos antes do CEO wizard
      };
    },

    ensureDifficulty(state) {
      if (!state) return null;
      if (!state.difficulty || typeof state.difficulty !== 'object') {
        state.difficulty = this.createEmptyDifficultyState();
      } else {
        const base = this.createEmptyDifficultyState();
        state.difficulty = {
          ...base,
          ...state.difficulty,
          params: mergeParams(base.params, state.difficulty.params),
          sandboxToggles: { ...base.sandboxToggles, ...(state.difficulty.sandboxToggles || {}) },
          cheatFlags: { ...(state.difficulty.cheatFlags || {}) },
          dynamic: { ...base.dynamic, ...(state.difficulty.dynamic || {}) },
          automation: {
            ...base.automation,
            ...(state.difficulty.automation || {}),
            areas: { ...base.automation.areas, ...(state.difficulty.automation?.areas || {}) },
            suggestions: Array.isArray(state.difficulty.automation?.suggestions)
              ? state.difficulty.automation.suggestions : [],
            log: Array.isArray(state.difficulty.automation?.log)
              ? state.difficulty.automation.log : []
          },
          achievementsUnlocked: Array.isArray(state.difficulty.achievementsUnlocked)
            ? state.difficulty.achievementsUnlocked : [],
          achievementsProgress: state.difficulty.achievementsProgress || {},
          aiLog: Array.isArray(state.difficulty.aiLog) ? state.difficulty.aiLog : [],
          balanceLog: Array.isArray(state.difficulty.balanceLog) ? state.difficulty.balanceLog : [],
          version: 13
        };
      }
      // Espelho legado em meta / ai / achievements
      if (state.meta) {
        state.meta.difficulty = state.difficulty.levelId;
        state.meta.gameMode = state.difficulty.startModeId;
        state.meta.cheats = !!state.difficulty.cheatsMode;
      }
      state.ai = state.ai || {};
      state.ai.version = 13;
      state.ai.personalities = CGL.Data.aiPersonalities;
      if (!Array.isArray(state.achievements)) {
        state.achievements = state.difficulty.achievementsUnlocked.slice();
      }
      return state.difficulty;
    },

    migrateAll(state) {
      this.ensureDifficulty(state);
      // Atribui personalidade a concorrentes sem ai.personality
      (state.companies?.empresas || []).forEach((e) => {
        if (e.concorrente) this.ensureCompetitorAI(e);
      });
      return state.difficulty;
    },

    /* ========== Resolução de parâmetros ========== */

    resolveParams(diff) {
      const d = diff || {};
      let layer = {};
      if (!d.custom && d.levelId) {
        const lvl = CGL.Data.getDifficultyLevelById(d.levelId);
        if (lvl) layer = lvl.params || {};
      }
      let preset = {};
      if (d.presetId) {
        const p = CGL.Data.getDifficultyPresetById(d.presetId);
        if (p) preset = p.params || {};
      }
      const merged = mergeParams(layer, preset, d.custom ? d.params : (d.params || {}));
      // Pressão dinâmica
      const pressure = d.dynamic?.pressureMult || 1;
      if (pressure !== 1 && d.dynamic?.enabled !== false) {
        merged.agressividadeIA *= pressure;
        merged.crescimentoConcorrentes *= Math.sqrt(pressure);
        merged.frequenciaCrises *= 0.85 + pressure * 0.15;
        merged.facilidadeCredito /= Math.max(0.7, Math.sqrt(pressure));
        merged.exigenciaSalarial *= 0.9 + pressure * 0.1;
      }
      return merged;
    },

    params(state) {
      this.ensureDifficulty(state);
      return this.resolveParams(state.difficulty);
    },

    /** Multiplicador nomeado (fallback 1) */
    mult(state, key) {
      const p = this.params(state);
      const v = p[key];
      return v == null || Number.isNaN(Number(v)) ? 1 : Number(v);
    },

    isSandboxSystemOn(state, toggleId) {
      this.ensureDifficulty(state);
      if (!state.difficulty.sandbox) return true;
      const t = state.difficulty.sandboxToggles || {};
      return t[toggleId] !== false;
    },

    hasCheatFlag(state, flagId) {
      this.ensureDifficulty(state);
      return !!(state.difficulty.cheatsMode && state.difficulty.cheatFlags?.[flagId]);
    },

    /* ========== Aplicação de nível / preset / modo ========== */

    setLevel(state, levelId, opts = {}) {
      this.ensureDifficulty(state);
      const lvl = CGL.Data.getDifficultyLevelById(levelId);
      if (!lvl) throw new Error('Nível de dificuldade inválido.');
      const d = state.difficulty;
      d.levelId = levelId;
      d.custom = false;
      d.params = mergeParams(lvl.params);
      if (opts.presetId) this.setPreset(state, opts.presetId, { skipRebuild: true });
      else if (!opts.keepPreset) d.presetId = null;
      this._syncMeta(state);
      if (opts.applyEconomy !== false) this.applyEconomySeeds(state);
      return d;
    },

    setPreset(state, presetId, opts = {}) {
      this.ensureDifficulty(state);
      const preset = CGL.Data.getDifficultyPresetById(presetId);
      if (!preset) throw new Error('Preset inválido.');
      const d = state.difficulty;
      d.presetId = presetId;
      if (preset.sandboxDefault) {
        d.sandbox = true;
      }
      if (!opts.skipRebuild) {
        const lvl = CGL.Data.getDifficultyLevelById(d.levelId) || CGL.Data.getDifficultyLevelById('normal');
        d.params = mergeParams(lvl?.params, preset.params, d.custom ? d.params : {});
      } else {
        d.params = mergeParams(d.params, preset.params);
      }
      this._syncMeta(state);
      if (opts.applyEconomy !== false) this.applyEconomySeeds(state);
      return d;
    },

    setCustomParams(state, partial) {
      this.ensureDifficulty(state);
      const d = state.difficulty;
      d.custom = true;
      d.levelId = 'personalizado';
      d.params = mergeParams(d.params, partial);
      this._syncMeta(state);
      this.applyEconomySeeds(state);
      return d;
    },

    setStartMode(state, modeId) {
      this.ensureDifficulty(state);
      const mode = CGL.Data.getStartModeById(modeId);
      if (!mode) throw new Error('Modo de partida inválido.');
      state.difficulty.startModeId = modeId;
      this._syncMeta(state);
      return mode;
    },

    setSandbox(state, enabled, toggles) {
      this.ensureDifficulty(state);
      state.difficulty.sandbox = !!enabled;
      if (toggles && typeof toggles === 'object') {
        state.difficulty.sandboxToggles = {
          ...state.difficulty.sandboxToggles,
          ...toggles
        };
      }
      this._syncMeta(state);
      return state.difficulty;
    },

    _syncMeta(state) {
      if (!state.meta) state.meta = {};
      state.meta.difficulty = state.difficulty.custom
        ? 'personalizado'
        : state.difficulty.levelId;
      state.meta.gameMode = state.difficulty.startModeId;
      state.meta.cheats = !!state.difficulty.cheatsMode;
      if (state.difficulty.sandbox) state.meta.sandbox = true;
    },

    /** Aplica sementes econômicas a partir dos params */
    applyEconomySeeds(state) {
      const p = this.params(state);
      if (!state.economy) return;
      state.economy.inflacaoAnual = p.inflacaoInicial;
      state.economy.taxaJuros = p.taxaJurosInicial;
      // Confiança e ciclo conforme estabilidade
      if (p.estabilidadeEconomica >= 1.3) {
        state.economy.ciclo = 'expansao';
        state.economy.indiceConfianca = Math.min(90, 60 + (p.estabilidadeEconomica - 1) * 20);
      } else if (p.estabilidadeEconomica <= 0.7) {
        state.economy.ciclo = p.frequenciaCrises > 1.5 ? 'crise' : 'recessao';
        state.economy.indiceConfianca = Math.max(15, 45 - (1 - p.estabilidadeEconomica) * 40);
      }
    },

    /**
     * Hooks de modo de partida após criação do CEO (não quebra o wizard).
     */
    applyStartModeHooks(state) {
      this.ensureDifficulty(state);
      const mode = CGL.Data.getStartModeById(state.difficulty.startModeId);
      if (!mode || !state.player) return;
      const h = mode.hooks || {};
      const capMult = this.mult(state, 'capitalInicialMult');

      // Capital
      if (typeof h.capitalBonus === 'number') {
        if (h.capitalBonus >= 1000) {
          state.player.dinheiro = (state.player.dinheiro || 0) + h.capitalBonus;
          state.player.patrimonio = (state.player.patrimonio || 0) + h.capitalBonus;
        } else if (h.capitalBonus < 0) {
          state.player.dinheiro = Math.round((state.player.dinheiro || 0) * (1 + h.capitalBonus));
          state.player.patrimonio = Math.round((state.player.patrimonio || 0) * (1 + h.capitalBonus));
        }
      }
      state.player.dinheiro = Math.round((state.player.dinheiro || 0) * capMult);
      state.player.patrimonio = Math.round((state.player.patrimonio || 0) * capMult);

      if (h.pressaoFamiliar) {
        state.player.pressaoFamiliar = Math.max(
          state.player.pressaoFamiliar || 0,
          h.pressaoFamiliar
        );
      }
      if (h.herancaAtiva) {
        state.player.herancaPotencial = Math.max(
          state.player.herancaPotencial || 0,
          5_000_000
        );
      }
      if (h.empregoInicial) {
        state.player.emprego = {
          empresaNome: 'Grupo Nacional S.A.',
          cargo: 'Analista júnior',
          salarioMensal: 4500,
          semanaInicio: state.world?.semanaAtual || 1,
          modoExecutivo: true
        };
      }
      if (h.herdeirosStub && CGL.Holding?.addHeirStub) {
        try {
          CGL.Holding.ensureHolding(state);
          CGL.Holding.addHeirStub(state, {
            nome: `${state.player.nome} Jr.`,
            idade: 0,
            stub: true
          });
          if (h.conselhoFamiliar) {
            state.holding.sucessao.conselhoFamiliar = true;
          }
        } catch (e) { /* ok */ }
      }
      if (CGL.Finance?.ensurePersonal) {
        try {
          CGL.Finance.ensurePersonal(state);
          const pf = state.finance?.pessoal;
          if (pf?.contas?.[0]) {
            const delta = state.player.dinheiro - (pf.contas[0].saldo || 0);
            if (Math.abs(delta) > 1) {
              pf.contas[0].saldo = state.player.dinheiro;
            }
          }
        } catch (e) { /* ok */ }
      }
    },

    /* ========== Automação ========== */

    setAutomationLevel(state, areaId, levelId) {
      this.ensureDifficulty(state);
      const area = (CGL.Data.automationAreas || []).find((a) => a.id === areaId);
      const level = (CGL.Data.automationLevels || []).find((l) => l.id === levelId);
      if (!area || !level) throw new Error('Área ou nível de automação inválido.');
      state.difficulty.automation.areas[areaId] = levelId;
      state.difficulty.automation.profileId = null;
      return state.difficulty.automation;
    },

    applyManagementProfile(state, profileId) {
      this.ensureDifficulty(state);
      const profile = (CGL.Data.managementProfiles || []).find((p) => p.id === profileId);
      if (!profile) throw new Error('Perfil de gestão inválido.');
      const areas = defaultAutomation();
      Object.assign(areas, profile.areas || {});
      state.difficulty.automation.areas = areas;
      state.difficulty.automation.profileId = profileId;
      return state.difficulty.automation;
    },

    _automationTick(state) {
      if (!this.isSandboxSystemOn(state, 'balanceamento')) { /* still run automation */ }
      const d = state.difficulty;
      const areas = d.automation.areas || {};
      const log = d.automation.log;
      const push = (msg) => {
        log.unshift({ semana: state.world?.semanaAtual || 0, msg, em: Date.now() });
        if (log.length > 40) log.length = 40;
      };

      const playerCos = (state.companies?.empresas || []).filter(
        (e) => e.ativa && !e.concorrente
      );
      if (!playerCos.length) return;

      playerCos.forEach((empresa) => {
        // Contratações semi/auto — repor se headcount baixo
        const hireLvl = areas.contratacoes;
        if (hireLvl === 'semi' || hireLvl === 'auto') {
          if ((empresa.funcionarios || 0) < 5 && (empresa.caixa || 0) > 20000) {
            empresa.funcionarios = (empresa.funcionarios || 0) + 1;
            empresa.caixa -= 3000;
            push(`${empresa.nomeFantasia}: contratação automática (+1).`);
          }
        }
        // Marketing semi/auto — orçamento mínimo
        const mktLvl = areas.marketing;
        if ((mktLvl === 'semi' || mktLvl === 'auto') && empresa.marketing?.orcamento) {
          if ((empresa.marketing.orcamento.semanal || 0) < 500 && (empresa.caixa || 0) > 10000) {
            empresa.marketing.orcamento.semanal = 800;
            push(`${empresa.nomeFantasia}: orçamento de marketing ajustado.`);
          }
        }
        // Precificação
        const priceLvl = areas.precificacao;
        if ((priceLvl === 'semi' || priceLvl === 'auto') && empresa.marketing?.precificacao) {
          if (empresa.lucro < 0) {
            empresa.marketing.precificacao.indicePreco = Math.min(
              1.15,
              (empresa.marketing.precificacao.indicePreco || 1) + 0.02
            );
          }
        }
        // Finanças / dividendos
        const finLvl = areas.financas;
        if (finLvl === 'auto' && empresa.finance && (empresa.caixa || 0) > 100000 && empresa.lucro > 0) {
          empresa.finance.reservas = (empresa.finance.reservas || 0) + Math.round(empresa.lucro * 0.05);
        }
        // P&D
        const pdLvl = areas.pd;
        if ((pdLvl === 'semi' || pdLvl === 'auto') && empresa.rd?.dept) {
          if ((empresa.rd.dept.orcamentoSemanal || 0) < 200 && (empresa.caixa || 0) > 15000) {
            empresa.rd.dept.orcamentoSemanal = 400;
            push(`${empresa.nomeFantasia}: orçamento P&D reforçado.`);
          }
        }
        // Assistido — gera sugestões
        Object.entries(areas).forEach(([areaId, lvl]) => {
          if (lvl === 'assistido' && Math.random() < 0.08) {
            d.automation.suggestions.unshift({
              id: CGL.Utils.uuid(),
              areaId,
              empresaId: empresa.id,
              texto: `Revisar ${areaId} em ${empresa.nomeFantasia}.`,
              semana: state.world?.semanaAtual || 0
            });
          }
        });
      });
      if (d.automation.suggestions.length > 20) {
        d.automation.suggestions.length = 20;
      }

      // Conquista automação total
      const allAuto = (CGL.Data.automationAreas || []).every(
        (a) => areas[a.id] === 'auto'
      );
      if (allAuto) this.unlockAchievement(state, 'automacao_total');
    },

    /* ========== IA de concorrentes ========== */

    ensureCompetitorAI(empresa) {
      if (!empresa) return null;
      if (!empresa.ai || typeof empresa.ai !== 'object') empresa.ai = {};
      if (!empresa.ai.personality) {
        const pick = CGL.Utils.pick(CGL.Data.aiPersonalities || []);
        empresa.ai.personality = pick?.id || 'conservadora';
      }
      const pers = CGL.Data.getAiPersonalityById(empresa.ai.personality);
      if (pers) {
        if (empresa.ai.agressividade == null) {
          empresa.ai.agressividade = pers.agressividade * CGL.Utils.randomFloat(0.85, 1.15);
        }
        if (!empresa.ai.foco) empresa.ai.foco = pers.foco;
      }
      return empresa.ai;
    },

    assignPersonalities(state) {
      (state.companies?.empresas || []).forEach((e) => {
        if (e.concorrente) this.ensureCompetitorAI(e);
      });
    },

    /**
     * Ações de personalidade no tick (além do stub em Company._weeklyCompetitorAI).
     */
    _competitorPersonalityTick(state) {
      if (!this.isSandboxSystemOn(state, 'iaConcorrente')) return;
      const aggMult = this.mult(state, 'agressividadeIA');
      const growMult = this.mult(state, 'crescimentoConcorrentes');
      const rivals = (state.companies?.empresas || []).filter((e) => e.concorrente && e.ativa);
      const log = state.difficulty.aiLog;

      rivals.forEach((empresa) => {
        const ai = this.ensureCompetitorAI(empresa);
        const pers = CGL.Data.getAiPersonalityById(ai.personality);
        if (!pers) return;
        const chance = 0.12 * (ai.agressividade || 1) * aggMult;
        if (Math.random() > chance) return;

        const act = CGL.Utils.pick(pers.acoes || ['expansao']);
        let msg = null;

        if (act === 'preco' && empresa.marketing?.precificacao) {
          empresa.marketing.precificacao.estrategia = 'penetracao';
          empresa.marketing.precificacao.indicePreco = Math.max(
            0.65,
            (empresa.marketing.precificacao.indicePreco || 1) - 0.05
          );
          msg = `${empresa.nomeFantasia} cortou preços (IA agressiva).`;
        } else if (act === 'expansao') {
          empresa.funcionarios = Math.round(
            (empresa.funcionarios || 10) * (1 + 0.02 * growMult)
          );
          empresa.caixa = Math.max(0, (empresa.caixa || 0) - 2500 * growMult);
          if (
            Math.random() < 0.25 * aggMult &&
            (empresa.filiais || []).length < 10 &&
            empresa.caixa > 50000
          ) {
            try {
              const city = CGL.Utils.pick(CGL.Data.cities.slice(0, 60));
              if (city) CGL.Company.openBranch(state, empresa.id, city.id, {
                funcionarios: CGL.Utils.randomInt(3, 10)
              });
              msg = `${empresa.nomeFantasia} abriu filial (IA).`;
            } catch (e) { /* ok */ }
          } else {
            msg = `${empresa.nomeFantasia} expandiu headcount (IA).`;
          }
        } else if (act === 'tech' || act === 'qualidade') {
          empresa.nivelTech = CGL.Utils.clamp(
            (empresa.nivelTech || 40) + 1.5 * this.mult(state, 'avancaoTecnologico'),
            5,
            98
          );
          if (empresa.reputacao) {
            empresa.reputacao.qualidade = CGL.Utils.clamp(
              (empresa.reputacao.qualidade || 50) + 1.2,
              0,
              100
            );
          }
          empresa.caixa = Math.max(0, (empresa.caixa || 0) - 2000);
          msg = `${empresa.nomeFantasia} investiu em inovação (IA).`;
        } else if (act === 'caixa' || act === 'evitar_divida') {
          empresa.caixa = (empresa.caixa || 0) + Math.round((empresa.lucro || 0) * 0.1);
          if ((empresa.endividamento || 0) > 0) {
            const pay = Math.min(empresa.endividamento, Math.max(500, empresa.caixa * 0.05));
            empresa.endividamento -= pay;
            empresa.caixa -= pay;
          }
          msg = `${empresa.nomeFantasia} reforçou caixa (IA conservadora).`;
        } else if (act === 'poach' || act === 'pressao') {
          const victims = (state.companies?.empresas || []).filter(
            (e) => e.ativa && !e.concorrente && e.segmentoId === empresa.segmentoId
          );
          if (victims.length) {
            const v = CGL.Utils.pick(victims);
            v.funcionarios = Math.max(1, (v.funcionarios || 2) - 1);
            empresa.funcionarios = (empresa.funcionarios || 0) + 1;
            if (v.reputacao) {
              v.reputacao.geral = CGL.Utils.clamp((v.reputacao.geral || 50) - 1, 0, 100);
            }
            msg = `${empresa.nomeFantasia} poachou talento de ${v.nomeFantasia}.`;
            CGL.Events.notify('alert', 'Guerra de talentos', msg);
          }
        } else if (act === 'aquisicao') {
          empresa.caixa = Math.max(0, (empresa.caixa || 0) - 5000);
          empresa.participacaoMercado = (empresa.participacaoMercado || 1) + 0.15 * growMult;
          msg = `${empresa.nomeFantasia} absorveu ativos fracos (IA predadora).`;
        } else if (act === 'intl') {
          empresa.nivelTech = CGL.Utils.clamp((empresa.nivelTech || 40) + 0.5, 5, 98);
          empresa.caixa = Math.max(0, (empresa.caixa || 0) - 4000);
          if (!empresa.international) empresa.international = {};
          empresa.international.ambicaoGlobal =
            (empresa.international.ambicaoGlobal || 0) + 1;
          msg = `${empresa.nomeFantasia} avançou plano internacional (IA global).`;
        } else if (act === 'risco') {
          empresa.endividamento = (empresa.endividamento || 0) + 8000;
          empresa.caixa = (empresa.caixa || 0) + 6000;
          empresa.funcionarios = (empresa.funcionarios || 0) + 2;
          msg = `${empresa.nomeFantasia} alavancou expansão arriscada.`;
        }

        if (msg) {
          log.unshift({ semana: state.world?.semanaAtual || 0, msg, personality: pers.id });
          if (log.length > 50) log.length = 50;
        }
      });
    },

    /* ========== Dificuldade dinâmica ========== */

    _dynamicTick(state) {
      if (!this.isSandboxSystemOn(state, 'dificuldadeDinamica')) return;
      const d = state.difficulty;
      if (d.dynamic.enabled === false) return;
      const nw = CGL.Player?.calcNetWorth
        ? CGL.Player.calcNetWorth(state.player)
        : (state.player?.patrimonio || 0);
      const last = d.dynamic.lastNetWorth || nw;
      const delta = nw - last;
      d.dynamic.lastNetWorth = nw;

      // Tendência suavizada
      if (delta > last * 0.02 && nw > 100000) {
        d.dynamic.score = Math.min(20, (d.dynamic.score || 0) + 1);
      } else if (delta < -Math.max(5000, last * 0.03) || nw < last * 0.7) {
        d.dynamic.score = Math.max(-20, (d.dynamic.score || 0) - 1);
      } else {
        d.dynamic.score = (d.dynamic.score || 0) * 0.95;
      }

      // Pressão: sucesso → até 1.35; falha → até 0.75
      const s = d.dynamic.score || 0;
      if (s > 8) d.dynamic.pressureMult = Math.min(1.35, 1 + (s - 8) * 0.03);
      else if (s < -8) d.dynamic.pressureMult = Math.max(0.75, 1 + (s + 8) * 0.03);
      else d.dynamic.pressureMult = 1 + s * 0.01;

      d.dynamic.weeksTrend = (d.dynamic.weeksTrend || 0) + 1;
    },

    /* ========== Auto-balanceamento ========== */

    _balanceTick(state) {
      if (!this.isSandboxSystemOn(state, 'balanceamento')) return;
      if (state.difficulty.cheatsMode) return; // cheats: sem balancear
      const playerCos = (state.companies?.empresas || []).filter(
        (e) => e.ativa && !e.concorrente
      );
      let touched = false;
      playerCos.forEach((e) => {
        // Lucro semanal absurdo vs capital → imposto de equilíbrio
        const cap = Math.max(50000, e.capitalSocial || 1);
        if (e.lucro > cap * 0.35 && e.caixa > cap * 5) {
          const tax = Math.round(e.lucro * 0.12 * this.mult(state, 'tributacao'));
          e.caixa = Math.max(0, e.caixa - tax);
          e.lucro = Math.max(0, e.lucro - tax);
          touched = true;
        }
        // Caixa ocioso gigante → erosão leve (custo de oportunidade)
        if (e.caixa > 50_000_000 && e.lucro > 0) {
          const drag = Math.round(e.caixa * 0.0004);
          e.caixa -= drag;
          touched = true;
        }
      });
      // Patrimônio pessoal explosivo
      if (state.player && state.player.dinheiro > 200_000_000 && !state.difficulty.sandbox) {
        const drag = Math.round(state.player.dinheiro * 0.0002);
        state.player.dinheiro -= drag;
        touched = true;
      }
      if (touched) {
        state.difficulty.balanceLog.unshift({
          semana: state.world?.semanaAtual || 0,
          msg: 'Auto-balanceamento aplicou freios de crescimento extremo.'
        });
        if (state.difficulty.balanceLog.length > 20) {
          state.difficulty.balanceLog.length = 20;
        }
      }
    },

    /* ========== Conquistas ========== */

    unlockAchievement(state, id) {
      this.ensureDifficulty(state);
      if (state.difficulty.cheatsMode) {
        // Ainda registra, mas marca que foi em modo cheats (recordes inválidos)
      }
      if (state.difficulty.achievementsUnlocked.includes(id)) return false;
      const def = CGL.Data.getAchievementById(id);
      if (!def) return false;
      state.difficulty.achievementsUnlocked.push(id);
      state.achievements = state.difficulty.achievementsUnlocked.slice();
      CGL.Events.notify(
        'success',
        'Conquista',
        `${def.nome} — ${def.descricao}${state.difficulty.cheatsMode ? ' (Cheats)' : ''}`
      );
      return true;
    },

    _achievementsTick(state) {
      const d = state.difficulty;
      const empresas = (state.companies?.empresas || []).filter((e) => e.ativa && !e.concorrente);
      if (empresas.length >= 1) this.unlockAchievement(state, 'primeira_empresa');
      if (empresas.some((e) => e.isHolding)) this.unlockAchievement(state, 'criar_holding');
      if (empresas.some((e) => (e.receitaAcumuladaAno || 0) >= 1_000_000)) {
        this.unlockAchievement(state, 'faturar_1m');
      }
      if (empresas.some((e) => (e.receitaAcumuladaAno || 0) >= 1_000_000_000)) {
        this.unlockAchievement(state, 'faturar_1b');
      }
      if (empresas.some((e) => e.ipo?.listada)) this.unlockAchievement(state, 'abrir_capital');

      const hasRivalStake = empresas.some((e) =>
        (e.participacoesDetidas || []).some((p) => {
          const t = CGL.Company.getById(state, p.empresaId);
          return t && t.concorrente;
        })
      );
      // Também: aquisições via holding M&A
      const maDone = (state.holding?.maPipeline || []).some(
        (deal) => deal.estagio === 'integrar' || deal.estagio === 'concluido'
      );
      if (hasRivalStake || maDone) this.unlockAchievement(state, 'comprar_concorrente');

      let countries = new Set();
      empresas.forEach((e) => {
        (e.international?.entradas || []).forEach((en) => {
          if (en.paisId) countries.add(en.paisId);
        });
        (e.international?.subsidiarias || []).forEach((s) => {
          if (s.paisId) countries.add(s.paisId);
        });
      });
      if (countries.size >= 10) this.unlockAchievement(state, 'dez_paises');

      if ((state.holding?.ranking || [])[0]?.jogador) {
        this.unlockAchievement(state, 'maior_mundo');
      }

      const nw = CGL.Player?.calcNetWorth
        ? CGL.Player.calcNetWorth(state.player)
        : (state.player?.patrimonio || 0);
      if (nw >= 1_000_000) this.unlockAchievement(state, 'primeiro_milhao');
      if (nw >= 1_000_000_000) this.unlockAchievement(state, 'primeiro_bilhao');
      if ((state.statistics?.weeksPlayed || 0) >= 52) {
        this.unlockAchievement(state, 'semana_52');
      }
      if ((state.assets?.imoveis || []).length >= 1) {
        this.unlockAchievement(state, 'primeira_casa');
      }
      if ((state.holding?.sucessao?.herdeiros || []).length >= 1) {
        this.unlockAchievement(state, 'criar_herdeiro');
      }
      if ((state.player?.idade || 0) >= 100) this.unlockAchievement(state, 'cem_anos');
      // Casar / filhos — hooks leves se flags existirem
      if (state.player?.casado) this.unlockAchievement(state, 'casar');
      if ((state.player?.filhos || 0) >= 1 || (state.player?.familia || []).some((m) => m.parentesco === 'filho')) {
        this.unlockAchievement(state, 'ter_filhos');
      }
      d.achievementsProgress = {
        patrimonio: nw,
        empresas: empresas.length,
        paises: countries.size,
        semanas: state.statistics?.weeksPlayed || 0
      };
    },

    /* ========== Cheats ========== */

    markCheatsMode(state) {
      this.ensureDifficulty(state);
      if (!state.difficulty.cheatsMode) {
        state.difficulty.cheatsMode = true;
        this._syncMeta(state);
        CGL.Events.notify(
          'alert',
          'Modo Cheats',
          'Esta partida foi marcada como Cheats — recordes e rankings oficiais ficam inválidos.'
        );
      }
    },

    activateCheat(state, cheatId) {
      this.ensureDifficulty(state);
      const def = CGL.Data.getCheatById(cheatId);
      if (!def) throw new Error('Cheat inválido.');
      this.markCheatsMode(state);

      if (def.toggle) {
        const cur = !!state.difficulty.cheatFlags[cheatId];
        state.difficulty.cheatFlags[cheatId] = !cur;
        return { ok: true, toggled: true, active: !cur };
      }

      const player = state.player;
      const empresas = (state.companies?.empresas || []).filter((e) => e.ativa && !e.concorrente);

      switch (cheatId) {
        case 'dinheiro_1m':
          player.dinheiro = (player.dinheiro || 0) + 1_000_000;
          player.patrimonio = (player.patrimonio || 0) + 1_000_000;
          break;
        case 'dinheiro_100m':
          player.dinheiro = (player.dinheiro || 0) + 100_000_000;
          player.patrimonio = (player.patrimonio || 0) + 100_000_000;
          break;
        case 'dinheiro_1b':
          player.dinheiro = (player.dinheiro || 0) + 1_000_000_000;
          player.patrimonio = (player.patrimonio || 0) + 1_000_000_000;
          break;
        case 'remover_dividas':
          empresas.forEach((e) => {
            e.endividamento = 0;
            if (e.finance) {
              e.finance.emprestimos = [];
              e.finance.financiamentos = [];
              e.finance.debentures = [];
            }
          });
          break;
        case 'max_reputacao':
          empresas.forEach((e) => {
            if (!e.reputacao) return;
            Object.keys(e.reputacao).forEach((k) => {
              if (typeof e.reputacao[k] === 'number') e.reputacao[k] = 100;
            });
          });
          if (player.necessidades) player.necessidades.reputacao = 100;
          break;
        case 'max_felicidade':
          if (player.necessidades) {
            player.necessidades.felicidade = 100;
            player.necessidades.energia = 100;
            player.necessidades.estresse = 0;
            player.necessidades.motivacao = 100;
            player.necessidades.saude = 100;
          }
          break;
        case 'funcionarios_perfeitos':
          empresas.forEach((e) => {
            (e.hr?.funcionarios || []).forEach((f) => {
              if (!f.ativo && f.ativo !== undefined) return;
              ['produtividade', 'motivacao', 'lealdade', 'saude', 'inteligencia', 'etica'].forEach((k) => {
                if (f[k] != null) f[k] = 95;
              });
              f.estresse = 5;
            });
          });
          break;
        case 'economia_perfeita':
          if (state.economy) {
            state.economy.inflacaoAnual = 0.02;
            state.economy.taxaJuros = 0.06;
            state.economy.indiceConfianca = 90;
            state.economy.ciclo = 'expansao';
            state.economy.desemprego = 0.04;
          }
          break;
        default:
          break;
      }
      return { ok: true, toggled: false };
    },

    /* ========== Hooks para outros módulos ========== */

    /** Ajuste de score de crédito (facilidadeCredito / cheats) */
    creditScoreBonus(state) {
      if (this.hasCheatFlag(state, 'sempre_aprovar')) return 100;
      const ease = this.mult(state, 'facilidadeCredito');
      // ease 1 → 0; ease 2 → +20; ease 0.25 → -25
      return (ease - 1) * 25 - (this.mult(state, 'custoCredito') - 1) * 8;
    },

    creditRateMult(state) {
      if (this.hasCheatFlag(state, 'sempre_aprovar')) return 0.5;
      return this.mult(state, 'custoCredito') / Math.max(0.4, Math.sqrt(this.mult(state, 'facilidadeCredito')));
    },

    eventChanceMult(state, kind) {
      if (!this.isSandboxSystemOn(state, 'eventos')) return 0;
      if (kind === 'crise' && !this.isSandboxSystemOn(state, 'crises')) return 0;
      if (kind === 'negativo') return this.mult(state, 'frequenciaEventosNegativos');
      if (kind === 'pessoal') return this.mult(state, 'frequenciaEventosPessoais');
      if (kind === 'crise') return this.mult(state, 'frequenciaCrises');
      return 1;
    },

    economyVolatilityMult(state) {
      return 1 / Math.max(0.4, this.mult(state, 'estabilidadeEconomica'));
    },

    hrProductivityMult(state) {
      return this.mult(state, 'produtividadeFuncionarios');
    },

    hrWageMult(state) {
      return this.mult(state, 'exigenciaSalarial');
    },

    hrTurnoverMult(state) {
      return this.mult(state, 'rotatividade') / Math.max(0.5, this.mult(state, 'lealdadeFuncionarios'));
    },

    marginMult(state) {
      return this.mult(state, 'margemOperacional');
    },

    taxMult(state) {
      return this.mult(state, 'tributacao');
    },

    competitorSpawnChance(state) {
      if (!this.isSandboxSystemOn(state, 'concorrentes')) return 0;
      return 0.08 * this.mult(state, 'crescimentoConcorrentes');
    },

    /* ========== Tick semanal ========== */

    weeklyTick(state) {
      this.ensureDifficulty(state);
      if (!state.difficulty) return;

      // Congelamentos de cheat
      if (this.hasCheatFlag(state, 'congelar_inflacao') && state.economy) {
        state.economy._frozenInflacao = state.economy.inflacaoAnual;
      }
      if (this.hasCheatFlag(state, 'congelar_juros') && state.economy) {
        state.economy._frozenJuros = state.economy.taxaJuros;
      }

      this._competitorPersonalityTick(state);
      this._automationTick(state);
      this._dynamicTick(state);
      this._balanceTick(state);
      this._achievementsTick(state);

      // Restaura freeze após outros ticks potencialmente já rodaram economia antes —
      // chamado no fim do advanceWeek também via afterEconomyFreeze
      this.applyFreezeFlags(state);

      state.difficulty.semanaUltimoTick = state.world?.semanaAtual || 0;
      return state.difficulty;
    },

    applyFreezeFlags(state) {
      if (!state?.economy) return;
      if (this.hasCheatFlag(state, 'congelar_inflacao') && state.economy._frozenInflacao != null) {
        state.economy.inflacaoAnual = state.economy._frozenInflacao;
      }
      if (this.hasCheatFlag(state, 'congelar_juros') && state.economy._frozenJuros != null) {
        state.economy.taxaJuros = state.economy._frozenJuros;
      }
    },

    /** Resumo para UI / dashboard */
    summary(state) {
      this.ensureDifficulty(state);
      const d = state.difficulty;
      const lvl = CGL.Data.getDifficultyLevelById(d.levelId);
      return {
        levelId: d.levelId,
        levelNome: d.custom ? 'Personalizado' : (lvl?.nome || d.levelId),
        presetId: d.presetId,
        startModeId: d.startModeId,
        sandbox: d.sandbox,
        cheatsMode: d.cheatsMode,
        pressure: d.dynamic?.pressureMult || 1,
        achievements: d.achievementsUnlocked.length,
        achievementsTotal: (CGL.Data.achievements || []).length,
        automationProfile: d.automation?.profileId,
        aiLogRecent: (d.aiLog || []).slice(0, 5)
      };
    }
  };

  // Alias
  global.CGL = global.CGL || {};
  global.CGL.Difficulty = Difficulty;
  global.CGL.Sandbox = Difficulty;
  global.CGL.Achievements = {
    unlock: (state, id) => Difficulty.unlockAchievement(state, id),
    list: (state) => {
      Difficulty.ensureDifficulty(state);
      return state.difficulty.achievementsUnlocked.slice();
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
