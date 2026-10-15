import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)];
if (scripts.length !== 3) throw new Error('Expected engine, catalog, and app scripts');
for (const [i, script] of scripts.entries()) new vm.Script(script[1], { filename: `index.html:script-${i + 1}` });
const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
const ids = [...markup.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
if (new Set(ids).size !== ids.length) throw new Error('Duplicate HTML IDs');
console.log(`PASS: syntax checked ${scripts.length} inline scripts; ${ids.length} unique HTML IDs. No external dependencies, lint, or TypeScript configuration.`);
