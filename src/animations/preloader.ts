import { gsap } from "gsap";
import { BG_COLUMNS, NEWS_PHOTOS, SLOT_OF_CARD, SLOT_X, STRIP_Y } from "../content";
import { columnText } from "../i18n";
import { startFlicker } from "./flicker";
import { prepareTypewriter } from "./typewriter";
import linesUrl from "../assets/lines.svg?url";
import { isCompact, onViewport, ux, uy, uu, watchViewport } from "../viewport";

/* ---------- layout constants, in px of the 1920×1080 design frame ---------- */
/** top-left corner of each card in the loading stack */
const STACK = [
  [697, 350],
  [767, 290],
  [747, 400],
  [842, 356],
  [737, 370],
] as const;
const CARD = { w: 380, h: 390 };
/** centre of the stack's bounding box (the phone layout centres the stack on it) */
const STACK_MID = [0, 1].map((a) => (Math.min(...STACK.map((s) => s[a])) + Math.max(...STACK.map((s) => s[a]))) / 2);

/** R / M in the preloader, in px of the design frame */
const PRE_H = 220; // letter height while loading
const PRE_TOP = 430;
const CENTER_X = { R: 754, M: 956 };
const SPLIT_X = { R: 400, M: 1309 };
const WORD_H = 352; // wordmark viewBox height

const MIN_LOADING = 2.5; // seconds of photo shuffle at least
const MAX_LOADING = 12; // never hold longer than this, whatever is still loading

const $ = <T extends Element = HTMLElement>(s: string, root: ParentNode = document) => root.querySelector<T>(s)!;
const $$ = <T extends Element = HTMLElement>(s: string, root: ParentNode = document) => [...root.querySelectorAll<T>(s)];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

type Glyph = { el: SVGGraphicsElement; x0: number; y0: number; w: number; h: number; home: number };

/** Where the wordmark's letters rest; the viewBox follows the box the CSS gives the SVG. */
function buildWordmark() {
  const svg = $<SVGSVGElement>("[data-wordmark]");
  const els = [
    $<SVGGElement>('[data-glyph="R"]'),
    ...$$<SVGPathElement>('[data-glyph="mid"] path'),
    $<SVGGElement>('[data-glyph="M"]'),
  ];
  const glyphs: Glyph[] = els.map((el) => {
    const b = el.getBBox();
    return { el, x0: b.x, y0: b.y, w: b.width, h: b.height, home: b.x };
  });
  const DESIGN_W = 1860;
  /** On screens wider than the design the extra room goes into the gaps between letters. */
  const layout = (box: { width: number; height: number }) => {
    const width = box.height > 0 ? Math.max(DESIGN_W, (WORD_H * box.width) / box.height) : DESIGN_W;
    svg.setAttribute("viewBox", `0 0 ${width.toFixed(2)} ${WORD_H}`);
    for (const g of glyphs) g.home = g.x0 + (g.x0 / (DESIGN_W - g.w)) * (width - DESIGN_W);
  };
  const place = (g: Glyph, x: number, y: number, s: number) =>
    g.el.setAttribute("transform", `translate(${(x - g.x0 * s).toFixed(2)} ${(y - g.y0 * s).toFixed(2)}) scale(${s.toFixed(4)})`);
  const home = () => glyphs.forEach((g) => place(g, g.home, g.y0, 1));
  return { svg, glyphs, R: glyphs[0], M: glyphs[glyphs.length - 1], mid: glyphs.slice(1, -1), layout, place, home };
}

function buildBackground() {
  const host = $("[data-bg-cols]");
  BG_COLUMNS.forEach((c, i) => {
    const p = document.createElement("p");
    p.className = "bg__col";
    p.style.cssText = `--x:${c.x};--b:${c.b}`;
    p.dataset.en = c.text;
    p.textContent = columnText(i, c.text);
    p.setAttribute("aria-hidden", "true");
    host.appendChild(p);
  });
  return $$(".bg__col", host);
}

