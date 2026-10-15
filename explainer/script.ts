import type { VideoSpec } from '@explainer/src/spec';

/**
 * Storyboard for the PAWN explainer: the LLM Cost Forecaster, a single HTML file (index.html in this repo) that prices tiered
 * LLM routing under each model's own cache and batch rules against the public OpenRouter catalog.
 * Footage comes from demo.html, generated from the app by `node explainer/make-demo.mjs`: the app byte for byte,
 * with the catalog served from the snapshot the app's own review captured (review/catalog-2026-10-15.json), browser storage
 * replaced by an in-memory stand-in, and the hash picking which section the scene opens on (explainer/demo/demo-mode.js).
 * At the recorder's 2400x1350 viewport the page is drawn at 1.5x so camera zooms stay sharp.
 * Edit the narration here and re-run `VIDEO=pawn npm run build`; render and poster copy the MP4 and poster into media/.
 * The outro names the repository and demo page from repoUrl and demoUrl below.
 */
export const spec: VideoSpec = {
  id: 'pawn',
  name: 'PAWN',
  fps: 30,
  width: 1920,
  height: 1080,
  repoUrl: 'https://github.com/ericediger/pawn',
  demoUrl: 'https://ericediger.github.io/pawn/demo.html',
  record: {
    appDir: '.',
    page: 'demo.html',
    viewport: { width: 2400, height: 1350 },
    dpr: 1,
    readySelector: '#stageReady',
  },
  voice: { say: 'Samantha', rate: 172, elevenlabs: 'G3qIj1Lb0GkRqMWsPD2C' },
  // The app's own brand tokens: navy header band, OpenRouter-blue accent, the green of the cost bar and the magenta of
  // warnings and manual overrides, on a dark navy stage so the light app footage pops.
  style: { frame: 'mac', captions: 'pill', lowerThird: 'chapter-card', background: 'glow-grid', transition: 'fade' },
  theme: {
    bg0: '#02141d',
    bg1: '#04212e',
    panel: '#0a2e40',
    panel2: '#0e3a4f',
    line: '#1a4a60',
    ink: '#eef5f8',
    muted: '#8fb4c5',
    accent: '#1ea7e8',
    accentDeep: '#008ac9',
    blue: '#66c3e6',
    warm: '#75c044',
    red: '#e03288',
    violet: '#9fc2d3',
    glowA: '#063a52',
    glowB: '#0d3320',
    grid: '#0c3447',
    font: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    display: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    captionBg: 'rgba(2,20,29,.86)',
    captionInk: '#ffffff',
  },
  poster: { atSec: 30.5 },
  music: { file: 'music/feature-in-motion.mp3', volume: 0.22, duckTo: 0.07, fadeOutSec: 3 },
  scenes: [
    {
      id: 'cold-open',
      kind: 'animated',
      component: 'ColdOpen',
      title: 'The problem',
      narration:
        'Every LLM bill starts as a guess. Prices change, new models land every month, and the spreadsheet you priced in June is already stale. You need a forecast that keeps up.',
      spoken:
        'Every L L M bill starts as a guess. Prices change, new models land every month, and the spreadsheet you priced in June is already stale. You need a forecast that keeps up.',
      leadInSec: 0.8,
      tailSec: 1.0,
    },
    {
      id: 'how-it-works',
      kind: 'animated',
      component: 'HowItWorks',
      title: 'How it works',
      narration:
        "PAWN is one HTML file. Set your traffic, split it into routing tiers, and give each tier a model. Every tier is priced under that model's own cache and batch rules, from a live catalog of every priced model on OpenRouter. Nothing leaves your browser.",
      spoken:
        "Pawn is one H T M L file. Set your traffic, split it into routing tiers, and give each tier a model. Every tier is priced under that model's own cache and batch rules, from a live catalog of every priced model on OpenRouter. Nothing leaves your browser.",
      tailSec: 1.1,
    },
    {
      id: 'drivers',
      kind: 'footage',
      route: 'drivers',
      title: 'Start with the traffic',
      subtitle: 'Global drivers',
      narration:
        "Start with the traffic: users, requests per day, working days. That's the monthly volume. The bar at the bottom prices it twice: your routing mix, and everything sent to the baseline model. The gap is what routing saves.",
      note: 'Demo page: the bundled starting scenario; nothing is stored.',
    },
    {
      id: 'tiers',
      kind: 'footage',
      route: 'tiers',
      title: 'Route by difficulty',
      subtitle: 'Routing tiers',
      narration:
        'Tiers are the routing plan. Pawns take the routine work on a cheap model. Knights, Rooks and the Queen take the harder requests at a higher price. Nudge a share, and every figure updates. Failed attempts escalate up the chain, and the Queen is where it ends.',
      note: 'Demo page: the bundled starting scenario; nothing is stored.',
    },
    {
      id: 'discover',
      kind: 'footage',
      route: 'discover',
      title: 'Find any model',
      subtitle: 'Discover models',
      narration:
        'Discover models lists every model on OpenRouter with published text prices, newest first. Search by name, filter by provider, sort by price. The catalog refreshes when you open the page and hourly after that, with no API key.',
      spoken:
        'Discover models lists every model on OpenRouter with published text prices, newest first. Search by name, filter by provider, sort by price. The catalog refreshes when you open the page and hourly after that, with no A P I key.',
      note: 'Demo page: the catalog is a snapshot of OpenRouter’s public model list captured on October 15, 2026.',
    },
    {
      id: 'select',
      kind: 'footage',
      route: 'select',
      title: 'Pick it in any tier',
      subtitle: 'Model menus',
      narration:
        'The whole catalog is already in every model menu, grouped by provider, newest first. Pick a model that shipped last month, and the tier reprices on the spot. Its published rates join the rate card: input, output, cache read, cache write, batch.',
      note: 'Demo page: the catalog is a snapshot of OpenRouter’s public model list captured on October 15, 2026.',
    },
    {
      id: 'rates',
      kind: 'footage',
      route: 'rates',
      title: 'Your rates, your overrides',
      subtitle: 'Rate card',
      narration:
        "Negotiated a discount? Edit the rate. It's marked manual and survives every refresh until you reset it. Everything else stays live, and a price the provider hasn't published stays unknown instead of being counted as free.",
      note: 'Demo page: the refresh re-reads the October 15, 2026 catalog snapshot.',
    },
    {
      id: 'scenarios',
      kind: 'footage',
      route: 'scenarios',
      title: 'Stress-test the plan',
      subtitle: 'Scenario comparison',
      narration:
        'Pin the current plan, then stress it: double the users, lose the cache, or push the levers. Every pin is repriced against the live rate card. Below it, the cost drivers are ranked by what actually moves the bill.',
      note: 'Demo page: the bundled starting scenario; nothing is stored.',
      tailSec: 1.1,
    },
    {
      id: 'outro',
      kind: 'animated',
      component: 'Outro',
      title: '',
      narration:
        'One HTML file. No server, no account, no API key. Your scenarios stay in your browser, and the rate card stays current. PAWN: the LLM Cost Forecaster.',
      spoken:
        'One H T M L file. No server, no account, no A P I key. Your scenarios stay in your browser, and the rate card stays current. Pawn: the L L M Cost Forecaster.',
      leadInSec: 0.8,
      tailSec: 2.6,
    },
  ],
};
