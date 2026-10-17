/**
 * CONGLOMERADO — Persistência LocalStorage com versionamento
 * Permite expansão futura sem quebrar saves antigos.
 */
(function (global) {
  'use strict';

  const SAVE_KEY = 'conglomerado_save_v1';
  const META_KEY = 'conglomerado_meta';
  const CURRENT_VERSION = 5;

  /** Migrações por versão (vN → vN+1) */
  const MIGRATIONS = {
    1: (data) => {
      // Fase 2: garante registro de empresas completo
      if (data.state) {
        if (global.CGL?.Company?.ensureRegistry) {
          data.state.companies = CGL.Company.ensureRegistry(data.state.companies);
        } else if (!data.state.companies) {
          data.state.companies = {
            empresas: [], holdings: [], participacoes: [], concorrentes: [], mercados: {}
          };
        }
        if (data.state.player && data.state.player.patrimonioEmpresarial == null) {
          data.state.player.patrimonioEmpresarial = 0;
        }
        if (data.state.player && !Array.isArray(data.state.player.empresasIds)) {
          data.state.player.empresasIds = [];
        }
      }
      data.version = 2;
      return data;
    },
    2: (data) => {
      // Fase 3: finanças PJ/PF, ledger, DRE, balanço
      if (data.state && global.CGL?.Finance?.migrateAll) {
        CGL.Finance.migrateAll(data.state);
      } else if (data.state) {
        if (!data.state.finance) data.state.finance = {};
        if (!data.state.finance.pessoal) {
          data.state.finance.pessoal = {
            version: 3, contas: [], ledger: [], aplicacoes: []
          };
        }
        (data.state.companies?.empresas || []).forEach((e) => {
          if (!e.finance || !Array.isArray(e.finance.contas)) {
            e.finance = {
              version: 3,
              contas: [],
              ledger: [],
              dreHistorico: [],
              balanco: null,
              emprestimos: [],
              financiamentos: [],
              debentures: [],
              aplicacoes: [],
              garantias: [],
              inadimplencia: {},
              indicadores: {},
              politicaDividendos: 'nunca',
              lucrosAcumulados: 0,
              reservas: 0,
              ativosFisicos: { estoques: 0, imoveis: 0, maquinas: 0, veiculos: 0 },
              contasPagar: 0,
              contasReceber: 0,
              falencia: { estagio: 0, chave: 'saudavel', semanasEmEstagio: 0 }
            };
          }
        });
      }
      data.version = 3;
      return data;
    },
    3: (data) => {
      // Fase 4: remuneração sócios/admins, mútuos, reembolso, restituição
      if (data.state && global.CGL?.Finance?.migrateAll) {
        CGL.Finance.migrateAll(data.state);
      }
      if (data.state) {
        if (data.state.finance?.pessoal) data.state.finance.pessoal.version = 4;
        (data.state.companies?.empresas || []).forEach((e) => {
          if (!e.finance) return;
          e.finance.version = 4;
          if (!Array.isArray(e.finance.emprestimosSocio)) e.finance.emprestimosSocio = [];
          if (!Array.isArray(e.finance.reembolsos)) e.finance.reembolsos = [];
          (e.administradores || []).forEach((a) => {
            if (a.proLaboreMensal == null) a.proLaboreMensal = null;
            if (a.satisfacao == null) a.satisfacao = a.ehContratado ? 70 : 80;
            if (a.ehContratado == null) a.ehContratado = false;
          });
        });
      }
      data.version = 4;
      return data;
    },
    4: (data) => {
      // Fase 5: mercado de capitais, rating, IPO, bolsa, investidores
      if (data.state && global.CGL?.Market?.migrateAll) {
        CGL.Market.migrateAll(data.state);
      } else if (data.state) {
        if (!data.state.market || !data.state.market.bolsa) {
          data.state.market = {
            version: 5,
            bolsa: { indice: 120000, historico: [], listadas: [] },
            investidores: [],
            ofertasPendentes: [],
            carteiraJogador: [],
            confianca: {},
            historicoOps: [],
            ma: { ofertasHostis: [], dueDiligence: [], integracoes: [] },
            semanaUltimoTick: 0
          };
        }
        (data.state.companies?.empresas || []).forEach((e) => {
          if (!e.ipo || typeof e.ipo !== 'object') {
            e.ipo = { elegivel: false, listada: false, status: 'privada' };
          } else if (e.ipo.status == null) {
            e.ipo.status = e.ipo.listada ? 'listada' : 'privada';
          }
          if (!e.rating) e.rating = { nota: 'BBB', score: 55, historico: [] };
          if (e.confiancaMercado == null) e.confiancaMercado = 50;
          if (!e.relacionamentoBancos) e.relacionamentoBancos = {};
          if (!e.estruturaCapital) {
            e.estruturaCapital = {
              equity: 0, debt: 0, wacc: 0.12, custoEquity: 0.14, custoDebt: 0.1, debtRatio: 0
            };
          }
          if (!e.reservasEstrategicas) {
            e.reservasEstrategicas = {
              alvoCaixa: 0, modo: 'normal', tradeoffRentabilidade: 0, tradeoffRisco: 0
            };
          }
          if (!e.boardPressure) {
            e.boardPressure = { nivel: 0, metasCrescimento: 0.02, ultimaPressao: null };
          }
        });
      }
      if (data.state?.finance?.pessoal) data.state.finance.pessoal.version = 5;
      (data.state?.companies?.empresas || []).forEach((e) => {
        if (e.finance) e.finance.version = 5;
      });
      data.version = 5;
      return data;
    }
  };

  const Save = {
    CURRENT_VERSION,
    SAVE_KEY,

    /** Verifica se existe save */
    hasSave() {
      try {
        return !!localStorage.getItem(SAVE_KEY);
      } catch (e) {
        return false;
      }
    },

    /** Carrega e migra save se necessário */
    load() {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return null;
        let data = JSON.parse(raw);
        data = this.migrate(data);
        return data;
      } catch (e) {
        console.error('Erro ao carregar save:', e);
        return null;
      }
    },

    /** Salva estado completo */
    save(state) {
      try {
        const payload = {
          version: CURRENT_VERSION,
          savedAt: new Date().toISOString(),
          state
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
        localStorage.setItem(META_KEY, JSON.stringify({
          version: CURRENT_VERSION,
          savedAt: payload.savedAt,
          playerName: state.player
            ? `${state.player.nome || ''} ${state.player.sobrenome || ''}`.trim()
            : '',
          week: state.world?.semanaAtual ?? 0,
          netWorth: state.player?.patrimonio ?? 0
        }));
        return true;
      } catch (e) {
        console.error('Erro ao salvar:', e);
        return false;
      }
    },

    /** Autosave (mesmo que save; ponto único para hooks futuros) */
    autosave(state) {
      return this.save(state);
    },

    /** Remove save */
    clear() {
      try {
        localStorage.removeItem(SAVE_KEY);
        localStorage.removeItem(META_KEY);
        return true;
      } catch (e) {
        return false;
      }
    },

    /** Metadados leves para tela inicial */
    getMeta() {
      try {
        const raw = localStorage.getItem(META_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },

    /** Aplica migrações sequenciais até CURRENT_VERSION */
    migrate(payload) {
      let version = payload.version || 1;
      let data = payload;
      while (version < CURRENT_VERSION) {
        const fn = MIGRATIONS[version];
        if (typeof fn === 'function') {
          data = fn(data);
        } else {
          data.version = version + 1;
        }
        version = data.version || version + 1;
      }
      data.version = CURRENT_VERSION;
      return data;
    }
  };

  global.CGL = global.CGL || {};
  global.CGL.Save = Save;
})(typeof window !== 'undefined' ? window : globalThis);
