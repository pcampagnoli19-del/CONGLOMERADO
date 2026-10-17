/**
 * CONGLOMERADO — Dados de internacionalização e comércio exterior (Fase 11)
 * Países, modos de entrada, acordos, riscos geopolíticos, cargos e centros globais.
 */
(function (global) {
  'use strict';

  /**
   * Países jogáveis (stats relativos 0–100 quando aplicável).
   * taxaUsd = unidades da moeda local por 1 USD (aproximado).
   */
  const COUNTRIES = [
    {
      id: 'br', nome: 'Brasil', codigo: 'BR', regiao: 'America Latina',
      populacao: 215, pib: 2.1, crescimento: 0.022, moeda: 'Real', codigoMoeda: 'BRL',
      taxaUsd: 5.2, inflacao: 0.045, taxaJuros: 0.105, impostos: 0.34,
      burocracia: 62, corrupcao: 48, segurancaJuridica: 55, custoMaoObra: 45,
      qualificacao: 58, poderCompra: 42, culturaConsumo: 60,
      tarifaImport: 0.12, barreiras: 40, riscoGeopolitico: 35, sedeJogador: true
    },
    {
      id: 'us', nome: 'Estados Unidos', codigo: 'US', regiao: 'America do Norte',
      populacao: 335, pib: 27.0, crescimento: 0.025, moeda: 'Dólar', codigoMoeda: 'USD',
      taxaUsd: 1.0, inflacao: 0.03, taxaJuros: 0.045, impostos: 0.21,
      burocracia: 35, corrupcao: 25, segurancaJuridica: 88, custoMaoObra: 85,
      qualificacao: 82, poderCompra: 92, culturaConsumo: 90,
      tarifaImport: 0.05, barreiras: 25, riscoGeopolitico: 30
    },
    {
      id: 'cn', nome: 'China', codigo: 'CN', regiao: 'Asia',
      populacao: 1410, pib: 18.0, crescimento: 0.045, moeda: 'Yuan', codigoMoeda: 'CNY',
      taxaUsd: 7.2, inflacao: 0.02, taxaJuros: 0.035, impostos: 0.25,
      burocracia: 70, corrupcao: 55, segurancaJuridica: 45, custoMaoObra: 35,
      qualificacao: 70, poderCompra: 50, culturaConsumo: 75,
      tarifaImport: 0.1, barreiras: 55, riscoGeopolitico: 55
    },
    {
      id: 'de', nome: 'Alemanha', codigo: 'DE', regiao: 'Europa',
      populacao: 84, pib: 4.5, crescimento: 0.012, moeda: 'Euro', codigoMoeda: 'EUR',
      taxaUsd: 0.92, inflacao: 0.025, taxaJuros: 0.035, impostos: 0.30,
      burocracia: 40, corrupcao: 18, segurancaJuridica: 92, custoMaoObra: 88,
      qualificacao: 90, poderCompra: 85, culturaConsumo: 70,
      tarifaImport: 0.04, barreiras: 30, riscoGeopolitico: 22
    },
    {
      id: 'jp', nome: 'Japão', codigo: 'JP', regiao: 'Asia',
      populacao: 125, pib: 4.2, crescimento: 0.008, moeda: 'Iene', codigoMoeda: 'JPY',
      taxaUsd: 150, inflacao: 0.015, taxaJuros: 0.01, impostos: 0.30,
      burocracia: 45, corrupcao: 15, segurancaJuridica: 90, custoMaoObra: 80,
      qualificacao: 88, poderCompra: 78, culturaConsumo: 65,
      tarifaImport: 0.06, barreiras: 45, riscoGeopolitico: 25
    },
    {
      id: 'mx', nome: 'México', codigo: 'MX', regiao: 'America Latina',
      populacao: 130, pib: 1.8, crescimento: 0.028, moeda: 'Peso mexicano', codigoMoeda: 'MXN',
      taxaUsd: 17.5, inflacao: 0.04, taxaJuros: 0.09, impostos: 0.30,
      burocracia: 58, corrupcao: 55, segurancaJuridica: 48, custoMaoObra: 38,
      qualificacao: 52, poderCompra: 40, culturaConsumo: 55,
      tarifaImport: 0.08, barreiras: 35, riscoGeopolitico: 48
    },
    {
      id: 'ar', nome: 'Argentina', codigo: 'AR', regiao: 'America Latina',
      populacao: 46, pib: 0.65, crescimento: 0.015, moeda: 'Peso argentino', codigoMoeda: 'ARS',
      taxaUsd: 950, inflacao: 0.12, taxaJuros: 0.4, impostos: 0.35,
      burocracia: 72, corrupcao: 60, segurancaJuridica: 40, custoMaoObra: 30,
      qualificacao: 60, poderCompra: 28, culturaConsumo: 50,
      tarifaImport: 0.18, barreiras: 60, riscoGeopolitico: 58
    },
    {
      id: 'in', nome: 'Índia', codigo: 'IN', regiao: 'Asia',
      populacao: 1420, pib: 3.7, crescimento: 0.065, moeda: 'Rúpia', codigoMoeda: 'INR',
      taxaUsd: 83, inflacao: 0.05, taxaJuros: 0.065, impostos: 0.25,
      burocracia: 68, corrupcao: 52, segurancaJuridica: 55, custoMaoObra: 22,
      qualificacao: 62, poderCompra: 35, culturaConsumo: 58,
      tarifaImport: 0.15, barreiras: 50, riscoGeopolitico: 40
    },
    {
      id: 'gb', nome: 'Reino Unido', codigo: 'GB', regiao: 'Europa',
      populacao: 67, pib: 3.3, crescimento: 0.015, moeda: 'Libra', codigoMoeda: 'GBP',
      taxaUsd: 0.79, inflacao: 0.028, taxaJuros: 0.05, impostos: 0.25,
      burocracia: 32, corrupcao: 20, segurancaJuridica: 90, custoMaoObra: 82,
      qualificacao: 85, poderCompra: 80, culturaConsumo: 75,
      tarifaImport: 0.05, barreiras: 28, riscoGeopolitico: 28
    },
    {
      id: 'ae', nome: 'Emirados Árabes', codigo: 'AE', regiao: 'Oriente Medio',
      populacao: 10, pib: 0.5, crescimento: 0.04, moeda: 'Dirham', codigoMoeda: 'AED',
      taxaUsd: 3.67, inflacao: 0.02, taxaJuros: 0.045, impostos: 0.09,
      burocracia: 30, corrupcao: 30, segurancaJuridica: 70, custoMaoObra: 55,
      qualificacao: 65, poderCompra: 88, culturaConsumo: 80,
      tarifaImport: 0.05, barreiras: 20, riscoGeopolitico: 42
    },
    {
      id: 'za', nome: 'África do Sul', codigo: 'ZA', regiao: 'Africa',
      populacao: 60, pib: 0.4, crescimento: 0.018, moeda: 'Rand', codigoMoeda: 'ZAR',
      taxaUsd: 18.5, inflacao: 0.055, taxaJuros: 0.08, impostos: 0.27,
      burocracia: 55, corrupcao: 50, segurancaJuridica: 50, custoMaoObra: 32,
      qualificacao: 48, poderCompra: 38, culturaConsumo: 45,
      tarifaImport: 0.1, barreiras: 40, riscoGeopolitico: 45
    },
    {
      id: 'cl', nome: 'Chile', codigo: 'CL', regiao: 'America Latina',
      populacao: 19, pib: 0.35, crescimento: 0.02, moeda: 'Peso chileno', codigoMoeda: 'CLP',
      taxaUsd: 920, inflacao: 0.035, taxaJuros: 0.065, impostos: 0.27,
      burocracia: 38, corrupcao: 28, segurancaJuridica: 78, custoMaoObra: 42,
      qualificacao: 65, poderCompra: 48, culturaConsumo: 55,
      tarifaImport: 0.06, barreiras: 22, riscoGeopolitico: 25
    }
  ];

  /** Modos de entrada no exterior */
  const ENTRY_MODES = [
    {
      id: 'exportacao', nome: 'Exportação',
      custoMult: 0.15, risco: 25, controle: 20, receitaPotencial: 0.35,
      semanasSetup: 1, exigeSubsidiaria: false,
      descricao: 'Venda direta ao exterior. Baixo CAPEX, exposição cambial e tarifas.'
    },
    {
      id: 'escritorio', nome: 'Escritório comercial',
      custoMult: 0.45, risco: 35, controle: 55, receitaPotencial: 0.5,
      semanasSetup: 3, exigeSubsidiaria: true,
      descricao: 'Presença comercial leve com equipe local de vendas.'
    },
    {
      id: 'loja', nome: 'Loja própria',
      custoMult: 0.8, risco: 45, controle: 70, receitaPotencial: 0.65,
      semanasSetup: 5, exigeSubsidiaria: true,
      descricao: 'Ponto de venda próprio. Marca local + opex de varejo.'
    },
    {
      id: 'fabrica', nome: 'Fábrica local',
      custoMult: 2.2, risco: 55, controle: 85, receitaPotencial: 1.1,
      semanasSetup: 10, exigeSubsidiaria: true,
      descricao: 'Produção no país. Alto CAPEX, menor frete e incentivos possíveis.'
    },
    {
      id: 'aquisicao', nome: 'Aquisição estrangeira',
      custoMult: 3.5, risco: 65, controle: 90, receitaPotencial: 1.3,
      semanasSetup: 8, exigeSubsidiaria: true,
      descricao: 'Compra de empresa local. Due diligence e integração cultural.'
    },
    {
      id: 'jv', nome: 'Joint venture',
      custoMult: 1.4, risco: 50, controle: 50, receitaPotencial: 0.9,
      semanasSetup: 6, exigeSubsidiaria: true,
      descricao: 'Parceria 50/50 com player local. Divide risco e lucro.'
    },
    {
      id: 'franquia', nome: 'Franquia',
      custoMult: 0.35, risco: 30, controle: 35, receitaPotencial: 0.4,
      semanasSetup: 4, exigeSubsidiaria: false,
      descricao: 'Royalties de franqueados. Escala rápida, menos controle operacional.'
    },
    {
      id: 'licenciamento', nome: 'Licenciamento',
      custoMult: 0.2, risco: 20, controle: 15, receitaPotencial: 0.25,
      semanasSetup: 2, exigeSubsidiaria: false,
      descricao: 'Licença de marca/tecnologia. Receita passiva com risco de diluição.'
    }
  ];

  /** Acordos comerciais base (podem ser ativados/alterados por eventos) */
  const TRADE_AGREEMENTS = [
    { id: 'mercosul', nome: 'Mercosul', paises: ['br', 'ar', 'cl'], tarifaMult: 0.4, ativo: true },
    { id: 'usmca', nome: 'USMCA', paises: ['us', 'mx'], tarifaMult: 0.35, ativo: true },
    { id: 'ue', nome: 'União Europeia', paises: ['de', 'gb'], tarifaMult: 0.3, ativo: true },
    { id: 'brics_trade', nome: 'Corredor BRICS', paises: ['br', 'cn', 'in', 'za'], tarifaMult: 0.7, ativo: false },
    { id: 'cptpp', nome: 'CPTPP (stub)', paises: ['jp', 'cl', 'mx'], tarifaMult: 0.5, ativo: false }
  ];

  /** Tipos de centros globais */
  const GLOBAL_CENTERS = [
    { id: 'sede_int', nome: 'Sede internacional', custo: 400000, opexSemanal: 12000, efeitos: { controle: 10, reputacao: 8 } },
    { id: 'pesquisa', nome: 'Centro de pesquisa', custo: 280000, opexSemanal: 9000, efeitos: { inovacao: 12, qualificacao: 5 } },
    { id: 'logistico', nome: 'Centro logístico global', custo: 220000, opexSemanal: 7500, efeitos: { frete: -0.12, prazo: -0.1 } },
    { id: 'financeiro', nome: 'Escritório financeiro', custo: 150000, opexSemanal: 5000, efeitos: { repatriacao: -0.03, fxHedge: 0.1 } },
    { id: 'fabrica_est', nome: 'Fábrica estratégica', custo: 500000, opexSemanal: 15000, efeitos: { producao: 0.15, custoLocal: -0.08 } }
  ];

  /** Cargos globais (hooks RH) */
  const GLOBAL_ROLES = [
    { id: 'dir_internacional', nome: 'Diretor Internacional', salarioSemanal: 18000, efeito: { expansao: 8, risco: -5 } },
    { id: 'pres_regional', nome: 'Presidente Regional', salarioSemanal: 22000, efeito: { controle: 10, adaptacao: 8 } },
    { id: 'gerente_pais', nome: 'Gerente de País', salarioSemanal: 12000, efeito: { plLocal: 0.08, moral: 5 } },
    { id: 'exec_global', nome: 'Executivo Global', salarioSemanal: 28000, efeito: { sinergia: 12, reputacao: 10 } }
  ];

  /** Eventos geopolíticos / expansão */
  const INTL_EVENTS = [
    {
      id: 'guerra_comercial', titulo: 'Guerra comercial',
      descricao: 'Tarifas sobem entre blocos e frete internacional encarece.',
      peso: 8, duracao: 6,
      efeitos: { tarifaMult: 1.4, freteIntMult: 1.25, risco: 15 }
    },
    {
      id: 'sancoes', titulo: 'Sanções internacionais',
      descricao: 'Restrições afetam operações e repatriação em mercados sensíveis.',
      peso: 5, duracao: 8,
      efeitos: { barreiras: 20, repatriacaoMult: 1.5, receitaExportMult: 0.7 }
    },
    {
      id: 'crise_cambial', titulo: 'Crise cambial',
      descricao: 'Volatilidade extrema nas taxas de câmbio.',
      peso: 10, duracao: 4,
      efeitos: { fxVolatilidade: 2.5, valorSubsidiariaMult: 0.85 }
    },
    {
      id: 'incentivo_fabrica', titulo: 'Incentivo para fábrica',
      descricao: 'Governo estrangeiro oferece incentivo fiscal para instalação industrial.',
      peso: 7, duracao: 12,
      efeitos: { custoFabricaMult: 0.7, impostosLocalMult: 0.8 },
      positivo: true
    },
    {
      id: 'concorrente_chines', titulo: 'Concorrente chinês entra',
      descricao: 'Player asiático pressiona preços em um mercado-alvo.',
      peso: 9, duracao: 5,
      efeitos: { demandaExportMult: 0.75, margemMult: 0.9 }
    },
    {
      id: 'fenomeno_marca', titulo: 'Fenômeno internacional',
      descricao: 'A marca explode em um mercado estrangeiro.',
      peso: 4, duracao: 6,
      efeitos: { demandaExportMult: 1.4, awareness: 15 },
      positivo: true
    },
    {
      id: 'crise_subsidiaria', titulo: 'Crise em subsidiária',
      descricao: 'Unidade local enfrenta greve, boicote ou falha de gestão.',
      peso: 6, duracao: 3,
      efeitos: { plLocalMult: 0.5, risco: 20 }
    },
    {
      id: 'nacionalizacao', titulo: 'Ameaça de nacionalização',
      descricao: 'Governo discute estatização de ativos estrangeiros.',
      peso: 3, duracao: 4,
      efeitos: { risco: 35, valorSubsidiariaMult: 0.6, barreiras: 25 }
    },
    {
      id: 'acordo_novo', titulo: 'Novo acordo comercial',
      descricao: 'Bloco reduz tarifas entre membros.',
      peso: 6, duracao: 16,
      efeitos: { tarifaMult: 0.6, freteIntMult: 0.95 },
      positivo: true
    },
    {
      id: 'boicote', titulo: 'Boicote internacional',
      descricao: 'Campanha de imagem afeta vendas no exterior.',
      peso: 5, duracao: 5,
      efeitos: { demandaExportMult: 0.65, reputacao: -10 }
    }
  ];

  /** Adaptação cultural — dimensões por país (0–100) */
  const CULTURE_DIMS = ['produto', 'embalagem', 'marketing', 'preco', 'atendimento', 'estrategia'];

  const Data = {
    countries: COUNTRIES,
    entryModes: ENTRY_MODES,
    tradeAgreements: TRADE_AGREEMENTS,
    globalCenters: GLOBAL_CENTERS,
    globalRoles: GLOBAL_ROLES,
    intlEvents: INTL_EVENTS,
    cultureDims: CULTURE_DIMS,

    getCountryById(id) {
      return COUNTRIES.find((c) => c.id === id) || null;
    },

    getEntryModeById(id) {
      return ENTRY_MODES.find((m) => m.id === id) || null;
    },

    getCenterById(id) {
      return GLOBAL_CENTERS.find((c) => c.id === id) || null;
    },

    getRoleById(id) {
      return GLOBAL_ROLES.find((r) => r.id === id) || null;
    },

    getEventById(id) {
      return INTL_EVENTS.find((e) => e.id === id) || null;
    },

    getAgreementById(id) {
      return TRADE_AGREEMENTS.find((a) => a.id === id) || null;
    },

    /** Países sem Brasil (mercados externos) */
    foreignCountries() {
      return COUNTRIES.filter((c) => !c.sedeJogador);
    },

    /** Acordo ativo entre dois países (menor tarifaMult) */
    agreementTariffMult(paisA, paisB, acordosAtivos) {
      const ativos = acordosAtivos || TRADE_AGREEMENTS.filter((a) => a.ativo);
      let best = 1;
      ativos.forEach((a) => {
        if (a.paises.includes(paisA) && a.paises.includes(paisB)) {
          best = Math.min(best, a.tarifaMult);
        }
      });
      return best;
    },

    /** Score de atratividade de mercado (0–100) */
    marketAttractiveness(pais) {
      if (!pais) return 0;
      return Math.round(
        pais.poderCompra * 0.2 +
        pais.crescimento * 800 +
        pais.segurancaJuridica * 0.15 +
        (100 - pais.burocracia) * 0.1 +
        (100 - pais.corrupcao) * 0.1 +
        pais.qualificacao * 0.1 +
        pais.culturaConsumo * 0.1 +
        (100 - pais.riscoGeopolitico) * 0.15
      );
    }
  };

  global.CGL = global.CGL || {};
  global.CGL.Data = Object.assign(global.CGL.Data || {}, Data);
  // aliases explícitos usados pelo núcleo
  global.CGL.Data.countries = COUNTRIES;
  global.CGL.Data.entryModes = ENTRY_MODES;
  global.CGL.Data.tradeAgreements = TRADE_AGREEMENTS;
  global.CGL.Data.globalCenters = GLOBAL_CENTERS;
  global.CGL.Data.globalRoles = GLOBAL_ROLES;
  global.CGL.Data.intlEvents = INTL_EVENTS;
  global.CGL.Data.cultureDims = CULTURE_DIMS;
})(typeof window !== 'undefined' ? window : globalThis);
