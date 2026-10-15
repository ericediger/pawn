/**
 * Recorder choreography for the PAWN explainer: one action per footage scene, keyed by scene id.
 * The page is the repo's demo.html#<scene> at 2400x1350, drawn at 1.5x (demo-mode.js), so every rectangle here is in those
 * viewport pixels and the app's 1220 px layout fills ~1830 of them. Times are seconds since the page was ready; the
 * narration starts at leadInSec (0.6 s), so T(narr, f) is the moment a fraction f of the line has been spoken.
 * The app re-renders whole sections on every change (tier cards, rate card rows), so selectors are structural
 * (nth-child, data-* attributes) and spotlights are re-measured after each change.
 */
import type { SceneAction, SceneRecorder } from '@explainer/scripts/lib/recorder';

const T = (narr: number, f: number): number => 0.6 + f * narr;

const TIER = (n: number) => `#tiers .tier:nth-child(${n})`;
const ROW = (n: number) => `#rateTable tbody tr:nth-child(${n})`;

/** Smooth-scroll to an element and wait until the page has actually stopped moving: a long scroll outlives the recorder's
 *  fixed 650 ms wait, and a spotlight or camera cue measured mid-scroll lands on the wrong rows. */
async function go(r: SceneRecorder, sel: string, block: ScrollLogicalPosition = 'center'): Promise<void> {
  await r.scrollTo(sel, block);
  await r.eval(
    () =>
      new Promise<void>((done) => {
        let last = window.scrollY;
        let still = 0;
        const t = setInterval(() => {
          if (window.scrollY === last) {
            if (++still >= 4) { clearInterval(t); done(); }
          } else { still = 0; last = window.scrollY; }
        }, 50);
      }),
  );
  await r.wait(0.15);
}

/** Select all in a focused field and type a replacement at a human pace (the app recalculates on every keystroke). */
async function retype(r: SceneRecorder, sel: string, text: string): Promise<void> {
  await r.click(sel);
  await r.press('Meta+A');
  await r.p.keyboard.type(text, { delay: 110 });
}

