/**
 * CONGLOMERADO — Dados de holding, governança e conglomerado (Fase 12)
 * Departamentos corporativos, escritórios, sinergias, M&A, marca e eventos de império.
 */
(function (global) {
  'use strict';

  /** Departamentos compartilhados da holding (centros de custo) */
  const CORP_DEPARTMENTS = [
    {
      id: 'juridico',
      nome: 'Jurídico',
      custoBase: 4200,
      beneficio: 'Reduz risco legal e custos de litígio no grupo.',
      efeito: { compliance: 8, risco: 5, custoGrupoMult: 0.97 }
    },
    {
      id: 'financeiro',
      nome: 'Financeiro corporativo',
      custoBase: 4800,
      beneficio: 'Tesouraria centralizada e melhor crédito.',
      efeito: { auditoria: 10, valoracaoMult: 1.03, custoGrupoMult: 0.98 }
    },
    {
      id: 'rh',
      nome: 'RH corporativo',
      custoBase: 3600,
      beneficio: 'Políticas de pessoas e sucessão interna.',
      efeito: { cultura: 6, eficiencia: 3, custoGrupoMult: 0.99 }
    },
    {
      id: 'tecnologia',
      nome: 'Tecnologia',
      custoBase: 5200,
      beneficio: 'Sistemas compartilhados e automação.',
      efeito: { eficiencia: 8, nivelTech: 5, custoGrupoMult: 0.96 }
    },
    {
      id: 'marketing',
      nome: 'Marketing corporativo',
      custoBase: 4000,
      beneficio: 'Marca do grupo e campanhas cruzadas.',
      efeito: { reputacao: 5, demandaMult: 1.04 }
    },
    {
      id: 'ri',
      nome: 'Relações institucionais',
      custoBase: 3200,
      beneficio: 'Lobby, licenças e imagem pública.',
      efeito: { reputacao: 4, compliance: 4, influencia: 6 }
    },
    {
      id: 'estrategia',
      nome: 'Estratégia',
      custoBase: 4500,
      beneficio: 'Sinergias e alocação de capital.',
      efeito: { sinergiaMult: 1.08, eficiencia: 4 }
    }
  ];

  /** Tipos de escritório corporativo */
  const CORP_OFFICES = [
    {
      id: 'sede_nacional',
      nome: 'Sede nacional',
      custoBase: 12000,
      capex: 250000,
      beneficio: 'Hub de decisão; +governança e prestígio.',
      efeito: { governanca: 12, reputacao: 8, eficiencia: 5 }
    },
    {
      id: 'regional',
      nome: 'Escritório regional',
      custoBase: 5500,
      capex: 80000,
      beneficio: 'Presença regional e coordenação de filiais.',
      efeito: { eficiencia: 4, cultura: 3 }
    },
    {
      id: 'centro_financeiro',
      nome: 'Centro financeiro',
      custoBase: 7000,
      capex: 150000,
      beneficio: 'Tesouraria e relações com bancos/bolsa.',
      efeito: { auditoria: 10, valoracaoMult: 1.04 }
    },
    {
      id: 'centro_inovacao',
      nome: 'Centro de inovação',
      custoBase: 6500,
      capex: 180000,
      beneficio: 'P&D compartilhado e startups internas.',
      efeito: { nivelTech: 8, eficiencia: 5 }
    },
    {
      id: 'universidade',
      nome: 'Universidade corporativa',
      custoBase: 4800,
      capex: 120000,
      beneficio: 'Formação de herdeiros e líderes.',
      efeito: { cultura: 8, sucessao: 10 }
    }
  ];

  /** Estratégias de marca do conglomerado */
  const BRAND_STRATEGIES = [
    {
      id: 'umbrella',
      nome: 'Marca única (umbrella)',
      descricao: 'Todas as empresas usam a marca do grupo.',
      forcaMarca: 1.15,
      riscoContagio: 1.35,
      custoMarketingMult: 0.88
    },
    {
      id: 'separadas',
      nome: 'Marcas independentes',
      descricao: 'Cada empresa mantém identidade própria.',
      forcaMarca: 0.95,
      riscoContagio: 0.7,
      custoMarketingMult: 1.18
    },
    {
      id: 'hibrida',
      nome: 'Estratégia híbrida',
      descricao: 'Marca-mãe + submarcas setoriais.',
      forcaMarca: 1.05,
      riscoContagio: 1.0,
      custoMarketingMult: 1.0
    }
  ];

  /** Pares de segmento que geram sinergia (origem → alvo ou bidirecional) */
  const SYNERGY_PAIRS = [
    {
      id: 'banco_varejo',
      a: 'financeiro',
      b: 'comercio',
      nome: 'Banco + Varejo',
      descricao: 'Venda de crédito aos clientes da rede.',
      receitaMult: 1.08,
      custoMult: 0.97,
      culturaRisco: 0.15
    },
    {
      id: 'agro_energia',
      a: 'agro',
      b: 'energia',
      nome: 'Agro + Energia',
      descricao: 'Biocombustível e insumos energéticos próprios.',
      receitaMult: 1.06,
      custoMult: 0.94,
      culturaRisco: 0.12
    },
    {
      id: 'industria_energia',
      a: 'industria',
      b: 'energia',
      nome: 'Indústria + Energia',
      descricao: 'Energia própria e custos industriais menores.',
      receitaMult: 1.05,
      custoMult: 0.92,
      culturaRisco: 0.18
    },
    {
      id: 'tech_todas',
      a: 'tecnologia',
      b: '*',
      nome: 'Tecnologia + Grupo',
      descricao: 'Automação e eficiência em todas as controladas.',
      receitaMult: 1.03,
      custoMult: 0.95,
      culturaRisco: 0.1
    },
    {
      id: 'logistica_varejo',
      a: 'logistica',
      b: 'comercio',
      nome: 'Logística + Varejo',
      descricao: 'Distribuição própria e last-mile.',
      receitaMult: 1.05,
      custoMult: 0.93,
      culturaRisco: 0.1
    },
    {
      id: 'imobiliario_varejo',
      a: 'imobiliario',
      b: 'comercio',
      nome: 'Imobiliário + Varejo',
      descricao: 'Pontos próprios e aluguel interno.',
      receitaMult: 1.04,
      custoMult: 0.96,
      culturaRisco: 0.08
    },
    {
      id: 'saude_tech',
      a: 'saude',
      b: 'tecnologia',
      nome: 'Saúde + Tech',
      descricao: 'Telemedicina e sistemas clínicos.',
      receitaMult: 1.07,
      custoMult: 0.97,
      culturaRisco: 0.2
    }
  ];

  /** Estágios do pipeline M&A */
  const MA_STAGES = [
    { id: 'encontrar', nome: 'Encontrar oportunidade', ordem: 1 },
    { id: 'proposta', nome: 'Proposta', ordem: 2 },
    { id: 'negociar', nome: 'Negociar preço', ordem: 3 },
    { id: 'diligencia', nome: 'Due diligence', ordem: 4 },
    { id: 'aprovar', nome: 'Aprovar aquisição', ordem: 5 },
    { id: 'integrar', nome: 'Integrar empresas', ordem: 6 },
    { id: 'concluido', nome: 'Concluído', ordem: 7 },
    { id: 'cancelado', nome: 'Cancelado', ordem: 99 }
  ];

  /** Tipos de alvo M&A */
  const MA_TARGET_TYPES = [
    { id: 'concorrente', nome: 'Concorrente', premium: 1.12 },
    { id: 'fornecedor', nome: 'Fornecedor', premium: 1.05 },
    { id: 'distribuidor', nome: 'Distribuidor', premium: 1.06 },
    { id: 'startup', nome: 'Startup', premium: 1.25 },
    { id: 'estrangeira', nome: 'Empresa estrangeira', premium: 1.18 }
  ];

  /** Issues ocultos reveláveis na due diligence */
  const DD_ISSUES = [
    { id: 'divida_oculta', nome: 'Dívidas ocultas', severidade: 0.8, efeito: { endividamentoAdd: 0.25 } },
    { id: 'processos', nome: 'Processos judiciais', severidade: 0.65, efeito: { reputacao: -8, custoAdd: 0.05 } },
    { id: 'rh_fraco', nome: 'Qualidade fraca de funcionários', severidade: 0.45, efeito: { eficiencia: -10, cultura: -8 } },
    { id: 'reputacao_manchada', nome: 'Reputação manchada', severidade: 0.55, efeito: { reputacao: -15 } },
    { id: 'tech_obsoleta', nome: 'Tecnologia obsoleta', severidade: 0.4, efeito: { nivelTech: -12, eficiencia: -5 } },
    { id: 'clientes_concentrados', nome: 'Clientes concentrados', severidade: 0.5, efeito: { riscoReceita: 0.15 } },
    { id: 'potencial_alto', nome: 'Alto potencial futuro', severidade: -0.3, efeito: { receitaMult: 1.08 } },
    { id: 'cultura_toxica', nome: 'Cultura incompatível', severidade: 0.7, efeito: { cultura: -15, eficiencia: -8 } }
  ];

  /** Políticas de governança */
  const GOV_POLICIES = [
    { id: 'auditoria', nome: 'Auditoria interna', custoSemanal: 1800, ganho: 12 },
    { id: 'compliance', nome: 'Compliance', custoSemanal: 1500, ganho: 10 },
    { id: 'risco', nome: 'Gestão de riscos', custoSemanal: 1600, ganho: 10 },
    { id: 'etica', nome: 'Código de ética', custoSemanal: 900, ganho: 8 }
  ];

  /** Papéis do conselho */
  const BOARD_ROLES = [
    { id: 'presidente', nome: 'Presidente do conselho', independente: false },
    { id: 'independente', nome: 'Conselheiro independente', independente: true },
    { id: 'acionista', nome: 'Representante dos acionistas', independente: false },
    { id: 'familiar', nome: 'Conselheiro familiar', independente: false },
    { id: 'especialista', nome: 'Especialista setorial', independente: true }
  ];

  /** Eventos de império */
  const EMPIRE_EVENTS = [
    {
      id: 'ranking_entrada',
      titulo: 'Entrada no ranking global',
      descricao: 'Seu grupo figura entre os maiores conglomerados monitorados.',
      tipo: 'positivo',
      cond: 'rankingTop20'
    },
    {
      id: 'fundo_compra',
      titulo: 'Fundo estrangeiro quer comprar a holding',
      descricao: 'Uma oferta hostil/amigável aparece na mesa do conselho.',
      tipo: 'decisao',
      cond: 'holdingValorAlto'
    },
    {
      id: 'governo_investiga',
      titulo: 'Governo investiga tamanho do grupo',
      descricao: 'Autoridades antitruste analisam concentração de mercado.',
      tipo: 'negativo',
      cond: 'muitasControladas'
    },
    {
      id: 'ataque_subsidiaria',
      titulo: 'Concorrente ataca subsidiária',
      descricao: 'Uma controlada sofre pressão comercial agressiva.',
      tipo: 'negativo',
      cond: 'temControlada'
    },
    {
      id: 'pressao_sucessao',
      titulo: 'Família pressiona por sucessão',
      descricao: 'Herdeiros cobram plano claro de sucessão.',
      tipo: 'decisao',
      cond: 'temHerdeiro'
    },
    {
      id: 'conselho_ameaca',
      titulo: 'Conselho ameaça substituir o CEO',
      descricao: 'Pressão do board por resultados fracos.',
      tipo: 'negativo',
      cond: 'boardPressaoAlta'
    },
    {
      id: 'sinergia_extra',
      titulo: 'Sinergia inesperada',
      descricao: 'Operações cruzadas geram eficiência acima do esperado.',
      tipo: 'positivo',
      cond: 'temSinergia'
    },
    {
      id: 'escandalo_gov',
      titulo: 'Escândalo de governança',
      descricao: 'Má governança gera perda de confiança e valorização.',
      tipo: 'negativo',
      cond: 'govBaixa'
    }
  ];

  /** Conglomerados NPC para ranking global (stubs) */
  const GLOBAL_CONGLOMERATES = [
    { id: 'npc_atlas', nome: 'Atlas Global Group', receitaAnual: 180e9, valorMercado: 220e9, paises: 42, funcionarios: 380000, poder: 92, influencia: 88, reputacao: 78 },
    { id: 'npc_vertex', nome: 'Vertex Holdings', receitaAnual: 95e9, valorMercado: 140e9, paises: 28, funcionarios: 210000, poder: 80, influencia: 74, reputacao: 82 },
    { id: 'npc_summit', nome: 'Summit Empire', receitaAnual: 70e9, valorMercado: 95e9, paises: 18, funcionarios: 150000, poder: 72, influencia: 70, reputacao: 75 },
    { id: 'npc_lumen', nome: 'Lumen Consortium', receitaAnual: 55e9, valorMercado: 80e9, paises: 22, funcionarios: 120000, poder: 68, influencia: 65, reputacao: 80 },
    { id: 'npc_forge', nome: 'Forge Industrial', receitaAnual: 48e9, valorMercado: 60e9, paises: 14, funcionarios: 95000, poder: 64, influencia: 58, reputacao: 70 },
    { id: 'npc_nexus', nome: 'Nexus Pacific', receitaAnual: 40e9, valorMercado: 55e9, paises: 16, funcionarios: 88000, poder: 60, influencia: 62, reputacao: 76 },
    { id: 'npc_cascade', nome: 'Cascade Retail Co', receitaAnual: 32e9, valorMercado: 38e9, paises: 10, funcionarios: 200000, poder: 55, influencia: 50, reputacao: 72 },
    { id: 'npc_horizon', nome: 'Horizon Agro', receitaAnual: 28e9, valorMercado: 35e9, paises: 8, funcionarios: 72000, poder: 52, influencia: 48, reputacao: 68 }
  ];

  /** Licenças genéricas para criação/compra no grupo */
  const CORP_LICENSES = [
    { id: 'junta', nome: 'Registro na Junta Comercial', custo: 2500 },
    { id: 'alvara', nome: 'Alvará de funcionamento', custo: 1800 },
    { id: 'ambiental', nome: 'Licença ambiental', custo: 8000 },
    { id: 'sanitaria', nome: 'Licença sanitária', custo: 3500 },
    { id: 'cade', nome: 'Notificação antitruste (CADE stub)', custo: 25000 },
    { id: 'bacen', nome: 'Autorização setorial financeira', custo: 50000 }
  ];

  const Data = {
    corpDepartments: CORP_DEPARTMENTS,
    corpOffices: CORP_OFFICES,
    brandStrategies: BRAND_STRATEGIES,
    synergyPairs: SYNERGY_PAIRS,
    maStages: MA_STAGES,
    maTargetTypes: MA_TARGET_TYPES,
    ddIssues: DD_ISSUES,
    govPolicies: GOV_POLICIES,
    boardRoles: BOARD_ROLES,
    empireEvents: EMPIRE_EVENTS,
    globalConglomerates: GLOBAL_CONGLOMERATES,
    corpLicenses: CORP_LICENSES,

    getCorpDeptById(id) {
      return CORP_DEPARTMENTS.find((d) => d.id === id) || null;
    },
    getCorpOfficeById(id) {
      return CORP_OFFICES.find((o) => o.id === id) || null;
    },
    getBrandStrategyById(id) {
      return BRAND_STRATEGIES.find((b) => b.id === id) || BRAND_STRATEGIES[2];
    },
    getMaStageById(id) {
      return MA_STAGES.find((s) => s.id === id) || null;
    },
    getSynergyPair(segA, segB) {
      return SYNERGY_PAIRS.find((p) => {
        if (p.a === 'tecnologia' && p.b === '*') {
          return segA === 'tecnologia' || segB === 'tecnologia';
        }
        return (p.a === segA && p.b === segB) || (p.a === segB && p.b === segA);
      }) || null;
    },
    getDdIssueById(id) {
      return DD_ISSUES.find((i) => i.id === id) || null;
    },
    getGovPolicyById(id) {
      return GOV_POLICIES.find((p) => p.id === id) || null;
    },
    getLicenseById(id) {
      return CORP_LICENSES.find((l) => l.id === id) || null;
    }
  };

  global.CGL = global.CGL || {};
  global.CGL.Data = Object.assign(global.CGL.Data || {}, Data);
})(typeof window !== 'undefined' ? window : globalThis);
