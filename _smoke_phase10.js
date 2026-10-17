/**
 * Smoke Fase 10 — fornecedor → estoque → week tick custos/entrega → evento → save/load v10.
 * Uso: node docs/game/_smoke_phase10.js
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

assert(CGL.Save.CURRENT_VERSION >= 10, 'save version ≥10');
assert(CGL.Logistics && CGL.Data.suppliers.length >= 5, 'Logistics + fornecedores');
assert(CGL.Data.supplyStages.length === 7, '7 etapas cadeia');
assert(CGL.Data.cdTypes.length >= 4, 'tipos CD');
assert(CGL.Data.vehicleTypes.length >= 5, 'veículos');
assert(CGL.Data.logisticsTech.length >= 5, 'tech logística');
assert(CGL.Data.ports.length >= 4, 'portos');
assert(CGL.Data.logisticsEvents.length >= 6, 'eventos risco');
assert(CGL.Data.routeFactors('SP', 'RJ').custoMult > 0, 'rota SP→RJ');
assert(CGL.Data.routeFactors('SP', 'SP').tempoSemanas >= 1, 'rota local');
console.log('OK dados logística');

const state = CGL.Game.createEmptyState();
state.player = CGL.Player.createFromCreation({
  nome: 'Rafael',
  sobrenome: 'Logis',
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
state.player.dinheiro = Math.max(state.player.dinheiro || 0, 3_000_000);
state.world = CGL.World.createInitial(state.player.cidadeMoradiaId);
CGL.Finance.ensurePersonal(state);
CGL.Market.ensureMarket(state);
CGL.Debt.ensureDebt(state);
CGL.Hr.ensureHr(state);
CGL.Marketing.ensureMarketing(state);
CGL.Rd.ensureRd(state);
CGL.Logistics.ensureLogistics(state);
assert(state.logistics.version === 10, 'logistics state v10');

const emp = CGL.Company.constitute(state, {
  nome: 'SupplyCo',
  nomeFantasia: 'SupplyCo',
  razaoSocial: 'SupplyCo Ltda',
  corMarca: '#3dd68c',
  cidadeId: CGL.Data.cities[0].id,
  segmentoId: 'industria',
  naturezaId: 'ltda',
  porte: 'media',
  capitalSocial: 400000,
  socios: [{ tipo: 'jogador', percentual: 100 }],
  administradores: [{ nome: 'Rafael Logis', cargo: 'CEO' }]
});

CGL.Finance.creditEmpresa(state, emp.id, 1_500_000, {
  categoria: 'aporte',
  descricao: 'Seed smoke logística'
});
CGL.Logistics.ensureCompanyLogistics(emp, state);
assert(emp.logistics.estoque, 'estoque seeded');
assert(emp.logistics.fornecedorAtivoId || CGL.Logistics.getActiveContract(emp), 'fornecedor seed');
console.log('OK seed empresa', emp.nomeFantasia, 'UF', emp.estadoSede);

// --- 1. Set supplier ---
const contract = CGL.Logistics.setSupplier(emp, state, 'sup_nac_premium');
assert(contract.status === 'ativo', 'contrato ativo');
assert(emp.logistics.fornecedorAtivoId === 'sup_nac_premium', 'fornecedor ativo');
console.log('OK fornecedor', contract.nome);

// --- 2. Stock move + order ---
const beforeStock = emp.logistics.estoque.unidades;
CGL.Logistics.moveStock(emp, state, 80, 'smoke');
assert(emp.logistics.estoque.unidades === beforeStock + 80, 'estoque moveu +80');

const pedido = CGL.Logistics.orderMaterials(emp, state, 200);
assert(pedido.status === 'transito', 'pedido em trânsito');
assert(pedido.semanasRestantes >= 1, 'lead time');
console.log('OK pedido', pedido.quantidade, 'lead', pedido.semanasRestantes);

// CD + frota + rota
const cd = CGL.Logistics.buildCD(emp, state, 'galpao', emp.estadoSede || 'SP');
assert(cd.status === 'ativo', 'CD ativo');
CGL.Logistics.setFleetMode(emp, state, 'hibrida');
const van = CGL.Logistics.buyVehicle(emp, state, 'caminhao');
assert(van.status === 'ativo', 'veículo');
const rota = CGL.Logistics.createRoute(emp, state, emp.estadoSede || 'SP', 'RJ');
assert(rota.ativa, 'rota');
const tech = CGL.Logistics.investTech(emp, state, 'log_erp');
assert(emp.logistics.techs.includes('log_erp'), 'tech erp');
console.log('OK CD/frota/rota/tech', cd.nome, van.nome, rota.origem + '→' + rota.destino, tech.nome);

// Vertical integration
CGL.Logistics.enableVerticalIntegration(emp, state);
assert(emp.logistics.integracaoVertical, 'vertical');
assert(emp.logistics.fornecedorAtivoId === 'sup_vertical', 'produção própria');
// Volta a nacional para testar entrega do pedido antigo
CGL.Logistics.setSupplier(emp, state, 'sup_nac_volume');
console.log('OK integração vertical + troca fornecedor');

// --- 3. Week ticks: custos + entrega ---
const stockPre = emp.logistics.estoque.unidades;
const lead = pedido.semanasRestantes;
for (let i = 0; i < Math.max(lead + 1, 4); i++) {
  CGL.World.advanceWeek(state.world);
  CGL.Company.weeklyTick(state);
  CGL.Finance.weeklyTick(state);
  CGL.Hr.weeklyTick(state);
  CGL.Marketing.weeklyTick(state);
  CGL.Rd.weeklyTick(state);
  CGL.Logistics.weeklyTick(state);
  CGL.Debt.weeklyTick(state);
}

const pedidoNow = emp.logistics.pedidos.find((p) => p.id === pedido.id);
assert(pedidoNow && pedidoNow.status === 'entregue', 'pedido entregue após ticks');
assert(emp.logistics.custoSemanal > 0 || emp.finance?._logCustoSemanal > 0, 'custo logística');
assert(emp.finance?._logCustoSemanal >= 0, 'hook finance log');
assert(emp.logistics.eficienciaLogistica > 0, 'eficiência');
console.log('OK tick entrega', pedidoNow.status, 'estoque', emp.logistics.estoque.unidades,
  'custo', emp.logistics.custoSemanal, 'eff', emp.logistics.eficienciaLogistica);

// Produção / marketing hooks
const prodM = CGL.Logistics.productionMult(emp);
const distM = CGL.Logistics.distributionBoost(emp);
assert(prodM > 0 && prodM <= 1.3, 'fator produção');
assert(distM > 0, 'fator distribuição');
CGL.Marketing.ensureCompanyMarketing(emp, state);
const dem = CGL.Marketing.calcDemandFactors(emp, state);
assert(dem.fatores.logistica != null, 'fator logística na demanda');
console.log('OK hooks prod', prodM, 'dist', distM, 'mkt.logistica', dem.fatores.logistica);

// Agenda Debt
const agenda = CGL.Debt.buildCalendar(emp, state);
const logItem = agenda.find((a) => a.tipo === 'logistica');
if (CGL.Logistics.weeklyLogisticsCostEstimate(emp, state) > 0) {
  assert(logItem && logItem.valor > 0, 'agenda logística');
  console.log('OK agenda log', logItem.valor);
} else {
  console.log('OK agenda log (custo zerado)');
}

// --- 4. Event hook (forçado) ---
const eventsBefore = (state.logistics.eventos || []).length;
// Força um evento via buff + push
state.logistics.buffsAtivos.push({
  eventId: 'greve_caminhao',
  titulo: 'Greve de caminhoneiros',
  semanasRestantes: 2,
  custoMult: 1.4,
  prazoMult: 1.8,
  freteIntMult: 1
});
CGL.Logistics.pushEvent(state, {
  tipo: 'greve_caminhao',
  empresaId: emp.id,
  titulo: 'Greve de caminhoneiros',
  descricao: 'Smoke event hook'
});
assert(state.logistics.eventos.length > eventsBefore, 'evento registrado');
assert(state.logistics.buffsAtivos.length >= 1, 'buff ativo');
const custoComBuff = CGL.Logistics.weeklyLogisticsCostEstimate(emp, state);
console.log('OK evento hook', state.logistics.eventos[0].titulo, 'custo c/ buff', custoComBuff);

// KPIs / ranking
const kpis = CGL.Logistics.calcKpis(emp, state);
assert(kpis.eficiencia > 0, 'kpi eficiência');
CGL.Logistics._updateRanking(state);
assert(state.logistics.ranking.length >= 1, 'ranking');
const sum = CGL.Logistics.dashboardSummary(state);
assert(sum.estoqueTotal >= 0, 'dashboard');
console.log('OK KPIs', kpis.eficiencia, 'ranking', state.logistics.ranking.length);

// --- 5. Save / load + migrate v9→v10 ---
CGL.Game.state = state;
CGL.Game.phase = 'playing';
assert(CGL.Save.save(state), 'save');
const raw = JSON.parse(localStorage.getItem(CGL.Save.SAVE_KEY));
assert(raw.version >= 10, 'payload ≥v10');

const v9payload = {
  version: 9,
  state: JSON.parse(JSON.stringify(state))
};
v9payload.state.logistics = { version: 9 };
v9payload.state.companies.empresas.forEach((e) => {
  e.logistics = {};
});
const migrated = CGL.Save.migrate(v9payload);
assert(migrated.version >= 10, 'migrate → ≥10');
assert(migrated.state.logistics.version >= 10, 'logistics version ≥10');
assert(migrated.state.companies.empresas[0].logistics.estoque, 'migrate seed estoque');
console.log('OK migrate v9→v' + migrated.version);

const loaded = CGL.Save.load();
assert(loaded && loaded.version >= 10, 'load ≥v10');
assert(loaded.state.companies.empresas[0].logistics.cds.length >= 1, 'CDs persistidos');
assert(loaded.state.companies.empresas[0].logistics.techs.includes('log_erp'), 'tech persistida');
console.log('OK save/load');

console.log('\n=== SMOKE FASE 10 OK ===');
