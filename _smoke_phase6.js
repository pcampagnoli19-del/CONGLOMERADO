/**
 * Smoke Fase 6 — modalidades, renegociação, debênture, covenants, agenda, tick, save v6.
 * Uso: node docs/game/_smoke_phase6.js
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
  'js/utils.js',
  'js/save.js',
  'js/economy.js',
  'js/company.js',
  'js/finance.js',
  'js/market.js',
  'js/debt.js',
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

assert(CGL.Save.CURRENT_VERSION >= 6, 'save version ≥6');
assert(CGL.Debt && CGL.Data.loanPurposes.some((p) => p.id === 'rural'), 'Debt + modalidades');
assert(CGL.Data.amortizationSystems.length >= 3, 'amortização');
assert(CGL.Data.covenantTypes.length >= 4, 'covenants');
assert(CGL.Data.creditEventDefs.length >= 6, 'eventos crédito');

const state = CGL.Game.createEmptyState();
state.player = CGL.Player.createFromCreation({
  nome: 'Bruno',
  sobrenome: 'Costa',
  sexo: 'M',
  dataNascimento: '1998-03-10',
  avatar: { skin: 1, hair: 1, hairColor: '#222', eyes: '#345', outfit: 1 },
  cidadeNascimentoId: CGL.Data.cities[0].id,
  cidadeMoradiaId: CGL.Data.cities[0].id,
  cursoId: CGL.Data.courses[0].id,
  atributos: CGL.Player.defaultAttributes(),
  tracos: (CGL.Data.traits || []).slice(0, 3).map((t) => t.id),
  sonhos: ['imperio'],
  origemId: 'classe_media'
});
state.player.dinheiro = Math.max(state.player.dinheiro || 0, 1_200_000);
state.world = CGL.World.createInitial(state.player.cidadeMoradiaId);
CGL.Finance.ensurePersonal(state);
CGL.Market.ensureMarket(state);
CGL.Debt.ensureDebt(state);
assert(state.debt.version === 6, 'debt state v6');

const emp = CGL.Company.constitute(state, {
  nome: 'DívidaCo',
  nomeFantasia: 'DívidaCo SA',
  razaoSocial: 'DividaCo S.A.',
  corMarca: '#3498db',
  cidadeId: CGL.Data.cities[0].id,
  segmentoId: 'tecnologia',
  naturezaId: 'sa_fechada',
  porte: 'grande',
  capitalSocial: 500000,
  socios: [
    { tipo: 'jogador', percentual: 90 },
    { tipo: 'npc', nome: 'Sócio B', percentual: 10 }
  ],
  administradores: [{ nome: 'Bruno Costa', cargo: 'CEO' }]
});

// Caixa alto para operações
CGL.Finance.creditEmpresa(state, emp.id, 800000, {
  categoria: 'aporte',
  descricao: 'Seed smoke'
});
CGL.Debt.ensureCompanyDebt(emp, state);
CGL.Market.ensureCompanyMarket(emp, state);
CGL.Market.updateCreditRating(emp, state);
emp.rating.score = Math.max(emp.rating.score, 62);
emp.rating.nota = CGL.Data.getRatingByScore(emp.rating.score).id;
emp.confiancaMercado = 70;
emp.reputacao.geral = 65;

// Relacionamento bancário alto
if (CGL.Market.adjustBankRelationship) {
  CGL.Market.adjustBankRelationship(emp, 'bb', 40, state);
  CGL.Market.adjustBankRelationship(emp, 'btg', 35, state);
}

const perfil = CGL.Debt.financialProfile(emp, state);
assert(perfil.historicoCredito > 0 && perfil.nivelRisco >= 0, 'perfil financeiro');
console.log('OK perfil', perfil.rating, 'risco', perfil.nivelRisco);

// --- Modalidades de empréstimo ---
const loan = CGL.Debt.requestBankLoan(state, emp.id, {
  bancoId: 'bb',
  finalidadeId: 'expansao',
  valor: 150000,
  prazoSem: 52,
  amortizacao: 'price',
  carenciaSem: 2,
  multaAtraso: 0.02,
  garantias: [{ tipoId: 'imovel', valor: 120000 }]
});
assert(loan.ok && loan.loan, 'empréstimo aprovado');
assert(loan.loan.amortizacao === 'price', 'amortização');
assert(loan.loan.multaAtraso === 0.02, 'multa');
assert(loan.loan.modalidade === 'expansao' || loan.loan.finalidadeId === 'expansao', 'modalidade');
assert((loan.loan.covenantsIds || []).length > 0 || emp.finance.covenantsAtivos.length > 0, 'covenants anexados');
console.log('OK loan modalidade', loan.loan.modalidade, 'parcela', loan.loan.parcela);

// Giro curto
const giro = CGL.Debt.requestBankLoan(state, emp.id, {
  bancoId: 'btg',
  finalidadeId: 'giro',
  valor: 40000,
  prazoSem: 26,
  amortizacao: 'sac',
  garantias: [{ tipoId: 'recebivel', valor: 50000 }]
});
assert(giro.ok, 'giro ok');
console.log('OK giro', giro.loan.amortizacao);

// --- Renegociação ---
const reno = CGL.Debt.renegotiateDebt(state, emp.id, loan.loan.id, 'alongamento', { force: true });
assert(reno.ok && reno.loan.prazoSem > 52, 'renegociação alongamento');
console.log('OK renegociação', reno.opcao.nome, 'prazo', reno.loan.prazoSem);

// --- Debêntures com apetite ---
emp.porte = 'grande';
const deb = CGL.Debt.issueDebenture(state, emp.id, {
  valor: 500000,
  quantidadeTitulos: 500,
  prazoSem: 104,
  remuneracaoAnual: 0.13,
  tipo: 'conversivel',
  publicoAlvo: 'institucional'
});
assert(deb.captado > 0 && deb.conversivel, 'debênture');
assert(deb.apetite > 0, 'apetite registrado');
console.log('OK debênture captado', deb.captado, 'apetite', deb.apetite);

// --- Nota / fornecedor / leasing / project ---
const note = CGL.Debt.issueCommercialPaper(state, emp.id, { valor: 25000, prazoSem: 6 });
assert(note.status === 'ativa', 'nota');
const sup = CGL.Debt.grantSupplierCredit(state, emp.id, {
  fornecedor: 'Insumos SA',
  valor: 18000,
  prazoSem: 5,
  relacionamento: 70
});
assert(sup.status === 'ativo', 'fornecedor');
const lease = CGL.Debt.startLeasing(state, emp.id, {
  tipoLeasing: 'operacional',
  ativoId: 'equipamentos',
  valor: 90000,
  prazoSem: 52
});
assert(lease.status === 'ativo', 'leasing');
console.log('OK note/sup/lease');

// Segunda empresa para intercompany
const emp2 = CGL.Company.constitute(state, {
  nome: 'FilialDebt',
  nomeFantasia: 'Filial Debt',
  razaoSocial: 'Filial Debt LTDA',
  corMarca: '#e67e22',
  cidadeId: CGL.Data.cities[0].id,
  segmentoId: 'tecnologia',
  naturezaId: 'ltda',
  porte: 'media',
  capitalSocial: 100000,
  socios: [{ tipo: 'jogador', percentual: 100 }],
  administradores: [{ nome: 'Bruno Costa', cargo: 'CEO' }]
});
CGL.Finance.creditEmpresa(state, emp.id, 100000, { categoria: 'aporte', descricao: 'buffer IC' });
const ic = CGL.Debt.intercompanyLoan(state, emp.id, emp2.id, {
  valor: 30000,
  prazoSem: 20,
  taxaSemanal: 0.002,
  aprovadoConselho: true
});
assert(ic.status === 'ativo', 'intercompany');
console.log('OK intercompany');

const proj = CGL.Debt.startProjectFinance(state, emp.id, {
  nome: 'Data Center',
  orcamento: 400000,
  pctFinanciado: 0.65,
  prazoObraSem: 20
});
assert(proj.fase === 'construcao' && proj.saldoDivida > 0, 'project finance');
console.log('OK project', proj.nome);

// --- Dashboard + agenda ---
const dash = CGL.Debt.debtDashboard(emp, state);
assert(dash.dividaTotal > 0, 'dívida total');
assert(dash.dividaCurtoPrazo + dash.dividaLongoPrazo > 0, 'curto/longo');
assert(typeof dash.alavancagem === 'number', 'alavancagem');
assert(typeof dash.coberturaJuros === 'number', 'cobertura');
const agenda = CGL.Debt.buildCalendar(emp, state);
assert(agenda.length > 0, 'agenda');
assert(agenda.some((a) => a.tipo.includes('emprestimo') || a.tipo.includes('parcela') || a.tipo === 'folha'), 'itens agenda');
console.log('OK dashboard', dash.dividaTotal, 'agenda', agenda.length);

// --- Covenants check ---
const breaches0 = CGL.Debt.checkCovenants(emp, state);
assert(Array.isArray(breaches0), 'check covenants');
// Força violação de caixa mínimo
emp.finance.covenantsAtivos.push({
  id: 'cov-test',
  tipoId: 'caixa_min',
  nome: 'Caixa mínimo',
  campo: 'caixa',
  op: 'gte',
  limite: 999999999,
  fonte: 'emprestimo',
  contratoId: loan.loan.id,
  status: 'ok'
});
const breaches = CGL.Debt.checkCovenants(emp, state);
assert(breaches.some((b) => b.tipoId === 'caixa_min'), 'covenant violado');
CGL.Debt.applyCovenantBreaches(emp, state, breaches.filter((b) => b.tipoId === 'caixa_min'));
assert(emp.finance.violacoesCovenant.length > 0, 'violação registrada');
console.log('OK covenants breach');

// --- Evento de crédito ---
const ev = CGL.Debt.applyCreditEvent(state, 'oferta_refi', emp);
assert(ev && state.debt.ofertasRefi.length >= 1, 'evento refi');
const ev2 = CGL.Debt.applyCreditEvent(state, 'crise_juros', emp);
assert(state.debt.climaCredito > 1 || ev2, 'crise juros');
console.log('OK credit events', state.debt.eventos.length);

// --- Week tick ---
const notaAntes = emp.finance.notasPromissorias.find((n) => n.status === 'ativa');
const semAntes = notaAntes.semanasRestantes;
for (let i = 0; i < 3; i++) {
  CGL.World.advanceWeek(state.world);
  CGL.Economy.weeklyTick(state.economy);
  CGL.Company.weeklyTick(state);
  CGL.Finance.weeklyTick(state);
  CGL.Market.weeklyTick(state);
  CGL.Debt.weeklyTick(state);
}
assert(state.debt.semanaUltimoTick > 0, 'debt tick');
const notaDepois = emp.finance.notasPromissorias.find((n) => n.id === notaAntes.id);
assert(
  !notaDepois || notaDepois.semanasRestantes < semAntes || notaDepois.status !== 'ativa',
  'nota processada no tick'
);
assert(emp.finance.perfilFinanceiro && emp.finance.agendaFinanceira, 'perfil/agenda atualizados');
console.log('OK week tick', 'semana', state.world.semanaAtual);

// --- Save / load (≥6) + migrate v5→atual ---
assert(CGL.Save.save(state), 'save');
const loaded = CGL.Save.load();
assert(loaded.version >= 6, 'load ≥6');
assert(loaded.state.debt && loaded.state.debt.version >= 6, 'debt persistido');
const empL = loaded.state.companies.empresas.find((e) => e.id === emp.id);
assert(empL.finance.notasPromissorias || empL.finance.emprestimos.length, 'finanças persistidas');

const v5payload = {
  version: 5,
  state: JSON.parse(JSON.stringify(state))
};
delete v5payload.state.debt;
v5payload.state.companies.empresas.forEach((e) => {
  if (e.finance) e.finance.version = 5;
});
const migrated = CGL.Save.migrate(v5payload);
assert(migrated.version >= 6, 'migrate ≥6');
assert(migrated.state.debt, 'debt migrado');
console.log('OK save/load + migrate v5→atual');

console.log('\n✅ Smoke Fase 6 OK');
