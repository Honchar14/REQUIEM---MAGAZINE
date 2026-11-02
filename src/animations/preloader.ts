import { gsap } from "gsap";
import { BG_COLUMNS, NEWS_PHOTOS } from "../content";
import { startFlicker } from "./flicker";
import linesSvg from "../assets/lines.svg?raw";
import { ux, uy, uu, watchViewport } from "../viewport";

/* ---------- layout constants, in px of the 1920×1080 design frame ---------- */
const STACK = [
  [697, 350],
  [767, 290],
  [747, 400],
  [842, 356],
  [737, 370],
] as const;
/** where each stack card lands in the main-screen row */
const ROW = [384, -2, 770, 1156, 1542].map((x) => [x, 536] as const);

/** R / M in the preloader, in px of the design frame */
const PRE_H = 220; // letter height while loading
const PRE_TOP = 430;
const CENTER_X = { R: 754, M: 956 };
const SPLIT_X = { R: 400, M: 1309 };
const WORD = { x: 30, y: 30, w: 1860, h: 352 }; // wordmark box in the frame

const MIN_LOADING = 2.8; // seconds the counter needs at least

/*
 * Units: x positions follow the screen width (ux), y positions follow the
 * screen height (uy), sizes use the smaller of the two (uu), so the whole
 * 1920×1080 frame always fits the viewport without distorting type.
 */
const pad = (n: number) => String(n).padStart(2, "0");
const $ = <T extends Element = HTMLElement>(s: string, root: ParentNode = document) => root.querySelector<T>(s)!;
const $$ = <T extends Element = HTMLElement>(s: string, root: ParentNode = document) => [...root.querySelectorAll<T>(s)];

type Glyph = { el: SVGGraphicsElement; x0: number; y0: number; w: number; h: number; home: number; x: number; y: number; s: number };

/** frame px → wordmark viewBox units */
const fx = (X: number) => ((X - WORD.x) * ux()) / uu();
const fy = (Y: number) => ((Y - WORD.y) * uy()) / uu();

function applyGlyph(g: Glyph) {
  g.el.setAttribute("transform", `translate(${g.x - g.x0 * g.s} ${g.y - g.y0 * g.s}) scale(${g.s})`);
}

/**
 * The wordmark keeps its letter shapes and always spans the full width:
 * on screens wider than 16:9 the extra room goes into the gaps between letters.
 */
function buildWordmark() {
  const svg = $<SVGSVGElement>("[data-wordmark]");
  const els = [
    $<SVGGElement>('[data-glyph="R"]'),
    ...$$<SVGPathElement>('[data-glyph="mid"] path'),
    $<SVGGElement>('[data-glyph="M"]'),
  ];
  const glyphs: Glyph[] = els.map((el) => {
    const b = el.getBBox();
    return { el, x0: b.x, y0: b.y, w: b.width, h: b.height, home: b.x, x: b.x, y: b.y, s: 1 };
  });
  const layout = () => {
    const width = WORD.w * (ux() / uu());
    svg.setAttribute("viewBox", `0 0 ${width} ${WORD.h}`);
    for (const g of glyphs) g.home = g.x0 + (g.x0 / (WORD.w - g.w)) * (width - WORD.w);
  };
  layout();
  return { glyphs, R: glyphs[0], M: glyphs[glyphs.length - 1], mid: glyphs.slice(1, -1), layout };
}

function buildBackground() {
  const host = $("[data-bg-cols]");
  for (const c of BG_COLUMNS) {
    const p = document.createElement("p");
    p.className = "bg__col";
    p.style.cssText = `--x:${c.x};--b:${c.b}`;
    p.textContent = c.text;
    p.setAttribute("aria-hidden", "true");
    host.appendChild(p);
  }
  return $$(".bg__col", host);
}

/** Mounts the designer's line vectors and sorts each piece into horizontal / vertical. */
function buildLines() {
  const host = $("[data-lines]");
  host.innerHTML = linesSvg;
  const pieces = [...host.querySelector("svg")!.children] as SVGGraphicsElement[];
  const h: SVGGraphicsElement[] = [];
  const v: SVGGraphicsElement[] = [];
  for (const el of pieces) {
    const b = el.getBBox();
    (b.width >= b.height ? h : v).push(el);
  }
  return { h, v };
}

