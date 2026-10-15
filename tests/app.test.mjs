import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const sources = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const copy = x => JSON.parse(JSON.stringify(x));
const row = (id = 'test/new-model', pricing = {}) => ({
  id, name: id, created: 1792000000, context_length: 128000,
  architecture: { output_modalities: ['text'] },
  pricing: { prompt: '0.000002', completion: '0.00001', ...pricing }
});
function runtime(extra = {}) {
  const elements = new Map(), storage = new Map();
  const element = selector => {
    if (!elements.has(selector)) elements.set(selector, { textContent: '', disabled: false, value: '', innerHTML: '', querySelectorAll: () => [] });
    return elements.get(selector);
  };
  const c = vm.createContext({
    console, URL, AbortController, setTimeout, clearTimeout, setInterval: () => {},
    document: { visibilityState: 'visible', querySelector: element, addEventListener: () => {}, querySelectorAll: () => [] },
    window: { addEventListener: () => {} },
    localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) },
    ...extra
  });
  for (const source of sources) vm.runInContext(source, c);
  return { c, elements, storage, run: code => vm.runInContext(code, c), element };
}
const testTier = { share: 100, tin: 1000, tout: 100, cache: 0, cacheWrite: 0, cacheDur: '5m', batch: 0, reason: 1, esc: 0 };

test('per-token parsing preserves zero and tiny prices; rejects malformed and negative rates', () => {
  const { c } = runtime();
  assert.equal(c.tokenRate('0'), 0);
  assert.equal(c.tokenRate('1e-12'), 0.000001);
  assert.equal(c.tokenRate('0.0000002'), 0.2);
  for (const x of ['', ' ', '2junk', '-1', 'Infinity', null, undefined, true, {}, NaN]) assert.equal(c.tokenRate(x), null);
});

test('CSV protects formula-like text, including leading whitespace, and quotes content', () => {
  const { c } = runtime();
  assert.equal(c.csvCell('=1+1'), '"\'=1+1"');
  assert.equal(c.csvCell('\t=1+1'), '"\'\t=1+1"');
  assert.equal(c.csvCell('A "quote"'), '"A ""quote"""');
  assert.equal(c.csvCell(5), '"5"');
});

test('catalog discovers all providers, excludes invalid/non-text/expired rows, and requires usable data', () => {
  const { c } = runtime();
  const result = c.normalizeCatalog([row('google/new'), row('qwen/new'), row('bad/negative', { prompt: '-1' }),
    { ...row('image/only'), architecture: { output_modalities: ['image'] } }, { ...row('old/model'), expiration_date: '2000-01-01' }]);
  assert.equal(result.entries.length, 2); assert.equal(result.skipped, 3);
  assert.throws(() => c.normalizeCatalog([]));
  assert.throws(() => c.normalizeCatalog([row(), row()]));
});

test('live models use exact batch variants and published cache terms without old assumptions', () => {
  const { c } = runtime();
  const r = row('anthropic/new', { input_cache_read: '0', input_cache_write: '0.0000025', input_cache_write_1h: '0.000004' });
  const batch = row('anthropic/new:batch', { prompt: '0.000001', completion: '0.000005', input_cache_read: '0', input_cache_write: '0.00000125' });
  const m = c.catalogModel(r, [r, batch], '2026-10-15T12:00:00.000Z');
  assert.equal(m.tokenPricing.cacheReadPerMTok, 0); assert.equal(m.tokenPricing.cacheWrite1hPerMTok, 4);
  assert.equal(m.pricingRules.cacheMode, 'read_write'); assert.equal(m.pricingRules.batchPricing.inputPerMTok, 1);
  const other = c.catalogModel(row('new/provider'), [row('new/provider')], 'now');
  assert.equal(other.pricingRules.batchMode, 'none'); assert.equal(other.tokenPricing.cacheReadPerMTok, null);
});

test('unverified provider storage/write semantics never become token-write discounts', () => {
  const { c } = runtime();
  const r = row('google/new', { input_cache_read: '0.0000001', input_cache_write: '0.0000001875', overrides: [{ min_prompt_tokens: 1000, input_cache_write: '0.0000002' }] });
  const m = c.catalogModel(r, [r], 'now');
  assert.equal(m.pricingRules.cacheMode, 'read_only'); assert.equal(m.tokenPricing.cacheWrite5mPerMTok, null);
  assert.equal(m.pricingRules.priceOverrides[0].prices.cacheWrite5mPerMTok, undefined);
});

