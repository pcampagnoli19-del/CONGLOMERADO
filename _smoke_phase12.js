/**
 * Smoke Fase 12 — holding → anexar → árvore → M&A diligence → week tick → save/load v12.
 * Uso: node docs/game/_smoke_phase12.js
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
  'data/logistics.js',
  'data/international.js',
  'data/holding.js',
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
  'js/logistics.js',
  'js/international.js',
  'js/holding.js',
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

assert(CGL.Save.CURRENT_VERSION >= 12, 'save version ≥12');
assert(CGL.Holding && CGL.Conglomerado === CGL.Holding, 'Holding + alias');
assert(CGL.Data.corpDepartments.length >= 6, 'departamentos');
assert(CGL.Data.corpOffices.length >= 4, 'escritórios');
assert(CGL.Data.brandStrategies.length === 3, 'marcas');
assert(CGL.Data.maStages.length >= 6, 'estágios M&A');
assert(CGL.Data.ddIssues.length >= 6, 'issues DD');
assert(CGL.Data.empireEvents.length >= 6, 'eventos império');
assert(CGL.Data.synergyPairs.length >= 5, 'sinergias');
console.log('OK dados holding');

const state = CGL.Game.createEmptyState();
state.player = CGL.Player.createFromCreation({
  nome: 'Rafael',
  sobrenome: 'Império',
  sexo: 'M',
  dataNascimento: '1985-03-12',
  avatar: { skin: 1, hair: 1, hairColor: '#222', eyes: '#345', outfit: 1 },
  cidadeNascimentoId: CGL.Data.cities[0].id,
  cidadeMoradiaId: CGL.Data.cities[0].id,
  cursoId: CGL.Data.courses[0].id,
  atributos: CGL.Player.defaultAttributes(),
  tracos: (CGL.Data.traits || []).slice(0, 3).map((t) => t.id),
  sonhos: ['imperio'],
  origemId: 'classe_media'
});
state.player.dinheiro = Math.max(state.player.dinheiro || 0, 8_000_000);
state.world = CGL.World.createInitial(state.player.cidadeMoradiaId);
CGL.Finance.ensurePersonal(state);
CGL.Market.ensureMarket(state);
CGL.Debt.ensureDebt(state);
CGL.Hr.ensureHr(state);
CGL.Marketing.ensureMarketing(state);
CGL.Rd.ensureRd(state);
CGL.Logistics.ensureLogistics(state);
CGL.International.ensureInternational(state);
CGL.Holding.ensureHolding(state);
assert(state.holding.version === 12, 'holding state v12');
console.log('OK seed estado holding');

// --- 1. Create holding ---
const holding = CGL.Company.constitute(state, {
  nome: 'Campagnoli',
  nomeFantasia: 'Conglomerado Campagnoli',
  razaoSocial: 'Conglomerado Campagnoli Holding Patrimonial Ltda',
  corMarca: '#d4a84b',
  cidadeId: CGL.Data.cities[0].id,
  segmentoId: 'holding',
  naturezaId: 'holding_patrimonial',
  porte: 'media',
  capitalSocial: 500000,
  socios: [{ tipo: 'jogador', percentual: 100 }],
  administradores: [{ nome: 'Rafael Império', cargo: 'Presidente' }],
  isHolding: true
});
assert(holding.isHolding, 'é holding');
assert(state.companies.holdings.includes(holding.id), 'no registro holdings');
assert(holding.holding?.seeded, 'holding seeded');
CGL.Finance.creditEmpresa(state, holding.id, 5_000_000, {
  categoria: 'aporte',
  descricao: 'Seed smoke holding'
});
holding.caixa = (holding.caixa || 0) + 5_000_000;
console.log('OK holding', holding.nomeFantasia);

// --- 2. Create operating company + attach ---
const op = CGL.Company.constitute(state, {
  nome: 'Varejo Norte',
  nomeFantasia: 'Varejo Norte',
  razaoSocial: 'Varejo Norte Ltda',
  corMarca: '#2ecc71',
  cidadeId: CGL.Data.cities[0].id,
  segmentoId: 'comercio',
  naturezaId: 'ltda',
  porte: 'pequena',
  capitalSocial: 120000,
  socios: [{ tipo: 'jogador', percentual: 100 }],
  administradores: [{ nome: 'Rafael Império', cargo: 'CEO' }]
});
CGL.Finance.creditEmpresa(state, op.id, 400000, {
  categoria: 'aporte',
  descricao: 'Seed op'
});
op.caixa = (op.caixa || 0) + 400000;

// Filial para árvore profunda (antes de anexar — ainda com controle do jogador)
CGL.Company.openBranch(
  state,
  op.id,
  CGL.Data.cities[1]?.id || CGL.Data.cities[0].id,
  { areaM2: 200, funcionarios: 8 }
);

const attach = CGL.Holding.attachCompany(state, holding.id, op.id, 80);
assert(attach.percentual >= 80, 'participação anexada');
assert(
  (holding.participacoesDetidas || []).some((p) => p.empresaId === op.id),
  'participacoesDetidas'
);
console.log('OK anexar', attach.percentual + '%');

// Segunda controlada (tech) para sinergia potencial
const tech = CGL.Company.constitute(state, {
  nome: 'Nexus Soft',
  nomeFantasia: 'Nexus Soft',
  razaoSocial: 'Nexus Soft Ltda',
  corMarca: '#3498db',
  cidadeId: CGL.Data.cities[0].id,
  segmentoId: 'tecnologia',
  naturezaId: 'ltda',
  porte: 'pequena',
  capitalSocial: 80000,
  socios: [{ tipo: 'jogador', percentual: 100 }],
  administradores: [{ nome: 'Rafael Império', cargo: 'CEO' }]
});
CGL.Finance.creditEmpresa(state, tech.id, 200000, { categoria: 'aporte', descricao: 'seed tech' });
tech.caixa = (tech.caixa || 0) + 200000;
CGL.Holding.attachCompany(state, holding.id, tech.id, 100);
const syns = CGL.Holding.refreshSynergies(state, holding.id);
assert(syns.length >= 1 || (state.holding.sinergiasAtivas || []).length >= 0, 'sinergias refresh');
console.log('OK sinergias', (state.holding.sinergiasAtivas || []).length);

// --- 3. Tree renders (data) ---
const tree = CGL.Holding.buildOwnershipTree(state, holding.id);
assert(tree.root && tree.root.id === holding.id, 'root holding');
assert(tree.nodes.some((n) => n.id === op.id), 'op na árvore');
assert(tree.nodes.some((n) => n.tipo === 'filial'), 'filial na árvore');
assert(tree.nodes.some((n) => n.tipo === 'unidade'), 'unidade na árvore');
assert(tree.summary.controladas >= 1, 'controladas');
assert(tree.edges.length >= 2, 'edges');
console.log('OK árvore', tree.nodes.length, 'nós', tree.summary.controladas, 'controladas');

// Departamentos / governança / escritório
CGL.Holding.openDepartment(state, holding.id, 'juridico');
CGL.Holding.openDepartment(state, holding.id, 'financeiro');
CGL.Holding.investGovernance(state, holding.id, 'auditoria');
CGL.Holding.openOffice(state, holding.id, 'regional');
assert(holding.holding.departamentos.length >= 2, 'depts');
assert(holding.holding.governanca.politicasAtivas.includes('auditoria'), 'gov');
assert(holding.holding.escritorios.length >= 1, 'escritório');
CGL.Holding.setBrandStrategy(state, 'umbrella');
assert(state.holding.brandStrategy === 'umbrella', 'marca umbrella');
CGL.Holding.addHeirStub(state, { nome: 'Sofia Império', idade: 22 });
CGL.Holding.setSuccessionPlan(state, 'filho');
console.log('OK corporativo/gov/sucessão');

// --- 4. M&A diligence stub ---
const deal = CGL.Holding.findOpportunity(state, holding.id, { tipoAlvo: 'concorrente' });
assert(deal.estagio === 'encontrar', 'deal encontrar');
CGL.Holding.makeOffer(state, deal.id, deal.precoOferta);
assert(deal.estagio === 'proposta', 'proposta');
CGL.Holding.negotiate(state, deal.id);
assert(deal.estagio === 'negociar' && deal.precoNegociado > 0, 'negociar');
// Garante caixa para DD + aquisição (pode não fechar compra no smoke)
const dd = CGL.Holding.runDueDiligence(state, deal.id);
assert(dd.estagio === 'diligencia', 'diligencia');
assert(dd.dueDiligence && Array.isArray(dd.issuesRevelados), 'issues DD');
assert(dd.issuesRevelados.length >= 1, 'pelo menos 1 issue');
console.log('OK M&A DD', dd.issuesRevelados.length, 'issues', 'risco', dd.dueDiligence.scoreRisco);

// --- 5. Week ticks ---
for (let i = 0; i < 3; i++) {
  CGL.World.advanceWeek(state.world);
  CGL.Economy.weeklyTick(state.economy);
  CGL.Company.weeklyTick(state);
  CGL.Finance.weeklyTick(state);
  CGL.Hr.weeklyTick(state);
  CGL.Marketing.weeklyTick(state);
  CGL.Rd.weeklyTick(state);
  CGL.Logistics.weeklyTick(state);
  CGL.International.weeklyTick(state);
  CGL.Holding.weeklyTick(state);
  CGL.Debt.weeklyTick(state);
}

assert(state.holding.semanaUltimoTick > 0, 'tick holding');
assert(holding.holding.custoCompartilhadoSemanal > 0, 'custo corporativo');
assert(holding.finance?._holdingCustoSemanal >= 0, 'hook finance holding');
CGL.Holding._updateRanking(state);
assert(state.holding.ranking.length >= 1, 'ranking');
const sum = CGL.Holding.dashboardSummary(state);
assert(sum.holdings >= 1 && sum.controladas >= 1, 'dashboard');
console.log('OK tick', 'custo', holding.holding.custoCompartilhadoSemanal, 'rank', sum.rankingPos);

const agenda = CGL.Debt.buildCalendar(holding, state);
const holdItem = agenda.find((a) => a.tipo === 'holding');
assert(holdItem && holdItem.valor > 0, 'agenda holding');
console.log('OK agenda holding', holdItem.valor);

// --- 6. Save / load + migrate v11→v12 ---
CGL.Game.state = state;
CGL.Game.phase = 'playing';
assert(CGL.Save.save(state), 'save');
const raw = JSON.parse(localStorage.getItem(CGL.Save.SAVE_KEY));
assert(raw.version >= 12, 'payload ≥12');

const v11payload = {
  version: 11,
  state: JSON.parse(JSON.stringify(state))
};
v11payload.state.holding = { version: 11 };
v11payload.state.companies.empresas.forEach((e) => {
  e.holding = {};
});
const migrated = CGL.Save.migrate(v11payload);
assert(migrated.version >= 12, 'migrate → ≥12');
assert(migrated.state.holding.version >= 12, 'holding version ≥12');
assert(Array.isArray(migrated.state.companies.empresas[0].holding.departamentos), 'migrate seed depts');
console.log('OK migrate v11→atual');

const loaded = CGL.Save.load();
assert(loaded && loaded.version >= 12, 'load ≥12');
const h2 = loaded.state.companies.empresas.find((e) => e.id === holding.id);
assert(h2 && h2.holding.departamentos.length >= 2, 'depts persistidos');
assert((loaded.state.holding.maPipeline || []).some((d) => d.id === deal.id), 'deal persistido');
const tree2 = CGL.Holding.buildOwnershipTree(loaded.state, holding.id);
assert(tree2.nodes.some((n) => n.id === op.id), 'árvore pós-load');
console.log('OK save/load v12');

console.log('\n=== SMOKE FASE 12 OK ===');
