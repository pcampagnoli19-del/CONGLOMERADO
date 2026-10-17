/**
 * CONGLOMERADO — Cursos superiores com afinidades setoriais balanceadas
 * Nenhuma opção é claramente superior; cada uma tem vantagens e desvantagens.
 */
(function (global) {
  'use strict';

  const COURSES = [
    { id: 'adm', nome: 'Administração', area: 'Negócios', vantagens: ['Gestão ampla', 'Rede de contatos'], desvantagens: ['Pouca especialização técnica'], afinidades: { varejo: 15, servicos: 15, holding: 20, industria: 5 }, bonusAtributos: { lideranca: 1, organizacao: 1 } },
    { id: 'eco', nome: 'Economia', area: 'Negócios', vantagens: ['Análise de mercados', 'Macroeconomia'], desvantagens: ['Menos prática operacional'], afinidades: { financeiro: 25, consultoria: 15, comercio: 10 }, bonusAtributos: { inteligencia: 1, ambicao: 1 } },
    { id: 'dir', nome: 'Direito', area: 'Humanas', vantagens: ['Contratos e compliance', 'Negociação'], desvantagens: ['Custos iniciais altos de escritório'], afinidades: { juridico: 30, imobiliario: 10, financeiro: 5 }, bonusAtributos: { etica: 1, carisma: 1 } },
    { id: 'cont', nome: 'Contabilidade', area: 'Negócios', vantagens: ['Controle financeiro', 'Tributos'], desvantagens: ['Percepção burocrática'], afinidades: { financeiro: 20, consultoria: 15, servicos: 10 }, bonusAtributos: { organizacao: 2 } },
    { id: 'eng_civ', nome: 'Engenharia Civil', area: 'Engenharia', vantagens: ['Obras e infraestrutura', 'Licitações'], desvantagens: ['Ciclos longos de projeto'], afinidades: { construcao: 30, imobiliario: 20, logistica: 5 }, bonusAtributos: { disciplina: 1, organizacao: 1 } },
    { id: 'eng_mec', nome: 'Engenharia Mecânica', area: 'Engenharia', vantagens: ['Indústria e máquinas', 'Eficiência'], desvantagens: ['Capital intensivo'], afinidades: { industria: 25, automotivo: 20, energia: 10 }, bonusAtributos: { inteligencia: 1, resistenciaEstresse: 1 } },
    { id: 'eng_prod', nome: 'Engenharia de Produção', area: 'Engenharia', vantagens: ['Processos e Lean', 'Custos'], desvantagens: ['Depende de operação madura'], afinidades: { industria: 25, logistica: 20, varejo: 5 }, bonusAtributos: { organizacao: 1, disciplina: 1 } },
    { id: 'eng_qui', nome: 'Engenharia Química', area: 'Engenharia', vantagens: ['Processos químicos', 'Petroquímica'], desvantagens: ['Regulação rigorosa'], afinidades: { quimica: 30, energia: 15, agro: 10 }, bonusAtributos: { inteligencia: 2 } },
    { id: 'eng_ele', nome: 'Engenharia Elétrica', area: 'Engenharia', vantagens: ['Energia e automação'], desvantagens: ['Alta concorrência técnica'], afinidades: { energia: 25, tecnologia: 15, industria: 10 }, bonusAtributos: { inteligencia: 1, criatividade: 1 } },
    { id: 'cc', nome: 'Ciência da Computação', area: 'Tecnologia', vantagens: ['Software e IA', 'Escalabilidade'], desvantagens: ['Mercado volátil'], afinidades: { tecnologia: 30, financeiro: 10, servicos: 10 }, bonusAtributos: { inteligencia: 1, criatividade: 1 } },
    { id: 'si', nome: 'Sistemas de Informação', area: 'Tecnologia', vantagens: ['TI empresarial', 'ERP'], desvantagens: ['Menos profundidade teórica'], afinidades: { tecnologia: 25, servicos: 15, varejo: 10 }, bonusAtributos: { organizacao: 1, inteligencia: 1 } },
    { id: 'eng_soft', nome: 'Engenharia de Software', area: 'Tecnologia', vantagens: ['Produtos digitais', 'Startups'], desvantagens: ['Burnout comum no setor'], afinidades: { tecnologia: 30, midia: 10, financeiro: 5 }, bonusAtributos: { criatividade: 1, disciplina: 1 } },
    { id: 'agro', nome: 'Agronomia', area: 'Agro', vantagens: ['Campo e commodities', 'Exportação'], desvantagens: ['Dependência climática'], afinidades: { agro: 35, logistica: 10, comercio: 5 }, bonusAtributos: { resistenciaEstresse: 1, saude: 1 } },
    { id: 'arq', nome: 'Arquitetura', area: 'Criativo', vantagens: ['Projetos e design urbano'], desvantagens: ['Renda inicial instável'], afinidades: { construcao: 20, imobiliario: 20, design: 15 }, bonusAtributos: { criatividade: 2 } },
    { id: 'med', nome: 'Medicina', area: 'Saúde', vantagens: ['Prestígio e renda clínica', 'Hospitais'], desvantagens: ['Tempo de formação longo; capital alto'], afinidades: { saude: 35, farmacia: 10, servicos: 5 }, bonusAtributos: { inteligencia: 1, disciplina: 1, etica: 1 }, custoExtra: true },
    { id: 'enf', nome: 'Enfermagem', area: 'Saúde', vantagens: ['Operação hospitalar', 'Gestão de equipes'], desvantagens: ['Estresse assistencial'], afinidades: { saude: 25, servicos: 10 }, bonusAtributos: { saude: 1, resistenciaEstresse: 1 } },
    { id: 'farm', nome: 'Farmácia', area: 'Saúde', vantagens: ['Drogarias e indústria'], desvantagens: ['Regulação sanitária'], afinidades: { farmacia: 30, saude: 15, varejo: 10 }, bonusAtributos: { organizacao: 1, etica: 1 } },
    { id: 'mkt', nome: 'Marketing', area: 'Comunicação', vantagens: ['Marca e demanda', 'Campanhas'], desvantagens: ['Resultados difíceis de medir'], afinidades: { varejo: 20, midia: 20, tecnologia: 10 }, bonusAtributos: { carisma: 1, criatividade: 1 } },
    { id: 'pub', nome: 'Publicidade e Propaganda', area: 'Comunicação', vantagens: ['Criação e mídia'], desvantagens: ['Agências competitivas'], afinidades: { midia: 30, varejo: 15 }, bonusAtributos: { criatividade: 2 } },
    { id: 'ri', nome: 'Relações Internacionais', area: 'Humanas', vantagens: ['Comércio exterior', 'Diplomacia corporativa'], desvantagens: ['Poucas vagas iniciais'], afinidades: { comercio: 25, logistica: 10, financeiro: 10 }, bonusAtributos: { carisma: 1, inteligencia: 1 } },
    { id: 'log', nome: 'Logística', area: 'Operações', vantagens: ['Cadeia de suprimentos'], desvantagens: ['Margens apertadas'], afinidades: { logistica: 35, varejo: 10, industria: 10 }, bonusAtributos: { organizacao: 2 } },
    { id: 'comex', nome: 'Comércio Exterior', area: 'Negócios', vantagens: ['Exportação/importação'], desvantagens: ['Risco cambial'], afinidades: { comercio: 30, logistica: 15, agro: 5 }, bonusAtributos: { ambicao: 1, organizacao: 1 } },
    { id: 'psi', nome: 'Psicologia', area: 'Humanas', vantagens: ['RH e clima organizacional'], desvantagens: ['Receita inicial limitada'], afinidades: { servicos: 20, saude: 15, consultoria: 15 }, bonusAtributos: { carisma: 1, etica: 1 } },
    { id: 'vet', nome: 'Medicina Veterinária', area: 'Saúde', vantagens: ['Agropecuária e pets'], desvantagens: ['Custos de clínica'], afinidades: { agro: 20, saude: 15, varejo: 10 }, bonusAtributos: { saude: 1, etica: 1 } },
    { id: 'bio', nome: 'Biologia', area: 'Ciências', vantagens: ['Biotecnologia e pesquisa'], desvantagens: ['Carreira acadêmica lenta'], afinidades: { saude: 15, agro: 15, energia: 5 }, bonusAtributos: { inteligencia: 1, disciplina: 1 } },
    { id: 'qui', nome: 'Química', area: 'Ciências', vantagens: ['Laboratórios e indústria'], desvantagens: ['Infraestrutura cara'], afinidades: { quimica: 30, farmacia: 15, industria: 10 }, bonusAtributos: { inteligencia: 2 } },
    { id: 'fis', nome: 'Física', area: 'Ciências', vantagens: ['Modelagem e alta tecnologia'], desvantagens: ['Poucas portas comerciais diretas'], afinidades: { tecnologia: 20, energia: 20, industria: 5 }, bonusAtributos: { inteligencia: 2 } },
    { id: 'mat', nome: 'Matemática', area: 'Ciências', vantagens: ['Modelos e análise'], desvantagens: ['Abstração vs. mercado'], afinidades: { financeiro: 20, tecnologia: 15, consultoria: 10 }, bonusAtributos: { inteligencia: 2 } },
    { id: 'est', nome: 'Estatística', area: 'Ciências', vantagens: ['Dados e risco'], desvantagens: ['Especialização estreita'], afinidades: { financeiro: 25, tecnologia: 15, consultoria: 15 }, bonusAtributos: { inteligencia: 1, organizacao: 1 } },
    { id: 'des', nome: 'Design', area: 'Criativo', vantagens: ['Produto e UX', 'Marca visual'], desvantagens: ['Freelance instável'], afinidades: { design: 30, tecnologia: 15, midia: 15 }, bonusAtributos: { criatividade: 2 } },
    { id: 'jor', nome: 'Jornalismo', area: 'Comunicação', vantagens: ['Mídia e influência'], desvantagens: ['Setor em crise'], afinidades: { midia: 30, servicos: 10 }, bonusAtributos: { carisma: 1, criatividade: 1 } },
    { id: 'tur', nome: 'Turismo', area: 'Serviços', vantagens: ['Hospitalidade e eventos'], desvantagens: ['Sazonalidade'], afinidades: { turismo: 35, servicos: 15, imobiliario: 5 }, bonusAtributos: { carisma: 1, saude: 1 } },
    { id: 'gas', nome: 'Gastronomia', area: 'Serviços', vantagens: ['Food service', 'Marca pessoal'], desvantagens: ['Margens baixas'], afinidades: { alimentacao: 30, turismo: 15, varejo: 5 }, bonusAtributos: { criatividade: 1, disciplina: 1 } },
    { id: 'edu', nome: 'Pedagogia', area: 'Humanas', vantagens: ['Educação e treinamento'], desvantagens: ['Remuneração inicial baixa'], afinidades: { educacao: 30, servicos: 15 }, bonusAtributos: { etica: 1, carisma: 1 } },
    { id: 'hist', nome: 'História', area: 'Humanas', vantagens: ['Contexto cultural e análise'], desvantagens: ['Poucas vias empresariais diretas'], afinidades: { educacao: 20, midia: 10, turismo: 10 }, bonusAtributos: { inteligencia: 1, etica: 1 } },
    { id: 'geo', nome: 'Geografia', area: 'Ciências', vantagens: ['Território e logística espacial'], desvantagens: ['Mercado nichado'], afinidades: { logistica: 15, imobiliario: 15, agro: 10 }, bonusAtributos: { organizacao: 1, inteligencia: 1 } },
    { id: 'eng_amb', nome: 'Engenharia Ambiental', area: 'Engenharia', vantagens: ['ESG e licenças'], desvantagens: ['Dependência regulatória'], afinidades: { energia: 20, construcao: 15, industria: 10 }, bonusAtributos: { etica: 1, inteligencia: 1 } },
    { id: 'eng_ali', nome: 'Engenharia de Alimentos', area: 'Engenharia', vantagens: ['Indústria alimentícia'], desvantagens: ['Controle sanitário rígido'], afinidades: { alimentacao: 30, agro: 15, varejo: 10 }, bonusAtributos: { organizacao: 1, disciplina: 1 } },
    { id: 'adm_pub', nome: 'Administração Pública', area: 'Negócios', vantagens: ['Licitações e governo'], desvantagens: ['Burocracia'], afinidades: { servicos: 15, construcao: 10, energia: 10 }, bonusAtributos: { organizacao: 1, etica: 1 } },
    { id: 'fin', nome: 'Finanças', area: 'Negócios', vantagens: ['Mercado de capitais', 'Tesouraria'], desvantagens: ['Pressão e risco'], afinidades: { financeiro: 35, holding: 15 }, bonusAtributos: { ambicao: 1, inteligencia: 1 } },
    { id: 'rh', nome: 'Gestão de Recursos Humanos', area: 'Negócios', vantagens: ['Pessoas e cultura'], desvantagens: ['Impacto financeiro indireto'], afinidades: { servicos: 20, consultoria: 20, industria: 5 }, bonusAtributos: { carisma: 1, lideranca: 1 } },
    { id: 'eng_pet', nome: 'Engenharia de Petróleo', area: 'Engenharia', vantagens: ['Energia e offshore'], desvantagens: ['Ciclos de commodity'], afinidades: { energia: 35, industria: 10 }, bonusAtributos: { inteligencia: 1, ambicao: 1 } },
    { id: 'ods', nome: 'Odontologia', area: 'Saúde', vantagens: ['Clínicas e franquias'], desvantagens: ['Investimento em equipamento'], afinidades: { saude: 30, servicos: 10 }, bonusAtributos: { disciplina: 1, carisma: 1 } },
    { id: 'fisio', nome: 'Fisioterapia', area: 'Saúde', vantagens: ['Clínicas e esportes'], desvantagens: ['Escala limitada'], afinidades: { saude: 25, servicos: 15 }, bonusAtributos: { saude: 2 } },
    { id: 'teatro', nome: 'Artes Cênicas', area: 'Criativo', vantagens: ['Entretenimento e influência'], desvantagens: ['Renda irregular'], afinidades: { midia: 25, turismo: 15 }, bonusAtributos: { carisma: 2, criatividade: 1 } },
    { id: 'musica', nome: 'Música', area: 'Criativo', vantagens: ['Indústria cultural'], desvantagens: ['Mercado saturado'], afinidades: { midia: 25, turismo: 10 }, bonusAtributos: { criatividade: 2 } },
    { id: 'edfis', nome: 'Educação Física', area: 'Saúde', vantagens: ['Academias e esporte'], desvantagens: ['Baixa barreira de entrada'], afinidades: { saude: 20, servicos: 15, turismo: 5 }, bonusAtributos: { saude: 2 } },
    { id: 'sec', nome: 'Secretariado Executivo', area: 'Negócios', vantagens: ['Organização e networking'], desvantagens: ['Teto salarial corporativo'], afinidades: { servicos: 20, holding: 10 }, bonusAtributos: { organizacao: 2, disciplina: 1 } },
    { id: 'bib', nome: 'Biblioteconomia', area: 'Humanas', vantagens: ['Gestão da informação'], desvantagens: ['Nicho restrito'], afinidades: { educacao: 20, tecnologia: 10, servicos: 10 }, bonusAtributos: { organizacao: 1, inteligencia: 1 } },
    { id: 'eng_florestal', nome: 'Engenharia Florestal', area: 'Agro', vantagens: ['Madeiras e sustentabilidade'], desvantagens: ['Ciclos longos'], afinidades: { agro: 25, energia: 10, industria: 5 }, bonusAtributos: { etica: 1, saude: 1 } },
    { id: 'zoot', nome: 'Zootecnia', area: 'Agro', vantagens: ['Pecuária e produtividade'], desvantagens: ['Volatilidade de preços'], afinidades: { agro: 30, alimentacao: 15 }, bonusAtributos: { disciplina: 1, saude: 1 } }
  ];

  global.CGL = global.CGL || {};
  global.CGL.Data = global.CGL.Data || {};
  global.CGL.Data.courses = COURSES;
  global.CGL.Data.getCourseById = function (id) {
    return COURSES.find((c) => c.id === id) || null;
  };
})(typeof window !== 'undefined' ? window : globalThis);
