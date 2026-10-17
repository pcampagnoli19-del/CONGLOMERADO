/**
 * CONGLOMERADO — Dados de logística e cadeia de suprimentos (Fase 10)
 * Fornecedores, frota, CDs, rotas, portos, tech e riscos.
 */
(function (global) {
  'use strict';

  /** Etapas da cadeia produtiva */
  const SUPPLY_STAGES = [
    { id: 'materia_prima', nome: 'Matéria-prima', ordem: 1 },
    { id: 'fornecedor', nome: 'Fornecedor', ordem: 2 },
    { id: 'producao', nome: 'Produção', ordem: 3 },
    { id: 'armazenamento', nome: 'Armazenamento', ordem: 4 },
    { id: 'transporte', nome: 'Transporte', ordem: 5 },
    { id: 'distribuicao', nome: 'Distribuição', ordem: 6 },
    { id: 'cliente', nome: 'Cliente final', ordem: 7 }
  ];

  /**
   * Catálogo de fornecedores (templates).
   * tipo: local | nacional | internacional | proprio
   */
  const SUPPLIERS = [
    { id: 'sup_local_barato', nome: 'Atacado Regional Ltda', tipo: 'local', preco: 0.75, qualidade: 45, leadTime: 1, confiabilidade: 55, capacidade: 800, descricao: 'Barato, qualidade irregular e atrasos frequentes.' },
    { id: 'sup_local_bom', nome: 'Insumos da Cidade S/A', tipo: 'local', preco: 1.0, qualidade: 68, leadTime: 1, confiabilidade: 78, capacidade: 1200, descricao: 'Equilíbrio preço/prazo para operações locais.' },
    { id: 'sup_nac_premium', nome: 'Brasil Supply Corp', tipo: 'nacional', preco: 1.25, qualidade: 85, leadTime: 2, confiabilidade: 90, capacidade: 5000, descricao: 'Grande fornecedor nacional, caro e confiável.' },
    { id: 'sup_nac_volume', nome: 'MegaInsumos Brasil', tipo: 'nacional', preco: 0.9, qualidade: 60, leadTime: 3, confiabilidade: 70, capacidade: 8000, descricao: 'Volume alto, prazo médio, preço competitivo.' },
    { id: 'sup_int_asia', nome: 'Pacific Trade Co.', tipo: 'internacional', preco: 0.65, qualidade: 55, leadTime: 6, confiabilidade: 50, capacidade: 15000, descricao: 'Importação barata; frete longo e risco alfandegário.' },
    { id: 'sup_int_eu', nome: 'EuroParts GmbH', tipo: 'internacional', preco: 1.4, qualidade: 92, leadTime: 5, confiabilidade: 88, capacidade: 4000, descricao: 'Alta qualidade europeia, frete caro.' },
    { id: 'sup_vertical', nome: 'Produção própria', tipo: 'proprio', preco: 0.55, qualidade: 80, leadTime: 1, confiabilidade: 95, capacidade: 99999, descricao: 'Integração vertical — exige investimento inicial alto.' }
  ];

  /** Tipos de centro de distribuição */
  const CD_TYPES = [
    { id: 'galpao', nome: 'Galpão', custo: 80000, capacidade: 2000, opexSemanal: 2500, refrigerado: false, fatorCusto: 1.0 },
    { id: 'centro_logistico', nome: 'Centro logístico', custo: 220000, capacidade: 8000, opexSemanal: 6500, refrigerado: false, fatorCusto: 0.85 },
    { id: 'armazem_frio', nome: 'Armazém refrigerado', custo: 180000, capacidade: 3000, opexSemanal: 9000, refrigerado: true, fatorCusto: 0.9 },
    { id: 'hub_regional', nome: 'Hub regional', custo: 350000, capacidade: 15000, opexSemanal: 12000, refrigerado: false, fatorCusto: 0.7 }
  ];

  /** Veículos da frota */
  const VEHICLE_TYPES = [
    { id: 'van', nome: 'Van', custo: 45000, capacidade: 80, manutacao: 400, consumo: 0.8, vidaUtil: 260, modo: 'rodovia' },
    { id: 'caminhao', nome: 'Caminhão', custo: 180000, capacidade: 400, manutacao: 1200, consumo: 1.2, vidaUtil: 312, modo: 'rodovia' },
    { id: 'carreta', nome: 'Carreta', custo: 320000, capacidade: 900, manutacao: 2200, consumo: 1.8, vidaUtil: 364, modo: 'rodovia' },
    { id: 'trem', nome: 'Trem cargueiro', custo: 1200000, capacidade: 5000, manutacao: 8000, consumo: 0.4, vidaUtil: 520, modo: 'ferrovia' },
    { id: 'navio', nome: 'Navio cargueiro', custo: 2500000, capacidade: 20000, manutacao: 15000, consumo: 2.5, vidaUtil: 780, modo: 'porto' },
    { id: 'aviao', nome: 'Avião cargueiro', custo: 1800000, capacidade: 1500, manutencao: 18000, consumo: 4.0, vidaUtil: 416, modo: 'aeroporto' }
  ];

  /** Investimentos em tech logística */
  const LOGISTICS_TECH = [
    { id: 'log_erp', nome: 'Sistema ERP logístico', custo: 60000, semanas: 4, efeitos: { eficiencia: 8, custo: -0.05, erros: -0.1 } },
    { id: 'log_rastreio', nome: 'Rastreamento em tempo real', custo: 45000, semanas: 3, efeitos: { eficiencia: 6, prazo: -0.08, satisfacao: 5 } },
    { id: 'log_automacao', nome: 'Automação de estoque', custo: 90000, semanas: 6, efeitos: { eficiencia: 10, holding: -0.15, erros: -0.2 } },
    { id: 'log_ia', nome: 'IA de rotas', custo: 120000, semanas: 8, prereqs: ['log_rastreio'], efeitos: { eficiencia: 12, custo: -0.12, prazo: -0.15 } },
    { id: 'log_robos', nome: 'Robôs de armazém', custo: 200000, semanas: 10, prereqs: ['log_automacao'], efeitos: { eficiencia: 15, holding: -0.2, opexCd: -0.18 } },
    { id: 'log_hub_smart', nome: 'Centros inteligentes', custo: 280000, semanas: 12, prereqs: ['log_ia', 'log_robos'], efeitos: { eficiencia: 18, alcance: 10, custo: -0.1 } }
  ];

  /** Portos e hubs do Brasil (hooks internacionais leves) */
  const PORTS = [
    { id: 'porto_santos', nome: 'Porto de Santos', uf: 'SP', tipo: 'porto', capacidade: 100, custoFrete: 1.0, tempoBase: 2 },
    { id: 'porto_parana', nome: 'Porto de Paranaguá', uf: 'PR', tipo: 'porto', capacidade: 70, custoFrete: 0.95, tempoBase: 2 },
    { id: 'porto_rio', nome: 'Porto do Rio', uf: 'RJ', tipo: 'porto', capacidade: 65, custoFrete: 1.1, tempoBase: 3 },
    { id: 'porto_suape', nome: 'Porto de Suape', uf: 'PE', tipo: 'porto', capacidade: 55, custoFrete: 1.05, tempoBase: 3 },
    { id: 'aeroporto_gru', nome: 'Aeroporto de Guarulhos', uf: 'SP', tipo: 'aeroporto', capacidade: 80, custoFrete: 2.2, tempoBase: 1 },
    { id: 'aeroporto_cnf', nome: 'Aeroporto de Confins', uf: 'MG', tipo: 'aeroporto', capacidade: 40, custoFrete: 2.0, tempoBase: 1 }
  ];

  /** Fatores regionais de infraestrutura (além de states.custoLogistico) */
  const REGION_INFRA = {
    Norte: { rodovia: 0.55, ferrovia: 0.3, porto: 0.7, aeroporto: 0.5 },
    Nordeste: { rodovia: 0.7, ferrovia: 0.4, porto: 0.85, aeroporto: 0.65 },
    'Centro-Oeste': { rodovia: 0.75, ferrovia: 0.55, porto: 0.2, aeroporto: 0.6 },
    Sudeste: { rodovia: 0.95, ferrovia: 0.8, porto: 0.95, aeroporto: 0.95 },
    Sul: { rodovia: 0.9, ferrovia: 0.75, porto: 0.8, aeroporto: 0.8 }
  };

  /** Eventos de risco logístico */
  const LOGISTICS_EVENTS = [
    { id: 'greve_caminhao', titulo: 'Greve de caminhoneiros', descricao: 'Bloqueios nas rodovias elevam prazos e custos.', peso: 12, efeitos: { prazoMult: 1.8, custoMult: 1.4, semanas: 2 } },
    { id: 'enchente', titulo: 'Enchentes bloqueiam estradas', descricao: 'Rotas interrompidas em estados afetados.', peso: 10, efeitos: { prazoMult: 1.5, custoMult: 1.25, semanas: 2, stockoutChance: 0.2 } },
    { id: 'porto_fecha', titulo: 'Porto fecha temporariamente', descricao: 'Operações portuárias paralisadas.', peso: 8, efeitos: { prazoMult: 2.0, freteIntMult: 1.5, semanas: 3 } },
    { id: 'fornecedor_quebra', titulo: 'Fornecedor quebra', descricao: 'Contrato principal interrompido.', peso: 6, efeitos: { cancelContrato: true, stockoutChance: 0.5, semanas: 1 } },
    { id: 'guerra_frete', titulo: 'Geopolítica eleva fretes', descricao: 'Frete internacional dispara.', peso: 5, efeitos: { freteIntMult: 1.8, custoMult: 1.15, semanas: 4 } },
    { id: 'falta_combustivel', titulo: 'Falta de combustível', descricao: 'Abastecimento restrito eleva consumo.', peso: 9, efeitos: { custoMult: 1.35, prazoMult: 1.2, semanas: 2 } },
    { id: 'greve_porto', titulo: 'Greve portuária', descricao: 'Filas e demurrage nos terminais.', peso: 7, efeitos: { freteIntMult: 1.4, prazoMult: 1.6, semanas: 2 } },
    { id: 'alfandega', titulo: 'Problema alfandegário', descricao: 'Carga retida na fiscalização.', peso: 8, efeitos: { prazoMult: 2.2, custoMult: 1.2, semanas: 3, soImport: true } }
  ];

  /** Modos de operação de frota */
  const FLEET_MODES = [
    { id: '3pl', nome: 'Transportadora (3PL)', descricao: 'Flexível, dependência externa, opex variável.' },
    { id: 'propria', nome: 'Frota própria', descricao: 'Controle total, CAPEX alto, pode virar negócio.' },
    { id: 'hibrida', nome: 'Híbrida', descricao: 'Frota própria + 3PL para picos.' }
  ];

  const Data = global.CGL.Data || {};

  Data.supplyStages = SUPPLY_STAGES;
  Data.suppliers = SUPPLIERS;
  Data.cdTypes = CD_TYPES;
  Data.vehicleTypes = VEHICLE_TYPES;
  Data.logisticsTech = LOGISTICS_TECH;
  Data.ports = PORTS;
  Data.regionInfra = REGION_INFRA;
  Data.logisticsEvents = LOGISTICS_EVENTS;
  Data.fleetModes = FLEET_MODES;

  Data.getSupplierById = function (id) {
    return SUPPLIERS.find((s) => s.id === id) || null;
  };
  Data.getCdTypeById = function (id) {
    return CD_TYPES.find((c) => c.id === id) || null;
  };
  Data.getVehicleTypeById = function (id) {
    return VEHICLE_TYPES.find((v) => v.id === id) || null;
  };
  Data.getLogisticsTechById = function (id) {
    return LOGISTICS_TECH.find((t) => t.id === id) || null;
  };
  Data.getPortById = function (id) {
    return PORTS.find((p) => p.id === id) || null;
  };
  Data.getFleetModeById = function (id) {
    return FLEET_MODES.find((m) => m.id === id) || FLEET_MODES[0];
  };

  /**
   * Custo/tempo relativo entre UFs (usa custoLogistico dos estados + região).
   * Retorna { custoMult, tempoSemanas, distanciaIdx }.
   */
  Data.routeFactors = function (ufOrigem, ufDestino) {
    const a = this.getStateByUf?.(ufOrigem);
    const b = this.getStateByUf?.(ufDestino);
    if (!a || !b) {
      return { custoMult: 1.2, tempoSemanas: 2, distanciaIdx: 50 };
    }
    const same = ufOrigem === ufDestino;
    const sameRegion = a.regiao === b.regiao;
    const logAvg = ((a.custoLogistico || 50) + (b.custoLogistico || 50)) / 200;
    const infraA = REGION_INFRA[a.regiao] || { rodovia: 0.7 };
    const infraB = REGION_INFRA[b.regiao] || { rodovia: 0.7 };
    const infra = ((infraA.rodovia || 0.7) + (infraB.rodovia || 0.7)) / 2;
    let distanciaIdx = same ? 8 : sameRegion ? 28 : 55;
    distanciaIdx += Math.abs((a.populacaoIdx || 50) - (b.populacaoIdx || 50)) * 0.15;
    const custoMult = CGL.Utils.clamp(
      (same ? 0.6 : sameRegion ? 0.95 : 1.35) * (0.7 + logAvg) * (1.3 - infra * 0.4),
      0.45,
      2.4
    );
    const tempoSemanas = Math.max(1, Math.round(
      (same ? 0.5 : sameRegion ? 1.2 : 2.2) * (1.2 - infra * 0.3) + distanciaIdx / 40
    ));
    return { custoMult, tempoSemanas, distanciaIdx: Math.round(distanciaIdx) };
  };

  global.CGL = global.CGL || {};
  global.CGL.Data = Data;
})(typeof window !== 'undefined' ? window : globalThis);
