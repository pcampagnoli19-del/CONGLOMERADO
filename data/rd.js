/**
 * CONGLOMERADO — Dados de P&D, árvores tecnológicas e inovação (Fase 9)
 * Brief duplicado unificado: um módulo cobre ambos os pedidos de P&D.
 */
(function (global) {
  'use strict';

  /** Mapeia segmento da empresa → árvore tech */
  const SECTOR_MAP = {
    industria: 'industria',
    construcao: 'industria',
    agro: 'agro',
    alimentacao: 'agro',
    financeiro: 'bancos',
    energia: 'energia',
    comercio: 'varejo',
    logistica: 'varejo',
    tecnologia: 'tecnologia',
    midia: 'tecnologia',
    servicos: 'tecnologia',
    saude: 'tecnologia',
    educacao: 'tecnologia',
    imobiliario: 'varejo',
    holding: 'tecnologia'
  };

  /**
   * Árvores por setor. Cada tech: id, nome, custo, semanas, prereqs,
   * efeitos (eficiencia, nivelTech, qualidade, custoProd, inovacao).
   */
  const TECH_TREES = {
    industria: {
      id: 'industria',
      nome: 'Indústria',
      techs: [
        { id: 'ind_automacao', nome: 'Automação industrial', custo: 80000, semanas: 8, prereqs: [], efeitos: { eficiencia: 6, nivelTech: 5, custoProd: -0.03 } },
        { id: 'ind_robotica', nome: 'Robótica', custo: 140000, semanas: 12, prereqs: ['ind_automacao'], efeitos: { eficiencia: 10, nivelTech: 8, qualidade: 4 } },
        { id: 'ind_3d', nome: 'Impressão 3D', custo: 100000, semanas: 10, prereqs: ['ind_automacao'], efeitos: { eficiencia: 5, nivelTech: 7, inovacao: 6 } },
        { id: 'ind_materiais', nome: 'Novos materiais', custo: 120000, semanas: 14, prereqs: ['ind_3d'], efeitos: { qualidade: 10, nivelTech: 6, inovacao: 5 } },
        { id: 'ind_enxuta', nome: 'Produção enxuta', custo: 60000, semanas: 6, prereqs: [], efeitos: { eficiencia: 8, custoProd: -0.05 } },
        { id: 'ind_ia', nome: 'IA industrial', custo: 200000, semanas: 16, prereqs: ['ind_robotica'], efeitos: { eficiencia: 12, nivelTech: 12, inovacao: 10 } }
      ]
    },
    agro: {
      id: 'agro',
      nome: 'Agronegócio',
      techs: [
        { id: 'agro_precisao', nome: 'Agricultura de precisão', custo: 90000, semanas: 10, prereqs: [], efeitos: { eficiencia: 7, nivelTech: 5, custoProd: -0.04 } },
        { id: 'agro_irrigacao', nome: 'Irrigação inteligente', custo: 70000, semanas: 8, prereqs: ['agro_precisao'], efeitos: { eficiencia: 6, qualidade: 4 } },
        { id: 'agro_genetica', nome: 'Melhoramento genético', custo: 150000, semanas: 18, prereqs: [], efeitos: { qualidade: 12, inovacao: 8, nivelTech: 7 } },
        { id: 'agro_drones', nome: 'Drones agrícolas', custo: 110000, semanas: 12, prereqs: ['agro_precisao'], efeitos: { eficiencia: 8, nivelTech: 6 } },
        { id: 'agro_autonomo', nome: 'Máquinas autônomas', custo: 180000, semanas: 16, prereqs: ['agro_drones'], efeitos: { eficiencia: 14, nivelTech: 10, custoProd: -0.06 } },
        { id: 'agro_bio', nome: 'Biotecnologia', custo: 220000, semanas: 20, prereqs: ['agro_genetica'], efeitos: { qualidade: 10, inovacao: 12, nivelTech: 12 } }
      ]
    },
    bancos: {
      id: 'bancos',
      nome: 'Bancos / Financeiro',
      techs: [
        { id: 'fin_pix', nome: 'PIX avançado', custo: 50000, semanas: 6, prereqs: [], efeitos: { eficiencia: 5, nivelTech: 4, inovacao: 3 } },
        { id: 'fin_open', nome: 'Open Finance', custo: 90000, semanas: 10, prereqs: ['fin_pix'], efeitos: { eficiencia: 6, nivelTech: 7, inovacao: 5 } },
        { id: 'fin_ia', nome: 'IA de crédito', custo: 130000, semanas: 12, prereqs: ['fin_open'], efeitos: { eficiencia: 10, qualidade: 6, nivelTech: 9 } },
        { id: 'fin_antifraude', nome: 'Antifraude', custo: 100000, semanas: 10, prereqs: ['fin_pix'], efeitos: { qualidade: 8, nivelTech: 6 } },
        { id: 'fin_blockchain', nome: 'Blockchain', custo: 160000, semanas: 14, prereqs: ['fin_open'], efeitos: { nivelTech: 11, inovacao: 9 } },
        { id: 'fin_auto', nome: 'Atendimento automatizado', custo: 80000, semanas: 8, prereqs: [], efeitos: { eficiencia: 8, custoProd: -0.04 } }
      ]
    },
    energia: {
      id: 'energia',
      nome: 'Energia',
      techs: [
        { id: 'ene_solar', nome: 'Painéis solares eficientes', custo: 110000, semanas: 12, prereqs: [], efeitos: { eficiencia: 6, nivelTech: 6, custoProd: -0.05 } },
        { id: 'ene_baterias', nome: 'Baterias avançadas', custo: 150000, semanas: 14, prereqs: ['ene_solar'], efeitos: { eficiencia: 8, nivelTech: 9, inovacao: 6 } },
        { id: 'ene_h2', nome: 'Hidrogênio verde', custo: 250000, semanas: 22, prereqs: ['ene_baterias'], efeitos: { nivelTech: 14, inovacao: 14, qualidade: 5 } },
        { id: 'ene_bio', nome: 'Biocombustíveis', custo: 120000, semanas: 12, prereqs: [], efeitos: { eficiencia: 5, inovacao: 5, nivelTech: 5 } },
        { id: 'ene_smart', nome: 'Redes inteligentes', custo: 180000, semanas: 16, prereqs: ['ene_solar'], efeitos: { eficiencia: 12, nivelTech: 10, custoProd: -0.04 } }
      ]
    },
    varejo: {
      id: 'varejo',
      nome: 'Varejo',
      techs: [
        { id: 'var_auto', nome: 'Autoatendimento', custo: 60000, semanas: 6, prereqs: [], efeitos: { eficiencia: 7, custoProd: -0.03 } },
        { id: 'var_ecom', nome: 'E-commerce avançado', custo: 80000, semanas: 8, prereqs: [], efeitos: { eficiencia: 5, nivelTech: 5, inovacao: 4 } },
        { id: 'var_entrega', nome: 'Entrega autônoma', custo: 140000, semanas: 14, prereqs: ['var_ecom'], efeitos: { eficiencia: 10, nivelTech: 8 } },
        { id: 'var_fidel', nome: 'Fidelização digital', custo: 70000, semanas: 7, prereqs: ['var_ecom'], efeitos: { qualidade: 6, inovacao: 4 } },
        { id: 'var_preco', nome: 'Inteligência de preços', custo: 100000, semanas: 10, prereqs: ['var_auto'], efeitos: { eficiencia: 8, nivelTech: 7, inovacao: 5 } }
      ]
    },
    tecnologia: {
      id: 'tecnologia',
      nome: 'Tecnologia',
      techs: [
        { id: 'tec_cloud', nome: 'Computação em nuvem', custo: 90000, semanas: 8, prereqs: [], efeitos: { eficiencia: 8, nivelTech: 6, custoProd: -0.04 } },
        { id: 'tec_ia_gen', nome: 'IA generativa', custo: 180000, semanas: 14, prereqs: ['tec_cloud'], efeitos: { inovacao: 14, nivelTech: 12, eficiencia: 6 } },
        { id: 'tec_quantum', nome: 'Computação quântica', custo: 400000, semanas: 28, prereqs: ['tec_ia_gen'], efeitos: { nivelTech: 20, inovacao: 18 } },
        { id: 'tec_chips', nome: 'Chips avançados', custo: 300000, semanas: 20, prereqs: ['tec_cloud'], efeitos: { nivelTech: 15, qualidade: 8, inovacao: 10 } },
        { id: 'tec_cyber', nome: 'Cibersegurança', custo: 110000, semanas: 10, prereqs: [], efeitos: { qualidade: 10, nivelTech: 7 } },
        { id: 'tec_mobile', nome: 'Plataforma mobile', custo: 75000, semanas: 8, prereqs: [], efeitos: { eficiencia: 5, inovacao: 5, nivelTech: 4 } }
      ]
    }
  };

  /** Ciclo de vida de produto */
  const PRODUCT_LIFECYCLE = [
    { id: 'lancamento', nome: 'Lançamento', semanas: 4, demandaMult: 1.15, margemMult: 1.1 },
    { id: 'crescimento', nome: 'Crescimento', semanas: 8, demandaMult: 1.25, margemMult: 1.15 },
    { id: 'maturidade', nome: 'Maturidade', semanas: 12, demandaMult: 1.05, margemMult: 1.0 },
    { id: 'saturacao', nome: 'Saturação', semanas: 8, demandaMult: 0.9, margemMult: 0.92 },
    { id: 'declinio', nome: 'Declínio', semanas: 10, demandaMult: 0.65, margemMult: 0.8 },
    { id: 'descontinuacao', nome: 'Descontinuação', semanas: 0, demandaMult: 0, margemMult: 0 }
  ];

  /** Tipos de parceria estratégica */
  const PARTNERSHIP_TYPES = [
    { id: 'universidade', nome: 'Universidade', custoSem: 8000, aceleracao: 1.35, shareResults: 0.25, reputacao: 4 },
    { id: 'centro_pesquisa', nome: 'Centro de pesquisa', custoSem: 12000, aceleracao: 1.45, shareResults: 0.2, reputacao: 5 },
    { id: 'startup', nome: 'Startup', custoSem: 15000, aceleracao: 1.55, shareResults: 0.35, reputacao: 3 },
    { id: 'empresa', nome: 'Outra empresa', custoSem: 20000, aceleracao: 1.25, shareResults: 0.4, reputacao: 2 },
    { id: 'governo', nome: 'Governo', custoSem: 5000, aceleracao: 1.3, shareResults: 0.15, reputacao: 6, incentivo: 0.1 }
  ];

  /** Eventos tecnológicos */
  const TECH_EVENTS = [
    { id: 'descoberta', nome: 'Descoberta científica', tipo: 'positivo', peso: 2, desc: 'Descoberta reduz custos de P&D.' },
    { id: 'uni_parceria', nome: 'Oferta de universidade', tipo: 'oportunidade', peso: 2, desc: 'Universidade oferece parceria de pesquisa.' },
    { id: 'pesquisador_famoso', nome: 'Pesquisador famoso', tipo: 'oportunidade', peso: 1, desc: 'Talento excepcional quer trabalhar na empresa.' },
    { id: 'projeto_fracassa', nome: 'Projeto fracassa', tipo: 'negativo', peso: 2, desc: 'Projeto longo fracassa após anos de investimento.' },
    { id: 'concorrente_rev', nome: 'Concorrente revolucionário', tipo: 'negativo', peso: 2, desc: 'Concorrente lança tecnologia revolucionária.' },
    { id: 'incentivo_gov', nome: 'Incentivo fiscal', tipo: 'positivo', peso: 2, desc: 'Governo cria incentivo fiscal para inovação.' },
    { id: 'startup_disrupt', nome: 'Startup disruptiva', tipo: 'oportunidade', peso: 1, desc: 'Startup desenvolve solução disruptiva.' },
    { id: 'patente_expira', nome: 'Patente expira', tipo: 'neutro', peso: 2, desc: 'Patente importante do setor expira.' },
    { id: 'invencao_historica', nome: 'Invenção histórica', tipo: 'positivo', peso: 1, desc: 'Sua empresa cria uma invenção histórica.' },
    { id: 'tech_obsoleta', nome: 'Tecnologia obsoleta', tipo: 'negativo', peso: 2, desc: 'Uma tecnologia-chave fica obsoleta no setor.' }
  ];

  const ESPIONAGE_RISKS = {
    baixa: { chance: 0.55, custo: 25000, reputacaoRisk: 4, multaChance: 0.08 },
    media: { chance: 0.4, custo: 60000, reputacaoRisk: 10, multaChance: 0.2 },
    alta: { chance: 0.25, custo: 120000, reputacaoRisk: 18, multaChance: 0.4 }
  };

  const PATENT_DURATION_WEEKS = 104; // ~2 anos
  const LICENSE_FEE_MULT = 0.08; // % do custo da tech / semana aproximado anualizado

  global.CGL = global.CGL || {};
  global.CGL.Data = global.CGL.Data || {};
  global.CGL.Data.rdSectorMap = SECTOR_MAP;
  global.CGL.Data.techTrees = TECH_TREES;
  global.CGL.Data.productLifecycle = PRODUCT_LIFECYCLE;
  global.CGL.Data.partnershipTypes = PARTNERSHIP_TYPES;
  global.CGL.Data.techEvents = TECH_EVENTS;
  global.CGL.Data.espionageRisks = ESPIONAGE_RISKS;
  global.CGL.Data.patentDurationWeeks = PATENT_DURATION_WEEKS;
  global.CGL.Data.licenseFeeMult = LICENSE_FEE_MULT;

  global.CGL.Data.getRdSectorForSegment = function (segmentoId) {
    return SECTOR_MAP[segmentoId] || 'tecnologia';
  };

  global.CGL.Data.getTechTree = function (sectorId) {
    return TECH_TREES[sectorId] || TECH_TREES.tecnologia;
  };

  global.CGL.Data.getTechById = function (techId) {
    for (const key of Object.keys(TECH_TREES)) {
      const t = TECH_TREES[key].techs.find((x) => x.id === techId);
      if (t) return { ...t, sectorId: key };
    }
    return null;
  };

  global.CGL.Data.getLifecycleStage = function (id) {
    return PRODUCT_LIFECYCLE.find((s) => s.id === id) || PRODUCT_LIFECYCLE[0];
  };

  global.CGL.Data.getPartnershipType = function (id) {
    return PARTNERSHIP_TYPES.find((p) => p.id === id) || PARTNERSHIP_TYPES[0];
  };

  global.CGL.Data.getTechEventById = function (id) {
    return TECH_EVENTS.find((e) => e.id === id) || null;
  };
})(typeof window !== 'undefined' ? window : globalThis);
