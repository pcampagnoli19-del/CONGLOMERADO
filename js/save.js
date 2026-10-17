/**
 * CONGLOMERADO — Persistência LocalStorage com versionamento
 * Permite expansão futura sem quebrar saves antigos.
 */
(function (global) {
  'use strict';

  const SAVE_KEY = 'conglomerado_save_v1';
  const META_KEY = 'conglomerado_meta';
  const CURRENT_VERSION = 12;

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
    },
    5: (data) => {
      // Fase 6: captação / estrutura de dívida
      if (data.state && global.CGL?.Debt?.migrateAll) {
        CGL.Debt.migrateAll(data.state);
      } else if (data.state) {
        if (!data.state.debt) {
          data.state.debt = {
            version: 6,
            climaCredito: 1,
            apetiteDebentures: 1,
            bancosIndisponiveis: [],
            subsidioTaxa: 0,
            ofertasRefi: [],
            interessesProjeto: [],
            eventos: [],
            semanaUltimoTick: 0
          };
        }
        (data.state.companies?.empresas || []).forEach((e) => {
          if (!e.finance) return;
          e.finance.version = 6;
          if (!Array.isArray(e.finance.notasPromissorias)) e.finance.notasPromissorias = [];
          if (!Array.isArray(e.finance.creditoFornecedor)) e.finance.creditoFornecedor = [];
          if (!Array.isArray(e.finance.creditoIntercompany)) e.finance.creditoIntercompany = [];
          if (!Array.isArray(e.finance.leasings)) e.finance.leasings = [];
          if (!Array.isArray(e.finance.projectFinance)) e.finance.projectFinance = [];
          if (!Array.isArray(e.finance.covenantsAtivos)) e.finance.covenantsAtivos = [];
          if (!Array.isArray(e.finance.violacoesCovenant)) e.finance.violacoesCovenant = [];
          if (!e.finance.perfilFinanceiro) e.finance.perfilFinanceiro = {};
          if (!Array.isArray(e.finance.agendaFinanceira)) e.finance.agendaFinanceira = [];
        });
      }
      if (data.state?.finance?.pessoal) data.state.finance.pessoal.version = 6;
      (data.state?.companies?.empresas || []).forEach((e) => {
        if (e.finance) e.finance.version = 6;
      });
      data.version = 6;
      return data;
    },
    6: (data) => {
      // Fase 7: RH, funcionários individuais, clima e cultura
      if (data.state && global.CGL?.Hr?.migrateAll) {
        CGL.Hr.migrateAll(data.state);
      } else if (data.state) {
        if (!data.state.hr || typeof data.state.hr !== 'object') {
          data.state.hr = {
            version: 7,
            semanaUltimoTick: 0,
            eventos: [],
            talentosExcepcionais: 0
          };
        } else {
          data.state.hr.version = 7;
          if (!Array.isArray(data.state.hr.eventos)) data.state.hr.eventos = [];
        }
        if (!Array.isArray(data.state.employees)) data.state.employees = [];
        (data.state.companies?.empresas || []).forEach((e) => {
          if (!e.hr || typeof e.hr !== 'object') e.hr = {};
          if (!Array.isArray(e.hr.funcionarios)) e.hr.funcionarios = [];
          if (!Array.isArray(e.hr.candidatos)) e.hr.candidatos = [];
          if (!e.hr.clima) {
            e.hr.clima = {
              moral: 55, engajamento: 50, confianca: 50,
              cultura: typeof e.cultura === 'number' ? e.cultura : 50,
              comunicacao: 50, colaboracao: 50
            };
          }
          if (!e.hr.culturaOrg) {
            e.hr.culturaOrg = { valores: ['meritocracia', 'resultados'], intensidade: 50 };
          }
          if (!Array.isArray(e.hr.beneficios)) e.hr.beneficios = ['vr'];
          if (!e.hr.sindicato) {
            e.hr.sindicato = {
              presente: false, forca: 0, satisfacao: 50,
              greveAtiva: false, semanasGreve: 0, proximoDissidio: 26
            };
          }
          if (!Array.isArray(e.hr.historico)) e.hr.historico = [];
          if (!Array.isArray(e.hr.treinamentosAtivos)) e.hr.treinamentosAtivos = [];
        });
      }
      if (data.state?.finance?.pessoal) data.state.finance.pessoal.version = 7;
      (data.state?.companies?.empresas || []).forEach((e) => {
        if (e.finance) e.finance.version = 7;
      });
      data.version = 7;
      return data;
    },
    7: (data) => {
      // Fase 8: marketing, marca, campanhas, CRM, crises
      if (data.state && global.CGL?.Marketing?.migrateAll) {
        CGL.Marketing.migrateAll(data.state);
      } else if (data.state) {
        if (!data.state.marketing || typeof data.state.marketing !== 'object') {
          data.state.marketing = {
            version: 8,
            semanaUltimoTick: 0,
            eventos: [],
            acoesConcorrentes: []
          };
        } else {
          data.state.marketing.version = 8;
          if (!Array.isArray(data.state.marketing.eventos)) data.state.marketing.eventos = [];
          if (!Array.isArray(data.state.marketing.acoesConcorrentes)) {
            data.state.marketing.acoesConcorrentes = [];
          }
        }
        (data.state.companies?.empresas || []).forEach((e) => {
          if (!e.marketing || typeof e.marketing !== 'object') e.marketing = {};
          if (!e.marketing.marca) {
            e.marketing.marca = {
              awareness: 15, reputacao: 50, confianca: 48,
              valorPercebido: 50, fidelidade: 25, posicionamento: 'popular', valorMarca: 0
            };
          }
          if (!e.marketing.precificacao) {
            e.marketing.precificacao = {
              estrategia: 'competitivo', indicePreco: 1, descontoAtivo: 0, promocaoSemanas: 0
            };
          }
          if (!e.marketing.distribuicao) e.marketing.distribuicao = { score: 30 };
          if (!e.marketing.crm) {
            e.marketing.crm = {
              nivel: 0, investimentoSemanal: 0, satisfacao: 50, retencao: 35, cac: 0, nps: 0
            };
          }
          if (!Array.isArray(e.marketing.campanhas)) e.marketing.campanhas = [];
          if (!Array.isArray(e.marketing.pesquisas)) e.marketing.pesquisas = [];
          if (!Array.isArray(e.marketing.influenciadores)) e.marketing.influenciadores = [];
          if (!Array.isArray(e.marketing.patrocinios)) e.marketing.patrocinios = [];
          if (!Array.isArray(e.marketing.crises)) e.marketing.crises = [];
          if (!Array.isArray(e.marketing.lancamentos)) e.marketing.lancamentos = [];
          if (!e.marketing.kpis) e.marketing.kpis = {};
          if (!e.marketing.insights) e.marketing.insights = {};
          if (!Array.isArray(e.marketing.historico)) e.marketing.historico = [];
          e.marketing.seeded = true;
        });
      }
      if (data.state?.finance?.pessoal) data.state.finance.pessoal.version = 8;
      (data.state?.companies?.empresas || []).forEach((e) => {
        if (e.finance) e.finance.version = 8;
      });
      data.version = 8;
      return data;
    },
    8: (data) => {
      // Fase 9: P&D, árvores tech, patentes, produtos, obsolescência
      if (data.state && global.CGL?.Rd?.migrateAll) {
        CGL.Rd.migrateAll(data.state);
      } else if (data.state) {
        if (!data.state.rd || typeof data.state.rd !== 'object') {
          data.state.rd = {
            version: 9,
            semanaUltimoTick: 0,
            eventos: [],
            patentesGlobais: [],
            ranking: []
          };
        } else {
          data.state.rd.version = 9;
          if (!Array.isArray(data.state.rd.eventos)) data.state.rd.eventos = [];
          if (!Array.isArray(data.state.rd.patentesGlobais)) data.state.rd.patentesGlobais = [];
          if (!Array.isArray(data.state.rd.ranking)) data.state.rd.ranking = [];
        }
        (data.state.companies?.empresas || []).forEach((e) => {
          if (!e.rd || typeof e.rd !== 'object') e.rd = {};
          if (!e.rd.dept) {
            e.rd.dept = {
              ativo: false, orcamentoSemanal: 0, pesquisadores: 0, diretores: 0,
              nivelTech: e.nivelTech ?? 30, eficiencia: 45, maxProjetos: 1,
              laboratorios: 0, etica: 70, culturaInovacao: 40
            };
          }
          if (!Array.isArray(e.rd.projetos)) e.rd.projetos = [];
          if (!Array.isArray(e.rd.techsDesbloqueadas)) e.rd.techsDesbloqueadas = [];
          if (!Array.isArray(e.rd.patentes)) e.rd.patentes = [];
          if (!Array.isArray(e.rd.licencasCompradas)) e.rd.licencasCompradas = [];
          if (!Array.isArray(e.rd.licencasVendidas)) e.rd.licencasVendidas = [];
          if (!Array.isArray(e.rd.produtos)) e.rd.produtos = [];
          if (!Array.isArray(e.rd.parcerias)) e.rd.parcerias = [];
          if (!Array.isArray(e.rd.historico)) e.rd.historico = [];
          if (e.rd.indiceInovacao == null) e.rd.indiceInovacao = 20;
          if (e.rd.obsolescencia == null) e.rd.obsolescencia = 15;
          e.rd.seeded = true;
        });
      }
      if (data.state?.finance?.pessoal) data.state.finance.pessoal.version = 9;
      (data.state?.companies?.empresas || []).forEach((e) => {
        if (e.finance) e.finance.version = 9;
      });
      data.version = 9;
      return data;
    },
    9: (data) => {
      // Fase 10: logística, cadeia, fornecedores, estoque, frota, CDs
      if (data.state && global.CGL?.Logistics?.migrateAll) {
        CGL.Logistics.migrateAll(data.state);
      } else if (data.state) {
        if (!data.state.logistics || typeof data.state.logistics !== 'object') {
          data.state.logistics = {
            version: 10,
            semanaUltimoTick: 0,
            eventos: [],
            ranking: [],
            freteInternacional: { indice: 1, seguro: 0.02, imposto: 0.08 },
            buffsAtivos: []
          };
        } else {
          data.state.logistics.version = 10;
          if (!Array.isArray(data.state.logistics.eventos)) data.state.logistics.eventos = [];
          if (!Array.isArray(data.state.logistics.ranking)) data.state.logistics.ranking = [];
          if (!Array.isArray(data.state.logistics.buffsAtivos)) data.state.logistics.buffsAtivos = [];
          if (!data.state.logistics.freteInternacional) {
            data.state.logistics.freteInternacional = { indice: 1, seguro: 0.02, imposto: 0.08 };
          }
        }
        (data.state.companies?.empresas || []).forEach((e) => {
          if (!e.logistics || typeof e.logistics !== 'object') e.logistics = {};
          if (!e.logistics.estoque) {
            e.logistics.estoque = {
              unidades: 100, minimo: 40, maximo: 400,
              holdingPorUnidade: 2.5, validadeSemanas: 40, idadeMedia: 4,
              perdasSemana: 0, stockouts: 0, semanasStockout: 0
            };
          }
          if (!e.logistics.frota) {
            e.logistics.frota = { modo: '3pl', veiculos: [], custo3plBase: 3500, taxa3plPorUnidade: 1.8 };
          }
          if (!e.logistics.cadeia) e.logistics.cadeia = { etapas: [] };
          if (!Array.isArray(e.logistics.contratos)) e.logistics.contratos = [];
          if (!Array.isArray(e.logistics.cds)) e.logistics.cds = [];
          if (!Array.isArray(e.logistics.rotas)) e.logistics.rotas = [];
          if (!Array.isArray(e.logistics.pedidos)) e.logistics.pedidos = [];
          if (!Array.isArray(e.logistics.techs)) e.logistics.techs = [];
          if (!Array.isArray(e.logistics.historico)) e.logistics.historico = [];
          if (!e.logistics.kpis) e.logistics.kpis = {};
          if (e.logistics.eficienciaLogistica == null) e.logistics.eficienciaLogistica = 40;
          e.logistics.seeded = true;
        });
      }
      if (data.state?.finance?.pessoal) data.state.finance.pessoal.version = 10;
      (data.state?.companies?.empresas || []).forEach((e) => {
        if (e.finance) e.finance.version = 10;
      });
      data.version = 10;
      return data;
    },
    10: (data) => {
      // Fase 11: internacionalização, câmbio, EXIM, subsidiárias
      if (data.state && global.CGL?.International?.migrateAll) {
        CGL.International.migrateAll(data.state);
      } else if (data.state) {
        if (!data.state.international || typeof data.state.international !== 'object') {
          data.state.international = {
            version: 11,
            semanaUltimoTick: 0,
            taxas: { BRL: 5.2, USD: 1, EUR: 0.92, CNY: 7.2, JPY: 150, GBP: 0.79 },
            historicoFx: [],
            acordos: [],
            eventos: [],
            ranking: [],
            buffsAtivos: [],
            repatriacaoBase: 0.15,
            volatilidadeFx: 1
          };
        } else {
          data.state.international.version = 11;
          if (!data.state.international.taxas) data.state.international.taxas = { BRL: 5.2, USD: 1 };
          if (!Array.isArray(data.state.international.historicoFx)) data.state.international.historicoFx = [];
          if (!Array.isArray(data.state.international.acordos)) data.state.international.acordos = [];
          if (!Array.isArray(data.state.international.eventos)) data.state.international.eventos = [];
          if (!Array.isArray(data.state.international.ranking)) data.state.international.ranking = [];
          if (!Array.isArray(data.state.international.buffsAtivos)) data.state.international.buffsAtivos = [];
        }
        (data.state.companies?.empresas || []).forEach((e) => {
          if (!e.international || typeof e.international !== 'object') e.international = {};
          if (!Array.isArray(e.international.entradas)) e.international.entradas = [];
          if (!Array.isArray(e.international.subsidiarias)) e.international.subsidiarias = [];
          if (!Array.isArray(e.international.operacoesExim)) e.international.operacoesExim = [];
          if (!Array.isArray(e.international.centros)) e.international.centros = [];
          if (!Array.isArray(e.international.cargosGlobais)) e.international.cargosGlobais = [];
          if (!e.international.adaptacaoCultural) e.international.adaptacaoCultural = {};
          if (!Array.isArray(e.international.historico)) e.international.historico = [];
          if (!e.international.kpis) e.international.kpis = {};
          e.international.seeded = true;
        });
      }
      if (data.state?.finance?.pessoal) data.state.finance.pessoal.version = 11;
      (data.state?.companies?.empresas || []).forEach((e) => {
        if (e.finance) e.finance.version = 11;
      });
      data.version = 11;
      return data;
    },
    11: (data) => {
      // Fase 12: holding, governança, M&A, árvore societária
      if (data.state && global.CGL?.Holding?.migrateAll) {
        CGL.Holding.migrateAll(data.state);
      } else if (data.state) {
        if (!data.state.holding || typeof data.state.holding !== 'object') {
          data.state.holding = {
            version: 12,
            semanaUltimoTick: 0,
            brandStrategy: 'hibrida',
            maPipeline: [],
            sinergiasAtivas: [],
            eventos: [],
            ranking: [],
            sucessao: { herdeiros: [], plano: null, conselhoFamiliar: false, conflitos: [] },
            buffsAtivos: [],
            nomeGrupo: null
          };
        } else {
          data.state.holding.version = 12;
          if (!Array.isArray(data.state.holding.maPipeline)) data.state.holding.maPipeline = [];
          if (!Array.isArray(data.state.holding.sinergiasAtivas)) data.state.holding.sinergiasAtivas = [];
          if (!Array.isArray(data.state.holding.eventos)) data.state.holding.eventos = [];
          if (!Array.isArray(data.state.holding.ranking)) data.state.holding.ranking = [];
          if (!Array.isArray(data.state.holding.buffsAtivos)) data.state.holding.buffsAtivos = [];
          if (!data.state.holding.sucessao) {
            data.state.holding.sucessao = {
              herdeiros: [], plano: null, conselhoFamiliar: false, conflitos: []
            };
          }
        }
        (data.state.companies?.empresas || []).forEach((e) => {
          if (!e.holding || typeof e.holding !== 'object') e.holding = {};
          if (!Array.isArray(e.holding.departamentos)) e.holding.departamentos = [];
          if (!Array.isArray(e.holding.escritorios)) e.holding.escritorios = [];
          if (!e.holding.conselho) e.holding.conselho = { membros: [], nivelPressao: 0, ultimaReuniao: 0, ativo: false };
          if (!e.holding.governanca) {
            e.holding.governanca = {
              auditoria: 40, compliance: 40, risco: 40, etica: 50, score: 42, politicasAtivas: []
            };
          }
          if (!Array.isArray(e.holding.historico)) e.holding.historico = [];
          if (!Array.isArray(e.holding.licencas)) e.holding.licencas = [];
          if (!e.holding.kpis) e.holding.kpis = {};
          e.holding.seeded = true;
        });
      }
      if (data.state?.finance?.pessoal) data.state.finance.pessoal.version = 12;
      (data.state?.companies?.empresas || []).forEach((e) => {
        if (e.finance) e.finance.version = 12;
      });
      data.version = 12;
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
