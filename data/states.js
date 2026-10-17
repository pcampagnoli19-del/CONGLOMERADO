/**
 * CONGLOMERADO — Características dos estados brasileiros (Fase 2)
 * Influenciam rentabilidade de sedes e filiais.
 */
(function (global) {
  'use strict';

  const STATES = [
    { uf: 'AC', nome: 'Acre', regiao: 'Norte', tributacao: 48, demanda: 35, populacaoIdx: 20, rendaMedia: 40, custoLogistico: 78, concorrencia: 30, maoDeObra: 42, incentivosFiscais: 70 },
    { uf: 'AL', nome: 'Alagoas', regiao: 'Nordeste', tributacao: 52, demanda: 42, populacaoIdx: 38, rendaMedia: 38, custoLogistico: 55, concorrencia: 40, maoDeObra: 55, incentivosFiscais: 60 },
    { uf: 'AP', nome: 'Amapá', regiao: 'Norte', tributacao: 45, demanda: 28, populacaoIdx: 18, rendaMedia: 42, custoLogistico: 82, concorrencia: 22, maoDeObra: 35, incentivosFiscais: 75 },
    { uf: 'AM', nome: 'Amazonas', regiao: 'Norte', tributacao: 40, demanda: 55, populacaoIdx: 45, rendaMedia: 50, custoLogistico: 85, concorrencia: 45, maoDeObra: 50, incentivosFiscais: 90 },
    { uf: 'BA', nome: 'Bahia', regiao: 'Nordeste', tributacao: 55, demanda: 70, populacaoIdx: 72, rendaMedia: 48, custoLogistico: 50, concorrencia: 60, maoDeObra: 68, incentivosFiscais: 55 },
    { uf: 'CE', nome: 'Ceará', regiao: 'Nordeste', tributacao: 53, demanda: 65, populacaoIdx: 68, rendaMedia: 46, custoLogistico: 48, concorrencia: 58, maoDeObra: 70, incentivosFiscais: 58 },
    { uf: 'DF', nome: 'Distrito Federal', regiao: 'Centro-Oeste', tributacao: 60, demanda: 75, populacaoIdx: 50, rendaMedia: 85, custoLogistico: 45, concorrencia: 70, maoDeObra: 75, incentivosFiscais: 40 },
    { uf: 'ES', nome: 'Espírito Santo', regiao: 'Sudeste', tributacao: 58, demanda: 60, populacaoIdx: 48, rendaMedia: 62, custoLogistico: 40, concorrencia: 55, maoDeObra: 60, incentivosFiscais: 50 },
    { uf: 'GO', nome: 'Goiás', regiao: 'Centro-Oeste', tributacao: 50, demanda: 62, populacaoIdx: 55, rendaMedia: 58, custoLogistico: 48, concorrencia: 52, maoDeObra: 62, incentivosFiscais: 65 },
    { uf: 'MA', nome: 'Maranhão', regiao: 'Nordeste', tributacao: 48, demanda: 45, populacaoIdx: 55, rendaMedia: 35, custoLogistico: 62, concorrencia: 35, maoDeObra: 58, incentivosFiscais: 68 },
    { uf: 'MT', nome: 'Mato Grosso', regiao: 'Centro-Oeste', tributacao: 46, demanda: 58, populacaoIdx: 42, rendaMedia: 60, custoLogistico: 58, concorrencia: 40, maoDeObra: 55, incentivosFiscais: 72 },
    { uf: 'MS', nome: 'Mato Grosso do Sul', regiao: 'Centro-Oeste', tributacao: 47, demanda: 52, populacaoIdx: 35, rendaMedia: 58, custoLogistico: 52, concorrencia: 38, maoDeObra: 52, incentivosFiscais: 70 },
    { uf: 'MG', nome: 'Minas Gerais', regiao: 'Sudeste', tributacao: 58, demanda: 82, populacaoIdx: 88, rendaMedia: 60, custoLogistico: 42, concorrencia: 72, maoDeObra: 78, incentivosFiscais: 48 },
    { uf: 'PA', nome: 'Pará', regiao: 'Norte', tributacao: 48, demanda: 58, populacaoIdx: 60, rendaMedia: 45, custoLogistico: 72, concorrencia: 42, maoDeObra: 58, incentivosFiscais: 68 },
    { uf: 'PB', nome: 'Paraíba', regiao: 'Nordeste', tributacao: 52, demanda: 48, populacaoIdx: 45, rendaMedia: 40, custoLogistico: 52, concorrencia: 42, maoDeObra: 55, incentivosFiscais: 58 },
    { uf: 'PR', nome: 'Paraná', regiao: 'Sul', tributacao: 56, demanda: 78, populacaoIdx: 75, rendaMedia: 68, custoLogistico: 38, concorrencia: 70, maoDeObra: 75, incentivosFiscais: 52 },
    { uf: 'PE', nome: 'Pernambuco', regiao: 'Nordeste', tributacao: 55, demanda: 68, populacaoIdx: 70, rendaMedia: 48, custoLogistico: 48, concorrencia: 62, maoDeObra: 68, incentivosFiscais: 55 },
    { uf: 'PI', nome: 'Piauí', regiao: 'Nordeste', tributacao: 48, demanda: 38, populacaoIdx: 40, rendaMedia: 36, custoLogistico: 58, concorrencia: 28, maoDeObra: 50, incentivosFiscais: 65 },
    { uf: 'RJ', nome: 'Rio de Janeiro', regiao: 'Sudeste', tributacao: 65, demanda: 88, populacaoIdx: 80, rendaMedia: 72, custoLogistico: 48, concorrencia: 85, maoDeObra: 80, incentivosFiscais: 35 },
    { uf: 'RN', nome: 'Rio Grande do Norte', regiao: 'Nordeste', tributacao: 52, demanda: 50, populacaoIdx: 42, rendaMedia: 44, custoLogistico: 50, concorrencia: 45, maoDeObra: 55, incentivosFiscais: 60 },
    { uf: 'RS', nome: 'Rio Grande do Sul', regiao: 'Sul', tributacao: 58, demanda: 80, populacaoIdx: 72, rendaMedia: 70, custoLogistico: 40, concorrencia: 72, maoDeObra: 78, incentivosFiscais: 45 },
    { uf: 'RO', nome: 'Rondônia', regiao: 'Norte', tributacao: 46, demanda: 40, populacaoIdx: 28, rendaMedia: 48, custoLogistico: 70, concorrencia: 32, maoDeObra: 45, incentivosFiscais: 72 },
    { uf: 'RR', nome: 'Roraima', regiao: 'Norte', tributacao: 42, demanda: 22, populacaoIdx: 12, rendaMedia: 44, custoLogistico: 88, concorrencia: 18, maoDeObra: 30, incentivosFiscais: 78 },
    { uf: 'SC', nome: 'Santa Catarina', regiao: 'Sul', tributacao: 54, demanda: 72, populacaoIdx: 58, rendaMedia: 72, custoLogistico: 36, concorrencia: 65, maoDeObra: 80, incentivosFiscais: 50 },
    { uf: 'SP', nome: 'São Paulo', regiao: 'Sudeste', tributacao: 68, demanda: 98, populacaoIdx: 100, rendaMedia: 80, custoLogistico: 30, concorrencia: 95, maoDeObra: 90, incentivosFiscais: 30 },
    { uf: 'SE', nome: 'Sergipe', regiao: 'Nordeste', tributacao: 50, demanda: 40, populacaoIdx: 30, rendaMedia: 42, custoLogistico: 52, concorrencia: 35, maoDeObra: 48, incentivosFiscais: 62 },
    { uf: 'TO', nome: 'Tocantins', regiao: 'Norte', tributacao: 44, demanda: 35, populacaoIdx: 25, rendaMedia: 48, custoLogistico: 65, concorrencia: 28, maoDeObra: 42, incentivosFiscais: 75 }
  ];

  /** Portes empresariais e limiares aproximados (receita anual est.) */
  const SIZE_TIERS = [
    { id: 'micro', nome: 'Microempresa', receitaMax: 360000, funcionariosMax: 9, unlock: 'Abertura local' },
    { id: 'pequena', nome: 'Pequena empresa', receitaMax: 4800000, funcionariosMax: 49, unlock: 'Filiais regionais' },
    { id: 'media', nome: 'Média empresa', receitaMax: 300000000, funcionariosMax: 249, unlock: 'Expansão multiestado' },
    { id: 'grande', nome: 'Grande empresa', receitaMax: 1e9, funcionariosMax: 999, unlock: 'Holdings e M&A' },
    { id: 'corporacao', nome: 'Grande corporação', receitaMax: 1e10, funcionariosMax: 4999, unlock: 'Mercado de capitais (stub)' },
    { id: 'conglomerado', nome: 'Conglomerado empresarial', receitaMax: Infinity, funcionariosMax: Infinity, unlock: 'Grupo diversificado' }
  ];

  global.CGL = global.CGL || {};
  global.CGL.Data = global.CGL.Data || {};
  global.CGL.Data.states = STATES;
  global.CGL.Data.sizeTiers = SIZE_TIERS;
  global.CGL.Data.getStateByUf = function (uf) {
    return STATES.find((s) => s.uf === uf) || null;
  };
  global.CGL.Data.getSizeTierById = function (id) {
    return SIZE_TIERS.find((t) => t.id === id) || SIZE_TIERS[0];
  };
  /** Multiplicador de rentabilidade local (média ponderada 0.7–1.3) */
  global.CGL.Data.stateProfitMult = function (uf) {
    const s = this.getStateByUf(uf);
    if (!s) return 1;
    const demand = s.demanda / 100;
    const labor = s.maoDeObra / 100;
    const incentives = s.incentivosFiscais / 100;
    const tax = s.tributacao / 100;
    const log = s.custoLogistico / 100;
    const competition = s.concorrencia / 100;
    const score =
      demand * 0.28 +
      labor * 0.15 +
      incentives * 0.18 +
      (1 - tax) * 0.18 +
      (1 - log) * 0.12 +
      (1 - competition) * 0.09;
    return CGL.Utils.clamp(0.7 + score * 0.6, 0.7, 1.35);
  };
})(typeof window !== 'undefined' ? window : globalThis);