test('refresh preserves manual models and missing-model rates, clears stale ancillary rates for matches', () => {
  const { c } = runtime();
  const old = c.catalogModel(row('anthropic/old', { input_cache_read: '0.000001' }), [], 'old');
  old.tokenPricing.cacheWrite1hPerMTok = 99; old.tokenPricing.batchInputPerMTok = 55;
  const manual = { ...copy(old), id: 'manual', manual: true };
  const missing = { ...copy(old), id: 'missing', orSlug: 'missing/model' };
  const out = c.mergeCatalog([old, manual, missing], [row('anthropic/old')], 'new');
  assert.equal(out.models[0].tokenPricing.cacheReadPerMTok, null);
  assert.equal(out.models[0].tokenPricing.cacheWrite1hPerMTok, null);
  assert.equal(out.models[0].tokenPricing.batchInputPerMTok, null);
  assert.equal(out.models[1], manual); assert.equal(out.models[2].tokenPricing.cacheWrite1hPerMTok, 99);
  assert.equal(out.models[2].refreshStatus, 'not_found'); assert.equal(out.models[2].refreshedAt, 'old');
});

test('conditional context thresholds are strict and later fields inherit earlier matches', () => {
  const { c } = runtime();
  const r = row('openai/new', { overrides: [
    { min_prompt_tokens: 1000, prompt: '0.000004', completion: '0.000015' },
    { min_prompt_tokens: 2000, completion: '0.00002' }
  ] });
  const m = c.catalogModel(r, [r], 'now');
  const at = c.priceStream(1000, 1000, 100, testTier, m, true);
  const above = c.priceStream(1000, 1001, 100, testTier, m, true);
  const later = c.priceStream(1000, 2001, 100, testTier, m, true);
  assert.equal(at.total, 3); assert.equal(above.total, 5.504); assert.equal(later.total, 10.004);
});

test('unsupported time or future pricing conditions are skipped with a warning', () => {
  const { c } = runtime();
  const r = row('test/time', { overrides: [{ utc_start: 0, utc_end: 1200, prompt: '0.0001' }, { min_prompt_tokens: 10, future_condition: true, prompt: '0.0001' }] });
  const m = c.catalogModel(r, [r], 'now');
  const result = c.priceStream(1000, 1000, 100, testTier, m, true);
  assert.equal(result.total, 3); assert.match(result.warnings.join(' '), /unsupported/);
});

test('batch uses its own cache rates, zero rates are valid, and escalation is not batch eligible', () => {
  const { c } = runtime();
  const r = row('anthropic/new', { input_cache_read: '0.0000002' });
  const b = row('anthropic/new:batch', { prompt: '0.000001', completion: '0.000005', input_cache_read: '0.0000001' });
  const m = c.catalogModel(r, [r, b], 'now');
  const tier = { ...testTier, batch: 100, cache: 50 };
  assert.equal(c.priceStream(1000, 1000, 100, tier, m, true).total, 1.05);
  assert.equal(c.priceStream(1000, 1000, 100, tier, m, false).total, 2.1);
  const free = row('test/free', { prompt: '0', completion: '0' });
  const fm = c.catalogModel(free, [free, row('test/free:batch', { prompt: '0', completion: '0' })], 'now');
  assert.equal(c.priceStream(1000, 1000, 100, tier, fm, true).total, 0);
});

test('missing cache write rates bill ordinary input rather than silently free tokens', () => {
  const { c } = runtime();
  const m = c.catalogModel(row('anthropic/write', { input_cache_write: '0.0000025' }), [], 'now');
  const result = c.priceStream(1000, 1000, 0, { ...testTier, cacheWrite: 100, cacheDur: '1h' }, m, false);
  assert.equal(result.total, 2); assert.match(result.warnings.join(' '), /ordinary input rate/);
});

test('cascade bills failed attempts and applies overhead to escalated input only', () => {
  const { c } = runtime();
  const m = c.catalogModel(row(), [], 'now');
  const tiers = [{ ...testTier, modelId: m.id, share: 100, esc: 50 }, { ...testTier, modelId: m.id, share: 0 }];
  const result = c.computeScenario({ users: 1000, rpd: 1, days: 1, escOverhead: 30 }, tiers, { [m.id]: m }, m.id);
  assert.equal(result.perTier[1].r.escIn, 500); assert.equal(result.mix.reqs, 1000);
  assert.equal(result.mix.total, 4.8); assert.equal(result.baseline, 3); assert.equal(result.escPremium, 1.8);
});

