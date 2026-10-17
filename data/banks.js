/**
 * CONGLOMERADO — Bancos e produtos financeiros (Fases 3–5)
 * Fase 5: perfil conservador/agressivo, especialização setorial, IPO.
 */
(function (global) {
  'use strict';

  const banks = [
    {
      id: 'bb',
      nome: 'Banco do Brasil',
      tipo: 'comercial',
      perfil: 'conservador',
      taxaBase: 0.018,
      rigor: 0.55,
      relacionamentoInicial: 55,
      tarifaMensal: 45,
      creditoMult: 1.1,
      setoresPreferidos: ['agro', 'industria', 'energia'],
      coordenaIPO: true
    },
    {
      id: 'itau',
      nome: 'Itaú Unibanco',
      tipo: 'comercial',
      perfil: 'moderado',
      taxaBase: 0.019,
      rigor: 0.6,
      relacionamentoInicial: 50,
      tarifaMensal: 55,
      creditoMult: 1.05,
      setoresPreferidos: ['servicos', 'varejo', 'financeiro'],
      coordenaIPO: true
    },
    {
      id: 'bradesco',
      nome: 'Bradesco',
      tipo: 'comercial',
      perfil: 'moderado',
      taxaBase: 0.0195,
      rigor: 0.58,
      relacionamentoInicial: 48,
      tarifaMensal: 50,
      creditoMult: 1.0,
      setoresPreferidos: ['saude', 'seguros', 'servicos'],
      coordenaIPO: true
    },
    {
      id: 'nubank',
      nome: 'Nubank Empresas',
      tipo: 'digital',
      perfil: 'agressivo',
      taxaBase: 0.021,
      rigor: 0.45,
      relacionamentoInicial: 40,
      tarifaMensal: 0,
      creditoMult: 0.75,
      rendimentoAuto: true,
      setoresPreferidos: ['tecnologia', 'servicos'],
      coordenaIPO: false
    },
    {
      id: 'inter',
      nome: 'Banco Inter',
      tipo: 'digital',
      perfil: 'agressivo',
      taxaBase: 0.02,
      rigor: 0.42,
      relacionamentoInicial: 42,
      tarifaMensal: 0,
      creditoMult: 0.8,
      rendimentoAuto: true,
      setoresPreferidos: ['tecnologia', 'varejo'],
      coordenaIPO: false
    },
    {
      id: 'btg',
      nome: 'BTG Pactual',
      tipo: 'investimento',
      perfil: 'agressivo',
      taxaBase: 0.016,
      rigor: 0.75,
      relacionamentoInicial: 30,
      tarifaMensal: 120,
      creditoMult: 1.4,
      porteMin: 'media',
      setoresPreferidos: ['tecnologia', 'energia', 'financeiro'],
      coordenaIPO: true
    },
    {
      id: 'caixa',
      nome: 'Caixa Econômica',
      tipo: 'comercial',
      perfil: 'conservador',
      taxaBase: 0.0175,
      rigor: 0.5,
      relacionamentoInicial: 60,
      tarifaMensal: 35,
      creditoMult: 1.15,
      setoresPreferidos: ['construcao', 'imobiliario', 'infraestrutura'],
      coordenaIPO: false
    },
    {
      id: 'santander',
      nome: 'Santander',
      tipo: 'comercial',
      perfil: 'moderado',
      taxaBase: 0.02,
      rigor: 0.62,
      relacionamentoInicial: 45,
      tarifaMensal: 60,
      creditoMult: 1.0,
      setoresPreferidos: ['industria', 'comercio', 'servicos'],
      coordenaIPO: true
    }
  ];

  /** Escala de rating de crédito (Fase 5) */
  const creditRatings = [
    { id: 'AAA', scoreMin: 90, spreadSpread: 0.0, confiancaBonus: 20 },
    { id: 'AA', scoreMin: 80, spreadSpread: 0.002, confiancaBonus: 12 },
    { id: 'A', scoreMin: 70, spreadSpread: 0.005, confiancaBonus: 6 },
    { id: 'BBB', scoreMin: 55, spreadSpread: 0.01, confiancaBonus: 0 },
    { id: 'BB', scoreMin: 40, spreadSpread: 0.02, confiancaBonus: -8 },
    { id: 'B', scoreMin: 25, jurosSpread: 0.035, confiancaBonus: -16 },
    { id: 'CCC', scoreMin: 0, jurosSpread: 0.06, confiancaBonus: -28 }
  ];

  function getRatingByScore(score) {
    const s = Number(score) || 0;
    for (const r of creditRatings) {
      if (s >= r.scoreMin) return r;
    }
    return creditRatings[creditRatings.length - 1];
  }

  function getRatingById(id) {
    return creditRatings.find((r) => r.id === id) || creditRatings[3];
  }

  const loanPurposes = [
    { id: 'giro', nome: 'Capital de giro', prazoMaxSem: 52, taxaMult: 1.0 },
    { id: 'expansao', nome: 'Expansão', prazoMaxSem: 156, taxaMult: 0.95 },
    { id: 'construcao', nome: 'Construção', prazoMaxSem: 208, taxaMult: 0.9 },
    { id: 'maquinas', nome: 'Compra de máquinas', prazoMaxSem: 104, taxaMult: 0.92 },
    { id: 'aquisicao', nome: 'Aquisição de empresas', prazoMaxSem: 156, taxaMult: 1.1 },
    { id: 'refinanciamento', nome: 'Refinanciamento', prazoMaxSem: 104, taxaMult: 1.05 },
    { id: 'emergencial', nome: 'Emergencial', prazoMaxSem: 26, taxaMult: 1.35 }
  ];

  const investmentProducts = [
    {
      id: 'caixa_remunerado',
      nome: 'Caixa remunerado',
      liquidezSem: 0,
      rentabilidadeAnual: 0.06,
      risco: 0.05,
      minimo: 1000
    },
    {
      id: 'cdb',
      nome: 'CDB',
      liquidezSem: 4,
      rentabilidadeAnual: 0.11,
      risco: 0.12,
      minimo: 5000
    },
    {
      id: 'tesouro',
      nome: 'Tesouro Selic',
      liquidezSem: 1,
      rentabilidadeAnual: 0.105,
      risco: 0.08,
      minimo: 2000
    },
    {
      id: 'fundo',
      nome: 'Fundo DI',
      liquidezSem: 2,
      rentabilidadeAnual: 0.095,
      risco: 0.15,
      minimo: 3000
    },
    {
      id: 'deb_terceiros',
      nome: 'Debêntures de terceiros',
      liquidezSem: 12,
      rentabilidadeAnual: 0.14,
      risco: 0.35,
      minimo: 20000
    }
  ];

  const dividendPolicies = [
    { id: 'nunca', nome: 'Nunca distribuir', payout: 0, satisfacaoDelta: -0.4 },
    { id: 'minima', nome: 'Distribuição mínima', payout: 0.15, satisfacaoDelta: 0.3 },
    { id: 'parcial', nome: 'Distribuição parcial', payout: 0.4, satisfacaoDelta: 0.8 },
    { id: 'maxima', nome: 'Distribuição máxima', payout: 0.75, satisfacaoDelta: 1.2 },
    { id: 'extraordinaria', nome: 'Distribuição extraordinária', payout: 0.95, satisfacaoDelta: 1.6 }
  ];

  const bankruptcyStages = [
    { id: 0, nome: 'Saudável', chave: 'saudavel' },
    { id: 1, nome: 'Atraso de pagamentos', chave: 'atraso' },
    { id: 2, nome: 'Corte de despesas', chave: 'corte' },
    { id: 3, nome: 'Venda de ativos', chave: 'venda_ativos' },
    { id: 4, nome: 'Renegociação', chave: 'renegociacao' },
    { id: 5, nome: 'Empréstimo emergencial', chave: 'emergencial' },
    { id: 6, nome: 'Recuperação financeira', chave: 'recuperacao' },
    { id: 7, nome: 'Recuperação judicial', chave: 'rj' },
    { id: 8, nome: 'Falência', chave: 'falencia' }
  ];

  const collateralTypes = [
    { id: 'imovel', nome: 'Imóveis', haircut: 0.7 },
    { id: 'maquina', nome: 'Máquinas', haircut: 0.55 },
    { id: 'veiculo', nome: 'Veículos', haircut: 0.6 },
    { id: 'participacao', nome: 'Participações societárias', haircut: 0.5 },
    { id: 'recebivel', nome: 'Recebíveis', haircut: 0.65 },
    { id: 'empresa', nome: 'Empresa inteira', haircut: 0.4 }
  ];

  function getBankById(id) {
    return banks.find((b) => b.id === id) || null;
  }

  function getLoanPurposeById(id) {
    return loanPurposes.find((p) => p.id === id) || null;
  }

  function getInvestmentById(id) {
    return investmentProducts.find((p) => p.id === id) || null;
  }

  function getDividendPolicyById(id) {
    return dividendPolicies.find((p) => p.id === id) || dividendPolicies[0];
  }

  function getBankruptcyStage(id) {
    return bankruptcyStages.find((s) => s.id === id) || bankruptcyStages[0];
  }

  global.CGL = global.CGL || {};
  global.CGL.Data = global.CGL.Data || {};
  Object.assign(global.CGL.Data, {
    banks,
    loanPurposes,
    investmentProducts,
    dividendPolicies,
    bankruptcyStages,
    collateralTypes,
    creditRatings,
    getBankById,
    getLoanPurposeById,
    getInvestmentById,
    getDividendPolicyById,
    getBankruptcyStage,
    getRatingByScore,
    getRatingById
  });
})(typeof window !== 'undefined' ? window : globalThis);
