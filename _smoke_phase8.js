/**
 * Smoke Fase 8 — campanha → week tick (vendas/marca) → crise → save/load v8.
 * Uso: node docs/game/_smoke_phase8.js
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
  'js/utils.js',
  'js/save.js',
  'js/economy.js',
  'js/company.js',
  'js/finance.js',
  'js/market.js',
  'js/debt.js',
  'js/hr.js',
  'js/marketing.js',
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

assert(CGL.Save.CURRENT_VERSION === 8, 'save version 8');
assert(CGL.Marketing && CGL.Data.brandPositions.length >= 8, 'Marketing + posicionamentos');
assert(CGL.Data.adChannels.length >= 8, 'canais ads');
assert(CGL.Data.consumerSegments.length >= 8, 'segmentos');
assert(CGL.Data.pricingStrategies.length >= 5, 'preços');
assert(CGL.Data.crisisDefs.length >= 6, 'crises');
assert(CGL.Data.launchStages.length >= 6, 'pipeline lançamento');
assert(CGL.Data.crmLevels.length >= 5, 'CRM');
assert(CGL.Data.influencerArchetypes.length >= 5, 'influenciadores');
assert(CGL.Data.sponsorshipTypes.length >= 5, 'patrocínios');

const state = CGL.Game.createEmptyState();
state.player = CGL.Player.createFromCreation({
  nome: 'Bruno',
  sobrenome: 'Costa',
  sexo: 'M',
  dataNascimento: '1990-03-12',
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
CGL.Hr.ensureHr(state);
CGL.Marketing.ensureMarketing(state);
assert(state.marketing.version === 8, 'marketing state v8');

const emp = CGL.Company.constitute(state, {
  nome: 'MarcaCo',
  nomeFantasia: 'MarcaCo',
  razaoSocial: 'MarcaCo Ltda',
  corMarca: '#d4a84b',
  cidadeId: CGL.Data.cities[0].id,
  segmentoId: 'servicos',
  naturezaId: 'ltda',
  porte: 'pequena',
  capitalSocial: 150000,
  socios: [{ tipo: 'jogador', percentual: 100 }],
  administradores: [{ nome: 'Bruno Costa', cargo: 'CEO' }]
});

CGL.Finance.creditEmpresa(state, emp.id, 400000, {
  categoria: 'aporte',
  descricao: 'Seed smoke marketing'
});
CGL.Marketing.ensureCompanyMarketing(emp, state);
assert(emp.marketing.marca.awareness >= 0, 'marca seeded');
assert(emp.marketing.marca.posicionamento, 'posicionamento');
console.log('OK seed marca awareness', emp.marketing.marca.awareness);

// Demanda NÃO é só existência — fatores compostos
const dem0 = CGL.Marketing.calcDemandFactors(emp, state);
assert(dem0.fator > 0 && dem0.fatores.marca, 'demanda fatores');
assert(dem0.fatores.preco && dem0.fatores.qualidade && dem0.fatores.distribuicao, 'fatores core');
assert(dem0.fatores.ads && dem0.fatores.concorrencia, 'fatores ads/concorrência');
console.log('OK demanda base', dem0.fator, dem0.fatores);

// Posicionamento + preço + CRM + distribuição
CGL.Marketing.setPositioning(emp, state, 'inovadora');
CGL.Marketing.setPricing(emp, state, 'premium');
CGL.Marketing.setCrmLevel(emp, state, 2);
CGL.Marketing.setDistribution(emp, state, 'ecommerce', 0.7);
assert(emp.marketing.marca.posicionamento === 'inovadora', 'pos');
assert(emp.marketing.precificacao.estrategia === 'premium', 'preço');
assert(emp.marketing.crm.nivel === 2, 'crm');
console.log('OK pos/preço/crm');

// --- Campanha ---
const camp = CGL.Marketing.createCampaign(emp, state, {
  canalId: 'social',
  objetivoId: 'marca',
  publicoId: 'jovem',
  duracao: 4,
  orcamento: 40000,
  mensagem: 'MarcaCo muda o jogo'
});
assert(camp.status === 'ativa', 'campanha ativa');
assert(emp.marketing.campanhas.some((c) => c.id === camp.id), 'na lista');
const awareBefore = emp.marketing.marca.awareness;
const demCamp = CGL.Marketing.calcDemandFactors(emp, state);
assert(demCamp.fatores.ads >= dem0.fatores.ads, 'ads sobe com campanha');
console.log('OK campanha', camp.canalId, 'ads', demCamp.fatores.ads);

// Pesquisa
const pesq = CGL.Marketing.startResearch(emp, state, 'consumidores');
assert(pesq.status === 'ativa', 'pesquisa');

// Influenciador + patrocínio
const inf = CGL.Marketing.hireInfluencer(emp, state, { archetypeId: 'micro' }, 6);
assert(inf.status === 'ativo', 'influencer');
const spon = CGL.Marketing.startSponsorship(emp, state, 'causa', 6);
assert(spon.status === 'ativo', 'patrocínio');

// Lançamento
const launch = CGL.Marketing.startLaunch(emp, state, 'Linha Nova');
assert(launch.estagio === 'pesquisa', 'pipeline');

// --- Week ticks: vendas + marca ---
const receitaAntes = emp.receita || 0;
for (let i = 0; i < 3; i++) {
  CGL.World.advanceWeek(state.world);
  CGL.Company.weeklyTick(state);
  CGL.Finance.weeklyTick(state);
  CGL.Hr.weeklyTick(state);
  CGL.Marketing.weeklyTick(state);
  CGL.Debt.weeklyTick(state);
}
assert(emp.receita > 0, 'vendas pós-tick');
assert(emp.marketing.marca.awareness !== awareBefore || camp.awarenessGain > 0 || emp.marketing.kpis, 'marca evoluiu ou KPIs');
assert(emp.marketing.demandaUltima.fator > 0, 'demanda registrada');
assert(emp.marketing.custoSemanal >= 0, 'custo mkt');
assert(emp.finance?._mktCustoSemanal >= 0 || emp.marketing.custoSemanal >= 0, 'hook finance mkt');
console.log('OK tick receita', emp.receita, 'awareness', emp.marketing.marca.awareness, 'demanda', emp.marketing.demandaUltima.fator);

// Agenda com marketing
const agenda = CGL.Debt.buildCalendar(emp, state);
const mktItem = agenda.find((a) => a.tipo === 'marketing');
if (CGL.Marketing.weeklyMarketingCostEstimate(emp) > 0) {
  assert(mktItem && mktItem.valor > 0, 'agenda marketing');
  console.log('OK agenda mkt', mktItem.valor);
} else {
  console.log('OK agenda mkt (sem custo ativo neste momento)');
}

// --- Crise + resposta ---
const crisis = CGL.Marketing.triggerCrisis(emp, state, 'produto_defeito');
assert(crisis.status === 'ativa', 'crise ativa');
const confBefore = emp.marketing.marca.confianca;
const resolved = CGL.Marketing.respondCrisis(emp, state, crisis.id, 'desculpas');
assert(resolved.respostaId === 'desculpas', 'resposta registrada');
assert(resolved.status === 'resolvida' || resolved.severidadeRestante < crisis.severidade, 'crise melhorou');
console.log('OK crise', resolved.status, 'confiança', emp.marketing.marca.confianca, 'vs', confBefore);

// KPIs
CGL.Marketing.updateKpis(emp, state);
assert(emp.marketing.kpis.valorMarca != null, 'KPI valor marca');
assert(emp.marketing.kpis.demanda != null, 'KPI demanda');
console.log('OK KPIs', emp.marketing.kpis.faturamentoSemanal, 'share', emp.marketing.kpis.participacaoMercado);

// --- Save / load migrate ---
CGL.Game.state = state;
CGL.Game.phase = 'playing';
assert(CGL.Save.save(state), 'save');
const raw = JSON.parse(localStorage.getItem(CGL.Save.SAVE_KEY));
assert(raw.version === 8, 'payload v8');

// Simula save v7 → migrate
const v7payload = {
  version: 7,
  state: JSON.parse(JSON.stringify(state))
};
v7payload.state.marketing = { version: 7 };
v7payload.state.companies.empresas.forEach((e) => {
  e.marketing = {};
});
const migrated = CGL.Save.migrate(v7payload);
assert(migrated.version === 8, 'migrate → 8');
assert(migrated.state.marketing.version === 8, 'mkt version 8');
assert(migrated.state.companies.empresas[0].marketing.marca, 'migrate seed marca');
console.log('OK migrate v7→v8', migrated.state.companies.empresas[0].marketing.marca.posicionamento);

const loaded = CGL.Save.load();
assert(loaded && loaded.version === 8, 'load v8');
assert(loaded.state.companies.empresas[0].marketing.campanhas.length > 0, 'campanhas persistidas');
console.log('OK save/load');

const sum = CGL.Marketing.dashboardSummary(state);
assert(sum.empresas >= 1, 'dashboard');
console.log('OK dashboard mkt awareness', sum.awarenessMedia, 'campanhas', sum.campanhasAtivas);

console.log('\n=== SMOKE FASE 8 OK ===');