test('context and completion limits warn for escalated profiles as well as native traffic', () => {
  const { c } = runtime();
  const r = { ...row(), context_length: 1200, top_provider: { max_completion_tokens: 90 } };
  const m = c.catalogModel(r, [r], 'now');
  const result = c.priceStream(1000, 1300, 100, testTier, m, false);
  assert.match(result.warnings.join(' '), /context window/);
  assert.match(result.warnings.join(' '), /maximum completion/);
});

test('scenario validation round-trips current scenarios and rejects corrupt nested data atomically', () => {
  const { c, run } = runtime();
  const original = copy(run('state'));
  assert.equal(c.validateScenario(original).models.length, 14);
  const cases = [
    s => s.models[0].tokenPricing.inputPerMTok = -1,
    s => s.models[0].tokenPricing.outputPerMTok = Infinity,
    s => s.models[0].tokenPricing = null,
    s => s.models[1].id = s.models[0].id,
    s => s.models[0].pricingRules.cacheMode = 'anything',
    s => s.tiers[0].modelId = 'unknown',
    s => s.tiers[0].share = -5,
    s => s.g.days = 100,
    s => s.pins = [{ name: 'broken', g: s.g, tiers: [{ ...s.tiers[0], modelId: 'unknown' }] }]
  ];
  for (const corrupt of cases) {
    const input = copy(original); corrupt(input);
    assert.throws(() => c.validateScenario(input));
    assert.equal(run('state.models.length'), 14);
  }
});

test('legacy flat model records remain loadable', () => {
  const { c, run } = runtime();
  const s = copy(run('state'));
  s.models[0] = { id: s.models[0].id, provider: 'Anthropic', name: 'Legacy', in: 10, out: 50, cacheIn: 1, ctxK: 1000 };
  assert.equal(c.validateScenario(s).models[0].tokenPricing.inputPerMTok, 10);
});

test('model option IDs and names are escaped before HTML rendering', () => {
  const { run } = runtime();
  run('state.models[0].id=\'x" onmouseover="alert(1)\';state.models[0].name="<img src=x onerror=alert(1)>"');
  const options = run('modelOptions(state.models[0].id)');
  assert.match(options, /&quot; onmouseover=&quot;/); assert.match(options, /&lt;img/);
  assert.doesNotMatch(options, /<img/);
});

test('model menus expose unadded catalog models from every provider without expanding the active rate card', () => {
  const { run } = runtime();
  run('catalogEntries='+JSON.stringify([row('openai/newest'),row('google/newest'),row('openai/newest:batch')])+';catalogFetchedAt=new Date().toISOString()');
  const options = run('modelOptions(state.baselineId)');
  assert.match(options, /value="openai\/newest"/);
  assert.match(options, /value="google\/newest"/);
  assert.doesNotMatch(options, /value="openai\/newest:batch"/);
  assert.equal(run('state.models.length'), 14);
  assert.equal(run('state.baselineId'), 'claude-fable-5');
});

test('model menus retain legacy IDs and manual prices and put newer models first within a provider', () => {
  const { run } = runtime();
  run('catalogEntries='+JSON.stringify([{...row('openai/gpt-5.5'),created:100},{...row('openai/newest'),created:200}])+';catalogFetchedAt=new Date().toISOString();markManual(state.models.find(m=>m.id==="gpt-5-5"));state.models.find(m=>m.id==="gpt-5-5").tokenPricing.inputPerMTok=123');
  const options = run('modelOptions("gpt-5-5")');
  assert.equal((options.match(/value="gpt-5-5"/g)||[]).length, 1);
  assert.doesNotMatch(options, /value="openai\/gpt-5.5"/);
  assert.ok(options.indexOf('value="openai/newest"')<options.indexOf('value="gpt-5-5"'));
  assert.match(options, /value="gpt-5-5" selected>GPT-5.5 — \$123/);
});

test('choosing an unadded baseline activates its rates and survives scenario save and restore', () => {
  const { c, run, storage } = runtime();
  run('renderRateCard=renderBaseline=renderTiers=renderCatalog=()=>{};recalc=persistScenario;catalogEntries='+JSON.stringify([row('openai/newest')])+';catalogFetchedAt=new Date().toISOString()');
  c.selectBaselineModel('openai/newest');
  assert.equal(run('state.baselineId'), 'openai/newest');
  assert.equal(run('state.models.length'), 15);
  assert.equal(run('byId()[state.baselineId].tokenPricing.inputPerMTok'), 2);
  const saved = JSON.parse(storage.get('pawn.scenario.v2'));
  assert.equal(c.validateScenario(saved).baselineId, 'openai/newest');
  assert.ok(Number.isFinite(run('computeScenario(state.g,state.tiers,byId(),state.baselineId).baseline')));
  c.restoreLocal();
  assert.equal(run('state.baselineId'), 'openai/newest');
});

