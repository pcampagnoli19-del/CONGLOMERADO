/**
 * CONGLOMERADO — Dados Fase 13: dificuldade, IA, automação, conquistas, cheats
 * Unifica pedidos duplicados do brief (Muito Fácil→Impossível + presets + modos).
 */
(function (global) {
  'use strict';

  /** Parâmetros padrão (1 = neutro). Escala tipicamente 0.25–2.5 */
  const DEFAULT_PARAMS = {
    capitalInicialMult: 1,
    inflacaoInicial: 0.045,
    taxaJurosInicial: 0.105,
    estabilidadeEconomica: 1,      // >1 = menos volatilidade
    frequenciaCrises: 1,
    frequenciaEventosPessoais: 1,
    frequenciaEventosNegativos: 1,
    recuperacaoCrises: 1,          // >1 = recupera mais rápido
    agressividadeIA: 1,
    crescimentoConcorrentes: 1,
    facilidadeCredito: 1,          // >1 = bancos aprovam mais / juros menores
    custoCredito: 1,               // >1 = crédito mais caro
    tributacao: 1,
    fiscalizacoes: 1,
    corrupcao: 1,
    criminalidade: 1,
    desastresNaturais: 1,
    produtividadeFuncionarios: 1,
    exigenciaSalarial: 1,
    dificuldadeContratacao: 1,
    rotatividade: 1,
    lealdadeFuncionarios: 1,
    avancaoTecnologico: 1,
    exigenciaInvestidores: 1,
    margemOperacional: 1,          // >1 = margens maiores (fácil)
    pressaoAcionistas: 1,
    volatilidadeMercado: 1,
    impactoFamiliaSaude: 1
  };

  /** Definições de sliders para modo personalizado */
  const PARAM_DEFS = [
    { id: 'capitalInicialMult', label: 'Capital inicial', min: 0.25, max: 3, step: 0.05 },
    { id: 'inflacaoInicial', label: 'Inflação inicial (a.a.)', min: 0.01, max: 0.25, step: 0.005, format: 'pct' },
    { id: 'taxaJurosInicial', label: 'Taxa de juros inicial', min: 0.02, max: 0.3, step: 0.005, format: 'pct' },
    { id: 'estabilidadeEconomica', label: 'Estabilidade econômica', min: 0.4, max: 2, step: 0.05 },
    { id: 'frequenciaCrises', label: 'Frequência de crises', min: 0.2, max: 2.5, step: 0.05 },
    { id: 'frequenciaEventosPessoais', label: 'Eventos pessoais', min: 0.2, max: 2.5, step: 0.05 },
    { id: 'frequenciaEventosNegativos', label: 'Eventos negativos', min: 0.2, max: 2.5, step: 0.05 },
    { id: 'recuperacaoCrises', label: 'Recuperação pós-crise', min: 0.4, max: 2, step: 0.05 },
    { id: 'agressividadeIA', label: 'Agressividade da IA', min: 0.2, max: 2.5, step: 0.05 },
    { id: 'crescimentoConcorrentes', label: 'Crescimento dos concorrentes', min: 0.2, max: 2.5, step: 0.05 },
    { id: 'facilidadeCredito', label: 'Facilidade de crédito', min: 0.25, max: 2.5, step: 0.05 },
    { id: 'custoCredito', label: 'Custo do crédito', min: 0.4, max: 2.5, step: 0.05 },
    { id: 'tributacao', label: 'Tributação', min: 0.5, max: 2, step: 0.05 },
    { id: 'fiscalizacoes', label: 'Fiscalizações', min: 0.3, max: 2.5, step: 0.05 },
    { id: 'corrupcao', label: 'Corrupção', min: 0.3, max: 2.5, step: 0.05 },
    { id: 'criminalidade', label: 'Criminalidade', min: 0.3, max: 2.5, step: 0.05 },
    { id: 'desastresNaturais', label: 'Desastres naturais', min: 0.2, max: 2.5, step: 0.05 },
    { id: 'produtividadeFuncionarios', label: 'Produtividade dos funcionários', min: 0.5, max: 1.8, step: 0.05 },
    { id: 'exigenciaSalarial', label: 'Exigência salarial', min: 0.5, max: 2, step: 0.05 },
    { id: 'dificuldadeContratacao', label: 'Dificuldade de contratação', min: 0.4, max: 2.2, step: 0.05 },
    { id: 'rotatividade', label: 'Rotatividade', min: 0.3, max: 2.2, step: 0.05 },
    { id: 'lealdadeFuncionarios', label: 'Lealdade dos funcionários', min: 0.5, max: 2, step: 0.05 },
    { id: 'avancaoTecnologico', label: 'Avanço tecnológico', min: 0.4, max: 2, step: 0.05 },
    { id: 'exigenciaInvestidores', label: 'Exigência de investidores', min: 0.4, max: 2.2, step: 0.05 },
    { id: 'margemOperacional', label: 'Margem operacional', min: 0.5, max: 1.6, step: 0.05 },
    { id: 'pressaoAcionistas', label: 'Pressão de acionistas', min: 0.3, max: 2.2, step: 0.05 },
    { id: 'volatilidadeMercado', label: 'Volatilidade de mercado', min: 0.4, max: 2.2, step: 0.05 },
    { id: 'impactoFamiliaSaude', label: 'Impacto família/saúde', min: 0.4, max: 2, step: 0.05 }
  ];

  /**
   * Níveis oficiais (conjunto unificado do brief):
   * Muito Fácil → Fácil → Normal → Difícil → Extremo → Impossível
   */
  const DIFFICULTY_LEVELS = [
    {
      id: 'muito_facil',
      nome: 'Muito Fácil',
      subtitulo: 'Empreendedor iniciante',
      descricao: 'Capital elevado, crédito fácil, economia estável e concorrentes lentos.',
      params: {
        capitalInicialMult: 2.2,
        estabilidadeEconomica: 1.6,
        frequenciaCrises: 0.35,
        frequenciaEventosNegativos: 0.4,
        recuperacaoCrises: 1.7,
        agressividadeIA: 0.4,
        crescimentoConcorrentes: 0.45,
        facilidadeCredito: 1.9,
        custoCredito: 0.65,
        produtividadeFuncionarios: 1.25,
        exigenciaSalarial: 0.75,
        lealdadeFuncionarios: 1.45,
        rotatividade: 0.55,
        dificuldadeContratacao: 0.6,
        margemOperacional: 1.25,
        exigenciaInvestidores: 0.55,
        fiscalizacoes: 0.5,
        pressaoAcionistas: 0.5,
        volatilidadeMercado: 0.55,
        impactoFamiliaSaude: 0.7
      }
    },
    {
      id: 'facil',
      nome: 'Fácil',
      subtitulo: 'Pequenos bônus',
      descricao: 'Economia relativamente estável com IA moderada.',
      params: {
        capitalInicialMult: 1.4,
        estabilidadeEconomica: 1.25,
        frequenciaCrises: 0.7,
        frequenciaEventosNegativos: 0.75,
        recuperacaoCrises: 1.25,
        agressividadeIA: 0.7,
        crescimentoConcorrentes: 0.75,
        facilidadeCredito: 1.35,
        custoCredito: 0.85,
        produtividadeFuncionarios: 1.1,
        exigenciaSalarial: 0.9,
        lealdadeFuncionarios: 1.2,
        margemOperacional: 1.1,
        exigenciaInvestidores: 0.8,
        fiscalizacoes: 0.8,
        pressaoAcionistas: 0.75
      }
    },
    {
      id: 'normal',
      nome: 'Normal',
      subtitulo: 'Empresário',
      descricao: 'Experiência equilibrada — parâmetros padrão da simulação.',
      params: {}
    },
    {
      id: 'dificil',
      nome: 'Difícil',
      subtitulo: 'Magnata',
      descricao: 'Crédito caro, salários altos, concorrência eficiente e mais crises.',
      params: {
        capitalInicialMult: 0.75,
        estabilidadeEconomica: 0.8,
        frequenciaCrises: 1.45,
        frequenciaEventosNegativos: 1.35,
        recuperacaoCrises: 0.75,
        agressividadeIA: 1.4,
        crescimentoConcorrentes: 1.35,
        facilidadeCredito: 0.65,
        custoCredito: 1.4,
        produtividadeFuncionarios: 0.92,
        exigenciaSalarial: 1.3,
        rotatividade: 1.35,
        dificuldadeContratacao: 1.3,
        lealdadeFuncionarios: 0.8,
        margemOperacional: 0.85,
        exigenciaInvestidores: 1.4,
        fiscalizacoes: 1.4,
        pressaoAcionistas: 1.4,
        volatilidadeMercado: 1.3,
        tributacao: 1.15
      }
    },
    {
      id: 'extremo',
      nome: 'Extremo',
      subtitulo: 'CEO sob fogo',
      descricao: 'Mercado hipercompetitivo, bancos seletivos e eventos constantes.',
      params: {
        capitalInicialMult: 0.55,
        estabilidadeEconomica: 0.55,
        frequenciaCrises: 1.9,
        frequenciaEventosNegativos: 1.8,
        frequenciaEventosPessoais: 1.4,
        recuperacaoCrises: 0.55,
        agressividadeIA: 1.85,
        crescimentoConcorrentes: 1.7,
        facilidadeCredito: 0.4,
        custoCredito: 1.8,
        produtividadeFuncionarios: 0.85,
        exigenciaSalarial: 1.55,
        rotatividade: 1.6,
        dificuldadeContratacao: 1.55,
        lealdadeFuncionarios: 0.65,
        margemOperacional: 0.72,
        exigenciaInvestidores: 1.75,
        fiscalizacoes: 1.8,
        pressaoAcionistas: 1.75,
        volatilidadeMercado: 1.7,
        tributacao: 1.3,
        corrupcao: 1.4,
        criminalidade: 1.3,
        desastresNaturais: 1.4,
        impactoFamiliaSaude: 1.4
      }
    },
    {
      id: 'impossivel',
      nome: 'Impossível',
      subtitulo: 'O Último Bilionário',
      descricao: 'Pouco capital, gigantes no mercado e quase nenhuma folga para erros.',
      params: {
        capitalInicialMult: 0.35,
        estabilidadeEconomica: 0.4,
        frequenciaCrises: 2.3,
        frequenciaEventosNegativos: 2.2,
        frequenciaEventosPessoais: 1.6,
        recuperacaoCrises: 0.4,
        agressividadeIA: 2.3,
        crescimentoConcorrentes: 2.1,
        facilidadeCredito: 0.25,
        custoCredito: 2.2,
        produtividadeFuncionarios: 0.78,
        exigenciaSalarial: 1.75,
        rotatividade: 1.9,
        dificuldadeContratacao: 1.85,
        lealdadeFuncionarios: 0.5,
        margemOperacional: 0.6,
        exigenciaInvestidores: 2.1,
        fiscalizacoes: 2.2,
        pressaoAcionistas: 2.1,
        volatilidadeMercado: 2.1,
        tributacao: 1.5,
        corrupcao: 1.7,
        criminalidade: 1.6,
        desastresNaturais: 1.8,
        impactoFamiliaSaude: 1.7,
        avancaoTecnologico: 1.3
      }
    }
  ];

  /** Presets de cenário (aplicáveis sobre nível ou personalizado) */
  const DIFFICULTY_PRESETS = [
    {
      id: 'brasil_estavel',
      nome: 'Brasil Estável',
      descricao: 'Inflação controlada, juros moderados e poucas crises.',
      params: {
        inflacaoInicial: 0.035,
        taxaJurosInicial: 0.09,
        estabilidadeEconomica: 1.4,
        frequenciaCrises: 0.55,
        volatilidadeMercado: 0.7,
        corrupcao: 0.7
      }
    },
    {
      id: 'brasil_crise',
      nome: 'Brasil em Crise',
      descricao: 'Juros altos, confiança baixa e fiscalizações intensas.',
      params: {
        inflacaoInicial: 0.09,
        taxaJurosInicial: 0.16,
        estabilidadeEconomica: 0.55,
        frequenciaCrises: 1.8,
        custoCredito: 1.6,
        facilidadeCredito: 0.55,
        fiscalizacoes: 1.6,
        volatilidadeMercado: 1.6,
        corrupcao: 1.4
      }
    },
    {
      id: 'boom',
      nome: 'Boom Econômico',
      descricao: 'Crescimento acelerado, crédito abundante e margens amplas.',
      params: {
        estabilidadeEconomica: 1.2,
        frequenciaCrises: 0.45,
        facilidadeCredito: 1.6,
        custoCredito: 0.7,
        margemOperacional: 1.25,
        crescimentoConcorrentes: 1.3,
        avancaoTecnologico: 1.4,
        volatilidadeMercado: 1.15
      }
    },
    {
      id: 'recessao',
      nome: 'Recessão',
      descricao: 'Demanda fraca, demissões e recuperação lenta.',
      params: {
        estabilidadeEconomica: 0.6,
        frequenciaCrises: 1.5,
        margemOperacional: 0.7,
        facilidadeCredito: 0.5,
        custoCredito: 1.5,
        recuperacaoCrises: 0.6,
        rotatividade: 1.5,
        exigenciaInvestidores: 1.5
      }
    },
    {
      id: 'ultracompetitivo',
      nome: 'Mercado Ultracompetitivo',
      descricao: 'IA predadora, expansão rápida dos rivais e margens apertadas.',
      params: {
        agressividadeIA: 2,
        crescimentoConcorrentes: 1.9,
        margemOperacional: 0.68,
        exigenciaSalarial: 1.25,
        volatilidadeMercado: 1.4
      }
    },
    {
      id: 'sandbox',
      nome: 'Sandbox',
      descricao: 'Laboratório livre — sistemas desligáveis e capital configurável.',
      params: {
        capitalInicialMult: 2,
        estabilidadeEconomica: 1.5,
        frequenciaCrises: 0.3,
        agressividadeIA: 0.5,
        facilidadeCredito: 2
      },
      sandboxDefault: true
    }
  ];

  /** Modos de partida alternativos (hooks leves na criação) */
  const START_MODES = [
    {
      id: 'empreendedor',
      nome: 'Empreendedor',
      descricao: 'Começa sozinho criando uma pequena empresa.',
      hooks: { capitalBonus: 0, empresaInicial: false, empregoInicial: false, foco: 'criar' }
    },
    {
      id: 'herdeiro',
      nome: 'Herdeiro',
      descricao: 'Recebe fortuna familiar — precisa preservar o patrimônio.',
      hooks: { capitalBonus: 2_500_000, herancaAtiva: true, pressaoFamiliar: 25, foco: 'preservar' }
    },
    {
      id: 'executivo',
      nome: 'Executivo',
      descricao: 'Começa empregado em grande empresa e precisa subir até virar dono.',
      hooks: { capitalBonus: -0.3, empregoInicial: true, foco: 'carreira' }
    },
    {
      id: 'investidor',
      nome: 'Investidor',
      descricao: 'Capital financeiro para comprar participações — sem operação inicial.',
      hooks: { capitalBonus: 1_200_000, empresaInicial: false, foco: 'comprar' }
    },
    {
      id: 'imperio_familiar',
      nome: 'Império Familiar',
      descricao: 'Foco em dinastia — herdeiros e conselho familiar desde o início.',
      hooks: { capitalBonus: 400_000, herdeirosStub: true, conselhoFamiliar: true, foco: 'dinastia' }
    }
  ];

  /** Personalidades de IA de concorrentes */
  const AI_PERSONALITIES = [
    {
      id: 'agressiva',
      nome: 'Agressiva',
      descricao: 'Corta preços, expande rápido e assume riscos.',
      agressividade: 1.4,
      foco: 'expansao',
      acoes: ['preco', 'expansao', 'risco']
    },
    {
      id: 'conservadora',
      nome: 'Conservadora',
      descricao: 'Cresce devagar, protege caixa e evita dívida.',
      agressividade: 0.45,
      foco: 'caixa',
      acoes: ['caixa', 'evitar_divida']
    },
    {
      id: 'inovadora',
      nome: 'Inovadora',
      descricao: 'Investe em tech e qualidade de produto.',
      agressividade: 0.9,
      foco: 'qualidade',
      acoes: ['tech', 'qualidade']
    },
    {
      id: 'predadora',
      nome: 'Predadora',
      descricao: 'Ataca rivais fracos e poacha talentos.',
      agressividade: 1.5,
      foco: 'dominio',
      acoes: ['poach', 'pressao', 'aquisicao']
    },
    {
      id: 'global',
      nome: 'Global',
      descricao: 'Prioriza expansão internacional e cadeias.',
      agressividade: 1.1,
      foco: 'expansao',
      acoes: ['intl', 'expansao']
    }
  ];

  const AUTOMATION_LEVELS = [
    { id: 'manual', nome: 'Manual', ordem: 0, descricao: 'Você decide tudo.' },
    { id: 'assistido', nome: 'Assistido', ordem: 1, descricao: 'Sugestões; aguarda aprovação.' },
    { id: 'semi', nome: 'Semi-automático', ordem: 2, descricao: 'Decisões pequenas automáticas.' },
    { id: 'auto', nome: 'Automático', ordem: 3, descricao: 'IA administra a área.' }
  ];

  const AUTOMATION_AREAS = [
    { id: 'compras', nome: 'Compras' },
    { id: 'producao', nome: 'Produção' },
    { id: 'estoque', nome: 'Estoque' },
    { id: 'contratacoes', nome: 'Contratações' },
    { id: 'marketing', nome: 'Marketing' },
    { id: 'expansao', nome: 'Expansão' },
    { id: 'financas', nome: 'Finanças' },
    { id: 'investimentos', nome: 'Investimentos' },
    { id: 'emprestimos', nome: 'Empréstimos' },
    { id: 'dividendos', nome: 'Dividendos' },
    { id: 'precificacao', nome: 'Precificação' },
    { id: 'logistica', nome: 'Logística' },
    { id: 'pd', nome: 'Pesquisa e desenvolvimento' }
  ];

  const MANAGEMENT_PROFILES = [
    { id: 'crescimento', nome: 'Crescimento', areas: { expansao: 'auto', contratacoes: 'semi', marketing: 'semi', pd: 'assistido' } },
    { id: 'lucro', nome: 'Lucro', areas: { precificacao: 'auto', financas: 'semi', estoque: 'semi', compras: 'assistido' } },
    { id: 'dividendos', nome: 'Dividendos', areas: { dividendos: 'auto', financas: 'semi', investimentos: 'assistido' } },
    { id: 'conservador', nome: 'Conservador', areas: { emprestimos: 'manual', expansao: 'assistido', financas: 'semi' } },
    { id: 'agressivo', nome: 'Agressivo', areas: { expansao: 'auto', marketing: 'auto', emprestimos: 'semi', contratacoes: 'semi' } },
    { id: 'inovacao', nome: 'Inovação', areas: { pd: 'auto', marketing: 'semi', producao: 'assistido' } },
    { id: 'reducao_custos', nome: 'Redução de custos', areas: { compras: 'auto', estoque: 'auto', logistica: 'semi', contratacoes: 'assistido' } }
  ];

  const ACHIEVEMENTS = [
    { id: 'primeira_empresa', nome: 'Primeira empresa', descricao: 'Constituir sua primeira empresa.', tipo: 'empresarial' },
    { id: 'faturar_1m', nome: 'Faturar R$ 1 mi', descricao: 'Receita acumulada de R$ 1 milhão em uma empresa.', tipo: 'empresarial' },
    { id: 'faturar_1b', nome: 'Faturar R$ 1 bi', descricao: 'Receita acumulada de R$ 1 bilhão.', tipo: 'empresarial' },
    { id: 'abrir_capital', nome: 'Abrir capital', descricao: 'Listar uma empresa na bolsa.', tipo: 'empresarial' },
    { id: 'comprar_concorrente', nome: 'Comprar concorrente', descricao: 'Adquirir participação de um rival.', tipo: 'empresarial' },
    { id: 'criar_holding', nome: 'Criar holding', descricao: 'Constituir uma holding.', tipo: 'empresarial' },
    { id: 'dez_paises', nome: 'Dez países', descricao: 'Operar em 10 países.', tipo: 'empresarial' },
    { id: 'maior_mundo', nome: 'Maior do mundo', descricao: 'Liderar o ranking global de conglomerados.', tipo: 'empresarial' },
    { id: 'primeira_casa', nome: 'Primeira casa', descricao: 'Adquirir o primeiro imóvel.', tipo: 'pessoal' },
    { id: 'casar', nome: 'Casar', descricao: 'Casar-se.', tipo: 'pessoal' },
    { id: 'ter_filhos', nome: 'Ter filhos', descricao: 'Ter filhos.', tipo: 'pessoal' },
    { id: 'criar_herdeiro', nome: 'Criar herdeiro', descricao: 'Registrar um herdeiro na sucessão.', tipo: 'pessoal' },
    { id: 'cem_anos', nome: 'Centenário', descricao: 'Chegar aos 100 anos.', tipo: 'pessoal' },
    { id: 'primeiro_milhao', nome: 'Primeiro milhão', descricao: 'Patrimônio líquido de R$ 1 milhão.', tipo: 'financeiro' },
    { id: 'primeiro_bilhao', nome: 'Primeiro bilhão', descricao: 'Patrimônio líquido de R$ 1 bilhão.', tipo: 'financeiro' },
    { id: 'semana_52', nome: 'Primeiro ano', descricao: 'Sobreviver 52 semanas.', tipo: 'financeiro' },
    { id: 'automacao_total', nome: 'Piloto automático', descricao: 'Colocar todas as áreas em Automático.', tipo: 'financeiro' }
  ];

  const CHEATS = [
    { id: 'dinheiro_1m', nome: '+R$ 1 milhão', grupo: 'dinheiro' },
    { id: 'dinheiro_100m', nome: '+R$ 100 milhões', grupo: 'dinheiro' },
    { id: 'dinheiro_1b', nome: '+R$ 1 bilhão', grupo: 'dinheiro' },
    { id: 'remover_dividas', nome: 'Remover dívidas', grupo: 'empresa' },
    { id: 'max_reputacao', nome: 'Máxima reputação', grupo: 'empresa' },
    { id: 'max_felicidade', nome: 'Máxima felicidade', grupo: 'jogador' },
    { id: 'funcionarios_perfeitos', nome: 'Funcionários perfeitos', grupo: 'rh' },
    { id: 'economia_perfeita', nome: 'Economia perfeita', grupo: 'mundo' },
    { id: 'congelar_inflacao', nome: 'Congelar inflação', grupo: 'mundo', toggle: true },
    { id: 'congelar_juros', nome: 'Congelar juros', grupo: 'mundo', toggle: true },
    { id: 'sempre_aprovar', nome: 'Sempre aprovar empréstimos', grupo: 'credito', toggle: true },
    { id: 'pesquisa_instantanea', nome: 'Pesquisa instantânea', grupo: 'pd', toggle: true },
    { id: 'ignorar_falencias', nome: 'Ignorar falências', grupo: 'empresa', toggle: true },
    { id: 'revelar_npcs', nome: 'Revelar infos de funcionários', grupo: 'debug', toggle: true }
  ];

  const SANDBOX_TOGGLES = [
    { id: 'eventos', nome: 'Eventos aleatórios', default: true },
    { id: 'crises', nome: 'Crises econômicas', default: true },
    { id: 'concorrentes', nome: 'Spawn de concorrentes', default: true },
    { id: 'iaConcorrente', nome: 'IA de concorrentes', default: true },
    { id: 'rh', nome: 'Tick de RH', default: true },
    { id: 'marketing', nome: 'Tick de marketing', default: true },
    { id: 'pd', nome: 'Tick de P&D', default: true },
    { id: 'logistica', nome: 'Tick de logística', default: true },
    { id: 'internacional', nome: 'Tick internacional', default: true },
    { id: 'holding', nome: 'Tick de holding', default: true },
    { id: 'divida', nome: 'Tick de dívida', default: true },
    { id: 'familia', nome: 'Tick de família', default: true },
    { id: 'balanceamento', nome: 'Auto-balanceamento', default: true },
    { id: 'dificuldadeDinamica', nome: 'Dificuldade dinâmica', default: true }
  ];

  global.CGL = global.CGL || {};
  global.CGL.Data = global.CGL.Data || {};
  Object.assign(global.CGL.Data, {
    DEFAULT_DIFFICULTY_PARAMS: DEFAULT_PARAMS,
    difficultyParamDefs: PARAM_DEFS,
    difficultyLevels: DIFFICULTY_LEVELS,
    difficultyPresets: DIFFICULTY_PRESETS,
    startModes: START_MODES,
    aiPersonalities: AI_PERSONALITIES,
    automationLevels: AUTOMATION_LEVELS,
    automationAreas: AUTOMATION_AREAS,
    managementProfiles: MANAGEMENT_PROFILES,
    achievements: ACHIEVEMENTS,
    cheats: CHEATS,
    sandboxToggles: SANDBOX_TOGGLES,

    getDifficultyLevelById(id) {
      return DIFFICULTY_LEVELS.find((d) => d.id === id) || null;
    },
    getDifficultyPresetById(id) {
      return DIFFICULTY_PRESETS.find((p) => p.id === id) || null;
    },
    getStartModeById(id) {
      return START_MODES.find((m) => m.id === id) || null;
    },
    getAiPersonalityById(id) {
      return AI_PERSONALITIES.find((p) => p.id === id) || null;
    },
    getAchievementById(id) {
      return ACHIEVEMENTS.find((a) => a.id === id) || null;
    },
    getCheatById(id) {
      return CHEATS.find((c) => c.id === id) || null;
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
