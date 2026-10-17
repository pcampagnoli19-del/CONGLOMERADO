/**
 * CONGLOMERADO — Segmentos econômicos (Fase 2)
 * Cada segmento tem afinidades, margem base e intensidade de concorrência.
 */
(function (global) {
  'use strict';

  const SEGMENTS = [
    { id: 'tecnologia', nome: 'Tecnologia', margem: 0.22, concorrencia: 0.7, capitalMin: 25000, crescimento: 1.15, descricao: 'Software, SaaS e serviços digitais.' },
    { id: 'comercio', nome: 'Comércio varejista', margem: 0.12, concorrencia: 0.85, capitalMin: 40000, crescimento: 1.0, descricao: 'Lojas físicas e e-commerce.' },
    { id: 'industria', nome: 'Indústria', margem: 0.14, concorrencia: 0.55, capitalMin: 120000, crescimento: 0.95, descricao: 'Manufatura e transformação.' },
    { id: 'servicos', nome: 'Serviços', margem: 0.18, concorrencia: 0.65, capitalMin: 15000, crescimento: 1.05, descricao: 'Consultoria, manutenção e B2B.' },
    { id: 'financeiro', nome: 'Serviços financeiros', margem: 0.28, concorrencia: 0.5, capitalMin: 200000, crescimento: 1.08, descricao: 'Crédito, corretagem e fintech (base).' },
    { id: 'saude', nome: 'Saúde', margem: 0.16, concorrencia: 0.45, capitalMin: 80000, crescimento: 1.1, descricao: 'Clínicas, laboratórios e care.' },
    { id: 'educacao', nome: 'Educação', margem: 0.15, concorrencia: 0.5, capitalMin: 30000, crescimento: 1.02, descricao: 'Escolas, cursos e EdTech.' },
    { id: 'agro', nome: 'Agronegócio', margem: 0.13, concorrencia: 0.4, capitalMin: 100000, crescimento: 0.98, descricao: 'Produção e comercialização agrícola.' },
    { id: 'construcao', nome: 'Construção civil', margem: 0.11, concorrencia: 0.6, capitalMin: 150000, crescimento: 0.92, descricao: 'Obras, incorporação e infraestrutura.' },
    { id: 'energia', nome: 'Energia', margem: 0.17, concorrencia: 0.35, capitalMin: 300000, crescimento: 1.06, descricao: 'Geração, distribuição e eficiência.' },
    { id: 'logistica', nome: 'Logística e transporte', margem: 0.1, concorrencia: 0.7, capitalMin: 90000, crescimento: 1.04, descricao: 'Frete, última milha e armazenagem.' },
    { id: 'alimentacao', nome: 'Alimentação', margem: 0.09, concorrencia: 0.9, capitalMin: 35000, crescimento: 1.0, descricao: 'Food service e produtos alimentícios.' },
    { id: 'midia', nome: 'Mídia e entretenimento', margem: 0.19, concorrencia: 0.75, capitalMin: 20000, crescimento: 1.12, descricao: 'Conteúdo, eventos e streaming.' },
    { id: 'imobiliario', nome: 'Imobiliário', margem: 0.2, concorrencia: 0.55, capitalMin: 180000, crescimento: 0.97, descricao: 'Gestão e desenvolvimento de imóveis.' },
    { id: 'holding', nome: 'Holding / patrimonial', margem: 0.08, concorrencia: 0.2, capitalMin: 50000, crescimento: 1.0, descricao: 'Controle societário e gestão de participações.' }
  ];

  global.CGL = global.CGL || {};
  global.CGL.Data = global.CGL.Data || {};
  global.CGL.Data.segments = SEGMENTS;
  global.CGL.Data.getSegmentById = function (id) {
    return SEGMENTS.find((s) => s.id === id) || null;
  };
})(typeof window !== 'undefined' ? window : globalThis);