test('choosing an unadded tier model activates its cache and batch rates once and keeps manual edits', () => {
  const { c, run } = runtime();
  const entries=[row('anthropic/newest',{input_cache_read:'0.0000002',input_cache_write:'0.0000025'}),row('anthropic/newest:batch',{prompt:'0.000001',completion:'0.000005'})];
  run('renderRateCard=renderBaseline=renderTiers=renderCatalog=()=>{};recalc=persistScenario;catalogEntries='+JSON.stringify(entries)+';catalogFetchedAt=new Date().toISOString()');
  c.selectTierModel(0,'anthropic/newest');
  assert.equal(run('state.tiers[0].modelId'), 'anthropic/newest');
  assert.equal(run('byId()[state.tiers[0].modelId].pricingRules.cacheMode'), 'read_write');
  assert.equal(run('byId()[state.tiers[0].modelId].tokenPricing.batchInputPerMTok'), 1);
  run('markManual(state.models.at(-1));state.models.at(-1).tokenPricing.inputPerMTok=123');
  c.selectTierModel(1,'anthropic/newest');
  assert.equal(run('state.models.length'), 15);
  assert.equal(run('state.models.at(-1).tokenPricing.inputPerMTok'), 123);
  assert.ok(Number.isFinite(run('computeScenario(state.g,state.tiers,byId(),state.baselineId).mix.total')));
});

test('a catalog model and an unrelated custom model with the same ID remain separately selectable', () => {
  const { c, run } = runtime();
  run('state.models[0].id="openai/newest";state.models[0].orSlug=null;catalogEntries='+JSON.stringify([row('openai/newest')])+';catalogFetchedAt=new Date().toISOString()');
  const options = run('selectableModels().filter(m=>m.id.includes("openai/newest"))');
  assert.equal(options.length, 2);
  assert.notEqual(options[0].id, options[1].id);
  const added=c.activateModel(options[1].id);
  assert.equal(added.orSlug, 'openai/newest');
  assert.equal(run('state.models[0].orSlug'), null);
  assert.equal(run('state.models.length'), 15);
});

test('a model missing from the catalog cannot replace the selected baseline or tier', () => {
  const { c, run } = runtime();
  run('renderBaseline=renderTiers=()=>{}');
  const before=JSON.stringify(copy(run('state')));
  c.selectBaselineModel('unknown/model');c.selectTierModel(0,'unknown/model');
  assert.equal(JSON.stringify(copy(run('state'))), before);
});

test('paginated fetch is complete, bypasses browser cache, and rejects foreign pagination', async () => {
  const calls = [];
  const { c } = runtime({ fetch: async (url, opts) => {
    calls.push({ url, opts });
    return { ok: true, json: async () => calls.length === 1
      ? { data: [row('one/model')], total_count: 2, links: { next: '?offset=1' } }
      : { data: [row('two/model')], total_count: 2, links: { next: null } } };
  } });
  const result = await c.fetchCatalog(new AbortController().signal);
  assert.equal(result.entries.length, 2); assert.equal(calls[0].opts.cache, 'no-store'); assert.equal(calls[0].opts.credentials, 'omit');
  const foreign = runtime({ fetch: async () => ({ ok: true, json: async () => ({ data: [row()], links: { next: 'https://other.example/catalog' } }) }) });
  await assert.rejects(foreign.c.fetchCatalog(new AbortController().signal), /pagination/);
});

test('incomplete or malformed responses cannot masquerade as a successful refresh', async () => {
  for (const payload of [{ data: [] }, {}, { data: [row()], total_count: 2 }]) {
    const { c } = runtime({ fetch: async () => ({ ok: true, json: async () => payload }) });
    await assert.rejects(c.fetchCatalog(new AbortController().signal));
  }
});

