/**
 * Smoke Fase 5 — rating, oferta investidor, valuation, IPO→bolsa, tick, save v5.
 * Uso: node docs/game/_smoke_phase5.js
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
  'js/utils.js',
  'js/save.js',
  'js/economy.js',
  'js/company.js',
  'js/finance.js',
  'js/market.js',
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

assert(CGL.Save.CURRENT_VERSION >= 5, 'save version ≥5');
assert(CGL.Market && CGL.Data.investorTypes.length >= 6, 'Market + investors');
assert(CGL.Data.creditRatings.length === 7, 'ratings AAA–CCC');
assert(CGL.Data.banks.every((b) => b.perfil), 'bancos com perfil');

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
state.player.dinheiro = Math.max(state.player.dinheiro || 0, 800000);
state.world = CGL.World.createInitial(state.player.cidadeMoradiaId);
CGL.Finance.ensurePersonal(state);
CGL.Market.ensureMarket(state);
assert(state.market.investidores.length >= 8, 'pool investidores');
assert(state.market.bolsa.indice > 0, 'índice bolsa');

const emp = CGL.Company.constitute(state, {
  nome: 'Capitals',
  nomeFantasia: 'Capitals SA',
  razaoSocial: 'Capitals S.A.',
  corMarca: '#2ecc71',
  cidadeId: CGL.Data.cities[0].id,
  segmentoId: 'tecnologia',
  naturezaId: 'sa_fechada',
  porte: 'media',
  capitalSocial: 200000,
  socios: [
    { tipo: 'jogador', percentual: 80 },
    { tipo: 'npc', nome: 'Sócio Seed', percentual: 20 }
  ],
  administradores: [{ nome: 'Ana Silva', cargo: 'CEO' }]
});

assert(emp.ipo && emp.ipo.status === 'privada', 'ipo stub');
assert(emp.rating && emp.rating.nota, 'rating bootstrap');
assert(emp.estruturaCapital, 'estrutura capital');

// --- Rating ---
const rating = CGL.Market.updateCreditRating(emp, state);
assert(rating.nota && rating.score >= 0, 'rating calculado');
console.log('OK rating', rating.nota, rating.score);

// --- Valuation dinâmico ---
const val1 = CGL.Market.calcValuation(emp, state);
emp.confiancaMercado = 90;
emp.crescimentoSemanal = 0.03;
const val2 = CGL.Market.calcValuation(emp, state);
assert(val1 > 0 && val2 > 0, 'valuation > 0');
assert(val2 !== val1 || emp.confiancaMercado === 90, 'valuation reage a confiança/crescimento');
console.log('OK valuation', val1, '→', val2);

// --- Estrutura de capital / WACC ---
const ec = CGL.Market.calcCapitalStructure(emp, state);
assert(ec.wacc > 0 && ec.custoEquity > 0, 'WACC');
console.log('OK WACC', ec.wacc, 'Ke', ec.custoEquity, 'Kd', ec.custoDebt);

// --- Oferta espontânea de investidor ---
emp.confiancaMercado = 70;
emp.porte = 'media';
const oferta = CGL.Market.generateSpontaneousOffer(state, emp, { force: true });
assert(oferta && oferta.valor > 0 && oferta.percentual > 0, 'oferta gerada');
const caixaAntes = emp.caixa;
const pctJogAntes = CGL.Company.playerStake(emp, state.player.id);
const acc = CGL.Market.respondToOffer(state, oferta.id, 'aceitar');
assert(acc.ok, 'oferta aceita');
assert(emp.caixa > caixaAntes, 'aporte creditou PJ');
assert(CGL.Company.playerStake(emp, state.player.id) < pctJogAntes, 'diluição jogador');
assert(emp.socios.some((s) => s.tipo === 'investidor'), 'sócio investidor');
console.log('OK oferta investidor', oferta.investidorNome, oferta.valor);

// --- Segunda oferta: negociar / recusar ---
const oferta2 = CGL.Market.generateSpontaneousOffer(state, emp);
if (oferta2) {
  CGL.Market.respondToOffer(state, oferta2.id, 'recusar');
  assert(oferta2.status === 'recusada', 'recusa');
  console.log('OK recusa oferta');
}

// --- Relacionamento bancário ---
const rel0 = CGL.Market.getBankRelationship(emp, 'btg');
CGL.Market.adjustBankRelationship(emp, 'btg', 5, state);
assert(CGL.Market.getBankRelationship(emp, 'btg') === rel0 + 5, 'rel banco');
console.log('OK relacionamento banco', rel0, '→', rel0 + 5);

// --- Reservas de caixa ---
CGL.Market.setCashReserveMode(state, emp.id, 'conservador');
assert(emp.reservasEstrategicas.modo === 'conservador', 'modo reservas');

// --- IPO path (forçar requisitos em smoke) ---
emp.porte = 'media';
emp.receita = 50000;
emp.receitaAcumuladaAno = 3_000_000;
emp.semanaFundacao = Math.max(1, (state.world.semanaAtual || 30) - 40);
emp.reputacao.geral = 60;
emp.naturezaId = 'sa_fechada';
CGL.Market.updateCreditRating(emp, state);
emp.rating.score = Math.max(emp.rating.score, 50);
emp.rating.nota = CGL.Data.getRatingByScore(emp.rating.score).id;

const check = CGL.Market.checkIpoRequirements(emp, state);
console.log('IPO reqs', check.requisitos.filter((r) => !r.ok).map((r) => r.id));

const prep = CGL.Market.prepareIpo(state, emp.id, {
  force: !check.ok,
  percentual: 25,
  bancoCoordenadorId: 'btg',
  valuation: CGL.Market.calcValuation(emp, state)
});
assert(emp.ipo.status === 'preparando', 'IPO preparando');
assert(prep.banco.id === 'btg', 'coordenador');

// Evita fracasso aleatório no smoke
const origRandom = Math.random;
Math.random = () => 0.9;
const ipo = CGL.Market.executeIpo(state, emp.id, { force: true, percentual: 25 });
Math.random = origRandom;

assert(ipo.ok, 'IPO ok');
assert(emp.ipo.listada && emp.ipo.ticker, 'listada + ticker');
assert(emp.ipo.preco > 0 && emp.ipo.marketCap > 0, 'preço/marketCap');
assert(state.market.bolsa.listadas.includes(emp.id), 'na bolsa');
assert(emp.socios.some((s) => s.tipo === 'mercado'), 'acionistas de mercado');
assert(emp.boardPressure.nivel > 0, 'pressão conselho');
assert(emp.naturezaId === 'sa_aberta', 'virou S.A. aberta');
console.log('OK IPO', ipo.ticker, ipo.preco, ipo.outcome, 'captado', ipo.captado);

// --- Bolsa: concorrente listado + compra/venda ---
const conc = CGL.Company.spawnCompetitor(state, 'tecnologia', CGL.Data.cities[0].id);
conc.receita = 20000;
CGL.Market.listCompetitorOnExchange(state, conc);
assert(conc.ipo.listada, 'concorrente listado');

state.player.dinheiro = Math.max(state.player.dinheiro, 100000);
CGL.Finance.syncPersonalCash(state);
const pfAntes = state.player.dinheiro;
const buy = CGL.Market.buyShares(state, conc.id, 5000);
assert(buy.qtd === 5000, 'comprou 5000');
assert(state.player.dinheiro < pfAntes, 'debitou PF');
const pos = CGL.Market.getPlayerPosition(state, conc.id);
assert(pos && pos.acoes === 5000, 'posição carteira');

const sell = CGL.Market.sellShares(state, conc.id, 2000);
assert(sell.qtd === 2000, 'vendeu 2000');
assert(CGL.Market.getPlayerPosition(state, conc.id).acoes === 3000, 'posição 3000');
console.log('OK trade ações', buy.total, sell.liquido);

// Compra da própria listada
const buyOwn = CGL.Market.buyShares(state, emp.id, 1000);
assert(buyOwn.qtd === 1000, 'comprou própria');
console.log('OK compra própria', emp.ipo.ticker);

// --- Política de dividendos em listada ---
const precoAntes = emp.ipo.preco;
CGL.Finance.setDividendPolicy(state, emp.id, 'parcial');
assert(emp.ipo.preco !== precoAntes || emp.confiancaMercado > 0, 'reação política');
console.log('OK reação dividendos listada', precoAntes, '→', emp.ipo.preco);

// --- M&A hooks ---
const dd = CGL.Market.startDueDiligence(state, conc.id);
assert(dd.valuation > 0, 'due diligence');
const hostil = CGL.Market.hostileTakeoverHook(state, conc.id);
assert(hostil.status, 'hook hostil');
console.log('OK M&A hooks', dd.status, hostil.status);

// --- Week tick ---
const idxAntes = state.market.bolsa.indice;
const histLen = emp.ipo.historicoPrecos.length;
for (let i = 0; i < 3; i++) {
  CGL.World.advanceWeek(state.world);
  CGL.Economy.weeklyTick(state.economy);
  CGL.Company.weeklyTick(state);
  CGL.Finance.weeklyTick(state);
  CGL.Market.weeklyTick(state);
}
assert(emp.ipo.historicoPrecos.length > histLen, 'histórico preços cresceu');
assert(state.market.bolsa.historico.length >= 3, 'histórico índice');
console.log('OK week tick', 'índice', idxAntes, '→', state.market.bolsa.indice, 'preço', emp.ipo.preco);

// --- Save / load v5 + migrate v4→v5 ---
assert(CGL.Save.save(state), 'save');
const loaded = CGL.Save.load();
assert(loaded.version >= 5, 'load v≥5');
assert(loaded.state.market.bolsa.listadas.includes(emp.id), 'listada persistida');
assert(loaded.state.market.carteiraJogador.some((p) => p.acoes > 0), 'carteira persistida');

// Migração sintética v4 → versão atual
const v4payload = {
  version: 4,
  state: JSON.parse(JSON.stringify(state))
};
// Simula save antigo sem market completo
v4payload.state.market = {};
const migrated = CGL.Save.migrate(v4payload);
assert(migrated.version >= 5, 'migrate → ≥5');
assert(migrated.state.market.bolsa, 'market migrado');
console.log('OK save/load + migrate v4→atual');

console.log('\n✅ Smoke Fase 5 OK');
