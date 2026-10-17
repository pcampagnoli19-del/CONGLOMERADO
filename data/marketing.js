/**
 * CONGLOMERADO — Dados de marketing, marca, canais e segmentos de consumo (Fase 8)
 */
(function (global) {
  'use strict';

  /** Posicionamentos de marca — atraem públicos diferentes */
  const BRAND_POSITIONS = [
    { id: 'luxo', nome: 'Luxo', precoIdeal: 1.8, segmentos: ['alta_renda', 'aspiracional'], awarenessBoost: 0.8, valorBoost: 1.4 },
    { id: 'premium', nome: 'Premium acessível', precoIdeal: 1.35, segmentos: ['alta_renda', 'classe_media', 'aspiracional'], awarenessBoost: 1, valorBoost: 1.2 },
    { id: 'popular', nome: 'Popular', precoIdeal: 1.0, segmentos: ['classe_media', 'massa', 'jovem'], awarenessBoost: 1.2, valorBoost: 1 },
    { id: 'baixo_custo', nome: 'Baixo custo', precoIdeal: 0.7, segmentos: ['massa', 'sensivel_preco'], awarenessBoost: 1.1, valorBoost: 0.7 },
    { id: 'sustentavel', nome: 'Sustentável', precoIdeal: 1.15, segmentos: ['eco', 'classe_media', 'jovem'], awarenessBoost: 0.9, valorBoost: 1.15 },
    { id: 'inovadora', nome: 'Inovadora', precoIdeal: 1.25, segmentos: ['early_adopter', 'jovem', 'corporativo'], awarenessBoost: 1.1, valorBoost: 1.25 },
    { id: 'tradicional', nome: 'Tradicional', precoIdeal: 1.05, segmentos: ['classe_media', 'senior', 'corporativo'], awarenessBoost: 0.85, valorBoost: 1.05 },
    { id: 'jovem', nome: 'Jovem', precoIdeal: 0.95, segmentos: ['jovem', 'early_adopter', 'massa'], awarenessBoost: 1.3, valorBoost: 0.95 },
    { id: 'corporativa', nome: 'Corporativa', precoIdeal: 1.2, segmentos: ['corporativo', 'governo', 'alta_renda'], awarenessBoost: 0.7, valorBoost: 1.1 }
  ];

  /** Segmentos de consumidores */
  const CONSUMER_SEGMENTS = [
    { id: 'jovem', nome: 'Jovens', idade: [16, 28], renda: 0.6, sensPreco: 0.7, fidelidade: 0.35, novidade: 0.9, eco: 0.5, peso: 1.1 },
    { id: 'classe_media', nome: 'Classe média', idade: [25, 55], renda: 1.0, sensPreco: 0.55, fidelidade: 0.55, novidade: 0.5, eco: 0.4, peso: 1.4 },
    { id: 'alta_renda', nome: 'Alta renda', idade: [30, 65], renda: 2.2, sensPreco: 0.25, fidelidade: 0.6, novidade: 0.55, eco: 0.45, peso: 0.8 },
    { id: 'massa', nome: 'Massa popular', idade: [18, 60], renda: 0.45, sensPreco: 0.9, fidelidade: 0.3, novidade: 0.4, eco: 0.2, peso: 1.6 },
    { id: 'sensivel_preco', nome: 'Sensíveis a preço', idade: [20, 70], renda: 0.5, sensPreco: 0.95, fidelidade: 0.25, novidade: 0.3, eco: 0.15, peso: 1.2 },
    { id: 'early_adopter', nome: 'Early adopters', idade: [22, 40], renda: 1.3, sensPreco: 0.4, fidelidade: 0.4, novidade: 0.95, eco: 0.5, peso: 0.6 },
    { id: 'eco', nome: 'Conscientes ambientais', idade: [25, 50], renda: 1.1, sensPreco: 0.45, fidelidade: 0.65, novidade: 0.6, eco: 0.95, peso: 0.7 },
    { id: 'senior', nome: 'Sênior', idade: [55, 80], renda: 0.9, sensPreco: 0.5, fidelidade: 0.75, novidade: 0.2, eco: 0.35, peso: 0.9 },
    { id: 'aspiracional', nome: 'Aspiracionais', idade: [22, 45], renda: 0.85, sensPreco: 0.5, fidelidade: 0.45, novidade: 0.7, eco: 0.4, peso: 0.85 },
    { id: 'corporativo', nome: 'Compradores B2B', idade: [30, 60], renda: 1.5, sensPreco: 0.4, fidelidade: 0.7, novidade: 0.5, eco: 0.35, peso: 0.75 },
    { id: 'governo', nome: 'Setor público', idade: [35, 65], renda: 1.2, sensPreco: 0.55, fidelidade: 0.8, novidade: 0.25, eco: 0.4, peso: 0.4 }
  ];

  /** Canais de publicidade */
  const AD_CHANNELS = [
    { id: 'tv', nome: 'Televisão', custoBase: 45000, alcance: 0.85, publico: ['massa', 'classe_media', 'senior'], viral: 0.15, backlash: 0.12 },
    { id: 'radio', nome: 'Rádio', custoBase: 8000, alcance: 0.45, publico: ['massa', 'classe_media', 'senior'], viral: 0.05, backlash: 0.06 },
    { id: 'internet', nome: 'Internet / display', custoBase: 12000, alcance: 0.7, publico: ['jovem', 'classe_media', 'early_adopter'], viral: 0.25, backlash: 0.1 },
    { id: 'social', nome: 'Redes sociais', custoBase: 6000, alcance: 0.65, publico: ['jovem', 'early_adopter', 'aspiracional', 'eco'], viral: 0.45, backlash: 0.22 },
    { id: 'influencer', nome: 'Influenciadores', custoBase: 15000, alcance: 0.55, publico: ['jovem', 'early_adopter', 'aspiracional'], viral: 0.5, backlash: 0.28 },
    { id: 'eventos', nome: 'Eventos', custoBase: 20000, alcance: 0.35, publico: ['alta_renda', 'corporativo', 'early_adopter'], viral: 0.2, backlash: 0.08 },
    { id: 'patrocinio', nome: 'Patrocínios', custoBase: 35000, alcance: 0.6, publico: ['massa', 'classe_media', 'jovem'], viral: 0.18, backlash: 0.1 },
    { id: 'outdoor', nome: 'Outdoor', custoBase: 10000, alcance: 0.5, publico: ['massa', 'classe_media'], viral: 0.08, backlash: 0.05 },
    { id: 'direto', nome: 'Marketing direto', custoBase: 4000, alcance: 0.3, publico: ['classe_media', 'senior', 'corporativo'], viral: 0.04, backlash: 0.04 }
  ];

  /** Objetivos de campanha */
  const CAMPAIGN_GOALS = [
    { id: 'vendas', nome: 'Aumentar vendas', pesoVendas: 1.4, pesoMarca: 0.6 },
    { id: 'marca', nome: 'Fortalecer marca', pesoVendas: 0.5, pesoMarca: 1.5 },
    { id: 'lancamento', nome: 'Lançamento', pesoVendas: 1.1, pesoMarca: 1.2 },
    { id: 'recuperacao', nome: 'Recuperação de imagem', pesoVendas: 0.4, pesoMarca: 1.6 },
    { id: 'promocao', nome: 'Promoção tática', pesoVendas: 1.5, pesoMarca: 0.3 },
    { id: 'b2b', nome: 'Geração B2B', pesoVendas: 1.2, pesoMarca: 0.8 }
  ];

  /** Tipos de pesquisa de mercado */
  const RESEARCH_TYPES = [
    { id: 'consumidores', nome: 'Pesquisa com consumidores', custo: 8000, semanas: 2, unlock: ['preferencias', 'sensPreco'] },
    { id: 'teste_produto', nome: 'Teste de produto', custo: 15000, semanas: 3, unlock: ['qualidade', 'aceitacao'] },
    { id: 'focus_group', nome: 'Grupos de avaliação', custo: 6000, semanas: 1, unlock: ['mensagem', 'posicionamento'] },
    { id: 'concorrentes', nome: 'Análise de concorrentes', custo: 10000, semanas: 2, unlock: ['precosRival', 'shareRival'] },
    { id: 'dados_mercado', nome: 'Dados de mercado', custo: 12000, semanas: 2, unlock: ['demandaSeg', 'tendencias'] }
  ];

  /** Influenciadores / celebridades (pool gerável) */
  const INFLUENCER_ARCHETYPES = [
    { id: 'nano', nome: 'Nano-influenciador', publico: 0.15, reputacao: 70, custoMult: 0.3, riscoEscandalo: 0.08 },
    { id: 'micro', nome: 'Micro-influenciador', publico: 0.35, reputacao: 65, custoMult: 0.7, riscoEscandalo: 0.12 },
    { id: 'macro', nome: 'Macro-influenciador', publico: 0.7, reputacao: 60, custoMult: 1.4, riscoEscandalo: 0.18 },
    { id: 'celebridade', nome: 'Celebridade', publico: 0.95, reputacao: 55, custoMult: 3.5, riscoEscandalo: 0.28 },
    { id: 'embaixador', nome: 'Embaixador de marca', publico: 0.5, reputacao: 75, custoMult: 2.0, riscoEscandalo: 0.1 },
    { id: 'criador', nome: 'Criador de conteúdo', publico: 0.45, reputacao: 68, custoMult: 1.0, riscoEscandalo: 0.15 }
  ];

  /** Patrocínios */
  const SPONSORSHIP_TYPES = [
    { id: 'time', nome: 'Time esportivo', custoSemanal: 25000, awareness: 2.2, duracaoMin: 12 },
    { id: 'evento', nome: 'Evento único', custoSemanal: 18000, awareness: 1.8, duracaoMin: 2 },
    { id: 'campeonato', nome: 'Campeonato', custoSemanal: 40000, awareness: 2.8, duracaoMin: 8 },
    { id: 'festival', nome: 'Festival', custoSemanal: 22000, awareness: 2.0, duracaoMin: 3 },
    { id: 'cultural', nome: 'Projeto cultural', custoSemanal: 8000, awareness: 1.2, duracaoMin: 8, confianca: 1.5 },
    { id: 'causa', nome: 'Causa social', custoSemanal: 6000, awareness: 1.0, duracaoMin: 6, confianca: 2.5, reputacao: 2 }
  ];

  /** Estratégias de preço */
  const PRICING_STRATEGIES = [
    { id: 'premium', nome: 'Preço premium', indice: 1.5, margem: 1.35, volume: 0.65, percepcao: 1.3 },
    { id: 'competitivo', nome: 'Preço competitivo', indice: 1.0, margem: 1.0, volume: 1.0, percepcao: 1.0 },
    { id: 'penetracao', nome: 'Penetração de mercado', indice: 0.75, margem: 0.7, volume: 1.45, percepcao: 0.85 },
    { id: 'promocao', nome: 'Promoções / descontos', indice: 0.85, margem: 0.75, volume: 1.25, percepcao: 0.9 },
    { id: 'assinatura', nome: 'Assinatura / recorrente', indice: 1.05, margem: 1.15, volume: 0.95, percepcao: 1.1, retencao: 1.25 }
  ];

  /** Canais de venda B2C / B2B */
  const SALES_CHANNELS = [
    { id: 'lojas', nome: 'Lojas físicas', tipo: 'b2c', custoFixo: 3000, alcance: 0.4 },
    { id: 'ecommerce', nome: 'E-commerce', tipo: 'b2c', custoFixo: 1500, alcance: 0.55 },
    { id: 'apps', nome: 'Aplicativos', tipo: 'b2c', custoFixo: 2000, alcance: 0.35 },
    { id: 'franquias', nome: 'Franquias', tipo: 'b2c', custoFixo: 2500, alcance: 0.45 },
    { id: 'corporativo', nome: 'Contratos corporativos', tipo: 'b2b', custoFixo: 4000, alcance: 0.5 },
    { id: 'governo', nome: 'Contratos governo', tipo: 'b2b', custoFixo: 5000, alcance: 0.3 },
    { id: 'grandes_clientes', nome: 'Grandes clientes', tipo: 'b2b', custoFixo: 3500, alcance: 0.4 },
    { id: 'distribuidores', nome: 'Distribuidores', tipo: 'b2b', custoFixo: 2000, alcance: 0.6 }
  ];

  /** Níveis de CRM */
  const CRM_LEVELS = [
    { id: 0, nome: 'Nenhum', custoSem: 0, retencao: 0, satisfacao: 0 },
    { id: 1, nome: 'Atendimento básico', custoSem: 800, retencao: 4, satisfacao: 3 },
    { id: 2, nome: 'Banco de clientes', custoSem: 2000, retencao: 8, satisfacao: 6 },
    { id: 3, nome: 'Fidelidade', custoSem: 4500, retencao: 14, satisfacao: 10 },
    { id: 4, nome: 'Personalização', custoSem: 8000, retencao: 20, satisfacao: 14 },
    { id: 5, nome: 'CRM avançado + pós-venda', custoSem: 14000, retencao: 28, satisfacao: 20 }
  ];

  /** Crises de imagem */
  const CRISIS_DEFS = [
    { id: 'produto_defeito', nome: 'Produto defeituoso viraliza', severidade: 70, alvo: ['confianca', 'reputacao', 'qualidade'] },
    { id: 'funcionario_polemica', nome: 'Funcionário faz declaração polêmica', severidade: 45, alvo: ['reputacao', 'confianca'] },
    { id: 'propaganda_critica', nome: 'Propaganda recebe críticas', severidade: 50, alvo: ['reputacao', 'awareness'] },
    { id: 'concorrente_acusa', nome: 'Concorrente acusa sua empresa', severidade: 40, alvo: ['confianca', 'reputacao'] },
    { id: 'cliente_famoso', nome: 'Cliente famoso reclama publicamente', severidade: 60, alvo: ['confianca', 'fidelidade', 'reputacao'] },
    { id: 'influencer_escandalo', nome: 'Influenciador envolvido em escândalo', severidade: 55, alvo: ['reputacao', 'confianca'] },
    { id: 'sucesso_viral', nome: 'Campanha vira sucesso inesperado', severidade: -40, alvo: ['awareness', 'valorPercebido'], positivo: true }
  ];

  /** Respostas a crises */
  const CRISIS_RESPONSES = [
    { id: 'ignorar', nome: 'Ignorar', custo: 0, eficacia: 0.15, riscoPiora: 0.45 },
    { id: 'desculpas', nome: 'Pedir desculpas públicas', custo: 5000, eficacia: 0.55, riscoPiora: 0.15 },
    { id: 'reposicionar', nome: 'Reposicionamento de marca', custo: 40000, eficacia: 0.7, riscoPiora: 0.1 },
    { id: 'retirar', nome: 'Retirar produto / campanha', custo: 25000, eficacia: 0.65, riscoPiora: 0.08 },
    { id: 'recuperacao', nome: 'Investir em recuperação de imagem', custo: 60000, eficacia: 0.85, riscoPiora: 0.05 }
  ];

  /** Pipeline de lançamento de produto */
  const LAUNCH_STAGES = [
    { id: 'pesquisa', nome: 'Pesquisa', semanas: 2, custo: 10000 },
    { id: 'desenvolvimento', nome: 'Desenvolvimento', semanas: 4, custo: 40000 },
    { id: 'teste', nome: 'Teste', semanas: 2, custo: 15000 },
    { id: 'campanha', nome: 'Campanha pré-lançamento', semanas: 2, custo: 25000 },
    { id: 'lancamento', nome: 'Lançamento', semanas: 1, custo: 20000 },
    { id: 'avaliacao', nome: 'Avaliação de mercado', semanas: 3, custo: 5000 }
  ];

  /** Ações comerciais de concorrentes */
  const COMPETITOR_ACTIONS = [
    { id: 'corte_preco', nome: 'Reduziu preços', efeito: { pressaoPreco: 0.12, shareSteal: 0.04 } },
    { id: 'campanha_agressiva', nome: 'Campanha agressiva', efeito: { pressaoAds: 0.15, shareSteal: 0.05 } },
    { id: 'produto_melhor', nome: 'Lançou produto melhor', efeito: { pressaoQualidade: 0.1, shareSteal: 0.06 } },
    { id: 'poaching', nome: 'Contrata seus funcionários', efeito: { pressaoRh: 0.08 } },
    { id: 'copia', nome: 'Copiou estratégia', efeito: { pressaoMarca: 0.06, shareSteal: 0.03 } },
    { id: 'guerra', nome: 'Guerra comercial', efeito: { pressaoPreco: 0.18, pressaoAds: 0.12, shareSteal: 0.08 } }
  ];

  const Data = global.CGL.Data || {};

  Data.brandPositions = BRAND_POSITIONS;
  Data.consumerSegments = CONSUMER_SEGMENTS;
  Data.adChannels = AD_CHANNELS;
  Data.campaignGoals = CAMPAIGN_GOALS;
  Data.researchTypes = RESEARCH_TYPES;
  Data.influencerArchetypes = INFLUENCER_ARCHETYPES;
  Data.sponsorshipTypes = SPONSORSHIP_TYPES;
  Data.pricingStrategies = PRICING_STRATEGIES;
  Data.salesChannels = SALES_CHANNELS;
  Data.crmLevels = CRM_LEVELS;
  Data.crisisDefs = CRISIS_DEFS;
  Data.crisisResponses = CRISIS_RESPONSES;
  Data.launchStages = LAUNCH_STAGES;
  Data.competitorActions = COMPETITOR_ACTIONS;

  Data.getBrandPositionById = (id) => BRAND_POSITIONS.find((p) => p.id === id) || BRAND_POSITIONS[2];
  Data.getConsumerSegmentById = (id) => CONSUMER_SEGMENTS.find((s) => s.id === id);
  Data.getAdChannelById = (id) => AD_CHANNELS.find((c) => c.id === id);
  Data.getCampaignGoalById = (id) => CAMPAIGN_GOALS.find((g) => g.id === id) || CAMPAIGN_GOALS[0];
  Data.getResearchTypeById = (id) => RESEARCH_TYPES.find((r) => r.id === id);
  Data.getInfluencerArchetypeById = (id) => INFLUENCER_ARCHETYPES.find((a) => a.id === id);
  Data.getSponsorshipTypeById = (id) => SPONSORSHIP_TYPES.find((s) => s.id === id);
  Data.getPricingStrategyById = (id) => PRICING_STRATEGIES.find((p) => p.id === id) || PRICING_STRATEGIES[1];
  Data.getSalesChannelById = (id) => SALES_CHANNELS.find((c) => c.id === id);
  Data.getCrmLevel = (n) => CRM_LEVELS.find((c) => c.id === Number(n)) || CRM_LEVELS[0];
  Data.getCrisisDefById = (id) => CRISIS_DEFS.find((c) => c.id === id);
  Data.getCrisisResponseById = (id) => CRISIS_RESPONSES.find((r) => r.id === id);
  Data.getLaunchStageById = (id) => LAUNCH_STAGES.find((s) => s.id === id);
  Data.getCompetitorActionById = (id) => COMPETITOR_ACTIONS.find((a) => a.id === id);

  global.CGL = global.CGL || {};
  global.CGL.Data = Data;
})(typeof window !== 'undefined' ? window : globalThis);