test('refresh is atomic on failure and always restores button state', async () => {
  const { c, run, element } = runtime({ fetch: async () => ({ ok: false, status: 503 }) });
  const before = JSON.stringify(copy(run('state')));
  await c.refreshRates();
  assert.equal(JSON.stringify(copy(run('state'))), before);
  assert.equal(element('#btnRefresh').disabled, false); assert.match(element('#status').innerHTML, /503/);
});

test('timeout aborts the request, retains rates, and restores the button', async () => {
  let timeout;
  const { c, run, element } = runtime({
    setTimeout: callback => { timeout = callback; return 1; }, clearTimeout: () => {},
    fetch: (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('Aborted'))))
  });
  const before = JSON.stringify(copy(run('state'))), request = c.refreshRates();
  timeout(); await request;
  assert.equal(JSON.stringify(copy(run('state'))), before);
  assert.match(element('#status').innerHTML, /20-second timeout/);
  assert.equal(element('#btnRefresh').disabled, false);
});

test('cached catalog cannot roll a newer saved source snapshot backward on startup', () => {
  const { c, run, storage } = runtime();
  const newer = copy(run('state'));
  newer.models[0].refreshedAt = '2026-10-15T20:00:00.000Z';
  newer.models[0].tokenPricing.inputPerMTok = 123;
  storage.set('pawn.scenario.v2', JSON.stringify(newer));
  storage.set('pawn.catalog.v1', JSON.stringify({ version: 1, fetchedAt: '2026-10-15T19:00:00.000Z', entries: [row('anthropic/claude-fable-5')] }));
  c.restoreLocal();
  assert.equal(run('state.models[0].tokenPricing.inputPerMTok'), 123);
});

test('overlapping requests are deduplicated, cancelled results cannot overwrite newer state', async () => {
  let finish, calls = 0;
  const { c, run, element } = runtime({ fetch: () => { calls++; return new Promise(resolve => { finish = resolve; }); } });
  const request = c.refreshRates(); await c.refreshRates(); assert.equal(calls, 1);
  c.cancelRefresh(); run('state.g.users=999');
  finish({ ok: true, json: async () => ({ data: [row()] }) }); await request;
  assert.equal(run('state.g.users'), 999); assert.equal(run('catalogFetchedAt'), null); assert.equal(element('#btnRefresh').disabled, false);
});

test('successful refresh preserves edits made while loading and persists the validated snapshot', async () => {
  let finish;
  const { c, run, storage } = runtime({ fetch: () => new Promise(resolve => { finish = resolve; }) });
  run('renderRateCard=renderBaseline=renderTiers=recalc=renderCatalog=()=>{}');
  const request = c.refreshRates(); run('markManual(state.models[0]);state.models[0].tokenPricing.inputPerMTok=123');
  finish({ ok: true, json: async () => ({ data: [row('anthropic/claude-fable-5')] }) }); await request;
  assert.equal(run('state.models[0].tokenPricing.inputPerMTok'), 123);
  assert.equal(JSON.parse(storage.get('pawn.catalog.v1')).entries.length, 1);
  assert.ok(run('catalogFetchedAt'));
});

test('startup tolerates storage failures, and automatic refresh respects freshness and visibility', () => {
  const { c, run } = runtime({ localStorage: { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); } } });
  c.restoreLocal(); c.persistScenario(); assert.equal(run('storageUnavailable'), true);
  run('var attempts=0;refreshRates=()=>{attempts++};catalogFetchedAt=new Date().toISOString()');
  c.autoRefresh(); assert.equal(run('attempts'), 0);
  run('catalogFetchedAt=null;document.visibilityState="hidden"'); c.autoRefresh(); assert.equal(run('attempts'), 0);
  run('document.visibilityState="visible"'); c.autoRefresh(); assert.equal(run('attempts'), 1);
});

test('reset keeps discovered models and pin references intact', () => {
  const { c, run } = runtime();
  run('renderRateCard=renderBaseline=renderTiers=recalc=()=>{};catalogEntries=[{id:"new/model",name:"New",architecture:{output_modalities:["text"]},pricing:{prompt:"0.000001",completion:"0.000002"}}];catalogFetchedAt=new Date().toISOString();state.models.push(catalogModel(catalogEntries[0],catalogEntries,catalogFetchedAt));state.tiers[0].modelId="new/model";state.pins=[{name:"pin",g:cpy(state.g),tiers:cpy(state.tiers)}]');
  c.resetAllRates(); assert.equal(run('state.models.some(m=>m.id==="new/model")'), true);
  assert.equal(run('validateScenario(state).pins[0].tiers[0].modelId'), 'new/model');
});