function buildPhotos() {
  const host = $("[data-photos]");
  return STACK.map((_, i) => {
    const card = document.createElement("figure");
    card.className = "photo";
    card.style.margin = "0";
    card.style.zIndex = String(i);
    card.style.filter = `url(#mblur-${i})`;
    // every card holds every photo; shuffling only toggles which one is visible,
    // so a swap never shows an undecoded (empty) frame
    NEWS_PHOTOS.forEach((src, k) => {
      const img = document.createElement("img");
      img.alt = "";
      img.src = src;
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

/** Resolves progressively as images and fonts arrive. */
function trackAssets(onProgress: (p: number) => void): Promise<void> {
  const urls = [...NEWS_PHOTOS, "/media/textures/bg-main.webp"];
  const total = urls.length + 1;
  let done = 0;
  const tick = () => onProgress(++done / total);
  const jobs = urls.map(
    (src) =>
      new Promise<void>((res) => {
        const im = new Image();
        im.onload = im.onerror = () => (tick(), res());
        im.src = src;
      }),
  );
  jobs.push(document.fonts.ready.then(() => tick()));
  return Promise.all(jobs).then(() => {});
}

/** Places the photo cards in the final row using CSS units so they survive resizes. */
function settleRow(cards: HTMLElement[]) {
  cards.forEach((c, i) => {
    gsap.set(c, { clearProps: "transform,opacity" });
    c.style.left = `calc(${ROW[i][0]} * var(--ux))`;
    c.style.top = `calc(${ROW[i][1]} * var(--uy))`;
    c.style.filter = "none";
  });
}

export function runPreloader({ reduceMotion = false } = {}): Promise<void> {
  const html = document.documentElement;
  const tex = $(".bg__tex");
  const cols = buildBackground();
  const cards = buildPhotos();
  // units are live from the very first frame; after loading the wordmark re-justifies on resize
  let relayout = () => {};
  watchViewport(() => relayout());
  const word = buildWordmark();
  const { R, M } = word;
  const mid = word.mid.map((g) => g.el);
  const toHome = () => {
    for (const g of word.glyphs) {
      g.x = g.home;
      g.y = g.y0;
      g.s = 1;
      applyGlyph(g);
    }
  };
  const { h: hLines, v: vLines } = buildLines();
  const pre = $("[data-pre]");
  const count = $("[data-pre-count]");
  const idx = $("[data-pre-idx]");
  const label = $("[data-pre-label]");
  const ui = $$("[data-ui] > *");
  const blurs = $$<SVGFEGaussianBlurElement>(".sr-filters feGaussianBlur");

  let stopBgFlicker = () => {};

  const finish = () => {
    stopBgFlicker(); // the typewriter flicker belongs to the preloader only
    settleRow(cards);
    toHome();
    relayout = () => (word.layout(), toHome());
    pre.remove();
    html.classList.remove("is-loading");
    // main screen: the same typewriter flicker on the three captions, each with its own rhythm
    for (const el of $$("[data-ui] [data-flicker]")) startFlicker([el], { rate: 0.04, interval: 150, hold: [110, 280] });
  };

  if (reduceMotion) {
    finish();
    return Promise.resolve();
  }

  stopBgFlicker = startFlicker(cols, { rate: 0.006, interval: 70 });

  /* ---------- initial state ---------- */
  gsap.set(tex, { opacity: 0 });
  gsap.set(cols, { opacity: 0 });
  gsap.set(mid, { opacity: 0 });
  gsap.set(hLines, { scaleX: 0, transformOrigin: "0% 50%" });
  gsap.set(vLines, { scaleY: 0, transformOrigin: "50% 0%" });
  gsap.set(ui, { opacity: 0 });
  gsap.set([count, label], { opacity: 0 });
  toHome(); // middle letters sit at their final spots, hidden
  [R, M].forEach((g, i) => {
    g.s = PRE_H / g.h;
    g.x = fx(i ? CENTER_X.M : CENTER_X.R);
    g.y = fy(PRE_TOP);
    applyGlyph(g);
  });
  gsap.set([R.el, M.el], { opacity: 0 });
  cards.forEach((c, i) => gsap.set(c, { x: STACK[i][0] * ux(), y: STACK[i][1] * uy(), opacity: 0, scale: 0.92 }));

  /* ---------- loading progress ---------- */
  let loaded = 0;
  const shown = { p: 0 };
  const assets = trackAssets((p) => (loaded = p));

  const render = () => {
    const p = Math.round(shown.p * 100);
    count.textContent = `${pad(p)}%`;
  };

  /* ---------- photo shuffle with motion blur ---------- */
  let photoIdx = 0;
  let z = 10;
  let shuffle: number | undefined;
  const shuffleOnce = () => {
    const k = (Math.random() * cards.length) | 0;
    const card = cards[k];
    photoIdx = (photoIdx + 1) % NEWS_PHOTOS.length;
    showPhoto(card, photoIdx);
    card.style.zIndex = String(++z);
    idx.textContent = `${pad(photoIdx + 1)} / ${pad(NEWS_PHOTOS.length)}`;
    const dir = Math.random() < 0.5 ? -1 : 1;
    const blur = { v: 38 };
    gsap.fromTo(
      card,
      { x: (STACK[k][0] + dir * 70) * ux(), y: (STACK[k][1] + (Math.random() * 30 - 15)) * uy() },
      { x: STACK[k][0] * ux(), y: STACK[k][1] * uy(), duration: 0.22, ease: "expo.out", overwrite: "auto" },
    );
    gsap.fromTo(blur, { v: 38 }, {
      v: 0,
      duration: 0.24,
      ease: "power2.out",
      onUpdate: () => blurs[k].setAttribute("stdDeviation", `${blur.v} 0`),
    });
  };

  return new Promise<void>((resolve) => {
    const tl = gsap.timeline();

    /* 1 — texture slams in: harsh, stepped flicker */
    tl.to(tex, {
      keyframes: { opacity: [0, 1, 0.15, 0.85, 0.3, 1], easeEach: "steps(1)" },
      duration: 0.55,
    })
      .fromTo(tex, { scale: 1.12, filter: "brightness(2.2) contrast(1.4)" }, { scale: 1, filter: "brightness(1) contrast(1)", duration: 0.7, ease: "expo.out" }, 0)

      /* faint type columns */
      .to(cols, { keyframes: { opacity: [0, 0.18, 0.04, 0.1] }, duration: 0.5, stagger: 0.07, ease: "steps(3)" }, 0.35)

      /* 2 — R M appear in the centre */
      .to([R.el, M.el], { keyframes: { opacity: [0, 1, 0.2, 1] }, duration: 0.4, stagger: 0.08, ease: "steps(3)" }, 0.75)
      .from([R.el, M.el], { yPercent: 6, duration: 0.6, ease: "expo.out", stagger: 0.08 }, 0.75)

      /* 3 — counter + label, letters move apart, photo stack arrives */
      .to([count, label], { keyframes: { opacity: [0, 1, 0.3, 1] }, duration: 0.35, ease: "steps(3)" }, 1.35)
      .to(R, { x: fx(SPLIT_X.R), duration: 0.85, ease: "power4.inOut", onUpdate: () => applyGlyph(R) }, 1.45)
      .to(M, { x: fx(SPLIT_X.M), duration: 0.85, ease: "power4.inOut", onUpdate: () => applyGlyph(M) }, 1.45)
      .to(cards, { opacity: 1, scale: 1, duration: 0.3, stagger: 0.05, ease: "expo.out" }, 1.75)
      .add(() => {
        shuffle = window.setInterval(shuffleOnce, 120);
      }, 1.9)

      /* 4 — count to 100: never faster than MIN_LOADING, never ahead of real loading */
      .add(() => {
        const t0 = performance.now();
        const step = () => {
          const time = Math.min(1, (performance.now() - t0) / (MIN_LOADING * 1000));
          const target = Math.min(time, loaded);
          shown.p += (target - shown.p) * 0.18;
          if (target >= 1 && shown.p > 0.995) shown.p = 1;
          render();
          if (shown.p < 1) requestAnimationFrame(step);
          else assets.then(() => gsap.delayedCall(0.25, exit));
        };
        requestAnimationFrame(step);
      }, 1.5);

    /* 5 — exit: letters grow into the wordmark, grid draws, stack deals into the row */
    const exit = () => {
      window.clearInterval(shuffle);
      // the row on the main screen shows five different stories, in order
      cards.forEach((c, i) => showPhoto(c, i));
      const out = gsap.timeline({
        onComplete: () => {
          finish();
          resolve();
        },
      });
      out
        .to([count, label], { keyframes: { opacity: [1, 0.2, 0.8, 0] }, duration: 0.3, ease: "steps(3)" })
        .to(R, { x: R.home, y: R.y0, s: 1, duration: 1.05, ease: "power4.inOut", onUpdate: () => applyGlyph(R) }, 0.1)
        .to(M, { x: M.home, y: M.y0, s: 1, duration: 1.05, ease: "power4.inOut", onUpdate: () => applyGlyph(M) }, 0.1)
        .to(hLines, { scaleX: 1, duration: 0.75, stagger: 0.05, ease: "power3.inOut" }, 0.45)
        .to(vLines, { scaleY: 1, duration: 0.75, stagger: { each: 0.03, from: "random" }, ease: "power3.inOut" }, 0.55)
        .to(mid, { keyframes: { opacity: [0, 1, 0.25, 1] }, duration: 0.35, stagger: { each: 0.06, from: "random" }, ease: "steps(3)" }, 0.95);

      cards.forEach((card, i) => {
        const blur = { v: 0 };
        out
          .to(card, { x: ROW[i][0] * ux(), y: ROW[i][1] * uy(), duration: 0.9, ease: "power3.inOut" }, 0.55 + i * 0.06)
          .to(blur, {
            keyframes: { v: [0, 30, 0] },
            duration: 0.9,
            ease: "power3.inOut",
            onUpdate: () => blurs[i].setAttribute("stdDeviation", `${blur.v} 0`),
          }, 0.55 + i * 0.06);
      });

      out.to(ui, { keyframes: { opacity: [0, 1, 0.3, 1] }, duration: 0.4, stagger: 0.04, ease: "steps(3)" }, 1.25);
    };
  });
}