/** The designer's line vectors, loaded beside the bundle; each piece sorted into horizontal / vertical. */
function loadLines(): Promise<{ h: SVGGraphicsElement[]; v: SVGGraphicsElement[] }> {
  const host = $("[data-lines]");
  return fetch(linesUrl)
    .then((r) => (r.ok ? r.text() : ""))
    .catch(() => "")
    .then((src) => {
      const h: SVGGraphicsElement[] = [];
      const v: SVGGraphicsElement[] = [];
      if (!src.includes("<svg")) return { h, v };
      host.innerHTML = src;
      for (const el of [...host.querySelector("svg")!.children] as SVGGraphicsElement[]) {
        const b = el.getBBox();
        const horizontal = b.width >= b.height;
        (horizontal ? h : v).push(el);
        el.classList.add(horizontal ? "line-h" : "line-v");
      }
      return { h, v };
    });
}

function buildPhotos() {
  const host = $("[data-photos]");
  return STACK.map((_, i) => {
    const card = document.createElement("figure");
    const slot = SLOT_OF_CARD[i];
    card.className = "photo";
    // the card's place on the main screen; the preloader only offsets it with transforms
    card.style.cssText = `--rx:${SLOT_X[slot]};--ry:${STRIP_Y};--slot:${slot};z-index:${i}`;
    // every card holds every photo; shuffling only toggles which one is visible,
    // so a swap never shows an undecoded (empty) frame
    NEWS_PHOTOS.forEach((src, k) => {
      const img = document.createElement("img");
      img.alt = "";
      img.src = src;
      img.decoding = "async";
      img.hidden = k !== i % NEWS_PHOTOS.length;
      card.appendChild(img);
    });
    host.appendChild(card);
    return card;
  });
}

function showPhoto(card: HTMLElement, k: number) {
  card.querySelectorAll("img").forEach((img, j) => (img.hidden = j !== k));
}

/** Resolves when the photos, the texture, the grid lines and the font are in. */
function trackAssets(lines: Promise<unknown>): Promise<void> {
  const urls = [...NEWS_PHOTOS, "/media/textures/bg-main.webp"];
  const jobs: Promise<unknown>[] = urls.map(
    (src) =>
      new Promise<void>((res) => {
        const im = new Image();
        im.onload = im.onerror = () => res();
        im.src = src;
      }),
  );
  jobs.push(document.fonts?.ready ?? Promise.resolve(), lines);
  return Promise.all(jobs).then(() => {});
}

/** Lines on the compact layout: the strip's two rules follow the photo strip wherever it lands. */
export function layoutLines() {
  const host = document.querySelector<HTMLElement>("[data-lines]");
  const strip = document.querySelector<HTMLElement>("[data-photos]");
  if (!host || !strip) return;
  if (!isCompact()) {
    host.style.removeProperty("--strip-top");
    host.style.removeProperty("--strip-h");
    return;
  }
  const stage = document.querySelector<HTMLElement>("[data-stage]")!;
  const s = strip.getBoundingClientRect();
  const st = stage.getBoundingClientRect();
  host.style.setProperty("--strip-top", `${s.top - st.top + stage.scrollTop}px`);
  host.style.setProperty("--strip-h", `${s.height}px`);
}

