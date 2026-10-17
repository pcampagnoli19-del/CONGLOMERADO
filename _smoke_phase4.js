/**
 * Smoke Fase 4 — remuneração sócios/admins, PF≠PJ, mútuos, save v4.
 * Uso: node docs/game/_smoke_phase4.js
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
  'js/utils.js',
  'js/save.js',
  'js/economy.js',
  'js/company.js',
  'js/finance.js',
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

const state = CGL.Game.createEmptyState();
state.player = CGL.Player.createFromCreation({
  nome: 'Ana',
  sobrenome: 'Silva',
  sexo: 'F',
  dataNascimento: '2002-01-15',
  avatar: { skin: 1, hair: 1, hairColor: '#333', eyes: '#456', outfit: 1 },
  cidadeNascimentoId: CGL.Data.cities[0].id,
  cidadeMoradiaId: CGL.Data.cities[0].id,
  cursoId: CGL.Data.courses[0].id,
  atributos: CGL.Player.defaultAttributes(),
  tracos: (CGL.Data.traits || []).slice(0, 3).map((t) => t.id),
  sonhos: ['imperio'],
  origemId: 'classe_media'
});
if (!state.player.dinheiro) state.player.dinheiro = 200000;
state.player.dinheiro = Math.max(state.player.dinheiro, 250000);
state.world = CGL.World.createInitial(state.player.cidadeMoradiaId);
CGL.Finance.ensurePersonal(state);

assert(CGL.Save.CURRENT_VERSION === 4, 'save version 4');
assert(CGL.Finance.canaisRetiradaPermitidos().includes('pro_labore'), 'canais');

const emp = CGL.Company.constitute(state, {
  nome: 'Aurora',
  nomeFantasia: 'Aurora Labs',
  razaoSocial: 'Aurora Labs Ltda.',
  corMarca: '#3498db',
  cidadeId: CGL.Data.cities[0].id,
  segmentoId: 'servicos',
  naturezaId: 'ltda',
  porte: 'pequena',
  capitalSocial: 80000,
  socios: [
    { tipo: 'jogador', percentual: 70 },
    { tipo: 'npc', nome: 'Sócio Beta', percentual: 30 }
  ],
  administradores: [
    { nome: 'Ana Silva', cargo: 'CEO' },
    { nome: 'Carlos Admin', cargo: 'Diretor', ehContratado: true }
  ]
});

assert(emp.finance.version === 4 || emp.finance.emprestimosSocio, 'finance v4 fields');
assert(Array.isArray(emp.finance.emprestimosSocio), 'emprestimosSocio');
assert(emp.administradores.length >= 2, '2 admins');
CGL.Finance._ensureAdminsProLabore(emp);
assert(emp.administradores[0].proLaboreMensal != null, 'proLabore bootstrap');

const caixaPj0 = emp.caixa;
const pf0 = state.player.dinheiro;

// --- Pró-labore ---
const adminJog = emp.administradores.find((a) => !a.ehContratado) || emp.administradores[0];
const adminNpc = emp.administradores.find((a) => a.ehContratado) || emp.administradores[1];
CGL.Finance.setProLabore(state, emp.id, adminJog.id, 5000);
CGL.Finance.setProLabore(state, emp.id, adminNpc.id, 4000);
assert(adminJog.proLaboreMensal === 5000, 'PL jogador');
assert(adminNpc.proLaboreMensal === 4000, 'PL contratado');

const pay = CGL.Finance.payProLabores(state, emp.id);
assert(pay.total >= 9000, 'pró-labore total pago');
assert(emp.caixa < caixaPj0, 'PL debitou PJ');
assert(state.player.dinheiro > pf0, 'PL creditou PF do jogador');
assert(
  state.finance.pessoal.ledger.some((l) => l.categoria === 'pro_labore_recebido'),
  'ledger PF pró-labore'
);
assert(
  emp.finance.ledger.some((l) => l.categoria === 'pro_labore'),
  'ledger PJ pró-labore'
);
console.log('OK pró-labore', pay.total, 'PF', state.player.dinheiro, 'PJ', emp.caixa);

// --- Separação: não há API de gasto livre PJ→PF ---
assert(
  typeof CGL.Finance.spendCompanyAsPersonal !== 'function',
  'sem gasto livre PJ como pessoal'
);

// --- Aporte ---
const capAntes = emp.capitalSocial;
const pfAntesAporte = state.player.dinheiro;
const caixaAntesAporte = emp.caixa;
CGL.Finance.contributeCapital(state, emp.id, 10000);
assert(emp.capitalSocial === capAntes + 10000, 'capital social +aporte');
assert(state.player.dinheiro === pfAntesAporte - 10000, 'aporte debitou PF');
assert(emp.caixa === caixaAntesAporte + 10000, 'aporte creditou PJ');
assert(emp.finance.ledger.some((l) => l.categoria === 'aporte_capital' && l.tipo === 'entrada'), 'ledger aporte PJ');
console.log('OK aporte capital', emp.capitalSocial);

// --- Dividendos pro-rata ---
emp.finance.lucrosAcumulados = 40000;
emp.caixa = Math.max(emp.caixa, 50000);
CGL.Finance.syncEmpresaCaixa(emp);
CGL.Finance.primaryAccount(emp.finance).disponivel = emp.caixa;
CGL.Finance.setDividendPolicy(state, emp.id, 'parcial');
const pfAntesDiv = state.player.dinheiro;
const div = CGL.Finance.distributeDividends(state, emp.id);
assert(div.total > 0, 'dividendos > 0');
const parteJog = div.pagos.find((p) => p.nome && (p.pct === 70 || p.nome.includes('Ana')));
const somaPagos = div.pagos.reduce((s, p) => s + p.valor, 0);
assert(Math.abs(somaPagos - div.total) <= div.pagos.length, 'soma pro-rata ≈ total');
assert(state.player.dinheiro > pfAntesDiv, 'dividendos no PF');
console.log('OK dividendos pro-rata', div.total, div.pagos);

// --- Reembolso ---
const pfAntesRe = state.player.dinheiro;
const cxAntesRe = emp.caixa;
CGL.Finance.reimburseExpense(state, emp.id, 800, 'Viagem a cliente');
assert(state.player.dinheiro === pfAntesRe + 800, 'reembolso PF');
assert(emp.caixa === cxAntesRe - 800, 'reembolso PJ');
assert(emp.finance.reembolsos.length >= 1, 'histórico reembolso');
console.log('OK reembolso');

// --- Mútuo sócio → empresa ---
const pfAntesM = state.player.dinheiro;
const cxAntesM = emp.caixa;
const mut1 = CGL.Finance.loanShareholderToCompany(state, emp.id, 12000, {
  prazoSem: 26,
  taxaAnual: 0.06
});
assert(mut1.direcao === 'socio_para_empresa', 'direção mutuo PF→PJ');
assert(state.player.dinheiro === pfAntesM - 12000, 'mutuo debitou PF');
assert(emp.caixa === cxAntesM + 12000, 'mutuo creditou PJ');
assert(emp.finance.emprestimosSocio.some((m) => m.id === mut1.id), 'contrato registrado');
console.log('OK mútuo sócio→empresa');

// --- Mútuo empresa → sócio ---
emp.caixa = Math.max(emp.caixa, 80000);
CGL.Finance.syncEmpresaCaixa(emp);
CGL.Finance.primaryAccount(emp.finance).disponivel = emp.caixa;
const pfAntesM2 = state.player.dinheiro;
const cxAntesM2 = emp.caixa;
const mut2 = CGL.Finance.loanCompanyToShareholder(state, emp.id, 5000, {
  prazoSem: 20,
  taxaAnual: 0.12
});
assert(mut2.direcao === 'empresa_para_socio', 'direção mutuo PJ→PF');
assert(mut2.taxaAnual >= 0.08, 'juros mínimos PJ→PF');
assert(state.player.dinheiro === pfAntesM2 + 5000, 'mutuo creditou PF');
assert(emp.caixa === cxAntesM2 - 5000, 'mutuo debitou PJ');
console.log('OK mútuo empresa→sócio');

// Limite deve falhar com valor absurdo
let limiteOk = false;
try {
  CGL.Finance.loanCompanyToShareholder(state, emp.id, Math.round(emp.caixa * 0.9));
} catch (e) {
  limiteOk = true;
}
assert(limiteOk, 'limite mútuo PJ→PF');

// --- Restituição ---
emp.caixa = Math.max(emp.caixa, 40000);
CGL.Finance.syncEmpresaCaixa(emp);
CGL.Finance.primaryAccount(emp.finance).disponivel = emp.caixa;
const capAntesR = emp.capitalSocial;
const pfAntesR = state.player.dinheiro;
const rest = CGL.Finance.restituteCapital(state, emp.id, 2000);
assert(rest.valor === 2000, 'restituição valor');
assert(emp.capitalSocial === capAntesR - 2000, 'capital reduzido');
assert(state.player.dinheiro === pfAntesR + 2000, 'restituição PF');
console.log('OK restituição', emp.capitalSocial);

// --- Venda de participação (canal formal) ---
state.player.dinheiro = Math.max(state.player.dinheiro, 200000);
CGL.Finance.primaryAccount(state.finance.pessoal).disponivel = state.player.dinheiro;
CGL.Finance.syncPersonalCash(state);
const empVenda = CGL.Company.constitute(state, {
  nome: 'VendaCo',
  nomeFantasia: 'Venda Co',
  cidadeId: CGL.Data.cities[0].id,
  segmentoId: 'servicos',
  naturezaId: 'ltda',
  porte: 'micro',
  capitalSocial: 15000,
  socios: [{ tipo: 'jogador', percentual: 100 }],
  administradores: [{ nome: 'Ana Silva', cargo: 'Admin' }]
});
const pfAntesVenda = state.player.dinheiro;
const venda = CGL.Company.sellCompany(state, empVenda.id, { venderTudo: true });
assert(venda.preco > 0, 'preço venda');
assert(state.player.dinheiro >= pfAntesVenda + venda.preco - 1, 'venda creditou PF');
assert(
  state.finance.pessoal.ledger.some((l) => l.categoria === 'venda_participacao'),
  'ledger venda participação'
);
console.log('OK venda participação', venda.preco);

// --- Multi-empresa independência ---
state.player.dinheiro = Math.max(state.player.dinheiro, 100000);
CGL.Finance.primaryAccount(state.finance.pessoal).disponivel = state.player.dinheiro;
CGL.Finance.syncPersonalCash(state);
const empB = CGL.Company.constitute(state, {
  nome: 'BetaIndep',
  nomeFantasia: 'Beta Indep',
  cidadeId: CGL.Data.cities[1].id,
  segmentoId: 'servicos',
  naturezaId: 'ltda',
  porte: 'micro',
  capitalSocial: 20000,
  socios: [{ tipo: 'jogador', percentual: 100 }],
  administradores: [{ nome: 'Ana Silva', cargo: 'Admin' }]
});
const cxA = emp.caixa;
CGL.Finance.contributeCapital(state, empB.id, 3000);
assert(emp.caixa === cxA, 'aporte em B não altera caixa de A');
console.log('OK independência multi-empresa');

// --- Week tick (inclui pró-labore na semana % 4) ---
state.world.semanaAtual = 3;
for (let i = 0; i < 5; i++) {
  CGL.World.advanceWeek(state.world);
  CGL.Economy.weeklyTick(state.economy);
  CGL.Company.weeklyTick(state);
  CGL.Finance.weeklyTick(state);
}
assert(emp.finance.dreHistorico.length >= 5, 'DRE após ticks');
assert(
  emp.finance.emprestimosSocio.some((m) => m.semanasRestantes < m.prazoSem || m.status === 'quitado'),
  'mútuos processados no tick'
);
console.log('OK week tick ×5', {
  semana: state.world.semanaAtual,
  mutuoStatuses: emp.finance.emprestimosSocio.map((m) => m.status)
});

// --- Save / load v4 ---
CGL.Game.state = state;
assert(CGL.Save.save(state), 'save');
const loaded = CGL.Save.load();
assert(loaded.version === 4, 'load version 4');
assert(loaded.state.companies.empresas.some((e) => Array.isArray(e.finance?.emprestimosSocio)), 'load mútuos');
assert(loaded.state.finance.pessoal.contas.length >= 1, 'load PF');
console.log('OK save/load v4');

// --- Migração v3 → v4 ---
const fakeV3 = {
  version: 3,
  state: JSON.parse(JSON.stringify(state))
};
fakeV3.state.companies.empresas.forEach((e) => {
  if (e.finance) {
    delete e.finance.emprestimosSocio;
    delete e.finance.reembolsos;
    e.finance.version = 3;
  }
});
const migrated = CGL.Save.migrate(fakeV3);
assert(migrated.version === 4, 'migrate → 4');
assert(Array.isArray(migrated.state.companies.empresas[0].finance.emprestimosSocio), 'migrate emprestimosSocio');
console.log('OK migrate v3→v4');

// Históricos
assert(
  (state.player.historico || []).some((h) => /pró-labore|dividendo|aporte|mútuo|reembolso|restituição|venda/i.test(h.titulo + h.descricao)),
  'histórico pessoal com movimentos'
);

console.log('\n=== SMOKE PHASE 4 PASSED ===');
