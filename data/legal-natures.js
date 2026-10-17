/**
 * CONGLOMERADO — Naturezas jurídicas inspiradas na legislação BR (Fase 2)
 * Cada natureza tem vantagens, limitações e exigências de capital/sócios.
 */
(function (global) {
  'use strict';

  const LEGAL_NATURES = [
    {
      id: 'ei',
      nome: 'Empresário Individual (EI)',
      sigla: 'EI',
      sociosMin: 1,
      sociosMax: 1,
      capitalMin: 1000,
      isHolding: false,
      permiteIPO: false,
      vantagem: 'Abertura rápida e baixo custo fixo.',
      limitacao: 'Responsabilidade ilimitada; um único titular.',
      impostoMult: 0.95,
      flexibilidade: 0.9,
      prestigio: 0.4,
      descricao: 'Pessoa física titular da empresa, sem sócios.'
    },
    {
      id: 'ltda',
      nome: 'Sociedade Limitada (Ltda.)',
      sigla: 'Ltda.',
      sociosMin: 1,
      sociosMax: 50,
      capitalMin: 5000,
      isHolding: false,
      permiteIPO: false,
      vantagem: 'Responsabilidade limitada ao capital; estrutura flexível.',
      limitacao: 'Menos prestígio que S.A. para grandes operações.',
      impostoMult: 1.0,
      flexibilidade: 1.0,
      prestigio: 0.7,
      descricao: 'Formato clássico para PMEs brasileiras.'
    },
    {
      id: 'sa_fechada',
      nome: 'S.A. de capital fechado',
      sigla: 'S.A.',
      sociosMin: 2,
      sociosMax: 200,
      capitalMin: 100000,
      isHolding: false,
      permiteIPO: false,
      vantagem: 'Governança formal e facilidade de aporte institucional.',
      limitacao: 'Custos de compliance e capital mínimo elevados.',
      impostoMult: 1.05,
      flexibilidade: 0.75,
      prestigio: 0.9,
      descricao: 'Sociedade anônima sem negociação em bolsa.'
    },
    {
      id: 'sa_aberta',
      nome: 'S.A. de capital aberto',
      sigla: 'S.A. Aberta',
      sociosMin: 3,
      sociosMax: 9999,
      capitalMin: 500000,
      isHolding: false,
      permiteIPO: true,
      vantagem: 'Acesso a mercado de capitais e IPO (Fase 5).',
      limitacao: 'Regulação pesada; capital e divulgação exigentes.',
      impostoMult: 1.1,
      flexibilidade: 0.55,
      prestigio: 1.0,
      descricao: 'Capital aberto — listagem e pressão de acionistas (Fase 5).'
    },
    {
      id: 'cooperativa',
      nome: 'Cooperativa',
      sigla: 'Coop.',
      sociosMin: 7,
      sociosMax: 500,
      capitalMin: 20000,
      isHolding: false,
      permiteIPO: false,
      vantagem: 'Cultura forte e benefícios fiscais leves.',
      limitacao: 'Decisões lentas; distribuição de lucros limitada.',
      impostoMult: 0.88,
      flexibilidade: 0.6,
      prestigio: 0.65,
      descricao: 'Associados com poder de voto igualitário (simplificado).'
    },
    {
      id: 'holding_patrimonial',
      nome: 'Holding patrimonial',
      sigla: 'Holding Pat.',
      sociosMin: 1,
      sociosMax: 20,
      capitalMin: 50000,
      isHolding: true,
      holdingTipo: 'patrimonial',
      permiteIPO: false,
      vantagem: 'Proteção patrimonial e planejamento societário.',
      limitacao: 'Atividade operacional restrita; foco em participações.',
      impostoMult: 0.92,
      flexibilidade: 0.85,
      prestigio: 0.8,
      descricao: 'Controla bens e participações com baixa operação.'
    },
    {
      id: 'holding_operacional',
      nome: 'Holding operacional',
      sigla: 'Holding Op.',
      sociosMin: 1,
      sociosMax: 50,
      capitalMin: 80000,
      isHolding: true,
      holdingTipo: 'operacional',
      permiteIPO: false,
      vantagem: 'Controle de grupo + sinergias operacionais futuras.',
      limitacao: 'Gestão mais complexa; exige capital e governança.',
      impostoMult: 1.02,
      flexibilidade: 0.8,
      prestigio: 0.95,
      descricao: 'Holding que também pode operar e coordenar subsidiárias.'
    }
  ];

  global.CGL = global.CGL || {};
  global.CGL.Data = global.CGL.Data || {};
  global.CGL.Data.legalNatures = LEGAL_NATURES;
  global.CGL.Data.getLegalNatureById = function (id) {
    return LEGAL_NATURES.find((n) => n.id === id) || null;
  };
})(typeof window !== 'undefined' ? window : globalThis);
