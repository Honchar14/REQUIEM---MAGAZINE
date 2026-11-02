import { gsap } from "gsap";
import { SLIDES, type Story } from "../content";
import { uu, ux, uy } from "../viewport";

/**
 * "Last news" slider: five pages of five stories in the photo strip.
 *
 * - Pager: the ring sits on the page number and fills up (faint ring + white
 *   arc, as in the layout) while the page plays; when it is full the next page
 *   comes in. Clicking a number or ←/→ jumps there; the ring hops over with a
 *   horizontal motion blur.
 * - Page change: like a film gate advancing, frame by frame across the strip.
 *   Each photo is knocked out sideways with a hard motion blur, the next one
 *   slams in from the other side on an overexposed flash.
 * - Hover (or keyboard focus) on a story: the photo drops to black and white and
 *   the glass card rises from the bottom; the title flickers in letter by
 *   letter, the rest is struck in like the typewriter labels and the underline draws.
 *   The autoplay waits while a card is open.
 */

/** card i (in the order the preloader deals them) → its slot on screen, left to right */
const SLOT_OF_CARD = [1, 0, 2, 3, 4];
/** ring position in the pager for each page (layout x − 485) */
const RING_X = [98, 163, 225, 288, 351];
const SLOT_X = [-2, 384, 770, 1156, 1542]; // layout x of each slot
const params = new URLSearchParams(location.search);
// ?slidedemo: short pages, for previews
const PAGE_TIME = params.has("slidedemo") ? 2.4 : 7; // seconds a page plays before the next one

/**
 * Five ways to change pages, picked with ?slide= (name or 1–5); "film" by default.
 *   1 film    — the strip advances frame by frame: knocked out sideways with a hard
 *               motion blur, the next photo slams in on an overexposed flash
 *   2 flicker — photos blink out and back in, in random order, in the stepped
 *               flicker of the wordmark letters
 *   3 shutter — black slats drop over each photo like blinds and lift off the next one
 *   4 scan    — a photocopier light bar sweeps across each card, the next photo
 *               printed in behind it
 *   5 deal    — the five cards gather into a pile, shuffle, and are dealt back out
 *               with the new stories, as in the preloader
 */
const TRANSITIONS = ["film", "flicker", "shutter", "scan", "deal"] as const;
type Transition = (typeof TRANSITIONS)[number];
const pickTransition = (): Transition => {
  const v = params.get("slide") ?? "";
  const n = Number(v);
  if (n >= 1 && n <= TRANSITIONS.length) return TRANSITIONS[n - 1];
  return (TRANSITIONS as readonly string[]).includes(v) ? (v as Transition) : "film";
};

type Info = {
  el: HTMLElement;
  title: HTMLElement;
  sub: HTMLElement;
  body: HTMLElement;
  more: HTMLAnchorElement;
  line: HTMLElement;
  date: HTMLElement;
};
type Card = {
  i: number;
  card: HTMLElement;
  slot: number;
  img: HTMLImageElement;
  info: Info;
  story: Story;
  open: boolean;
  tl?: gsap.core.Animation;
  blur: SVGFEGaussianBlurElement | null;
};

function buildInfo(card: HTMLElement): Info {
  const el = document.createElement("div");
  el.className = "photo__info";
  el.innerHTML =
    '<h3 class="pi__title"></h3><p class="pi__sub"></p><p class="pi__body"></p>' +
    '<a class="pi__more" href="#">Read more<img class="pi__arrow" src="/media/icons/arrow-more.svg" alt="" /><i class="pi__line"></i></a>' +
    '<p class="pi__date"></p>';
  card.appendChild(el);
  const q = <T extends HTMLElement>(s: string) => el.querySelector<T>(s)!;
  return {
    el,
    title: q(".pi__title"),
    sub: q(".pi__sub"),
    body: q(".pi__body"),
    more: q<HTMLAnchorElement>(".pi__more"),
    line: q(".pi__line"),
    date: q(".pi__date"),
  };
}

function writeInfo(c: Card, story: Story) {
  c.story = story;
  const { title, sub, body, more, date } = c.info;
  title.textContent = story.title;
  sub.textContent = story.sub;
  body.textContent = story.body;
  date.textContent = story.date;
  more.href = story.href ?? "#";
  more.setAttribute("aria-label", `Read more: ${story.title}, ${story.sub}`);
  c.img.alt = `${story.title}: ${story.sub}`;
}

