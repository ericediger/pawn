import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const ctx = vm.createContext({ console, URL, AbortController, setTimeout, clearTimeout, fetch,
  window: { addEventListener() {} }, document: { addEventListener() {} } });
for (const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) vm.runInContext(m[1], ctx);
let normalized, raw;
if (process.argv[2]) {
  raw = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  assert.ok(Array.isArray(raw.data));
  assert.ok(!raw.total_count || raw.data.length >= raw.total_count, 'Snapshot must contain every page');
  normalized = ctx.normalizeCatalog(raw.data);
} else {
  normalized = await ctx.fetchCatalog(AbortSignal.timeout(20000));
}
const timestamp = new Date().toISOString(), entries = normalized.entries;
const bundled = vm.runInContext('BUNDLED_MODELS', ctx);
const merged = ctx.mergeCatalog(bundled, entries, timestamp);
let streams = 0;
for (const row of entries) {
  const model = ctx.catalogModel(row, entries, timestamp);
  ctx.validateScenario({ g: { users: 100, rpd: 1, days: 1 }, baselineId: model.id, models: [model], tiers: [
    { name: 'Check', modelId: model.id, share: 100, tin: 1000, tout: 100 }
  ] });
  for (const tin of [1000, 272000, 272001, 1000000]) {
    for (const batch of [0, 100]) {
      const result = ctx.priceStream(1000, tin, 100, { reason: 1.5, cache: 70, cacheWrite: 5, cacheDur: '5m', batch }, model, true);
      assert.ok(Number.isFinite(result.total) && result.total >= 0, `Invalid total: ${row.id}`);
      assert.ok(Math.abs(result.total - result.inputCost - result.outputCost) < 1e-6, `Unbalanced total: ${row.id}`);
      streams++;
    }
  }
}
const summary = { evaluatedAt: timestamp, source: 'https://openrouter.ai/api/v1/models',
  sourceMode: process.argv[2] ? 'previously downloaded public snapshot' : 'live request',
  rawEntries: raw?.data.length ?? entries.length + normalized.skipped,
  usableEntries: entries.length, selectableModels: entries.filter(x => !x.id.endsWith(':batch')).length,
  batchVariants: entries.filter(x => x.id.endsWith(':batch')).length, excludedEntries: normalized.skipped,
  bundledMatches: merged.counts.updated, missingBundledIds: merged.models.filter(m => m.refreshStatus === 'not_found').map(m => m.orSlug),
  evaluatedStreams: streams,
  exampleCurrentModels: entries.filter(x => ['openai/gpt-6.1-sol', 'openai/gpt-6-astra', 'anthropic/claude-fable-5.1', 'google/gemini-4-argon'].includes(x.id)).map(x => ({ id: x.id, pricing: x.pricing })) };
console.log(JSON.stringify(summary, null, 2));
if (process.argv[3]) writeFileSync(process.argv[3], JSON.stringify(summary, null, 2) + '\n');
