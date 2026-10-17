/**
 * CONGLOMERADO — Dados de RH, cargos, recrutamento e cultura (Fase 7)
 */
(function (global) {
  'use strict';

  /** Hierarquia completa — faixa salarial mensal (BRL) e impacto relativo */
  const ROLES = [
    { id: 'estagiario', nome: 'Estagiário', nivel: 1, salarioMin: 800, salarioMax: 1800, impacto: 0.3, depts: ['ops', 'ti', 'fin', 'mkt', 'rh', 'juridico', 'comercial'] },
    { id: 'aprendiz', nome: 'Aprendiz', nivel: 2, salarioMin: 900, salarioMax: 1600, impacto: 0.35, depts: ['ops', 'ti', 'fin', 'mkt', 'rh', 'comercial'] },
    { id: 'assistente', nome: 'Assistente', nivel: 3, salarioMin: 1600, salarioMax: 2800, impacto: 0.5, depts: ['ops', 'ti', 'fin', 'mkt', 'rh', 'juridico', 'comercial', 'admin'] },
    { id: 'analista_jr', nome: 'Analista Júnior', nivel: 4, salarioMin: 2500, salarioMax: 4200, impacto: 0.7, depts: ['ops', 'ti', 'fin', 'mkt', 'rh', 'juridico', 'comercial', 'rd'] },
    { id: 'analista_pl', nome: 'Analista Pleno', nivel: 5, salarioMin: 4000, salarioMax: 6500, impacto: 0.9, depts: ['ops', 'ti', 'fin', 'mkt', 'rh', 'juridico', 'comercial', 'rd'] },
    { id: 'analista_sr', nome: 'Analista Sênior', nivel: 6, salarioMin: 6000, salarioMax: 9500, impacto: 1.1, depts: ['ops', 'ti', 'fin', 'mkt', 'rh', 'juridico', 'comercial', 'rd'] },
    { id: 'especialista', nome: 'Especialista', nivel: 7, salarioMin: 8000, salarioMax: 14000, impacto: 1.3, depts: ['ti', 'fin', 'rd', 'juridico', 'ops'] },
    { id: 'supervisor', nome: 'Supervisor', nivel: 8, salarioMin: 5500, salarioMax: 9000, impacto: 1.2, depts: ['ops', 'comercial', 'mkt', 'admin'] },
    { id: 'coordenador', nome: 'Coordenador', nivel: 9, salarioMin: 8000, salarioMax: 13000, impacto: 1.4, depts: ['ops', 'ti', 'fin', 'mkt', 'rh', 'comercial', 'rd'] },
    { id: 'gerente', nome: 'Gerente', nivel: 10, salarioMin: 12000, salarioMax: 22000, impacto: 1.8, depts: ['ops', 'ti', 'fin', 'mkt', 'rh', 'juridico', 'comercial', 'rd', 'admin'] },
    { id: 'diretor', nome: 'Diretor', nivel: 11, salarioMin: 20000, salarioMax: 45000, impacto: 2.5, depts: ['ops', 'ti', 'fin', 'mkt', 'rh', 'juridico', 'comercial', 'rd', 'admin'] },
    { id: 'vp', nome: 'Vice-Presidente', nivel: 12, salarioMin: 35000, salarioMax: 70000, impacto: 3.2, depts: ['admin', 'fin', 'ops', 'comercial'] },
    { id: 'presidente', nome: 'Presidente', nivel: 13, salarioMin: 50000, salarioMax: 120000, impacto: 4.0, depts: ['admin'] }
  ];

  const DEPARTMENTS = [
    { id: 'ops', nome: 'Operações', cor: '#3dd68c' },
    { id: 'ti', nome: 'Tecnologia', cor: '#5b8def' },
    { id: 'fin', nome: 'Financeiro', cor: '#d4a84b' },
    { id: 'mkt', nome: 'Marketing', cor: '#e07a5f' },
    { id: 'rh', nome: 'Recursos Humanos', cor: '#9b7ede' },
    { id: 'juridico', nome: 'Jurídico', cor: '#8b9bb0' },
    { id: 'comercial', nome: 'Comercial', cor: '#2dd4bf' },
    { id: 'rd', nome: 'P&D', cor: '#f07178' },
    { id: 'admin', nome: 'Administrativo', cor: '#c4b5a0' }
  ];

  const RECRUITMENT_CHANNELS = [
    { id: 'processo', nome: 'Processo seletivo', custoBase: 800, qualidade: 0.55, velocidade: 3, revelacao: 0.35 },
    { id: 'indicacao', nome: 'Indicação', custoBase: 200, qualidade: 0.7, velocidade: 1, revelacao: 0.5 },
    { id: 'headhunter', nome: 'Headhunter', custoBase: 5000, qualidade: 0.85, velocidade: 2, revelacao: 0.55 },
    { id: 'universidade', nome: 'Universidades', custoBase: 400, qualidade: 0.5, velocidade: 4, revelacao: 0.4 },
    { id: 'estagio', nome: 'Programa de estágio', custoBase: 300, qualidade: 0.45, velocidade: 2, revelacao: 0.45 },
    { id: 'interno', nome: 'Recrutamento interno', custoBase: 100, qualidade: 0.75, velocidade: 1, revelacao: 0.9 },
    { id: 'aquisicao', nome: 'Aquisição de empresas', custoBase: 0, qualidade: 0.6, velocidade: 0, revelacao: 0.3 }
  ];

  const ASSESSMENT_TYPES = [
    { id: 'tecnico', nome: 'Teste técnico', custo: 400, revela: ['inteligencia', 'experiencia', 'produtividade'], qualidadeBonus: 0.12 },
    { id: 'comportamental', nome: 'Teste comportamental', custo: 350, revela: ['motivacao', 'lealdade', 'tracosVisiveis'], qualidadeBonus: 0.1 },
    { id: 'background', nome: 'Background check', custo: 600, revela: ['etica', 'historico'], qualidadeBonus: 0.15 },
    { id: 'dinamica', nome: 'Dinâmica de grupo', custo: 250, revela: ['lideranca', 'criatividade'], qualidadeBonus: 0.08 },
    { id: 'entrevista', nome: 'Entrevista', custo: 150, revela: ['motivacao', 'comunicacao'], qualidadeBonus: 0.1 },
    { id: 'psicologico', nome: 'Avaliação psicológica', custo: 500, revela: ['estresse', 'saude', 'tracosOcultos'], qualidadeBonus: 0.14 }
  ];

  /** Traços de personalidade de funcionários — alguns ocultos até avaliação/tempo */
  const EMPLOYEE_TRAITS = [
    { id: 'lider_nato', nome: 'Líder nato', oculto: false, efeitos: { lideranca: 15, motivacao: 5 } },
    { id: 'criativo', nome: 'Criativo', oculto: false, efeitos: { criatividade: 15, produtividade: 3 } },
    { id: 'organizado', nome: 'Organizado', oculto: false, efeitos: { produtividade: 8, estresse: -5 } },
    { id: 'ambicioso', nome: 'Ambicioso', oculto: false, efeitos: { motivacao: 10, lealdade: -5 } },
    { id: 'leal', nome: 'Leal', oculto: false, efeitos: { lealdade: 18 } },
    { id: 'competitivo', nome: 'Competitivo', oculto: false, efeitos: { produtividade: 8, colaboracao: -5 } },
    { id: 'introvertido', nome: 'Introvertido', oculto: false, efeitos: { comunicacao: -8, foco: 8 } },
    { id: 'comunicativo', nome: 'Comunicativo', oculto: false, efeitos: { comunicacao: 12, clima: 5 } },
    { id: 'workaholic', nome: 'Workaholic', oculto: true, efeitos: { produtividade: 12, estresse: 10, saude: -5 } },
    { id: 'preguicoso', nome: 'Preguiçoso', oculto: true, efeitos: { produtividade: -15, motivacao: -8 } },
    { id: 'fofoqueiro', nome: 'Fofoqueiro', oculto: true, efeitos: { clima: -10, confianca: -8 } },
    { id: 'antietico', nome: 'Antiético', oculto: true, efeitos: { etica: -25, reputacaoRisco: 15 } },
    { id: 'genial', nome: 'Genial', oculto: true, efeitos: { inteligencia: 20, criatividade: 12, salarioExpect: 1.3 } },
    { id: 'carismatico', nome: 'Carismático', oculto: false, efeitos: { lideranca: 10, motivacao: 8 } }
  ];

  const TRAININGS = [
    { id: 'integracao', nome: 'Integração', custo: 200, semanas: 1, boosts: { motivacao: 5, lealdade: 3 }, attrs: {} },
    { id: 'lideranca', nome: 'Liderança', custo: 1200, semanas: 2, boosts: { lideranca: 8 }, attrs: { lideranca: 6 } },
    { id: 'vendas', nome: 'Vendas', custo: 800, semanas: 2, boosts: { produtividade: 5 }, attrs: { criatividade: 3 } },
    { id: 'atendimento', nome: 'Atendimento', custo: 500, semanas: 1, boosts: { motivacao: 4 }, attrs: {} },
    { id: 'tecnologia', nome: 'Tecnologia', custo: 1500, semanas: 3, boosts: { produtividade: 8 }, attrs: { inteligencia: 5, aprendizado: 4 } },
    { id: 'seguranca', nome: 'Segurança', custo: 400, semanas: 1, boosts: { saude: 3 }, attrs: { etica: 2 } },
    { id: 'compliance', nome: 'Compliance', custo: 700, semanas: 1, boosts: {}, attrs: { etica: 8 } },
    { id: 'gestao', nome: 'Gestão', custo: 1800, semanas: 3, boosts: { lideranca: 6, motivacao: 4 }, attrs: { inteligencia: 3 } },
    { id: 'idiomas', nome: 'Idiomas', custo: 900, semanas: 4, boosts: { potencial: 3 }, attrs: { aprendizado: 6 } }
  ];

  const BENEFITS = [
    { id: 'vr', nome: 'Vale-refeição', custoPorFunc: 350, satisfacao: 6 },
    { id: 'va', nome: 'Vale-alimentação', custoPorFunc: 280, satisfacao: 5 },
    { id: 'saude', nome: 'Plano de saúde', custoPorFunc: 450, satisfacao: 12, saudeBoost: 4 },
    { id: 'odonto', nome: 'Plano odontológico', custoPorFunc: 80, satisfacao: 4 },
    { id: 'prev', nome: 'Previdência privada', custoPorFunc: 200, satisfacao: 7, lealdadeBoost: 3 },
    { id: 'plr', nome: 'Participação nos lucros', custoPorFunc: 0, satisfacao: 10, plrPct: 0.05 },
    { id: 'bonus', nome: 'Bônus por desempenho', custoPorFunc: 150, satisfacao: 8 },
    { id: 'creche', nome: 'Auxílio-creche', custoPorFunc: 400, satisfacao: 9 },
    { id: 'home', nome: 'Home office', custoPorFunc: 50, satisfacao: 11, estresseBoost: -4 },
    { id: 'flex', nome: 'Horário flexível', custoPorFunc: 20, satisfacao: 8, estresseBoost: -3 },
    { id: 'academia', nome: 'Academia', custoPorFunc: 100, satisfacao: 5, saudeBoost: 3 },
    { id: 'transporte', nome: 'Transporte', custoPorFunc: 220, satisfacao: 6 }
  ];

  const CULTURE_VALUES = [
    { id: 'inovacao', nome: 'Inovação', atração: { criatividade: 10, inteligencia: 5 } },
    { id: 'meritocracia', nome: 'Meritocracia', atração: { ambicao: 10, produtividade: 5 } },
    { id: 'conservadorismo', nome: 'Conservadorismo', atração: { lealdade: 8, etica: 5 } },
    { id: 'sustentabilidade', nome: 'Sustentabilidade', atração: { etica: 10 } },
    { id: 'resultados', nome: 'Foco em resultados', atração: { produtividade: 12, estresse: 5 } },
    { id: 'bem_estar', nome: 'Bem-estar', atração: { saude: 8, motivacao: 8 } },
    { id: 'qualidade', nome: 'Qualidade', atração: { etica: 5, produtividade: 5 } },
    { id: 'atendimento', nome: 'Atendimento', atração: { comunicacao: 10, motivacao: 5 } }
  ];

  const EDUCATION_LEVELS = [
    { id: 'fundamental', nome: 'Ensino fundamental', bonus: 0 },
    { id: 'medio', nome: 'Ensino médio', bonus: 5 },
    { id: 'tecnico', nome: 'Técnico', bonus: 10 },
    { id: 'superior', nome: 'Superior incompleto', bonus: 15 },
    { id: 'graduacao', nome: 'Graduação', bonus: 25 },
    { id: 'pos', nome: 'Pós-graduação', bonus: 35 },
    { id: 'mestrado', nome: 'Mestrado', bonus: 45 },
    { id: 'doutorado', nome: 'Doutorado', bonus: 55 }
  ];

  const HR_EVENT_DEFS = [
    { id: 'processo_trabalhista', nome: 'Funcionário processa a empresa', severidade: 3, chance: 0.04 },
    { id: 'diretor_demite', nome: 'Diretor pede demissão', severidade: 2, chance: 0.03 },
    { id: 'greve_iminente', nome: 'Greve iminente', severidade: 3, chance: 0.035 },
    { id: 'acidente', nome: 'Acidente de trabalho', severidade: 3, chance: 0.025 },
    { id: 'trainee_sucesso', nome: 'Programa de trainee faz sucesso', severidade: 0, chance: 0.04 },
    { id: 'viral_positivo', nome: 'Colaborador viraliza positivamente', severidade: 0, chance: 0.03 },
    { id: 'escandalo', nome: 'Escândalo envolvendo funcionário', severidade: 4, chance: 0.02 },
    { id: 'parceria_uni', nome: 'Universidade oferece parceria', severidade: 0, chance: 0.035 },
    { id: 'concorrente_poe', nome: 'Concorrente tenta contratar equipe', severidade: 2, chance: 0.05 },
    { id: 'burnout_crise', nome: 'Onda de burnout no time', severidade: 2, chance: 0.04 }
  ];

  const TERMINATION_TYPES = [
    { id: 'individual', nome: 'Demissão individual', custoMult: 1.5, moralHit: 4, reputacaoHit: 2 },
    { id: 'coletiva', nome: 'Demissão coletiva', custoMult: 1.8, moralHit: 12, reputacaoHit: 8 },
    { id: 'acordo', nome: 'Acordo', custoMult: 1.2, moralHit: 2, reputacaoHit: 0 },
    { id: 'pedido', nome: 'Pedido de demissão', custoMult: 0.3, moralHit: 3, reputacaoHit: 0 },
    { id: 'aposentadoria', nome: 'Aposentadoria', custoMult: 0.5, moralHit: 1, reputacaoHit: 0 }
  ];

  function getRoleById(id) {
    return ROLES.find((r) => r.id === id) || null;
  }

  function getDeptById(id) {
    return DEPARTMENTS.find((d) => d.id === id) || null;
  }

  function getChannelById(id) {
    return RECRUITMENT_CHANNELS.find((c) => c.id === id) || null;
  }

  function getAssessmentById(id) {
    return ASSESSMENT_TYPES.find((a) => a.id === id) || null;
  }

  function getTrainingById(id) {
    return TRAININGS.find((t) => t.id === id) || null;
  }

  function getBenefitById(id) {
    return BENEFITS.find((b) => b.id === id) || null;
  }

  function getCultureById(id) {
    return CULTURE_VALUES.find((c) => c.id === id) || null;
  }

  function getTraitById(id) {
    return EMPLOYEE_TRAITS.find((t) => t.id === id) || null;
  }

  function getTerminationById(id) {
    return TERMINATION_TYPES.find((t) => t.id === id) || null;
  }

  function roleForNivel(nivel) {
    const sorted = ROLES.slice().sort((a, b) => a.nivel - b.nivel);
    return sorted.find((r) => r.nivel >= nivel) || sorted[sorted.length - 1];
  }

  global.CGL = global.CGL || {};
  global.CGL.Data = global.CGL.Data || {};
  Object.assign(global.CGL.Data, {
    roles: ROLES,
    departments: DEPARTMENTS,
    recruitmentChannels: RECRUITMENT_CHANNELS,
    assessmentTypes: ASSESSMENT_TYPES,
    employeeTraits: EMPLOYEE_TRAITS,
    trainings: TRAININGS,
    benefits: BENEFITS,
    cultureValues: CULTURE_VALUES,
    educationLevels: EDUCATION_LEVELS,
    hrEventDefs: HR_EVENT_DEFS,
    terminationTypes: TERMINATION_TYPES,
    getRoleById,
    getDeptById,
    getChannelById,
    getAssessmentById,
    getTrainingById,
    getBenefitById,
    getCultureById,
    getTraitById,
    getTerminationById,
    roleForNivel
  });
})(typeof window !== 'undefined' ? window : globalThis);
