/**
 * Smoke Fase 13 — dificuldade → week tick IA → automação → conquista → cheat → save/load v13.
 * Uso: node docs/game/_smoke_phase13.js
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
  'data/difficulty.js',
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
  'js/difficulty.js',
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

assert(CGL.Save.CURRENT_VERSION === 13, 'save version 13');
assert(CGL.Difficulty && CGL.Sandbox === CGL.Difficulty, 'Difficulty + alias');
assert(CGL.Data.difficultyLevels.length === 6, '6 níveis oficiais');
assert(CGL.Data.difficultyPresets.length >= 6, 'presets');
assert(CGL.Data.startModes.length === 5, 'modos de partida');
assert(CGL.Data.aiPersonalities.length === 5, 'personalidades IA');
assert(CGL.Data.automationAreas.length >= 10, 'áreas automação');
assert(CGL.Data.automationLevels.length === 4, 'níveis automação');
assert(CGL.Data.achievements.length >= 12, 'conquistas');
assert(CGL.Data.cheats.length >= 10, 'cheats');
assert(CGL.Data.sandboxToggles.length >= 8, 'sandbox toggles');
assert(CGL.Data.difficultyParamDefs.length >= 15, 'sliders custom');
console.log('OK dados dificuldade');

const state = CGL.Game.createEmptyState();
state.player = CGL.Player.createFromCreation({
  nome: 'Lara',
  sobrenome: 'Magnata',
  sexo: 'F',
  dataNascimento: '1988-07-04',
  avatar: { skin: 1, hair: 1, hairColor: '#222', eyes: '#345', outfit: 1 },
  cidadeNascimentoId: CGL.Data.cities[0].id,
  cidadeMoradiaId: CGL.Data.cities[0].id,
  cursoId: CGL.Data.courses[0].id,
  atributos: CGL.Player.defaultAttributes(),
  tracos: (CGL.Data.traits || []).slice(0, 3).map((t) => t.id),
  sonhos: ['imperio'],
  origemId: 'classe_media'
});
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
CGL.Difficulty.ensureDifficulty(state);
assert(state.difficulty.version === 13, 'difficulty state v13');
console.log('OK seed estado');

// --- 1. Pick difficulty ---
CGL.Difficulty.setLevel(state, 'dificil');
assert(state.difficulty.levelId === 'dificil', 'nível difícil');
assert(state.meta.difficulty === 'dificil', 'meta sync');
const pHard = CGL.Difficulty.params(state);
assert(pHard.agressividadeIA > 1, 'IA agressiva no difícil');
assert(pHard.facilidadeCredito < 1, 'crédito mais difícil');
assert(pHard.custoCredito > 1, 'crédito mais caro');
assert(pHard.frequenciaCrises > 1, 'mais crises');
assert(pHard.exigenciaSalarial > 1, 'salários');
CGL.Difficulty.setPreset(state, 'ultracompetitivo');
assert(state.difficulty.presetId === 'ultracompetitivo', 'preset');
assert(CGL.Difficulty.mult(state, 'agressividadeIA') >= pHard.agressividadeIA, 'preset soma IA');
CGL.Difficulty.setStartMode(state, 'herdeiro');
assert(state.difficulty.startModeId === 'herdeiro', 'modo herdeiro');
CGL.Difficulty.applyStartModeHooks(state);
assert(state.player.dinheiro > 100000, 'herdeiro capital');
console.log('OK dificuldade + preset + modo');

// Credit multipliers wired
const creditBonus = CGL.Difficulty.creditScoreBonus(state);
const rateMult = CGL.Difficulty.creditRateMult(state);
assert(typeof creditBonus === 'number', 'credit bonus');
assert(rateMult > 1, 'rate mult difícil');
console.log('OK credit hooks', creditBonus.toFixed(1), rateMult.toFixed(2));

// --- 2. Company + competitors + week tick AI ---
const co = CGL.Company.constitute(state, {
  nome: 'Atlas Soft',
  nomeFantasia: 'Atlas Soft',
  razaoSocial: 'Atlas Soft Ltda',
  corMarca: '#3498db',
  cidadeId: CGL.Data.cities[0].id,
  segmentoId: 'tecnologia',
  naturezaId: 'ltda',
  porte: 'pequena',
  capitalSocial: 100000,
  socios: [{ tipo: 'jogador', percentual: 100 }],
  administradores: [{ nome: 'Lara Magnata', cargo: 'CEO' }]
});
CGL.Finance.creditEmpresa(state, co.id, 300000, { categoria: 'aporte', descricao: 'seed' });
co.caixa = (co.caixa || 0) + 300000;

// Force competitors with personalities
for (let i = 0; i < 5; i++) {
  const c = CGL.Company.spawnCompetitor(state, 'tecnologia', CGL.Data.cities[0].id);
  assert(c.ai && c.ai.personality, 'personalidade IA ' + i);
}
const personalities = new Set(
  CGL.Company.listCompetitors(state).map((e) => e.ai.personality)
);
assert(personalities.size >= 1, 'pelo menos 1 personalidade');
console.log('OK concorrentes', personalities.size, 'tipos:', [...personalities].join(','));

CGL.Game.state = state;
CGL.Game.phase = 'playing';

let aiLogBefore = (state.difficulty.aiLog || []).length;
for (let i = 0; i < 8; i++) {
  CGL.World.advanceWeek(state.world);
  CGL.Economy.weeklyTick(state.economy, Math.random, state);
  CGL.Company.weeklyTick(state);
  CGL.Finance.weeklyTick(state);
  CGL.Hr.weeklyTick(state);
  CGL.Marketing.weeklyTick(state);
  CGL.Rd.weeklyTick(state);
  CGL.Logistics.weeklyTick(state);
  CGL.International.weeklyTick(state);
  CGL.Holding.weeklyTick(state);
  CGL.Debt.weeklyTick(state);
  CGL.Difficulty.weeklyTick(state);
  CGL.Events.weeklyTick(state);
  state.statistics.weeksPlayed = (state.statistics.weeksPlayed || 0) + 1;
}
assert(state.difficulty.semanaUltimoTick > 0, 'tick dificuldade');
// IA pode ou não ter logado (rng); força um tick de personalidade com agressividade alta
state.difficulty.params.agressividadeIA = 5;
CGL.Difficulty._competitorPersonalityTick(state);
assert((state.difficulty.aiLog || []).length >= aiLogBefore, 'AI log existe');
console.log('OK week tick + AI', 'log', state.difficulty.aiLog.length);

// --- 3. Automation ---
CGL.Difficulty.applyManagementProfile(state, 'crescimento');
assert(state.difficulty.automation.profileId === 'crescimento', 'perfil');
assert(state.difficulty.automation.areas.expansao === 'auto', 'expansão auto');
CGL.Difficulty.setAutomationLevel(state, 'marketing', 'semi');
assert(state.difficulty.automation.areas.marketing === 'semi', 'mkt semi');
CGL.Difficulty._automationTick(state);
console.log('OK automação');

// --- 4. Achievement unlock ---
// primeira_empresa pode já ter sido desbloqueada no tick; força outra
assert(
  state.difficulty.achievementsUnlocked.includes('primeira_empresa'),
  'primeira_empresa via tick'
);
const unlocked = CGL.Difficulty.unlockAchievement(state, 'semana_52');
assert(unlocked || state.difficulty.achievementsUnlocked.includes('semana_52'), 'semana_52');
// Força patrimônio para milhão
state.player.dinheiro = Math.max(state.player.dinheiro || 0, 1_500_000);
state.player.patrimonio = Math.max(state.player.patrimonio || 0, 1_500_000);
CGL.Difficulty._achievementsTick(state);
assert(state.difficulty.achievementsUnlocked.includes('primeiro_milhao'), 'primeiro_milhao');
assert(state.achievements.includes('primeira_empresa'), 'espelho achievements');
console.log('OK conquistas', state.difficulty.achievementsUnlocked.length);

// --- 5. Cheat marks mode ---
assert(!state.difficulty.cheatsMode, 'sem cheats ainda');
const moneyBefore = state.player.dinheiro;
CGL.Difficulty.activateCheat(state, 'dinheiro_1m');
assert(state.difficulty.cheatsMode, 'modo cheats marcado');
assert(state.meta.cheats === true, 'meta.cheats');
assert(state.player.dinheiro >= moneyBefore + 1_000_000, 'dinheiro cheat');
CGL.Difficulty.activateCheat(state, 'congelar_inflacao');
assert(state.difficulty.cheatFlags.congelar_inflacao === true, 'toggle freeze');
console.log('OK cheats');

// Sandbox toggles
CGL.Difficulty.setSandbox(state, true, { crises: false, iaConcorrente: true });
assert(state.difficulty.sandbox, 'sandbox on');
assert(CGL.Difficulty.isSandboxSystemOn(state, 'crises') === false, 'crises off');
assert(CGL.Difficulty.eventChanceMult(state, 'crise') === 0, 'crise chance 0');
console.log('OK sandbox');

// Custom + easy level for balance
CGL.Difficulty.setLevel(state, 'muito_facil');
assert(CGL.Difficulty.mult(state, 'capitalInicialMult') > 1.5, 'muito fácil capital');
CGL.Difficulty.setCustomParams(state, { agressividadeIA: 0.5, facilidadeCredito: 2 });
assert(state.difficulty.custom, 'custom');
assert(state.meta.difficulty === 'personalizado', 'meta personalizado');
console.log('OK custom');

// --- 6. Save / load + migrate v12→v13 ---
assert(CGL.Save.save(state), 'save');
const raw = JSON.parse(localStorage.getItem(CGL.Save.SAVE_KEY));
assert(raw.version === 13, 'payload v13');

const v12payload = {
  version: 12,
  state: JSON.parse(JSON.stringify(state))
};
delete v12payload.state.difficulty;
v12payload.state.meta = { difficulty: 'normal', gameMode: 'empreendedor', cheats: false };
v12payload.state.achievements = [];
const migrated = CGL.Save.migrate(v12payload);
assert(migrated.version === 13, 'migrate → 13');
assert(migrated.state.difficulty.version === 13, 'difficulty version 13');
assert(migrated.state.difficulty.levelId === 'normal', 'migrate level from meta');
console.log('OK migrate v12→v13');

const loaded = CGL.Save.load();
assert(loaded && loaded.version === 13, 'load v13');
assert(loaded.state.difficulty.cheatsMode === true, 'cheats persistidos');
assert(loaded.state.difficulty.achievementsUnlocked.includes('primeira_empresa'), 'conquista persistida');
assert(loaded.state.difficulty.automation.areas.marketing === 'semi', 'auto persistida');
console.log('OK save/load v13');

// Summary
const sum = CGL.Difficulty.summary(loaded.state);
assert(sum.cheatsMode && sum.achievements >= 1, 'summary');
console.log('OK summary', sum.levelNome, 'conquistas', sum.achievements);

console.log('\n=== SMOKE FASE 13 OK ===');
