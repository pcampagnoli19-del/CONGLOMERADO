/**
 * Smoke Fase 9 — projeto P&D → week tick → patente/licença → obsolescência → save/load v9.
 * Uso: node docs/game/_smoke_phase9.js
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
  'data/marketing.js',
  'data/rd.js',
  'js/utils.js',
  'js/save.js',
  'js/economy.js',
  'js/company.js',
  'js/finance.js',
  'js/market.js',
  'js/debt.js',
  'js/hr.js',
  'js/marketing.js',
  'js/rd.js',
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

assert(CGL.Save.CURRENT_VERSION >= 9, 'save version ≥9');
assert(CGL.Rd && CGL.Data.techTrees.industria, 'Rd + árvores');
assert(Object.keys(CGL.Data.techTrees).length >= 6, '6 setores tech');
assert(CGL.Data.productLifecycle.length >= 6, 'ciclo de vida');
assert(CGL.Data.partnershipTypes.length >= 5, 'parcerias');
assert(CGL.Data.techEvents.length >= 8, 'eventos tech');
assert(CGL.Data.espionageRisks.media, 'espionagem');

const state = CGL.Game.createEmptyState();
state.player = CGL.Player.createFromCreation({
  nome: 'Helena',
  sobrenome: 'Tech',
  sexo: 'F',
  dataNascimento: '1988-07-01',
  avatar: { skin: 1, hair: 1, hairColor: '#222', eyes: '#345', outfit: 1 },
  cidadeNascimentoId: CGL.Data.cities[0].id,
  cidadeMoradiaId: CGL.Data.cities[0].id,
  cursoId: CGL.Data.courses[0].id,
  atributos: CGL.Player.defaultAttributes(),
  tracos: (CGL.Data.traits || []).slice(0, 3).map((t) => t.id),
  sonhos: ['imperio'],
  origemId: 'classe_media'
});
state.player.dinheiro = Math.max(state.player.dinheiro || 0, 2_000_000);
state.world = CGL.World.createInitial(state.player.cidadeMoradiaId);
CGL.Finance.ensurePersonal(state);
CGL.Market.ensureMarket(state);
CGL.Debt.ensureDebt(state);
CGL.Hr.ensureHr(state);
CGL.Marketing.ensureMarketing(state);
CGL.Rd.ensureRd(state);
assert(state.rd.version === 9, 'rd state v9');

const emp = CGL.Company.constitute(state, {
  nome: 'InnoCo',
  nomeFantasia: 'InnoCo',
  razaoSocial: 'InnoCo Ltda',
  corMarca: '#3dd68c',
  cidadeId: CGL.Data.cities[0].id,
  segmentoId: 'industria',
  naturezaId: 'ltda',
  porte: 'media',
  capitalSocial: 300000,
  socios: [{ tipo: 'jogador', percentual: 100 }],
  administradores: [{ nome: 'Helena Tech', cargo: 'CEO' }]
});

CGL.Finance.creditEmpresa(state, emp.id, 800000, {
  categoria: 'aporte',
  descricao: 'Seed smoke P&D'
});
CGL.Rd.ensureCompanyRd(emp, state);
assert(emp.rd.dept, 'dept seeded');
assert(CGL.Rd.sectorId(emp) === 'industria', 'setor industria');
console.log('OK seed empresa', emp.nomeFantasia, 'setor', CGL.Rd.sectorId(emp));

// --- Ativar P&D + projeto ---
CGL.Rd.activateDept(emp, state, {
  orcamentoSemanal: 15000,
  pesquisadores: 5,
  diretores: 1,
  laboratorios: 2
});
assert(emp.rd.dept.ativo, 'dept ativo');
const avail = CGL.Rd.availableTechs(emp);
assert(avail.length > 0, 'techs disponíveis');
const techId = avail[0].id;
const proj = CGL.Rd.startProject(emp, state, techId);
assert(proj.status === 'ativo', 'projeto ativo');
assert(emp.rd.projetos.some((p) => p.id === proj.id), 'na lista');
console.log('OK projeto', proj.nome, 'semanas', proj.semanasTotal);

const obsBefore = emp.rd.obsolescencia;
const progressBefore = proj.progresso;

// --- Week ticks: progresso + custos + obsolescência ---
for (let i = 0; i < 6; i++) {
  CGL.World.advanceWeek(state.world);
  CGL.Company.weeklyTick(state);
  CGL.Finance.weeklyTick(state);
  CGL.Hr.weeklyTick(state);
  CGL.Marketing.weeklyTick(state);
  CGL.Rd.weeklyTick(state);
  if (CGL.Logistics?.weeklyTick) CGL.Logistics.weeklyTick(state);
  CGL.Debt.weeklyTick(state);
}

const projNow = emp.rd.projetos.find((p) => p.id === proj.id);
assert(projNow.progresso > progressBefore || projNow.status !== 'ativo', 'projeto progrediu ou concluiu');
assert(emp.rd.custoSemanal > 0 || emp.finance?._rdCustoSemanal > 0, 'custo P&D');
assert(emp.finance?._rdCustoSemanal >= 0, 'hook finance rd');
console.log('OK tick progresso', projNow.progresso, 'status', projNow.status, 'custo', emp.rd.custoSemanal);

// Força conclusão se ainda ativo (smoke determinístico)
if (projNow.status === 'ativo') {
  projNow.progresso = 100;
  projNow.risco = 0;
  CGL.Rd._completeProject(emp, state, projNow);
}
assert(
  emp.rd.techsDesbloqueadas.includes(techId) || projNow.status === 'fracassado',
  'tech desbloqueada ou fracasso registrado'
);
console.log('OK conclusão', projNow.status, 'techs', emp.rd.techsDesbloqueadas.length);

// --- Patente (pode ter sido auto-registrada na conclusão) ---
if (!emp.rd.techsDesbloqueadas.includes(techId)) {
  emp.rd.techsDesbloqueadas.push(techId);
}
let patent = emp.rd.patentes.find((p) => p.techId === techId && p.status === 'ativa');
if (!patent) {
  patent = CGL.Rd.filePatent(emp, state, techId);
}
assert(patent.status === 'ativa', 'patente ativa');
assert(state.rd.patentesGlobais.some((p) => p.id === patent.id), 'patente global');
console.log('OK patente', patent.nome);

// Segunda empresa para licença
const emp2 = CGL.Company.constitute(state, {
  nome: 'LicenCo',
  nomeFantasia: 'LicenCo',
  razaoSocial: 'LicenCo Ltda',
  corMarca: '#d4a84b',
  cidadeId: CGL.Data.cities[0].id,
  segmentoId: 'industria',
  naturezaId: 'ltda',
  porte: 'pequena',
  capitalSocial: 100000,
  socios: [{ tipo: 'jogador', percentual: 100 }],
  administradores: [{ nome: 'Helena Tech', cargo: 'CEO' }]
});
CGL.Finance.creditEmpresa(state, emp2.id, 500000, {
  categoria: 'aporte',
  descricao: 'Seed licença'
});
CGL.Rd.ensureCompanyRd(emp2, state);
CGL.Rd.activateDept(emp2, state, {
  orcamentoSemanal: 5000,
  pesquisadores: 2,
  diretores: 1,
  laboratorios: 1
});
const lic = CGL.Rd.licenseTech(emp2, state, patent.id);
assert(lic.status === 'ativa', 'licença ativa');
assert(emp2.rd.licencasCompradas.some((l) => l.id === lic.id), 'licença comprada');
console.log('OK licença', lic.techId, 'fee', lic.feeSemanal);

// --- Produto + obsolescência ---
const prod = CGL.Rd.launchProduct(emp, state, { nome: 'Linha Beta' });
assert(prod.ciclo === 'lancamento', 'ciclo lançamento');
assert(prod.geracao === 1, 'geração 1');
emp.rd.obsolescencia = 10;
// Sem modernização: tick aumenta obsolescência
emp.rd.dept.orcamentoSemanal = 0;
emp.rd.projetos.forEach((p) => { if (p.status === 'ativo') p.status = 'cancelado'; });
for (let i = 0; i < 4; i++) {
  CGL.World.advanceWeek(state.world);
  CGL.Rd.weeklyTick(state);
}
assert(emp.rd.obsolescencia > 10, 'obsolescência sobe sem investimento');
const effM = CGL.Rd.efficiencyMult(emp);
assert(effM < 1.2, 'eficiência afetada por obsolescência');
console.log('OK obsolescência', emp.rd.obsolescencia, 'effMult', effM);

const idx = CGL.Rd.calcInnovationIndex(emp, state);
assert(idx > 0, 'índice inovação');
console.log('OK índice', idx);

// Demanda marketing com inovacao
CGL.Marketing.ensureCompanyMarketing(emp, state);
const dem = CGL.Marketing.calcDemandFactors(emp, state);
assert(dem.fatores.inovacao != null, 'fator inovacao na demanda');
console.log('OK demanda inovacao', dem.fatores.inovacao);

// Agenda Debt com P&D
const agenda = CGL.Debt.buildCalendar(emp, state);
const rdItem = agenda.find((a) => a.tipo === 'pd');
if (CGL.Rd.weeklyRdCostEstimate(emp) > 0) {
  assert(rdItem && rdItem.valor > 0, 'agenda pd');
  console.log('OK agenda pd', rdItem.valor);
} else {
  console.log('OK agenda pd (custo zerado neste momento)');
}

// --- Save / load + migrate v8→v9 ---
CGL.Game.state = state;
CGL.Game.phase = 'playing';
assert(CGL.Save.save(state), 'save');
const raw = JSON.parse(localStorage.getItem(CGL.Save.SAVE_KEY));
assert(raw.version >= 9, 'payload ≥v9');

const v8payload = {
  version: 8,
  state: JSON.parse(JSON.stringify(state))
};
v8payload.state.rd = { version: 8 };
v8payload.state.companies.empresas.forEach((e) => {
  e.rd = {};
});
const migrated = CGL.Save.migrate(v8payload);
assert(migrated.version >= 9, 'migrate → ≥9');
assert(migrated.state.rd.version >= 9, 'rd version ≥9');
assert(migrated.state.companies.empresas[0].rd.dept, 'migrate seed dept');
console.log('OK migrate v8→atual');

const loaded = CGL.Save.load();
assert(loaded && loaded.version >= 9, 'load ≥v9');
assert(loaded.state.companies.empresas[0].rd.patentes.length > 0, 'patentes persistidas');
console.log('OK save/load');

const sum = CGL.Rd.dashboardSummary(state);
assert(sum.empresas >= 1, 'dashboard');
console.log('OK dashboard inov', sum.inovacaoMedia, 'projetos', sum.projetosAtivos);

console.log('\n=== SMOKE FASE 9 OK ===');