export function runPreloader({ reduceMotion = false } = {}): Promise<void> {
  const html = document.documentElement;
  const tex = $(".bg__tex");
  const photosHost = $("[data-photos]");
  watchViewport();
  const cols = buildBackground();
  const cards = buildPhotos();
  const word = buildWordmark();
  const { R, M } = word;
  const mid = word.mid.map((g) => g.el);
  const lines = loadLines();
  const ui = $$("[data-ui] > *");
  const blurs = $$<SVGFEGaussianBlurElement>(".sr-filters feGaussianBlur");

  /* ---------- geometry, measured once and again on every viewport change ---------- */
  const geo = { left: 0, top: 0, k: 1, cards: [] as { cx: number; cy: number; w: number; h: number }[] };
  const measure = () => {
    const r = word.svg.getBoundingClientRect();
    word.layout(r);
    geo.left = r.left;
    geo.top = r.top;
    geo.k = r.height / WORD_H || 1; // screen px per viewBox unit
    const host = photosHost.getBoundingClientRect();
    geo.cards = cards.map((c) => ({
      cx: host.left + c.offsetLeft - photosHost.scrollLeft + c.offsetWidth / 2,
      cy: host.top + c.offsetTop - photosHost.scrollTop + c.offsetHeight / 2,
      w: c.offsetWidth,
      h: c.offsetHeight,
    }));
    layoutLines();
  };

  /* ---------- the loading composition, in screen px, per layout ---------- */
  const area = () => ({ W: html.clientWidth || innerWidth, H: html.clientHeight || innerHeight });
  const desktop = {
    preH: () => PRE_H * uu(),
    left: (g: Glyph, split: number) => lerp(g === R ? CENTER_X.R : CENTER_X.M, g === R ? SPLIT_X.R : SPLIT_X.M, split) * ux(),
    top: () => PRE_TOP * uy(),
    stack: (i: number) => ({ x: (STACK[i][0] + CARD.w / 2) * ux(), y: (STACK[i][1] + CARD.h / 2) * uy(), s: 1, jx: ux(), jy: uy() }),
  };
  // phones: the two letters sit a little above the middle, close together, then part
  // to the screen edges; the stack is dealt between them
  const JITTER = 0.55; // the stack is kept tighter on a narrow screen
  const SPREAD = (Math.max(...STACK.map((s) => s[0])) - Math.min(...STACK.map((s) => s[0]))) / CARD.w; // ≈ 0.38
  const compact = {
    preH: () => {
      const { W, H } = area();
      return clamp(Math.min(W * 0.2, H * 0.13), 52, 120);
    },
    widths: () => {
      const h = compact.preH();
      return { h, wR: (R.w / R.h) * h, wM: (M.w / M.h) * h, gap: 0.09 * h, pad: Math.max(16, area().W * 0.05) };
    },
    left: (g: Glyph, split: number) => {
      const { W } = area();
      const { wR, wM, gap, pad } = compact.widths();
      const c0 = W / 2 - (wR + gap + wM) / 2;
      const together = g === R ? c0 : c0 + wR + gap;
      const apart = g === R ? pad : W - pad - wM;
      return lerp(together, apart, split);
    },
    top: () => area().H * 0.46 - compact.preH() / 2,
    stack: (i: number) => {
      const { W } = area();
      const { h, wR, wM, pad } = compact.widths();
      const f = geo.cards[i];
      // the whole stack, jolts included, fits between the parted letters with air on both sides
      const room = W - 2 * pad - wR - wM - 2 * Math.max(10, 0.14 * h);
      const sw = clamp(room / (1 + SPREAD * JITTER), 96, Math.min(W * 0.5, 280));
      const j = (sw / CARD.w) * JITTER;
      return {
        x: W / 2 + (STACK[i][0] - STACK_MID[0]) * j,
        y: compact.top() + h / 2 + (STACK[i][1] - STACK_MID[1]) * j,
        s: f && f.w ? sw / f.w : 0.5,
        jx: j,
        jy: j,
      };
    },
  };
  const mode = () => (isCompact() ? compact : desktop);

  /* ---------- animated state; rendered on every tick from the live geometry ---------- */
  const pre = { split: 0, home: 0, dyR: 0, dyM: 0 }; // letters: together → apart → wordmark
  const deck = cards.map(() => ({ ox: 0, oy: 0, s: 1, home: 0 })); // cards: stack (+ jolt) → strip
  const renderGlyph = (g: Glyph, dy: number) => {
    const m = mode();
    const h = m.preH();
    const s = h / (g.h * geo.k);
    const X = (m.left(g, pre.split) - geo.left) / geo.k;
    const Y = (m.top() + dy * h - geo.top) / geo.k;
    word.place(g, lerp(X, g.home, pre.home), lerp(Y, g.y0, pre.home), lerp(s, 1, pre.home));
  };
  const renderCard = (i: number) => {
    const f = geo.cards[i];
    if (!f) return;
    const st = mode().stack(i);
    const d = deck[i];
    const sx = st.x + d.ox * st.jx;
    const sy = st.y + d.oy * st.jy;
    const sc = lerp(st.s * d.s, 1, d.home);
    cards[i].style.transform =
      `translate3d(${(lerp(sx, f.cx, d.home) - f.cx).toFixed(2)}px, ${(lerp(sy, f.cy, d.home) - f.cy).toFixed(2)}px, 0) scale(${sc.toFixed(4)})`;
  };
  const render = () => {
    renderGlyph(R, pre.dyR);
    renderGlyph(M, pre.dyM);
    for (let i = 0; i < cards.length; i++) renderCard(i);
  };

  /** horizontal motion blur, in px of a design-size card; the SVG filter is attached only while it blurs */
  const blurOn = cards.map(() => false);
  const setBlur = (i: number, v: number) => {
    const on = v > 0.3;
    if (on !== blurOn[i]) {
      cards[i].style.filter = on ? `url(#mblur-${i})` : "";
      blurOn[i] = on;
    }
    if (on) blurs[i].setAttribute("stdDeviation", `${(v * ((geo.cards[i]?.w ?? CARD.w) / CARD.w)).toFixed(1)} 0`);
  };

  let ticking = false;
  let stopFollow = () => {};
  const finish = () => {
    if (ticking) gsap.ticker.remove(render);
    ticking = false;
    stopFollow();
    cards.forEach((c, i) => {
      c.style.transform = "";
      c.style.opacity = "";
      setBlur(i, 0);
    });
    measure();
    word.home();
    onViewport(() => {
      word.layout(word.svg.getBoundingClientRect());
      word.home();
      layoutLines();
    });
    // compact layout: anything above or below the strip that changes size (a language
    // switch rewraps the menu and the tagline) moves the strip, and its rules follow
    if ("ResizeObserver" in window) {
      const ro = new ResizeObserver(() => isCompact() && layoutLines());
      [photosHost, word.svg, ...$$("[data-ui] > *")].forEach((el) => ro.observe(el));
    }
    html.classList.remove("is-loading", "is-booting");
  };

  const startCaptionFlicker = () => {
    // the same typewriter flicker as the preloader columns: about 2–3 letters a second per caption
    for (const el of $$("[data-ui] [data-flicker]")) startFlicker([el], { rate: 0.01, interval: 200, chance: 0.5, hold: [120, 260] });
  };

  if (reduceMotion) {
    measure();
    finish();
    return Promise.resolve();
  }

  // background columns: the typewriter flicker runs from the preloader on and never stops
  // (lighter on phones: fewer letters change at once)
  startFlicker(cols, { rate: isCompact() ? 0.004 : 0.006, interval: 70 });

  /* ---------- initial state ---------- */
  measure();
  const follow = () => measure();
  document.addEventListener("requiem:resize", follow);
  stopFollow = () => document.removeEventListener("requiem:resize", follow);

  gsap.set(tex, { opacity: 0 });
  gsap.set(cols, { opacity: 0 });
  gsap.set(mid, { opacity: 0 });
  gsap.set(ui, { opacity: 0 });
  const typeTargets = [...$$("[data-ui] .t"), ...$$("[data-ui] .gt:not([data-notype])")] as (HTMLElement | HTMLInputElement)[];
  const icons = $$("[data-ui] .ico, [data-ui] [data-flick]");
  const typeIn = prepareTypewriter(typeTargets, { stagger: 90, min: 26, max: 62 });
  word.home(); // middle letters sit at their final spots, hidden
  gsap.set([R.el, M.el], { opacity: 0 });
  gsap.set(cards, { opacity: 0 });
  deck.forEach((d) => (d.s = 0.92));
  render();
  gsap.ticker.add(render);
  ticking = true;
  // everything above is in its first state: the page may show now
  html.classList.remove("is-booting");

  // the grid is drawn on exit; if it only arrives after that (very slow network) it simply appears
  let exiting = false;
  let grid: { h: SVGGraphicsElement[]; v: SVGGraphicsElement[] } = { h: [], v: [] };
  const assetsIn = trackAssets(
    lines.then((l) => {
      if (exiting) return;
      gsap.set(l.h, { scaleX: 0, transformOrigin: "0% 50%" });
      gsap.set(l.v, { scaleY: 0, transformOrigin: "50% 0%" });
      grid = l;
    }),
  );

  /* ---------- photo shuffle with motion blur ---------- */
  let photoIdx = 0;
  let z = 10;
  let shuffle = 0;
  const shuffleOnce = () => {
    if (document.hidden) return;
    const k = (Math.random() * cards.length) | 0;
    photoIdx = (photoIdx + 1) % NEWS_PHOTOS.length;
    showPhoto(cards[k], photoIdx);
    cards[k].style.zIndex = String(++z);
    const dir = Math.random() < 0.5 ? -1 : 1;
    gsap.fromTo(deck[k], { ox: dir * 70, oy: Math.random() * 30 - 15 }, { ox: 0, oy: 0, duration: 0.22, ease: "expo.out", overwrite: "auto" });
    const b = { v: 38 };
    gsap.to(b, { v: 0, duration: 0.24, ease: "power2.out", onUpdate: () => setBlur(k, b.v), onComplete: () => setBlur(k, 0) });
  };

  return new Promise<void>((resolve) => {
    const tl = gsap.timeline();

    /* 1 — texture slams in: harsh, stepped flicker */
    tl.to(tex, {
      keyframes: { opacity: [0, 1, 0.15, 0.85, 0.3, 1], easeEach: "steps(1)" },
      duration: 0.55,
    })
      .fromTo(tex, { scale: 1.12, filter: "brightness(2.2) contrast(1.4)" }, { scale: 1, filter: "brightness(1) contrast(1)", duration: 0.7, ease: "expo.out" }, 0)
      // a filter left at "brightness(1)" still costs a full-screen filter pass every frame
      .set(tex, { clearProps: "filter,transform" }, 0.72)

      /* faint type columns */
      .to(cols, { keyframes: { opacity: [0, 0.18, 0.04, 0.1] }, duration: 0.5, stagger: 0.07, ease: "steps(3)" }, 0.35)

      /* 2 — R M appear in the centre */
      .to([R.el, M.el], { keyframes: { opacity: [0, 1, 0.2, 1] }, duration: 0.4, stagger: 0.08, ease: "steps(3)" }, 0.75)
      .fromTo(pre, { dyR: 0.06 }, { dyR: 0, duration: 0.6, ease: "expo.out" }, 0.75)
      .fromTo(pre, { dyM: 0.06 }, { dyM: 0, duration: 0.6, ease: "expo.out" }, 0.83)

      /* 3 — letters move apart, photo stack arrives */
      .to(pre, { split: 1, duration: 0.85, ease: "power4.inOut" }, 1.45)
      .to(cards, { opacity: 1, duration: 0.3, stagger: 0.05, ease: "expo.out" }, 1.75)
      .to(deck, { s: 1, duration: 0.3, stagger: 0.05, ease: "expo.out" }, 1.75)
      .add(() => {
        shuffle = window.setInterval(shuffleOnce, 120);
      }, 1.9)

      /* 4 — hold until everything is loaded, but never shorter than MIN_LOADING */
      .add(() => {
        const hold = Promise.all([assetsIn, new Promise((r) => setTimeout(r, MIN_LOADING * 1000))]);
        Promise.race([hold, new Promise((r) => setTimeout(r, MAX_LOADING * 1000))]).then(() => gsap.delayedCall(0.25, exit));
      }, 1.9);

    /* 5 — exit: letters grow into the wordmark, grid draws, stack deals into the row */
    const exit = () => {
      window.clearInterval(shuffle);
      exiting = true;
      const { h: hLines, v: vLines } = grid;
      // the row on the main screen shows five different stories, in order
      cards.forEach((c, i) => {
        gsap.killTweensOf(deck[i]);
        deck[i].ox = deck[i].oy = 0;
        showPhoto(c, i);
        setBlur(i, 0);
      });
      const out = gsap.timeline({
        onComplete: () => {
          finish();
          resolve();
        },
      });
      out
        .to(pre, { home: 1, duration: 1.05, ease: "power4.inOut" }, 0.1)
        .to(hLines, { scaleX: 1, duration: 0.75, stagger: 0.05, ease: "power3.inOut" }, 0.45)
        .to(vLines, { scaleY: 1, duration: 0.75, stagger: { each: 0.03, from: "random" }, ease: "power3.inOut" }, 0.55)
        .to(mid, { keyframes: { opacity: [0, 1, 0.25, 1] }, duration: 0.35, stagger: { each: 0.06, from: "random" }, ease: "steps(3)" }, 0.95);

      cards.forEach((_, i) => {
        const blur = { v: 0 };
        const at = 0.55 + i * 0.06;
        out
          .to(deck[i], { home: 1, duration: 0.9, ease: "power3.inOut" }, at)
          .to(blur, { keyframes: { v: [0, 30, 0] }, duration: 0.9, ease: "power3.inOut", onUpdate: () => setBlur(i, blur.v) }, at);
      });

      // small type is struck in like a typewriter; icons and the pager ring flick on
      out
        .set(ui, { opacity: 1 }, 1.2)
        .set(icons, { opacity: 0 }, 1.2)
        .add(() => {
          typeIn().then(startCaptionFlicker);
        }, 1.2)
        .to(icons, { keyframes: { opacity: [0, 1, 0.3, 1] }, duration: 0.35, stagger: 0.12, ease: "steps(3)" }, 1.45);
    };
  });
}
