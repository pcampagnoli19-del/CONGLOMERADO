/**
 * CONGLOMERADO — Perfis de investidores (Fase 5)
 * Angel, VC, PE, family office, etc. — objetivos e apetite a risco.
 */
(function (global) {
  'use strict';

  const investorTypes = [
    {
      id: 'pf',
      nome: 'Pessoa física',
      ticketMin: 20000,
      ticketMax: 250000,
      risco: 0.45,
      horizonteSem: 104,
      equityAlvoMin: 3,
      equityAlvoMax: 15,
      exigeConselho: false,
      preferenciaDividendos: 0.4,
      setores: null // todos
    },
    {
      id: 'anjo',
      nome: 'Investidor-anjo',
      ticketMin: 50000,
      ticketMax: 800000,
      risco: 0.7,
      horizonteSem: 156,
      equityAlvoMin: 5,
      equityAlvoMax: 25,
      exigeConselho: false,
      preferenciaDividendos: 0.15,
      setores: ['tecnologia', 'servicos', 'saude', 'educacao']
    },
    {
      id: 'fundo',
      nome: 'Fundo de investimento',
      ticketMin: 200000,
      ticketMax: 5000000,
      risco: 0.5,
      horizonteSem: 208,
      equityAlvoMin: 8,
      equityAlvoMax: 30,
      exigeConselho: true,
      preferenciaDividendos: 0.35,
      setores: null
    },
    {
      id: 'vc',
      nome: 'Venture Capital',
      ticketMin: 300000,
      ticketMax: 8000000,
      risco: 0.85,
      horizonteSem: 260,
      equityAlvoMin: 10,
      equityAlvoMax: 35,
      exigeConselho: true,
      preferenciaDividendos: 0.05,
      setores: ['tecnologia', 'saude', 'educacao', 'servicos']
    },
    {
      id: 'pe',
      nome: 'Private Equity',
      ticketMin: 2000000,
      ticketMax: 50000000,
      risco: 0.55,
      horizonteSem: 312,
      equityAlvoMin: 15,
      equityAlvoMax: 49,
      exigeConselho: true,
      preferenciaDividendos: 0.25,
      setores: null,
      porteMin: 'media'
    },
    {
      id: 'family_office',
      nome: 'Family Office',
      ticketMin: 500000,
      ticketMax: 15000000,
      risco: 0.4,
      horizonteSem: 400,
      equityAlvoMin: 5,
      equityAlvoMax: 25,
      exigeConselho: true,
      preferenciaDividendos: 0.45,
      setores: null
    },
    {
      id: 'banco_investimento',
      nome: 'Banco de investimento',
      ticketMin: 1000000,
      ticketMax: 30000000,
      risco: 0.35,
      horizonteSem: 156,
      equityAlvoMin: 5,
      equityAlvoMax: 20,
      exigeConselho: true,
      preferenciaDividendos: 0.5,
      setores: null,
      porteMin: 'media'
    },
    {
      id: 'holding',
      nome: 'Holding empresarial',
      ticketMin: 400000,
      ticketMax: 20000000,
      risco: 0.5,
      horizonteSem: 520,
      equityAlvoMin: 10,
      equityAlvoMax: 40,
      exigeConselho: true,
      preferenciaDividendos: 0.3,
      setores: null
    }
  ];

  const investorNames = [
    'Horizon Capital', 'Aurora Ventures', 'Atlas Partners', 'Delta Equity',
    'Nova Angeli', 'Pampas Capital', 'Serra Fund', 'Litoral Invest',
    'Cerrado Partners', 'Iguaçu Ventures', 'Planalto Equity', 'Costa Family Office',
    'Mercúrio Capital', 'Vértice PE', 'Orquestra Investimentos', 'Fênix Holding'
  ];

  function getInvestorTypeById(id) {
    return investorTypes.find((t) => t.id === id) || investorTypes[0];
  }

  function createInvestorInstance(typeId, opts = {}) {
    const tipo = getInvestorTypeById(typeId);
    const nome = opts.nome || (global.CGL?.Utils?.pick
      ? CGL.Utils.pick(investorNames)
      : investorNames[Math.floor(Math.random() * investorNames.length)]);
    const ticket = opts.ticket != null
      ? opts.ticket
      : Math.round(
        tipo.ticketMin + Math.random() * (tipo.ticketMax - tipo.ticketMin)
      );
    return {
      id: opts.id || (global.CGL?.Utils?.uuid ? CGL.Utils.uuid() : 'inv_' + Date.now()),
      tipoId: tipo.id,
      tipoNome: tipo.nome,
      nome,
      ticketDisponivel: ticket,
      risco: tipo.risco,
      horizonteSem: tipo.horizonteSem,
      equityAlvoMin: tipo.equityAlvoMin,
      equityAlvoMax: tipo.equityAlvoMax,
      exigeConselho: tipo.exigeConselho,
      preferenciaDividendos: tipo.preferenciaDividendos,
      setores: tipo.setores ? tipo.setores.slice() : null,
      porteMin: tipo.porteMin || null,
      humor: 50 + Math.round(Math.random() * 30),
      historicoOfertas: 0
    };
  }

  global.CGL = global.CGL || {};
  global.CGL.Data = global.CGL.Data || {};
  Object.assign(global.CGL.Data, {
    investorTypes,
    investorNames,
    getInvestorTypeById,
    createInvestorInstance
  });
})(typeof window !== 'undefined' ? window : globalThis);
