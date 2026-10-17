/**
 * Smoke Fase 11 — entrar país (export) → FX → subsidiária stub → week tick → save/load v11.
 * Uso: node docs/game/_smoke_phase11.js
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

assert(CGL.Save.CURRENT_VERSION >= 11, 'save version ≥11');
assert(CGL.International && CGL.Data.countries.length >= 10, 'International + países');
assert(CGL.Data.entryModes.length === 8, '8 modos de entrada');
assert(CGL.Data.intlEvents.length >= 8, 'eventos geopolíticos');
assert(CGL.Data.globalCenters.length >= 4, 'centros globais');
assert(CGL.Data.globalRoles.length >= 4, 'cargos globais');
assert(CGL.Data.tradeAgreements.length >= 3, 'acordos');
assert(CGL.Data.marketAttractiveness(CGL.Data.getCountryById('us')) > 40, 'atratividade US');
console.log('OK dados internacionais');

const state = CGL.Game.createEmptyState();
state.player = CGL.Player.createFromCreation({
  nome: 'Helena',
  sobrenome: 'Global',
  sexo: 'F',
  dataNascimento: '1988-07-20',
  avatar: { skin: 1, hair: 1, hairColor: '#222', eyes: '#345', outfit: 1 },
  cidadeNascimentoId: CGL.Data.cities[0].id,
  cidadeMoradiaId: CGL.Data.cities[0].id,
  cursoId: CGL.Data.courses[0].id,
  atributos: CGL.Player.defaultAttributes(),
  tracos: (CGL.Data.traits || []).slice(0, 3).map((t) => t.id),
  sonhos: ['imperio'],
  origemId: 'classe_media'
});
state.player.dinheiro = Math.max(state.player.dinheiro || 0, 5_000_000);
state.world = CGL.World.createInitial(state.player.cidadeMoradiaId);
CGL.Finance.ensurePersonal(state);
CGL.Market.ensureMarket(state);
CGL.Debt.ensureDebt(state);
CGL.Hr.ensureHr(state);
CGL.Marketing.ensureMarketing(state);
CGL.Rd.ensureRd(state);
CGL.Logistics.ensureLogistics(state);
CGL.International.ensureInternational(state);
assert(state.international.version === 11, 'intl state v11');
assert(state.international.taxas.USD === 1, 'USD = 1');
console.log('OK seed estado intl');

const emp = CGL.Company.constitute(state, {
  nome: 'GlobeCo',
  nomeFantasia: 'GlobeCo',
  razaoSocial: 'GlobeCo Ltda',
  corMarca: '#d4a84b',
  cidadeId: CGL.Data.cities[0].id,
  segmentoId: 'industria',
  naturezaId: 'ltda',
  porte: 'media',
  capitalSocial: 500000,
  socios: [{ tipo: 'jogador', percentual: 100 }],
  administradores: [{ nome: 'Helena Global', cargo: 'CEO' }]
});

CGL.Finance.creditEmpresa(state, emp.id, 2_500_000, {
  categoria: 'aporte',
  descricao: 'Seed smoke internacional'
});
CGL.International.ensureCompanyIntl(emp, state);
CGL.Logistics.ensureCompanyLogistics(emp, state);
assert(emp.international.seeded, 'intl seeded');
console.log('OK empresa', emp.nomeFantasia);

// --- 1. Enter country via export ---
const entered = CGL.International.enterCountry(emp, state, 'us', 'exportacao');
assert(entered.entrada.paisId === 'us', 'entrada US');
assert(entered.entrada.modo === 'exportacao', 'modo exportação');
assert(entered.entrada.status === 'ativo', 'exportação ativa imediata');
assert(!entered.subsidiaria, 'exportação sem subsidiária');
assert(emp.international.presencaPaises === 1, 'presença 1 país');

const op = CGL.International.startExport(emp, state, 'us', 200);
assert(op.status === 'transito', 'export em trânsito');
assert(op.tarifa >= 0, 'tarifa');
assert(op.semanasRestantes >= 2, 'ETA export');
console.log('OK entrada export + EXIM', op.volume, 'tarifa', op.tarifa);

// --- 2. FX move ---
const brlBefore = state.international.taxas.BRL;
const shock = CGL.International.shockFx(state, 'BRL', 0.08);
assert(shock.after > brlBefore, 'BRL depreciou');
assert(Math.abs(state.economy.cambioUSD - shock.after) < 0.01, 'economy alinhada');
const rateUsd = CGL.International.rateToBRL(state, 'USD');
assert(rateUsd > 0, 'rate USD→BRL');
console.log('OK FX shock BRL', brlBefore.toFixed(2), '→', shock.after.toFixed(2), 'USD em R$', rateUsd.toFixed(2));

// --- 3. Subsidiary path stub ---
const sub = CGL.International.upgradeToSubsidiary(emp, state, 'us', 'escritorio');
assert(sub && sub.paisId === 'us', 'subsidiária US');
assert(sub.moeda === 'USD', 'moeda USD');
assert(emp.international.entradas[0].subsidiariaId === sub.id, 'entrada linkada');
assert(emp.international.subsidiarias.length >= 1, 'lista subsidiárias');
console.log('OK subsidiária stub', sub.nome, sub.moeda);

// Entrada secundária com fábrica (cria sub em outro país)
const mex = CGL.International.enterCountry(emp, state, 'mx', 'escritorio');
assert(mex.subsidiaria && mex.subsidiaria.paisId === 'mx', 'sub MX');
assert(emp.international.presencaPaises === 2, '2 países');

// Cultura + centro + cargo
const adBefore = emp.international.adaptacaoCultural.us.score;
CGL.International.investCulture(emp, state, 'us', 'marketing', 20000);
assert(emp.international.adaptacaoCultural.us.score > adBefore, 'adaptação aumentou');
CGL.International.buildCenter(emp, state, 'financeiro', 'us');
CGL.International.hireGlobalRole(emp, state, 'gerente_pais', 'us');
assert(emp.international.centros.length >= 1, 'centro');
assert(emp.international.cargosGlobais.length >= 1, 'cargo global');
console.log('OK cultura/centro/cargo');

// M&A stub
const ma = CGL.International.crossBorderMaStub(emp, state, 'de');
assert(ma.valuationEst > 0 && ma.status === 'avaliacao', 'M&A stub');

// --- 4. Week ticks ---
const lead = op.semanasRestantes;
for (let i = 0; i < Math.max(lead + 2, 5); i++) {
  CGL.World.advanceWeek(state.world);
  CGL.Economy.weeklyTick(state.economy);
  CGL.Company.weeklyTick(state);
  CGL.Finance.weeklyTick(state);
  CGL.Hr.weeklyTick(state);
  CGL.Marketing.weeklyTick(state);
  CGL.Rd.weeklyTick(state);
  CGL.Logistics.weeklyTick(state);
  CGL.International.weeklyTick(state);
  CGL.Debt.weeklyTick(state);
}

const opNow = emp.international.operacoesExim.find((o) => o.id === op.id);
assert(opNow && opNow.status === 'concluida', 'export concluída');
assert(opNow.receitaLiquida > 0, 'receita export');
assert(emp.international.custoSemanal > 0 || emp.finance?._intlCustoSemanal > 0, 'custo intl');
assert(emp.finance?._intlCustoSemanal >= 0, 'hook finance intl');
assert(sub.receitaLocal > 0 || sub.semanasAtiva > 0, 'P&L subsidiária tick');
assert(state.international.historicoFx.length >= 1, 'histórico FX');
console.log('OK tick', 'export', opNow.status, 'custo', emp.international.custoSemanal,
  'receitaIntl', emp.international.receitaIntl, 'sub.lucro', sub.lucroLocal);

// Hooks marketing / company
CGL.Marketing.ensureCompanyMarketing(emp, state);
const dem = CGL.Marketing.calcDemandFactors(emp, state);
assert(dem.fatores.internacional != null, 'fator intl na demanda');
const boost = CGL.International.intlDemandBoost(emp, state);
assert(boost >= 1, 'boost demanda intl');
console.log('OK hooks mkt.internacional', dem.fatores.internacional, 'boost', boost);

// Agenda Debt
const agenda = CGL.Debt.buildCalendar(emp, state);
const intlItem = agenda.find((a) => a.tipo === 'internacional');
if (CGL.International.weeklyIntlCostEstimate(emp, state) > 0) {
  assert(intlItem && intlItem.valor > 0, 'agenda internacional');
  console.log('OK agenda intl', intlItem.valor);
} else {
  console.log('OK agenda intl (custo zerado)');
}

// Ranking / dashboard
CGL.International._updateRanking(state);
assert(state.international.ranking.length >= 1, 'ranking');
const sum = CGL.International.dashboardSummary(state);
assert(sum.paises >= 2, 'dashboard países');
console.log('OK dashboard', sum.paises, 'subs', sum.subsidiarias);

// Evento forçado
const eventsBefore = (state.international.eventos || []).length;
state.international.buffsAtivos.push({
  eventId: 'crise_cambial',
  titulo: 'Crise cambial',
  semanasRestantes: 3,
  fxVolatilidade: 2.5,
  valorSubsidiariaMult: 0.85
});
CGL.International.pushEvent(state, {
  tipo: 'crise_cambial',
  titulo: 'Crise cambial',
  descricao: 'Smoke event hook'
});
assert(state.international.eventos.length > eventsBefore, 'evento registrado');
console.log('OK evento hook');

// Repatriação (após ticks com caixa local)
if (sub.caixaLocal > 0) {
  const rep = CGL.International.repatriate(emp, state, sub.id, Math.min(sub.caixaLocal, 1000));
  assert(rep.liquido >= 0, 'repatriação');
  console.log('OK repatriação', rep.liquido, 'taxa', rep.taxa);
}

// --- 5. Save / load + migrate v10→v11 ---
CGL.Game.state = state;
CGL.Game.phase = 'playing';
assert(CGL.Save.save(state), 'save');
const raw = JSON.parse(localStorage.getItem(CGL.Save.SAVE_KEY));
assert(raw.version >= 11, 'payload ≥v11');

const v10payload = {
  version: 10,
  state: JSON.parse(JSON.stringify(state))
};
v10payload.state.international = { version: 10 };
v10payload.state.companies.empresas.forEach((e) => {
  e.international = {};
});
const migrated = CGL.Save.migrate(v10payload);
assert(migrated.version >= 11, 'migrate → ≥11');
assert(migrated.state.international.version >= 11, 'intl version ≥11');
assert(Array.isArray(migrated.state.companies.empresas[0].international.entradas), 'migrate seed entradas');
console.log('OK migrate v10→atual');

const loaded = CGL.Save.load();
assert(loaded && loaded.version >= 11, 'load ≥v11');
assert(loaded.state.companies.empresas[0].international.subsidiarias.length >= 1, 'subs persistidas');
assert(loaded.state.companies.empresas[0].international.entradas.some((e) => e.paisId === 'us'), 'entrada US persistida');
console.log('OK save/load');

console.log('\n=== SMOKE FASE 11 OK ===');
