/**
 * Smoke Fase 7 — hire → assess → train → week tick (folha/stress/clima) → save/load v7.
 * Uso: node docs/game/_smoke_phase7.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __dirname;
const store = new Map();

const localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k)
};

const sandbox = {
  console,
  Math,
  Date,
  JSON,
  Array,
  Object,
  String,
  Number,
  Boolean,
  parseInt,
  parseFloat,
  isNaN,
  Infinity,
  undefined,
  setTimeout,
  clearTimeout,
  localStorage,
  crypto: { randomUUID: () => require('crypto').randomUUID() }
};
sandbox.global = sandbox;
sandbox.globalThis = sandbox;
sandbox.window = sandbox;

const context = vm.createContext(sandbox);

function load(rel) {
  const code = fs.readFileSync(path.join(root, rel), 'utf8');
  vm.runInContext(code, context, { filename: rel });
}

[
  'data/cities.js',
  'data/courses.js',
  'data/traits.js',
  'data/names.js',
  'data/segments.js',
  'data/legal-natures.js',
  'data/states.js',
  'data/banks.js',
  'data/investors.js',
  'data/debt.js',
  'data/hr.js',
  'js/utils.js',
  'js/save.js',
  'js/economy.js',
  'js/company.js',
  'js/finance.js',
  'js/market.js',
  'js/debt.js',
  'js/hr.js',
  'js/world.js',
  'js/family.js',
  'js/player.js',
  'js/events.js',
  'js/game.js'
].forEach(load);

const { CGL } = sandbox;
const assert = (cond, msg) => {
  if (!cond) throw new Error('FAIL: ' + msg);
};

assert(CGL.Save.CURRENT_VERSION === 7, 'save version 7');
assert(CGL.Hr && CGL.Data.roles.length >= 13, 'Hr + hierarquia');
assert(CGL.Data.recruitmentChannels.length >= 6, 'canais');
assert(CGL.Data.assessmentTypes.length >= 5, 'avaliações');
assert(CGL.Data.trainings.length >= 6, 'treinamentos');
assert(CGL.Data.benefits.length >= 8, 'benefícios');
assert(CGL.Data.cultureValues.length >= 6, 'cultura');
assert(CGL.Data.hrEventDefs.length >= 8, 'eventos RH');
assert(CGL.Data.employeeTraits.some((t) => t.oculto), 'traços ocultos');

const state = CGL.Game.createEmptyState();
state.player = CGL.Player.createFromCreation({
  nome: 'Ana',
  sobrenome: 'Reis',
  sexo: 'F',
  dataNascimento: '1995-06-20',
  avatar: { skin: 1, hair: 1, hairColor: '#222', eyes: '#345', outfit: 1 },
  cidadeNascimentoId: CGL.Data.cities[0].id,
  cidadeMoradiaId: CGL.Data.cities[0].id,
  cursoId: CGL.Data.courses[0].id,
  atributos: CGL.Player.defaultAttributes(),
  tracos: (CGL.Data.traits || []).slice(0, 3).map((t) => t.id),
  sonhos: ['imperio'],
  origemId: 'classe_media'
});
state.player.dinheiro = Math.max(state.player.dinheiro || 0, 800_000);
state.world = CGL.World.createInitial(state.player.cidadeMoradiaId);
CGL.Finance.ensurePersonal(state);
CGL.Market.ensureMarket(state);
CGL.Debt.ensureDebt(state);
CGL.Hr.ensureHr(state);
assert(state.hr.version === 7, 'hr state v7');

const emp = CGL.Company.constitute(state, {
  nome: 'PessoasCo',
  nomeFantasia: 'PessoasCo',
  razaoSocial: 'PessoasCo Ltda',
  corMarca: '#3dd68c',
  cidadeId: CGL.Data.cities[0].id,
  segmentoId: 'servicos',
  naturezaId: 'ltda',
  porte: 'pequena',
  capitalSocial: 120000,
  socios: [{ tipo: 'jogador', percentual: 100 }],
  administradores: [{ nome: 'Ana Reis', cargo: 'CEO' }]
});

CGL.Finance.creditEmpresa(state, emp.id, 200000, {
  categoria: 'aporte',
  descricao: 'Seed smoke RH'
});
CGL.Hr.ensureCompanyHR(emp, state);
assert(emp.hr.seeded, 'RH seeded na constituição');
assert(CGL.Hr.listActive(emp).length > 0, 'funcionários individuais');
console.log('OK seed', CGL.Hr.listActive(emp).length, 'func');

// --- Hire ---
const cands = CGL.Hr.openRecruitment(emp, state, 'processo', {
  roleId: 'analista_jr',
  deptId: 'ops',
  qty: 3
});
assert(cands.length === 3, 'candidatos gerados');
assert(cands[0].status === 'candidato', 'status candidato');
assert(cands[0].revelado.etica === false || cands[0].revelado.etica == null || cands[0].revelado.etica === false, 'ética oculta');
const cand = emp.hr.candidatos[0];
assert(cand.revelado.produtividade === false, 'produtividade oculta pré-avaliação');
console.log('OK recruit', cands.length);

// --- Assess ---
CGL.Hr.runAssessment(emp, state, cand.id, 'tecnico');
assert(cand.avaliacoesFeitas.includes('tecnico'), 'teste técnico');
assert(cand.revelado.inteligencia === true || cand.revelado.produtividade === true, 'attrs revelados');
CGL.Hr.runAssessment(emp, state, cand.id, 'entrevista');
assert((cand.scoreAvaliacao || 0) > 0, 'score avaliação');
console.log('OK assess', cand.notaPercebida, 'score', cand.scoreAvaliacao);

// --- Hire candidate ---
const hired = CGL.Hr.hireCandidate(emp, state, cand.id);
assert(hired.status === 'ativo', 'contratado ativo');
assert(CGL.Hr.listActive(emp).some((f) => f.id === hired.id), 'na equipe');
const headBefore = emp.funcionarios;
CGL.Hr.syncHeadcount(emp);
assert(emp.funcionarios >= 1, 'headcount sync');
console.log('OK hire', hired.nome, 'headcount', emp.funcionarios);

// --- Train ---
CGL.Hr.startTraining(emp, state, hired.id, 'lideranca');
assert(hired.status === 'treinamento', 'em treinamento');
assert(emp.hr.treinamentosAtivos.length >= 1, 'treinamento ativo');
const leadBefore = hired.lideranca;
console.log('OK train start', hired.semanasTreinamento, 'sem');

// --- Benefícios / cultura ---
CGL.Hr.setBenefits(emp, state, ['vr', 'saude', 'home']);
assert(emp.hr.beneficios.includes('saude'), 'benefícios');
CGL.Hr.setCulture(emp, state, ['inovacao', 'bem_estar'], 70);
assert(emp.hr.culturaOrg.valores.includes('inovacao'), 'cultura');
CGL.Hr.recalcClimate(emp, state);
assert(emp.hr.clima.moral >= 0 && emp.hr.clima.engajamento >= 0, 'clima');
console.log('OK clima moral', emp.hr.clima.moral);

// --- Avaliação de desempenho em outro func ---
const other = CGL.Hr.listActive(emp).find((f) => f.id !== hired.id && f.status === 'ativo');
if (other) {
  const rev = CGL.Hr.performanceReview(emp, state, other.id);
  assert(rev.nota >= 1 && rev.nota <= 100, 'review nota');
  console.log('OK review', rev.nota);
}

// --- Week ticks ---
const stressBefore = hired.estresse;
for (let i = 0; i < 3; i++) {
  CGL.World.advanceWeek(state.world);
  CGL.Company.weeklyTick(state);
  CGL.Finance.weeklyTick(state);
  CGL.Hr.weeklyTick(state);
  CGL.Debt.weeklyTick(state);
}
assert(emp.hr.folhaSemanal > 0, 'folha semanal');
assert(typeof emp.hr.clima.moral === 'number', 'clima pós-tick');
// Treinamento de liderança dura 2 sem — após 3 ticks deve completar
assert(hired.status === 'ativo', 'treino concluído');
assert(hired.lideranca >= leadBefore, 'liderança aumentou');
console.log('OK tick folha', emp.hr.folhaSemanal, 'stress', hired.estresse, '≥?', stressBefore);

// Agenda financeira com folha RH
const agenda = CGL.Debt.buildCalendar(emp, state);
const folhaItem = agenda.find((a) => a.tipo === 'folha');
assert(folhaItem && folhaItem.valor > 0, 'agenda folha RH');
assert(/RH|benef/i.test(folhaItem.descricao) || folhaItem.valor === CGL.Hr.payrollAgendaEstimate(emp), 'folha agenda valor');
console.log('OK agenda folha', folhaItem.valor);

// Demissão
const fireTarget = CGL.Hr.listActive(emp).find((f) => f.status === 'ativo' && f.id !== hired.id);
if (fireTarget) {
  const term = CGL.Hr.terminate(emp, state, fireTarget.id, 'acordo');
  assert(term.rescisao >= 0, 'rescisão');
  assert(fireTarget.status === 'demitido', 'status demitido');
  console.log('OK fire', term.rescisao);
}

// --- Save / load migrate ---
CGL.Game.state = state;
CGL.Game.phase = 'playing';
assert(CGL.Save.save(state), 'save');
const raw = JSON.parse(localStorage.getItem(CGL.Save.SAVE_KEY));
assert(raw.version === 7, 'payload v7');

// Simula save v6 → migrate
const v6payload = {
  version: 6,
  state: JSON.parse(JSON.stringify(state))
};
// Remove hr seeded staff to test migrate seed path on empty
v6payload.state.hr = { version: 6 };
v6payload.state.companies.empresas.forEach((e) => {
  e.hr = { departamentos: [] };
  e.funcionarios = 5;
});
const migrated = CGL.Save.migrate(v6payload);
assert(migrated.version === 7, 'migrate → 7');
assert(migrated.state.hr.version === 7, 'hr version 7');
assert(migrated.state.companies.empresas[0].hr.funcionarios.length > 0, 'migrate seed staff');
console.log('OK migrate v6→v7', migrated.state.companies.empresas[0].hr.funcionarios.length);

const loaded = CGL.Save.load();
assert(loaded && loaded.version === 7, 'load v7');
assert(loaded.state.companies.empresas[0].hr.funcionarios.length > 0, 'staff persistido');
console.log('OK save/load');

const sum = CGL.Hr.dashboardSummary(state);
assert(sum.headcount >= 0, 'dashboard');
console.log('OK dashboard RH', sum.headcount, 'moral', sum.moralMedia);

console.log('\n=== SMOKE FASE 7 OK ===');