export const actions: Record<string, SceneAction> = {
  // Page top: the drivers card, users typed up to 5,000, the request total, then the cost bar at the bottom face by face.
  drivers: async (r, narr) => {
    await r.until(0.3);
    await r.zoomUnion(['#usersR', '#reqTotal'], 70);
    await r.moveTo('#users', { at: [0.5, 0.5] });
    await r.until(T(narr, 0.08));
    await retype(r, '#users', '5000');
    await r.until(T(narr, 0.2));
    await r.moveTo('#rpd', { at: [0.5, 0.5], ms: 500 });
    await r.until(T(narr, 0.26));
    await r.moveTo('#days', { at: [0.5, 0.5], ms: 500 });
    await r.until(T(narr, 0.32));
    await r.spot('#reqTotal', 6);
    await r.moveTo('#reqTotal', { at: [0.18, 0.5] });
    await r.until(T(narr, 0.46));
    await r.unspot();
    await r.zoom('#clock .inner', 60);
    await r.spot('#clock .face:first-child', 8);
    await r.moveTo('#totalMix', { at: [0.4, 0.5] });
    await r.until(T(narr, 0.68));
    await r.spot('#clock .face.baseline', 8);
    await r.moveTo('#totalBase', { at: [0.4, 0.5], ms: 600 });
    await r.until(T(narr, 0.86));
    await r.spot('#clock .delta', 8);
    await r.moveTo('#deltaLine', { at: [0.4, 0.5], ms: 600 });
    await r.until(T(narr, 1.0) + 0.3);
    await r.unspot();
    r.zoomReset();
  },

  // The first row of tier cards, one spotlight per piece, a share nudged and normalized, then the Queen at the end of the chain.
  tiers: async (r, narr) => {
    await r.until(0.3);
    await r.zoomUnion([TIER(1), TIER(3)], 50);
    await r.until(T(narr, 0.1));
    await r.spot(TIER(1), 6);
    await r.moveTo(`${TIER(1)} .tname`, { at: [0.3, 0.5] });
    await r.until(T(narr, 0.3));
    await r.spot(TIER(2), 6);
    await r.moveTo(`${TIER(2)} .tname`, { at: [0.3, 0.5], ms: 600 });
    await r.until(T(narr, 0.37));
    await r.spot(TIER(3), 6);
    await r.moveTo(`${TIER(3)} .tname`, { at: [0.3, 0.5], ms: 600 });
    await r.until(T(narr, 0.5));
    await r.unspot();
    await retype(r, `${TIER(1)} input[data-k="share"]`, '70');
    await r.wait(0.3);
    await r.spot('#shareBadge', 8);
    await r.moveTo('#shareBadge', { at: [0.5, 0.5] });
    await r.until(T(narr, 0.64));
    await r.unspot();
    await go(r, TIER(4), 'start');
    await r.zoomUnion([TIER(4), '.add-row'], 40);
    await r.click('#btnNormalize');
    await r.wait(0.3);
    await r.spot('#material', 8);
    await r.moveTo('#material', { at: [0.3, 0.5] });
    await r.until(T(narr, 0.76));
    await r.spot(TIER(4), 6);
    await r.moveTo(`${TIER(4)} .tname`, { at: [0.3, 0.5] });
    await r.until(T(narr, 0.9));
    await r.spot(`${TIER(4)} .tgrid .field:last-child`, 6);
    await r.moveTo(`${TIER(4)} .tgrid .field:last-child .cache-note`, { at: [0.5, 0.5], ms: 600 });
    await r.until(T(narr, 1.0) + 0.3);
    await r.unspot();
    r.zoomReset();
  },

  // The catalog card: newest rows, a search, a provider filter, a price sort, then the retrieval line.
  discover: async (r, narr) => {
    await r.until(0.3);
    await r.zoomUnion(['#catalogTitle', '#catalogMore'], 40);
    await r.until(T(narr, 0.12));
    await r.spot('#catalogResults tbody tr:nth-child(1)', 4);
    await r.moveTo('#catalogResults tbody tr:nth-child(1) td:nth-child(4)', { at: [0.3, 0.5] });
    await r.until(T(narr, 0.22));
    await r.spot('#catalogResults tbody tr:nth-child(3)', 4);
    await r.moveTo('#catalogResults tbody tr:nth-child(3) td:nth-child(4)', { at: [0.3, 0.5], ms: 500 });
    await r.until(T(narr, 0.3));
    await r.unspot();
    await r.type('#catalogSearch', 'gemini', { cps: 14 });
    await r.until(T(narr, 0.45));
    await r.click('#catalogSearch');
    await r.press('Meta+A');
    await r.press('Backspace');
    await r.moveTo('#catalogProvider');
    await r.p.selectOption('#catalogProvider', 'openai');
    await r.spot('#catalogProvider', 6);
    await r.until(T(narr, 0.56));
    await r.unspot();
    await r.moveTo('#catalogSort');
    await r.p.selectOption('#catalogSort', 'input');
    await r.spot('#catalogSort', 6);
    await r.until(T(narr, 0.66));
    await r.unspot();
    await r.spot('#catalogInfo', 8);
    await r.moveTo('#catalogInfo', { at: [0.3, 0.5] });
    await r.until(T(narr, 1.0) + 0.3);
    await r.unspot();
    r.zoomReset();
  },

  // Tier 1's model menu: pick a catalog model, the tier reprices, and the new row at the foot of the rate card.
  select: async (r, narr) => {
    const SEL = `${TIER(1)} select[data-k="modelId"]`;
    await r.until(0.3);
    await r.zoomUnion([TIER(1), TIER(2)], 50);
    await r.until(T(narr, 0.1));
    await r.spot(SEL, 8);
    await r.moveTo(SEL, { at: [0.5, 0.5] });
    await r.until(T(narr, 0.34));
    await r.click(SEL);
    await r.wait(0.35);
    await r.p.selectOption(SEL, 'anthropic/claude-haiku-5.5');
    await r.wait(0.35);
    await r.spot(`${TIER(1)} .tier-out`, 8);
    await r.moveTo('#tcost0', { at: [0.5, 0.5] });
    await r.until(T(narr, 0.56));
    await r.unspot();
    r.zoomReset();
    await go(r, '#rateTable tbody tr:last-child');
    await r.zoomUnion(['#rateTable tbody tr:nth-last-child(3)', '#rateTable tbody tr:last-child'], 30);
    await r.spot('#rateTable tbody tr:last-child', 6);
    await r.moveTo('#rateTable tbody tr:last-child td:nth-child(3)', { at: [0.5, 0.5] });
    await r.until(T(narr, 0.76));
    await r.moveTo('#rateTable tbody tr:last-child td:nth-child(9)', { at: [0.5, 0.5], ms: 1500 });
    await r.until(T(narr, 1.0) + 0.3);
    await r.unspot();
    r.zoomReset();
  },

  // Rate card: edit one input price (Manual), refresh from the top band (preserved), then a row with unpublished prices.
  rates: async (r, narr) => {
    const IN = 'input[data-mi="3"][data-mk="inputPerMTok"]';
    await r.until(0.3);
    await r.zoomUnion(['#rateTable thead', ROW(5)], 30);
    await r.until(T(narr, 0.1));
    await retype(r, IN, '0.8');
    await r.wait(0.3);
    await r.spot(`${ROW(4)} .chip`, 8);
    await r.moveTo(`${ROW(4)} .chip`, { at: [0.5, 0.5] });
    await r.until(T(narr, 0.34));
    await r.unspot();
    r.zoomReset();
    await go(r, '#btnRefresh');
    await r.zoom('.band .wrap', 40);
    await r.click('#btnRefresh');
    await r.p.waitForFunction(() => (document.querySelector('#status')?.textContent ?? '').includes('1 manual preserved'), null, { timeout: 15000 });
    await r.spot('#status', 6);
    await r.moveTo('#status', { at: [0.42, 0.5] });
    await r.until(T(narr, 0.64));
    await r.unspot();
    r.zoomReset();
    // A model whose provider publishes no cache-write or batch price shows "—", never a zero.
    const dashRow = (await r.eval(() => [...document.querySelectorAll('#rateTable tbody tr')].findIndex((tr) => tr.querySelectorAll('td .dash, td.dash').length >= 2))) as number;
    const n = dashRow >= 0 ? dashRow + 1 : 10;
    await go(r, ROW(n));
    await r.zoomUnion([ROW(Math.max(1, n - 1)), ROW(n + 1)], 30);
    await r.spot(ROW(n), 4);
    await r.moveTo(`${ROW(n)} td:nth-child(6)`, { at: [0.5, 0.5] });
    await r.until(T(narr, 1.0) + 0.3);
    await r.unspot();
    r.zoomReset();
  },

  // Scenario comparison: pin the current plan and three derived cases, then the ranked cost drivers below.
  scenarios: async (r, narr) => {
    await r.until(0.3);
    await r.zoomUnion(['#pinCurrent', '#pinTable'], 40);
    await r.until(T(narr, 0.04));
    await r.click('#pinCurrent');
    await r.until(T(narr, 0.2));
    await r.click('#pinHigh');
    await r.until(T(narr, 0.32));
    await r.click('#pinWorst');
    await r.until(T(narr, 0.42));
    await r.click('#pinOpt');
    await r.wait(0.3);
    await r.zoomUnion(['#pinCurrent', '#pinTable'], 40);
    await r.spot('#pinTable tbody', 6);
    await r.moveTo('#pinTable tbody tr:nth-child(2) td:nth-child(3)', { at: [0.5, 0.5] });
    await r.until(T(narr, 0.6));
    await r.moveTo('#pinTable tbody tr:nth-child(4) td:nth-child(3)', { at: [0.5, 0.5], ms: 800 });
    await r.until(T(narr, 0.72));
    await r.unspot();
    await go(r, '#sense');
    await r.zoom('#sense', 60);
    await r.spot('#sense .sense-row:nth-child(1)', 4);
    await r.moveTo('#sense .sense-row:nth-child(1) .barbox', { at: [0.25, 0.5] });
    await r.until(T(narr, 0.9));
    await r.spot('#sense .sense-row:nth-child(2)', 4);
    await r.moveTo('#sense .sense-row:nth-child(2) .barbox', { at: [0.25, 0.5], ms: 600 });
    await r.until(T(narr, 1.0) + 0.3);
    await r.unspot();
    r.zoomReset();
  },
};
