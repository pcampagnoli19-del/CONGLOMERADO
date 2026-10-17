/**
 * CONGLOMERADO — Traços de personalidade e sonhos de longo prazo
 * Efeitos discretos preparados para sistemas futuros.
 */
(function (global) {
  'use strict';

  const TRAITS = [
    { id: 'introvertido', nome: 'Introvertido', oposto: 'extrovertido', efeitos: { networking: -5, foco: 8, estresseSocial: -5 } },
    { id: 'extrovertido', nome: 'Extrovertido', oposto: 'introvertido', efeitos: { networking: 10, carismaSituacional: 5, gastoSocial: 5 } },
    { id: 'paciente', nome: 'Paciente', oposto: 'impulsivo', efeitos: { decisoes: 5, velocidadeExpansao: -5 } },
    { id: 'impulsivo', nome: 'Impulsivo', oposto: 'paciente', efeitos: { velocidadeExpansao: 8, risco: 10 } },
    { id: 'conservador', nome: 'Conservador', oposto: 'inovador', efeitos: { risco: -10, estabilidade: 10 } },
    { id: 'inovador', nome: 'Inovador', oposto: 'conservador', efeitos: { inovacao: 12, risco: 5 } },
    { id: 'competitivo', nome: 'Competitivo', efeitos: { ambicaoSituacional: 10, estresse: 5 } },
    { id: 'calmo', nome: 'Calmo', oposto: 'ansioso', efeitos: { estresse: -10, negociacao: 5 } },
    { id: 'perfeccionista', nome: 'Perfeccionista', efeitos: { qualidade: 12, velocidade: -8 } },
    { id: 'visionario', nome: 'Visionário', efeitos: { estrategiaLongoPrazo: 12, detalheOperacional: -5 } },
    { id: 'organizado', nome: 'Organizado', efeitos: { eficiencia: 10, burocracia: 5 } },
    { id: 'ansioso', nome: 'Ansioso', oposto: 'calmo', efeitos: { estresse: 12, alertaRiscos: 8 } },
    { id: 'generoso', nome: 'Generoso', oposto: 'economico', efeitos: { lealdadeEquipe: 10, custos: 8 } },
    { id: 'economico', nome: 'Econômico', oposto: 'generoso', efeitos: { custos: -10, moralEquipe: -3 } },
    { id: 'materialista', nome: 'Materialista', efeitos: { motivacaoRiqueza: 10, felicidadeBasica: -3 } },
    { id: 'idealista', nome: 'Idealista', efeitos: { eticaSituacional: 10, lucroCurtoPrazo: -5 } },
    { id: 'workaholic', nome: 'Workaholic', efeitos: { produtividade: 12, saude: -8, energia: -5 } },
    { id: 'diplomatico', nome: 'Diplomático', efeitos: { negociacao: 10, conflito: -8 } },
    { id: 'cauteloso', nome: 'Cauteloso', efeitos: { risco: -8, oportunidadesPerdidas: 5 } },
    { id: 'otimista', nome: 'Otimista', efeitos: { motivacao: 8, leituraRiscos: -5 } },
    { id: 'pessimista', nome: 'Pessimista', efeitos: { leituraRiscos: 10, motivacao: -5 } },
    { id: 'ambicioso_social', nome: 'Ambicioso socialmente', efeitos: { status: 10, gastosImagem: 8 } }
  ];

  const DREAMS = [
    { id: 'maior_empresa', nome: 'Construir a maior empresa do país', descricao: 'Dominar rankings nacionais de receita e valor.', prioridades: { expansao: 15, reputacao: 10 } },
    { id: 'patrimonio_100bi', nome: 'Patrimônio superior a R$ 100 bilhões', descricao: 'Acumular fortuna pessoal histórica.', prioridades: { patrimonio: 20, risco: 5 } },
    { id: 'empresa_familiar', nome: 'Criar uma empresa familiar', descricao: 'Construir um legado geracional.', prioridades: { familia: 15, sucessao: 15 } },
    { id: 'time_futebol', nome: 'Comprar um time de futebol', descricao: 'Entrar no esporte como proprietário.', prioridades: { prestigio: 15, midia: 10 } },
    { id: 'controlar_banco', nome: 'Controlar um banco', descricao: 'Dominar o sistema financeiro.', prioridades: { financeiro: 20, regulacao: 10 } },
    { id: 'dominar_setor', nome: 'Dominar um setor econômico', descricao: 'Ser referência absoluta em um mercado.', prioridades: { marketShare: 20, foco: 10 } },
    { id: 'reconhecimento_mundial', nome: 'Ser reconhecido mundialmente', descricao: 'Marca pessoal global.', prioridades: { midia: 15, internacional: 15 } },
    { id: 'aposentar_jovem', nome: 'Aposentar-se jovem', descricao: 'Independência financeira precoce.', prioridades: { liquidez: 15, equilibrio: 10 } },
    { id: 'imperio_imobiliario', nome: 'Construir um império imobiliário', descricao: 'Portfólio de propriedades em todo o país.', prioridades: { imobiliario: 20, patrimonio: 10 } },
    { id: 'tecnologia_global', nome: 'Criar um unicórnio tecnológico', descricao: 'Empresa de tecnologia avaliada em bilhões.', prioridades: { tecnologia: 20, inovacao: 15 } },
    { id: 'agro_export', nome: 'Ser o maior exportador do agro', descricao: 'Liderar commodities brasileiras.', prioridades: { agro: 20, comercio: 10 } },
    { id: 'filantropia', nome: 'Fundar um império filantrópico', descricao: 'Riqueza a serviço de causas sociais.', prioridades: { etica: 15, reputacao: 15 } }
  ];

  /** Origens familiares — tradeoffs, não easy mode */
  const FAMILY_ORIGINS = [
    {
      id: 'extremamente_pobre',
      nome: 'Família extremamente pobre',
      capitalInicial: 800,
      contatos: 5,
      herancaPotencial: 0,
      ajudaFamiliar: 2,
      acessoMercado: 5,
      pressao: 15,
      motivacaoBonus: 12,
      reputacaoInicial: 35,
      descricao: 'Quase nada no bolso, muita fome de vencer. Poucos contatos, alta motivação.'
    },
    {
      id: 'pobre',
      nome: 'Família pobre',
      capitalInicial: 3500,
      contatos: 10,
      herancaPotencial: 2000,
      ajudaFamiliar: 8,
      acessoMercado: 12,
      pressao: 10,
      motivacaoBonus: 8,
      reputacaoInicial: 40,
      descricao: 'Recursos escassos. Família pode pedir ajuda com frequência.'
    },
    {
      id: 'media_baixa',
      nome: 'Classe média baixa',
      capitalInicial: 12000,
      contatos: 20,
      herancaPotencial: 15000,
      ajudaFamiliar: 15,
      acessoMercado: 25,
      pressao: 8,
      motivacaoBonus: 5,
      reputacaoInicial: 45,
      descricao: 'Estabilidade frágil. Empréstimos familiares limitados.'
    },
    {
      id: 'media',
      nome: 'Classe média',
      capitalInicial: 35000,
      contatos: 35,
      herancaPotencial: 80000,
      ajudaFamiliar: 30,
      acessoMercado: 40,
      pressao: 5,
      motivacaoBonus: 0,
      reputacaoInicial: 50,
      descricao: 'Equilíbrio clássico: capital modesto e expectativas familiares.'
    },
    {
      id: 'media_alta',
      nome: 'Classe média alta',
      capitalInicial: 120000,
      contatos: 55,
      herancaPotencial: 400000,
      ajudaFamiliar: 50,
      acessoMercado: 60,
      pressao: 12,
      motivacaoBonus: -3,
      reputacaoInicial: 58,
      descricao: 'Bom ponto de partida, mas a família exige resultados e status.'
    },
    {
      id: 'rica',
      nome: 'Família rica',
      capitalInicial: 450000,
      contatos: 75,
      herancaPotencial: 2500000,
      ajudaFamiliar: 70,
      acessoMercado: 80,
      pressao: 20,
      motivacaoBonus: -8,
      reputacaoInicial: 65,
      escrutinioMidia: 15,
      descricao: 'Capital e portas abertas — sob escrutínio e rivalidade interna.'
    },
    {
      id: 'extremamente_rica',
      nome: 'Família extremamente rica',
      capitalInicial: 2500000,
      contatos: 90,
      herancaPotencial: 50000000,
      ajudaFamiliar: 85,
      acessoMercado: 95,
      pressao: 30,
      motivacaoBonus: -15,
      reputacaoInicial: 70,
      escrutinioMidia: 35,
      inimigosIniciais: 2,
      descricao: 'Fortuna herdável e inimigos. Nada é “fácil”: o mundo espera fracasso ou domínio.'
    }
  ];

  const ATTRIBUTE_DEFS = [
    { id: 'inteligencia', nome: 'Inteligência', desc: 'Aprendizado, análise e estratégia.' },
    { id: 'lideranca', nome: 'Liderança', desc: 'Comando de equipes e diretoria.' },
    { id: 'carisma', nome: 'Carisma', desc: 'Negociação, vendas e influência.' },
    { id: 'saude', nome: 'Saúde', desc: 'Resistência física e recuperação.' },
    { id: 'resistenciaEstresse', nome: 'Resistência ao estresse', desc: 'Suporta pressão sem colapsar.' },
    { id: 'criatividade', nome: 'Criatividade', desc: 'Inovação e soluções originais.' },
    { id: 'organizacao', nome: 'Organização', desc: 'Processos, prazos e eficiência.' },
    { id: 'disciplina', nome: 'Disciplina', desc: 'Constância e cumprimento de rotinas.' },
    { id: 'ambicao', nome: 'Ambição', desc: 'Fome de crescimento e risco calculado.' },
    { id: 'etica', nome: 'Ética', desc: 'Compliance, confiança e escândalos evitados.' },
    { id: 'sorte', nome: 'Sorte', desc: 'Eventos aleatórios e oportunidades.' }
  ];

  const ATTR_POINTS = 25;
  const ATTR_BASE = 5;
  const ATTR_MAX = 15;
  const TRAIT_PICKS = 3;
  const DREAM_PICKS = 2;

  global.CGL = global.CGL || {};
  global.CGL.Data = global.CGL.Data || {};
  Object.assign(global.CGL.Data, {
    traits: TRAITS,
    dreams: DREAMS,
    familyOrigins: FAMILY_ORIGINS,
    attributeDefs: ATTRIBUTE_DEFS,
    ATTR_POINTS,
    ATTR_BASE,
    ATTR_MAX,
    TRAIT_PICKS,
    DREAM_PICKS,
    getTraitById: (id) => TRAITS.find((t) => t.id === id) || null,
    getDreamById: (id) => DREAMS.find((d) => d.id === id) || null,
    getOriginById: (id) => FAMILY_ORIGINS.find((o) => o.id === id) || null
  });
})(typeof window !== 'undefined' ? window : globalThis);
