/**
 * Regenerates demo.html from index.html at the repo root: the app byte for byte, plus a "— demo" title, a #stage wrapper
 * around the page, and demo/demo-mode.js appended before </body> (snapshot catalog, in-memory storage, scene-by-hash).
 * Run after the app changes:  node explainer/make-demo.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.resolve(here, '..');
const src = fs.readFileSync(path.join(app, 'index.html'), 'utf8');
const block = fs.readFileSync(path.join(here, 'demo', 'demo-mode.js'), 'utf8');

const need = (s, what) => { if (!src.includes(s)) throw new Error(`index.html no longer contains ${what}`); };
need('<title>LLM Cost Forecaster v1.0 — Live Model Catalog</title>', 'the title');
need('<body>\n', 'the body tag');
need('</body>', 'the closing body tag');

const out = src
  .replace('<title>LLM Cost Forecaster v1.0 — Live Model Catalog</title>', '<title>LLM Cost Forecaster v1.0 — demo</title>')
  .replace('<body>\n', '<body>\n<div id="stage">\n')
  .replace('</body>', `</div>\n<script>\n${block}</script>\n</body>`);

fs.writeFileSync(path.join(app, 'demo.html'), out);
console.log(`wrote ${path.join(app, 'demo.html')} (${out.length} bytes)`);
