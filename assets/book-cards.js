/* ============================================================
   Ashen Press card port — interaction engine.
   Pointer-tracked 3D tilt with lerp springs, hover lift,
   press select, cursor sheen, staggered entrance.
   Pure vanilla; disables itself for touch-only and
   prefers-reduced-motion.
   ============================================================ */
(() => {
  "use strict";

  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FINE = matchMedia("(pointer: fine)").matches;
  const LERP_ACTIVE = 0.16;
  const LERP_SETTLE = 0.09;
  const EPS = 0.0015;

  const cards = [];
  let raf = 0;

  function makeCard(el) {
    if (!el || el.dataset.bcBook || el.tagName !== "ARTICLE") return;
    // hidden cards (filtered out by boxes.js) still get adopted: the
    // MutationObserver-free IO path picks them up when un-hidden
    el.dataset.bcBook = "1";
    el.classList.add("book");

    const b = {
      el,
      px: 0, py: 0, pl: 0,          // current values
      tx: 0, ty: 0, tl: 0,          // targets
      mx: 50, my: 18,               // sheen position, %
      hovering: false,
      pressed: false,
      amp: 1,
    };
    cards.push(b);

    // tiny deterministic rest rotation: hand-placed volume
    const idx = cards.length;
    el.style.setProperty("--rz", (((idx * 7) % 13) - 6) * 0.15 + "deg");

    if (FINE && !REDUCED) {
      el.addEventListener("pointerenter", () => {
        b.hovering = true;
        b.tl = 1;
        // tall cards (open notes/details) lean less
        b.amp = Math.min(1, 380 / Math.max(1, el.offsetHeight));
        el.classList.add("is-hover");
        startLoop();
      });
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
        const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
        b.tx = Math.max(-1, Math.min(1, nx));
        b.ty = Math.max(-1, Math.min(1, ny));
        b.mx = ((e.clientX - r.left) / r.width) * 100;
        b.my = ((e.clientY - r.top) / r.height) * 100;
        el.style.setProperty("--mx", b.mx.toFixed(1) + "%");
        el.style.setProperty("--my", b.my.toFixed(1) + "%");
        b.el.style.setProperty("--sh", "1");
        startLoop();
      });
      el.addEventListener("pointerdown", () => {
        b.pressed = true;
        b.tl = -0.55; // press squish
        el.classList.add("is-pressed");
        startLoop();
      });
    }
    const release = () => {
      b.hovering = false;
      b.pressed = false;
      b.tl = 0;
      b.tx = 0;
      b.ty = 0;
      el.classList.remove("is-hover", "is-pressed");
      el.style.setProperty("--sh", "0");
      startLoop();
    };
    el.addEventListener("pointerleave", release);
    el.addEventListener("pointercancel", release);
    el.addEventListener("pointerup", release);
  }

  function frame() {
    raf = 0;
    let alive = false;
    for (const b of cards) {
      const settled = !b.hovering && !b.pressed &&
        Math.abs(b.tx - b.px) < EPS &&
        Math.abs(b.ty - b.py) < EPS &&
        Math.abs(b.tl - b.pl) < EPS;

      if (settled) {
        b.px = b.py = b.pl = 0;
        continue;
      }

      const f = b.hovering || b.pressed ? LERP_ACTIVE : LERP_SETTLE;
      b.px += (b.tx - b.px) * f;
      b.py += (b.ty - b.py) * f;
      b.pl += (b.tl - b.pl) * f;

      const s = b.el.style;
      s.setProperty("--px", b.px.toFixed(3));
      s.setProperty("--py", b.py.toFixed(3));
      s.setProperty("--pl", b.pl.toFixed(3));
      s.setProperty("--amp", b.amp.toFixed(2));
      alive = true;
    }
    if (alive) raf = requestAnimationFrame(frame);
    else {
      // hard reset so cards rest exactly flat
      for (const b of cards) {
        b.el.style.removeProperty("--px");
        b.el.style.removeProperty("--py");
        b.el.style.removeProperty("--pl");
        b.el.style.removeProperty("--amp");
      }
    }
  }

  function startLoop() {
    if (!raf) raf = requestAnimationFrame(frame);
  }

  /* ---------- staggered entrance ---------- */
  let seq = 0;
  const pending = new Set();
  const io = REDUCED || typeof IntersectionObserver === "undefined"
    ? null
    : new IntersectionObserver(
        (entries) => {
          for (const en of entries) {
            if (!en.isIntersecting) continue;
            reveal(en.target);
            io.unobserve(en.target);
          }
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.15 }
      );

  function reveal(el) {
    if (el.classList.contains("bc-in")) return;
    pending.delete(el);
    el.style.setProperty("--seq", String(seq++));
    el.classList.add("bc-in");
  }

  function maybeReveal(el) {
    // cards already on screen stack in immediately; IO only watches below-fold
    const r = el.getBoundingClientRect();
    if (r.top < (window.innerHeight || 900) * 1.1) {
      reveal(el);
      return;
    }
    if (io) {
      io.observe(el);
      pending.add(el);
      // failsafe: below-fold cards can never stay hidden, even if IO
      // is throttled (background tabs, embeds, odd environments)
      setTimeout(() => {
        for (const p of pending) reveal(p);
        pending.clear();
      }, 1400);
    } else {
      reveal(el);
    }
  }

  function adopt(grid) {
    grid.querySelectorAll("article").forEach((el) => {
      makeCard(el);
      if (el.classList.contains("book")) maybeReveal(el);
    });

    // posts render after load (main.js) — adopt new cards too
    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        m.addedNodes.forEach((n) => {
          if (n.nodeType !== 1) return;
          const articles = n.matches?.("article")
            ? [n, ...n.querySelectorAll("article")]
            : [...n.querySelectorAll("article")];
          articles.forEach((a) => {
            makeCard(a);
            if (a.classList.contains("book")) maybeReveal(a);
          });
        });
      }
    });
    mo.observe(grid, { childList: true });
  }

  function init() {
    document.querySelectorAll("[data-book-grid]").forEach(adopt);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
