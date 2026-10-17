/**
 * CONGLOMERADO — Dados de dívida / captação (Fase 6)
 * Modalidades, amortização, covenants, leasing, eventos de crédito.
 */
(function (global) {
  'use strict';

  const amortizationSystems = [
    { id: 'price', nome: 'PRICE (parcelas fixas)', fatorParc: 1.0 },
    { id: 'sac', nome: 'SAC (amortização constante)', fatorParc: 1.08 },
    { id: 'bullet', nome: 'Bullet (juros + principal no fim)', fatorParc: 0.35 },
    { id: 'interest_only', nome: 'Só juros + amortização final', fatorParc: 0.4 }
  ];

  const renegotiationOptions = [
    { id: 'alongamento', nome: 'Alongamento do prazo', prazoMult: 1.5, taxaMult: 1.06, parcelaMult: 0.75 },
    { id: 'reducao_parcelas', nome: 'Redução temporária das parcelas', prazoMult: 1.2, taxaMult: 1.1, parcelaMult: 0.6, carenciaSem: 0 },
    { id: 'carencia', nome: 'Carência', prazoMult: 1.15, taxaMult: 1.05, parcelaMult: 1.0, carenciaSem: 8 },
    { id: 'troca_garantia', nome: 'Troca de garantia', prazoMult: 1.0, taxaMult: 0.98, parcelaMult: 1.0, exigeGarantia: true },
    { id: 'equity_swap', nome: 'Conversão parcial em equity', prazoMult: 1.0, taxaMult: 1.0, parcelaMult: 0.7, equityPct: 0.08 }
  ];

  const covenantTypes = [
    { id: 'endividamento_max', nome: 'Endividamento máximo', campo: 'endividamento', op: 'lte', padrao: 0.75 },
    { id: 'caixa_min', nome: 'Caixa mínimo', campo: 'caixa', op: 'gte', padrao: 15000 },
    { id: 'liquidez_min', nome: 'Índice mínimo de liquidez', campo: 'liquidez', op: 'gte', padrao: 0.9 },
    { id: 'dividendo_max', nome: 'Limite de dividendos (payout)', campo: 'payoutMax', op: 'lte', padrao: 0.4 }
  ];

  const leasingTypes = [
    { id: 'financeiro', nome: 'Leasing financeiro', ownershipEnd: true, taxaMult: 1.05 },
    { id: 'operacional', nome: 'Leasing operacional', ownershipEnd: false, taxaMult: 0.95 }
  ];

  const leasingAssets = [
    { id: 'equipamentos', nome: 'Equipamentos', valorBase: 80000 },
    { id: 'caminhoes', nome: 'Caminhões', valorBase: 220000 },
    { id: 'aeronaves', nome: 'Aeronaves', valorBase: 2500000 },
    { id: 'maquinas', nome: 'Máquinas industriais', valorBase: 150000 },
    { id: 'imoveis', nome: 'Imóveis comerciais', valorBase: 800000 }
  ];

  /** Eventos de mercado de crédito (tick semanal) */
  const creditEventDefs = [
    {
      id: 'limite_reduzido',
      nome: 'Banco reduz limite de crédito',
      peso: 12,
      efeito: 'limite_credito',
      delta: -0.15
    },
    {
      id: 'linha_subsidiada',
      nome: 'Linha subsidiada do governo',
      peso: 8,
      efeito: 'subsidio_taxa',
      delta: -0.02
    },
    {
      id: 'crise_juros',
      nome: 'Crise financeira eleva juros',
      peso: 10,
      efeito: 'juros_mercado',
      delta: 0.03
    },
    {
      id: 'banco_liquidacao',
      nome: 'Banco entra em liquidação',
      peso: 3,
      efeito: 'banco_indisponivel',
      delta: 1
    },
    {
      id: 'emissao_recusada',
      nome: 'Investidores recusam emissão',
      peso: 7,
      efeito: 'apetite_deb',
      delta: -0.25
    },
    {
      id: 'rating_sobe',
      nome: 'Rating da empresa melhora',
      peso: 9,
      efeito: 'rating_delta',
      delta: 5
    },
    {
      id: 'rating_cai',
      nome: 'Rating da empresa é rebaixado',
      peso: 9,
      efeito: 'rating_delta',
      delta: -6
    },
    {
      id: 'oferta_refi',
      nome: 'Banco oferece refinanciamento',
      peso: 11,
      efeito: 'oferta_refi',
      delta: 1
    },
    {
      id: 'fundo_projeto',
      nome: 'Fundo quer financiar projeto',
      peso: 6,
      efeito: 'interesse_projeto',
      delta: 1
    }
  ];

  function getAmortizationById(id) {
    return amortizationSystems.find((a) => a.id === id) || amortizationSystems[0];
  }

  function getRenegotiationById(id) {
    return renegotiationOptions.find((r) => r.id === id) || null;
  }

  function getCovenantTypeById(id) {
    return covenantTypes.find((c) => c.id === id) || null;
  }

  function getLeasingTypeById(id) {
    return leasingTypes.find((l) => l.id === id) || leasingTypes[0];
  }

  function getLeasingAssetById(id) {
    return leasingAssets.find((a) => a.id === id) || null;
  }

  function getCreditEventById(id) {
    return creditEventDefs.find((e) => e.id === id) || null;
  }

  global.CGL = global.CGL || {};
  global.CGL.Data = global.CGL.Data || {};
  Object.assign(global.CGL.Data, {
    amortizationSystems,
    renegotiationOptions,
    covenantTypes,
    leasingTypes,
    leasingAssets,
    creditEventDefs,
    getAmortizationById,
    getRenegotiationById,
    getCovenantTypeById,
    getLeasingTypeById,
    getLeasingAssetById,
    getCreditEventById
  });
})(typeof window !== 'undefined' ? window : globalThis);
