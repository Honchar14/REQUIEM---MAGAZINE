import { gsap } from "gsap";
import { BG_COLUMNS, NEWS_PHOTOS } from "../content";
import { startFlicker } from "./flicker";
import linesSvg from "../assets/lines.svg?raw";

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

/** glyph bounding boxes inside the wordmark svg (viewBox 0 0 1860 352) */
const BOX = { R: { x: 0, y: 8.66, h: 318 }, M: { x: 1556, y: 8.66, h: 318 } };
const WORD_ORIGIN = 30; // wordmark sits at (30, 30) in the frame
const PRE_SCALE = 220 / 318; // R / M height in the preloader: 220px
const PRE_Y = 430 - WORD_ORIGIN;
const CENTER = { R: 754 - WORD_ORIGIN, M: 956 - WORD_ORIGIN };
const SPLIT = { R: 400 - WORD_ORIGIN, M: 1309 - WORD_ORIGIN };

const MIN_LOADING = 2.8; // seconds the counter needs at least

const u = () => window.innerWidth / 1920;
const pad = (n: number) => String(n).padStart(2, "0");
const $ = <T extends Element = HTMLElement>(s: string, root: ParentNode = document) => root.querySelector<T>(s)!;
const $$ = <T extends Element = HTMLElement>(s: string, root: ParentNode = document) => [...root.querySelectorAll<T>(s)];

type Glyph = { el: SVGGElement; box: { x: number; y: number }; x: number; y: number; s: number };

function glyph(name: "R" | "M"): Glyph {
  const el = $<SVGGElement>(`[data-glyph="${name}"]`);
  const box = BOX[name];
  return { el, box, x: box.x, y: box.y, s: 1 };
}
function applyGlyph(g: Glyph) {
  g.el.setAttribute("transform", `translate(${g.x - g.box.x * g.s} ${g.y - g.box.y * g.s}) scale(${g.s})`);
}

function buildBackground() {
  const host = $("[data-bg-cols]");
  for (const c of BG_COLUMNS) {
    const p = document.createElement("p");
    p.className = "bg__col";
    p.style.cssText = `--x:${c.x};--y:${c.y};--h:${c.h}`;
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
  const urls = [...NEWS_PHOTOS, "/assets/textures/bg-main.webp"];
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
    c.style.left = `calc(${ROW[i][0]} * var(--u))`;
    c.style.top = `calc(${ROW[i][1]} * var(--u))`;
    c.style.filter = "none";
  });
}

export function runPreloader({ reduceMotion = false } = {}): Promise<void> {
  const html = document.documentElement;
  const tex = $(".bg__tex");
  const cols = buildBackground();
  const cards = buildPhotos();
  const R = glyph("R");
  const M = glyph("M");
  const mid = $$<SVGPathElement>('[data-glyph="mid"] path');
  const { h: hLines, v: vLines } = buildLines();
  const pre = $("[data-pre]");
  const count = $("[data-pre-count]");
  const bar = $("[data-pre-bar]");
  const label = $("[data-pre-label]");
  const idx = $("[data-pre-idx]");
  const ui = $$("[data-ui] > *");
  const blurs = $$<SVGFEGaussianBlurElement>(".sr-filters feGaussianBlur");

  const stopBgFlicker = startFlicker(cols, { rate: 0.006, interval: 70 });

  const finish = () => {
    settleRow(cards);
    [R, M].forEach((g) => ((g.x = g.box.x), (g.y = g.box.y), (g.s = 1), applyGlyph(g)));
    pre.remove();
    html.classList.remove("is-loading");
    startFlicker($$("[data-ui] [data-flicker]"), { rate: 0.03, interval: 120 });
  };

  if (reduceMotion) {
    finish();
    return Promise.resolve();
  }

  /* ---------- initial state ---------- */
  gsap.set(tex, { opacity: 0 });
  gsap.set(cols, { opacity: 0 });
  gsap.set(mid, { opacity: 0 });
  gsap.set(hLines, { scaleX: 0, transformOrigin: "0% 50%" });
  gsap.set(vLines, { scaleY: 0, transformOrigin: "50% 0%" });
  gsap.set(ui, { opacity: 0 });
  gsap.set([count, label], { opacity: 0 });
  [R, M].forEach((g, i) => {
    g.s = PRE_SCALE;
    g.x = i ? CENTER.M : CENTER.R;
    g.y = PRE_Y;
    applyGlyph(g);
  });
  gsap.set([R.el, M.el], { opacity: 0 });
  cards.forEach((c, i) => gsap.set(c, { x: STACK[i][0] * u(), y: STACK[i][1] * u(), opacity: 0, scale: 0.92 }));

  /* ---------- loading progress ---------- */
  let loaded = 0;
  const shown = { p: 0 };
  const assets = trackAssets((p) => (loaded = p));

  const render = () => {
    const p = Math.round(shown.p * 100);
    count.textContent = `${pad(p)}%`;
    bar.style.clipPath = `inset(0 ${100 - shown.p * 100}% 0 0)`;
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
      { x: (STACK[k][0] + dir * 70) * u(), y: (STACK[k][1] + (Math.random() * 30 - 15)) * u() },
      { x: STACK[k][0] * u(), y: STACK[k][1] * u(), duration: 0.22, ease: "expo.out", overwrite: "auto" },
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
      .to(R, { x: SPLIT.R, duration: 0.85, ease: "power4.inOut", onUpdate: () => applyGlyph(R) }, 1.45)
      .to(M, { x: SPLIT.M, duration: 0.85, ease: "power4.inOut", onUpdate: () => applyGlyph(M) }, 1.45)
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
          stopBgFlicker();
          startFlicker(cols, { rate: 0.004, interval: 110 });
          finish();
          resolve();
        },
      });
      out
        .to([count, label, bar], { keyframes: { opacity: [1, 0.2, 0.8, 0] }, duration: 0.3, ease: "steps(3)" })
        .to(R, { x: R.box.x, y: R.box.y, s: 1, duration: 1.05, ease: "power4.inOut", onUpdate: () => applyGlyph(R) }, 0.1)
        .to(M, { x: M.box.x, y: M.box.y, s: 1, duration: 1.05, ease: "power4.inOut", onUpdate: () => applyGlyph(M) }, 0.1)
        .to(hLines, { scaleX: 1, duration: 0.75, stagger: 0.05, ease: "power3.inOut" }, 0.45)
        .to(vLines, { scaleY: 1, duration: 0.75, stagger: { each: 0.03, from: "random" }, ease: "power3.inOut" }, 0.55)
        .to(mid, { keyframes: { opacity: [0, 1, 0.25, 1] }, duration: 0.35, stagger: { each: 0.06, from: "random" }, ease: "steps(3)" }, 0.95);

      cards.forEach((card, i) => {
        const blur = { v: 0 };
        out
          .to(card, { x: ROW[i][0] * u(), y: ROW[i][1] * u(), duration: 0.9, ease: "power3.inOut" }, 0.55 + i * 0.06)
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