/** The title flickers in letter by letter, in random order, like the wordmark letters in the preloader. */
function flickerIn(el: HTMLElement, text: string) {
  el.textContent = "";
  const letters = [...text].map((ch) => {
    const s = document.createElement("span");
    s.textContent = ch;
    el.appendChild(s);
    return s;
  });
  return gsap.fromTo(
    letters.filter((s) => s.textContent !== " "),
    { opacity: 0 },
    { keyframes: { opacity: [0, 1, 0.25, 1] }, duration: 0.35, ease: "steps(3)", stagger: { each: 0.04, from: "random" } },
  );
}

export function initSlider({ reduceMotion = false } = {}) {
  const cards = [...document.querySelectorAll<HTMLElement>("[data-photos] .photo")];
  const pager = document.querySelector<HTMLElement>("[data-pager]");
  const ring = pager?.querySelector<HTMLElement>("[data-ring]");
  const fill = ring?.querySelector<HTMLElement>(".ui__ring-fill");
  if (!pager || !ring || !fill || cards.length !== 5) return;
  const buttons = [...pager.querySelectorAll<HTMLButtonElement>("[data-page]")];
  const ringBlur = document.querySelector<SVGFEGaussianBlurElement>("#mblur-ring feGaussianBlur");

  /* ---------- photos: one cached element per story, the other pages load in the background ---------- */
  const cache = new Map<string, HTMLImageElement>();
  const imgFor = (src: string) => {
    let im = cache.get(src);
    if (!im) {
      im = new Image();
      im.decoding = "async";
      im.alt = "";
      im.src = src;
      cache.set(src, im);
    }
    return im;
  };
  const ready = (im: HTMLImageElement) =>
    im.complete && im.naturalWidth ? Promise.resolve() : im.decode().catch(() => {});

  const state: Card[] = cards.map((card, i) => {
    const slot = SLOT_OF_CARD[i];
    const story = SLIDES[0][slot];
    // the preloader leaves every photo in every card; keep only the one on show
    const imgs = [...card.querySelectorAll("img")];
    const img = imgs.find((im) => !im.hidden) ?? imgs[0];
    imgs.forEach((im) => im !== img && im.remove());
    cache.set(story.photo, img);
    const c: Card = { i, card, slot, img, story, open: false, info: buildInfo(card), blur: document.querySelector(`#mblur-${i} feGaussianBlur`) };
    writeInfo(c, story);
    gsap.set(c.info.el, { y: 0, yPercent: 101 });
    return c;
  });
  // the grid lines run over the photos, as in the layout: the strip gets its own
  // stacking layer so the cards' z-index can no longer lift them above the lines
  const host = cards[0].parentElement;
  if (host) host.style.zIndex = "0";
  // keyboard order follows the screen, left to right
  [...state].sort((a, b) => a.slot - b.slot).forEach((c) => c.card.parentElement?.appendChild(c.card));
  window.setTimeout(() => SLIDES.slice(1).flat().forEach((s) => imgFor(s.photo)), 400);

  /* ---------- hover card ---------- */
  const openCard = (c: Card) => {
    c.open = true;
    c.card.classList.add("is-open");
    c.tl?.kill();
    const { el, title, sub, body, more, date, line } = c.info;
    if (reduceMotion) {
      gsap.set(el, { yPercent: 0 });
      return;
    }
    const lift = 8 * uu();
    const rest = [sub, body, more, date];
    c.tl = gsap
      .timeline()
      .to(el, { yPercent: 0, duration: 0.55, ease: "expo.out" }, 0)
      .add(flickerIn(title, c.story.title), 0.12)
      .fromTo(rest, { opacity: 0 }, { keyframes: { opacity: [0, 1, 0.35, 1] }, duration: 0.3, ease: "steps(3)", stagger: 0.06 }, 0.16)
      .fromTo(rest, { y: lift }, { y: 0, duration: 0.5, ease: "expo.out", stagger: 0.06 }, 0.16)
      .fromTo(line, { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: "expo.out" }, 0.34);
  };
  const closeCard = (c: Card) => {
    c.open = false;
    c.card.classList.remove("is-open");
    c.tl?.kill();
    c.info.title.textContent = c.story.title;
    c.tl = gsap.to(c.info.el, { yPercent: 101, duration: reduceMotion ? 0 : 0.3, ease: "power3.in" });
    syncPause();
  };
  for (const c of state) {
    c.card.addEventListener("pointerenter", () => (openCard(c), syncPause()));
    c.card.addEventListener("pointerleave", () => closeCard(c));
    c.card.addEventListener("focusin", () => !c.open && (openCard(c), syncPause()));
    c.card.addEventListener("focusout", (e) => !c.card.contains(e.relatedTarget as Node) && closeCard(c));
  }

  /* ---------- pager ring ---------- */
  const ringState = { x: RING_X[0], blur: 0, p: 0 };
  const drawRing = () => {
    ring.style.setProperty("--ix", ringState.x.toFixed(2));
    fill.style.setProperty("--p", `${ringState.p.toFixed(2)}deg`);
    ringBlur?.setAttribute("stdDeviation", `${ringState.blur.toFixed(2)} 0`);
  };

  let page = 0;
  let busy = false;
  let progress: gsap.core.Tween | undefined;
  const paused = () => document.hidden || state.some((c) => c.open);
  function syncPause() {
    if (!progress) return;
    if (paused()) progress.pause();
    else progress.resume();
  }
  const startProgress = () => {
    progress?.kill();
    ringState.p = 0;
    drawRing();
    if (reduceMotion) return;
    progress = gsap.to(ringState, { p: 360, duration: PAGE_TIME, ease: "none", onUpdate: drawRing, onComplete: () => go((page + 1) % SLIDES.length, 1) });
    syncPause();
  };
  document.addEventListener("visibilitychange", syncPause);

  /* ---------- page change ---------- */
  type Swap = { c: Card; story: Story; next: HTMLImageElement; prev: HTMLImageElement };
  /** puts the next photo into the card, under the info card and above the current one */
  const mount = (w: Swap, vars: gsap.TweenVars = {}) => {
    w.next.hidden = false;
    w.c.card.insertBefore(w.next, w.c.info.el);
    gsap.set(w.next, { zIndex: 2, ...vars });
    gsap.set(w.prev, { zIndex: 1 });
  };
  /** the next photo is now the card's photo, with its story */
  const commit = (w: Swap) => {
    w.c.img = w.next;
    writeInfo(w.c, w.story);
    if (w.c.open) openCard(w.c);
  };
  const cleanup = (w: Swap) => {
    w.prev.remove();
    gsap.set(w.next, { clearProps: "transform,opacity,filter,zIndex,clipPath" });
    w.c.card.style.filter = "none";
  };
  const blurOf = (c: Card) => (v: number) => c.blur?.setAttribute("stdDeviation", `${v.toFixed(1)} 0`);
  /** position in the direction of travel: 0 for the first card to change */
  const orderOf = (c: Card, dir: number) => (dir > 0 ? c.slot : 4 - c.slot);
  const overlay = (c: Card, cls: string, html = "") => {
    let el = c.card.querySelector<HTMLElement>(`.${cls}`);
    if (!el) {
      el = document.createElement("div");
      el.className = cls;
      el.innerHTML = html;
      c.card.insertBefore(el, c.info.el);
    }
    return el;
  };

  const RUN: Record<Transition, (tl: gsap.core.Timeline, swaps: Swap[], dir: number) => void> = {
    film(tl, swaps, dir) {
      for (const w of swaps) {
        const b = { v: 0 };
        const blur = blurOf(w.c);
        const sub = gsap
          .timeline({
            onStart: () => {
              w.c.card.style.filter = `url(#mblur-${w.c.i})`;
              mount(w, { xPercent: dir * 22, opacity: 0 });
            },
            onComplete: () => cleanup(w),
          })
          .to(w.prev, { xPercent: -dir * 16, duration: 0.2, ease: "power2.in" }, 0)
          .to(b, { v: 36, duration: 0.2, ease: "power2.in", onUpdate: () => blur(b.v) }, 0)
          .set(w.next, { opacity: 1 }, 0.12)
          .to(w.next, { xPercent: 0, duration: 0.38, ease: "expo.out" }, 0.12)
          .fromTo(w.next, { filter: "brightness(2.1) contrast(1.25)" }, { filter: "brightness(1) contrast(1)", duration: 0.4, ease: "expo.out" }, 0.12)
          .to(b, { v: 0, duration: 0.38, ease: "expo.out", onUpdate: () => blur(b.v) }, 0.12)
          .add(() => commit(w), 0.14);
        tl.add(sub, 0.08 + orderOf(w.c, dir) * 0.07);
      }
    },

    flicker(tl, swaps) {
      const order = [...swaps].sort(() => Math.random() - 0.5);
      order.forEach((w, k) => {
        const sub = gsap
          .timeline({ onStart: () => mount(w, { opacity: 0 }), onComplete: () => cleanup(w) })
          .to(w.prev, { keyframes: { opacity: [1, 0.15, 1, 0] }, duration: 0.26, ease: "steps(3)" }, 0)
          .add(() => commit(w), 0.3)
          .fromTo(w.next, { opacity: 0 }, { keyframes: { opacity: [0, 1, 0.25, 1] }, duration: 0.32, ease: "steps(3)" }, 0.32)
          .fromTo(w.next, { filter: "brightness(1.9) contrast(1.2)" }, { filter: "brightness(1) contrast(1)", duration: 0.32, ease: "steps(3)" }, 0.32);
        tl.add(sub, 0.08 + k * 0.07);
      });
    },

    shutter(tl, swaps, dir) {
      const SLATS = 7;
      for (const w of swaps) {
        const blinds = overlay(w.c, "photo__blinds", "<i></i>".repeat(SLATS));
        const slats = [...blinds.children] as HTMLElement[];
        const sub = gsap
          .timeline({ onComplete: () => cleanup(w) })
          .fromTo(slats, { scaleY: 0, transformOrigin: "50% 0%" }, { scaleY: 1, duration: 0.17, ease: "power3.in", stagger: 0.028 }, 0)
          .add(() => {
            mount(w);
            w.prev.style.opacity = "0";
            commit(w);
          }, 0.17 + 0.028 * (SLATS - 1) + 0.04)
          .set(slats, { transformOrigin: "50% 100%" }, ">")
          .to(slats, { scaleY: 0, duration: 0.22, ease: "power3.out", stagger: 0.028 }, ">+0.04")
          .fromTo(w.next, { filter: "brightness(1.6)" }, { filter: "brightness(1)", duration: 0.4, ease: "expo.out" }, "<");
        tl.add(sub, 0.08 + orderOf(w.c, dir) * 0.06);
      }
    },

    scan(tl, swaps, dir) {
      for (const w of swaps) {
        const bar = overlay(w.c, "photo__scan");
        const p = { v: 0 };
        // the bar travels across; the next photo is revealed up to the bar
        const draw = () => {
          const at = dir > 0 ? p.v : 1 - p.v;
          w.next.style.clipPath = dir > 0 ? `inset(0 ${(1 - at) * 100}% 0 0)` : `inset(0 0 0 ${at * 100}%)`;
          bar.style.left = `${at * 100}%`;
        };
        const sub = gsap
          .timeline({
            onStart: () => {
              mount(w);
              draw();
            },
            onComplete: () => {
              gsap.set(bar, { opacity: 0 });
              cleanup(w);
            },
          })
          .set(bar, { opacity: 1 }, 0)
          .to(p, { v: 1, duration: 0.6, ease: "power2.inOut", onUpdate: draw }, 0)
          .fromTo(w.next, { filter: "brightness(1.7) contrast(1.3) grayscale(0.6)" }, { filter: "brightness(1) contrast(1) grayscale(0)", duration: 0.75, ease: "power2.out" }, 0)
          .add(() => commit(w), 0.3)
          .to(bar, { opacity: 0, duration: 0.12, ease: "steps(2)" }, 0.58);
        tl.add(sub, 0.08 + orderOf(w.c, dir) * 0.09);
      }
    },

    deal(tl, swaps, dir) {
      const mid = SLOT_X[2];
      const z = swaps.map((w) => w.c.card.style.zIndex);
      // the outer cards travel furthest: pile them in from the outside in
      const pileOrder = [...swaps].sort((a, b) => Math.abs(SLOT_X[b.c.slot] - mid) - Math.abs(SLOT_X[a.c.slot] - mid));
      const g = 0.05;
      pileOrder.forEach((w, k) => {
        const b = { v: 0 };
        const blur = blurOf(w.c);
        const dx = (mid - SLOT_X[w.c.slot]) * ux();
        tl.add(() => {
          w.c.card.style.zIndex = String(40 + k);
          w.c.card.style.filter = `url(#mblur-${w.c.i})`;
        }, g + k * 0.04)
          .to(w.c.card, { x: dx + (Math.random() * 30 - 15) * ux(), y: (Math.random() * 24 - 12) * uy(), rotation: Math.random() * 8 - 4, duration: 0.42, ease: "power3.in" }, g + k * 0.04)
          .to(b, { keyframes: { v: [0, 28, 6] }, duration: 0.42, ease: "none", easeEach: "power2.inOut", onUpdate: () => blur(b.v) }, g + k * 0.04);
      });
      // in the pile: every card takes its new photo, and the top few are shuffled with a flick
      const inPile = g + 0.42 + 0.04 * 4;
      tl.add(() => swaps.forEach((w) => (mount(w), commit(w), w.prev.remove())), inPile);
      [...pileOrder].reverse().slice(0, 3).forEach((w, k) => {
        const b = { v: 30 };
        const blur = blurOf(w.c);
        const t = inPile + 0.05 + k * 0.11;
        tl.add(() => (w.c.card.style.zIndex = String(60 + k)), t)
          .fromTo(w.c.card, { x: `+=${(k % 2 ? -1 : 1) * 60 * ux()}` }, { x: `-=${(k % 2 ? -1 : 1) * 60 * ux()}`, duration: 0.2, ease: "expo.out" }, t)
          .fromTo(b, { v: 30 }, { v: 4, duration: 0.2, ease: "power2.out", onUpdate: () => blur(b.v) }, t);
      });
      // dealt back out in the direction of travel
      const dealAt = inPile + 0.05 + 3 * 0.11 + 0.05;
      swaps.forEach((w) => {
        const b = { v: 6 };
        const blur = blurOf(w.c);
        const t = dealAt + orderOf(w.c, dir) * 0.07;
        tl.to(w.c.card, { x: 0, y: 0, rotation: 0, duration: 0.55, ease: "power3.out" }, t)
          .to(b, { keyframes: { v: [6, 30, 0] }, duration: 0.55, ease: "none", easeEach: "power2.inOut", onUpdate: () => blur(b.v) }, t)
          .fromTo(w.next, { filter: "brightness(1.5)" }, { filter: "brightness(1)", duration: 0.5, ease: "expo.out" }, t + 0.25)
          .add(() => {
            gsap.set(w.c.card, { clearProps: "transform" });
            w.c.card.style.zIndex = z[swaps.indexOf(w)];
            cleanup(w);
          }, t + 0.56);
      });
    },
  };
  const transition = pickTransition();

  async function go(target: number, dir: number) {
    if (busy || target === page) return;
    busy = true;
    progress?.kill();
    progress = undefined;
    page = target;
    buttons.forEach((btn, k) => (k === page ? btn.setAttribute("aria-current", "true") : btn.removeAttribute("aria-current")));
    const stories = state.map((c) => SLIDES[target][c.slot]);

    if (reduceMotion) {
      state.forEach((c, k) => {
        const next = imgFor(stories[k].photo);
        next.hidden = false;
        c.card.replaceChild(next, c.img);
        c.img = next;
        writeInfo(c, stories[k]);
      });
      ringState.x = RING_X[target];
      drawRing();
      busy = false;
      startProgress();
      return;
    }

    // never cut to a frame that has not arrived yet
    await Promise.race([Promise.all(stories.map((s) => ready(imgFor(s.photo)))), new Promise((r) => setTimeout(r, 1500))]);

    ring!.style.filter = "url(#mblur-ring)";
    const tl = gsap.timeline({
      onComplete: () => {
        ring!.style.filter = "";
        busy = false;
        startProgress();
      },
    });
    // the ring drains, then hops to the new number with a motion blur
    tl.to(ringState, { p: 0, duration: 0.22, ease: "power2.in", onUpdate: drawRing }, 0)
      .to(ringState, { x: RING_X[target], duration: 0.5, ease: "expo.inOut", onUpdate: drawRing }, 0.05)
      .to(ringState, { keyframes: { blur: [0, 7, 0] }, duration: 0.5, ease: "none", easeEach: "power2.inOut", onUpdate: drawRing }, 0.05);
    // the strip changes, in the chosen style
    const swaps: Swap[] = state.map((c, k) => ({ c, story: stories[k], next: imgFor(stories[k].photo), prev: c.img }));
    if (transition === "deal") state.filter((c) => c.open).forEach(closeCard);
    RUN[transition](tl, swaps, dir);
  }

  buttons.forEach((btn, k) => btn.addEventListener("click", () => go(k, k > page ? 1 : -1)));
  document.addEventListener("keydown", (e) => {
    const t = e.target as HTMLElement;
    if (t.closest("input, textarea, [contenteditable]")) return;
    if (e.key === "ArrowRight") go((page + 1) % SLIDES.length, 1);
    if (e.key === "ArrowLeft") go((page + SLIDES.length - 1) % SLIDES.length, -1);
  });

  drawRing();
  gsap.delayedCall(0.6, startProgress);
}
