/* ===== DEMO MODE — the app's own code, with the catalog served from a snapshot, nothing stored, and the scene picked by hash ===== */
(function () {
  "use strict";

  // 1. Storage: an in-memory stand-in, so opening the demo never touches the scenario saved by the real app on this origin.
  const mem = new Map();
  const shim = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => { mem.set(String(k), String(v)); },
    removeItem: (k) => { mem.delete(k); },
    clear: () => mem.clear(),
    key: (i) => [...mem.keys()][i] ?? null,
    get length() { return mem.size; },
  };
  try { Object.defineProperty(window, "localStorage", { value: shim, configurable: true }); } catch (e) { /* keep the real one */ }

  // 2. Catalog: the public OpenRouter list as captured on 2026-10-15 (review/catalog-2026-10-15.json), served through the
  //    app's own fetch/normalize/merge path with a short, believable round trip. No live request leaves the page.
  const realFetch = window.fetch.bind(window);
  window.fetch = async function (url, opts) {
    if (!String(url).startsWith(CATALOG_URL)) return realFetch(url, opts);
    const r = await realFetch("review/catalog-2026-10-15.json", { cache: "no-store" });
    const j = await r.json();
    await new Promise((res) => setTimeout(res, 700));
    return new Response(JSON.stringify({ data: j.data, total_count: j.total_count, links: { next: null } }), {
      status: 200, headers: { "content-type": "application/json" },
    });
  };

  // 3. Dialogs: a headless recorder cannot answer prompt(); "Pin current" takes the suggested name.
  window.prompt = (msg, def) => def || "Current";

  // 4. Stage: at the recorder's 2400x1350 viewport the page is drawn at 1.5x so camera zooms stay sharp; the recorder's own
  //    overlays live outside #stage and are enlarged to match.
  if (window.innerWidth >= 2300) {
    const css = document.createElement("style");
    css.textContent = `
      #stage{zoom:1.5}
      #__cursor{width:42px!important;height:42px!important}
      #__cursor svg{width:42px!important;height:42px!important}
      #__ripple{width:66px!important;height:66px!important;margin:-33px 0 0 -33px!important;border-width:4px!important}
      #__spot{border-radius:14px!important;outline-width:3px!important}`;
    document.head.appendChild(css);
  }

  // 5. Scene setup by hash: scroll the section the scene is about to the top once the catalog has loaded, then flag ready.
  const top = (sel) => {
    const el = document.querySelector(sel);
    const box = el && (el.closest("section, details") || el);
    if (box) box.scrollIntoView({ block: "start", behavior: "auto" });
    window.scrollBy(0, -12);
  };
  const SETUP = {
    drivers: () => window.scrollTo(0, 0),
    tiers: () => top("#shareBadge"),
    select: () => top("#shareBadge"),
    discover: () => top("#catalogTitle"),
    rates: () => top("#rateBox"),
    scenarios: () => top("#pinCurrent"),
  };
  window.addEventListener("DOMContentLoaded", () => {
    const scene = location.hash.slice(1);
    const poll = setInterval(() => {
      if (!catalogFetchedAt || refreshController) return;
      clearInterval(poll);
      (SETUP[scene] || SETUP.drivers)();
      setTimeout(() => {
        const flag = document.createElement("div");
        flag.id = "stageReady"; flag.hidden = true; flag.textContent = "ready";
        document.body.appendChild(flag);
      }, 80);
    }, 50);
  });
})();
