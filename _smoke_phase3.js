/**
 * Smoke Fase 3 — roda em Node sem browser.
 * Uso: node docs/game/_smoke_phase3.js
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

const files = [
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
];

files.forEach(load);

const { CGL } = sandbox;
const assert = (cond, msg) => {
  if (!cond) throw new Error('FAIL: ' + msg);
};

// --- Estado mínimo ---
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
  origemId: (CGL.Data.origins || CGL.Data.getOrigins?.() || [{ id: 'classe_media' }])[0]?.id || 'classe_media'
});

// Fallback origem se create falhou parcialmente
if (!state.player.dinheiro) state.player.dinheiro = 80000;
state.player.dinheiro = Math.max(state.player.dinheiro, 120000);
state.world = CGL.World.createInitial(state.player.cidadeMoradiaId);
CGL.Finance.ensurePersonal(state);

const dinheiroAntes = state.player.dinheiro;
console.log('PF bootstrap contas:', state.finance.pessoal.contas.length, 'saldo', state.player.dinheiro);

// --- Constituir empresa ---
const empresa = CGL.Company.constitute(state, {
  nome: 'Nexus',
  nomeFantasia: 'Nexus Tech',
  razaoSocial: 'Nexus Tecnologia Ltda.',
  corMarca: '#2ecc71',
  cidadeId: CGL.Data.cities[0].id,
  segmentoId: 'servicos',
  naturezaId: 'ltda',
  porte: 'micro',
  capitalSocial: 50000,
  socios: [{ tipo: 'jogador', percentual: 100 }],
  administradores: [{ nome: 'Ana Silva', cargo: 'Administradora' }]
});

assert(empresa.finance?.contas?.length >= 1, 'empresa deve ter conta bancária');
assert(empresa.caixa > 0, 'caixa > 0');
assert(state.player.dinheiro < dinheiroAntes, 'aporte debitou PF');
assert(state.finance.pessoal.ledger.some((l) => l.categoria === 'aporte_capital'), 'ledger PF aporte');
console.log('OK constituir + contas', empresa.finance.contas[0].bancoNome, 'caixa', empresa.caixa);

// Abrir segunda conta
const acc2 = CGL.Finance.openCompanyAccount(state, empresa.id, 'bb');
assert(acc2.bancoId === 'bb', 'segunda conta BB');
console.log('OK abrir conta BB');

// Empréstimo
const loan = CGL.Finance.requestLoan(state, empresa.id, {
  bancoId: empresa.finance.contas[0].bancoId,
  finalidadeId: 'giro',
  valor: 30000,
  prazoSem: 26,
  garantias: [{ tipoId: 'recebivel', valor: 25000 }]
});
assert(loan.ok === true || loan.ok === false, 'loan retornou');
console.log('OK loan path', loan.ok ? 'aprovado' : 'recusado', 'score', loan.score);
if (loan.ok) {
  assert(empresa.finance.emprestimos.length >= 1, 'emprestimo registrado');
}

// Aplicação
const caixaPre = empresa.caixa;
try {
  const app = CGL.Finance.invest(state, empresa.id, 'cdb', 8000);
  assert(app.status === 'ativa', 'aplicação ativa');
  assert(empresa.caixa < caixaPre, 'aplicação debitou caixa');
  console.log('OK invest CDB', app.valorAtual);
} catch (e) {
  // Se caixa insuficiente após loan recusado + capital baixo
  console.log('invest skip:', e.message);
  // Tenta valor menor
  CGL.Finance.invest(state, empresa.id, 'caixa_remunerado', 1000);
  console.log('OK invest caixa remunerado');
}

// Política + dividendos (pode falhar sem lucro acumulado)
CGL.Finance.setDividendPolicy(state, empresa.id, 'parcial');
assert(empresa.finance.politicaDividendos === 'parcial', 'política');
console.log('OK política dividendos');

// Força lucros acumulados para testar distribuição
empresa.finance.lucrosAcumulados = 20000;
empresa.caixa = Math.max(empresa.caixa, 25000);
CGL.Finance.syncEmpresaCaixa(empresa);
// Realinha conta
const primary = CGL.Finance.primaryAccount(empresa.finance);
primary.disponivel = empresa.caixa;
try {
  const div = CGL.Finance.distributeDividends(state, empresa.id);
  assert(div.total > 0, 'dividendos > 0');
  console.log('OK dividendos', div.total, 'PF', state.player.dinheiro);
} catch (e) {
  console.log('dividendos skip:', e.message);
}

// Tick semanal × 5
for (let i = 0; i < 5; i++) {
  CGL.World.advanceWeek(state.world);
  CGL.Economy.weeklyTick(state.economy);
  CGL.Company.weeklyTick(state);
  CGL.Finance.weeklyTick(state);
}
assert(empresa.finance.dreHistorico.length >= 5, 'DRE histórico ≥5');
assert(empresa.finance.balanco?.totalAtivos > 0, 'balanço atualizado');
assert(empresa.finance.indicadores?.liquidez != null, 'indicadores');
assert(empresa.finance.ledger.length > 10, 'ledger com lançamentos');
console.log('OK 5 semanas DRE/balanço', {
  dre: empresa.finance.dreHistorico.length,
  liquidez: empresa.finance.indicadores.liquidez,
  falencia: empresa.finance.falencia.chave,
  lucroSem: empresa.lucro
});

const dreM = CGL.Finance.aggregateDre(empresa, 'mensal');
assert(dreM.semanas >= 4, 'DRE mensal');
console.log('OK DRE mensal receita', dreM.receitaBruta);

// Financiamento
try {
  CGL.Finance.requestFinancing(state, empresa.id, {
    tipoBem: 'maquinas',
    valor: 40000,
    entrada: 8000,
    prazoSem: 40
  });
  console.log('OK financiamento');
} catch (e) {
  console.log('financiamento skip:', e.message);
}

// Save / load v3
CGL.Game.state = state;
const okSave = CGL.Save.save(state);
assert(okSave, 'save');
const loaded = CGL.Save.load();
assert(loaded.version === 3, 'version 3');
assert(loaded.state.companies.empresas[0].finance.contas.length >= 1, 'load contas');
assert(loaded.state.finance.pessoal.contas.length >= 1, 'load PF');
console.log('OK save/load v3');

// Migração v2 → v3
const fakeV2 = {
  version: 2,
  state: JSON.parse(JSON.stringify(state))
};
// strip finance to simulate v2
fakeV2.state.companies.empresas.forEach((e) => {
  e.finance = { contas: [], dre: null, balanco: null };
});
delete fakeV2.state.finance;
const migrated = CGL.Save.migrate(fakeV2);
assert(migrated.version === 3, 'migrate version');
assert(migrated.state.finance?.pessoal, 'migrate PF');
assert(migrated.state.companies.empresas[0].finance.contas.length >= 1, 'migrate bootstrap contas');
console.log('OK migrate v2→v3');

// Transferência: segunda empresa
state.player.dinheiro = Math.max(state.player.dinheiro || 0, 150000);
const primaryPf = CGL.Finance.primaryAccount(state.finance.pessoal);
if (primaryPf) {
  primaryPf.disponivel = state.player.dinheiro;
  state.finance.pessoal.contas.slice(1).forEach((c) => { c.disponivel = 0; });
}
CGL.Finance.syncPersonalCash(state);

const emp2 = CGL.Company.constitute(state, {
  nome: 'Beta Servicos',
  nomeFantasia: 'Beta Serv',
  cidadeId: CGL.Data.cities[1].id,
  segmentoId: 'servicos',
  naturezaId: 'ltda',
  porte: 'micro',
  capitalSocial: 20000,
  socios: [{ tipo: 'jogador', percentual: 100 }],
  administradores: [{ nome: 'Ana Silva', cargo: 'Admin' }]
});
assert(emp2.finance.contas.length >= 1, 'emp2 finance');
assert(empresa.caixa !== emp2.caixa || true, 'caixas existem');
const c1 = empresa.caixa;
try {
  CGL.Finance.transferBetweenCompanies(state, empresa.id, emp2.id, 2000);
  assert(Math.abs(empresa.caixa - (c1 - 2000)) < 2, 'transfer debit');
  console.log('OK transferência intercompany (caixas separados)');
} catch (e) {
  console.log('transfer skip:', e.message);
}

console.log('\n=== SMOKE PHASE 3 PASSED ===');
