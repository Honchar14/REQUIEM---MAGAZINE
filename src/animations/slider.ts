import { gsap } from "gsap";
import { SLIDES, type Story } from "../content";
import { uu } from "../viewport";

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
 *   the glass card rises from the bottom; the title decodes letter by letter,
 *   the rest is struck in like the typewriter labels and the underline draws.
 *   The autoplay waits while a card is open.
 */

/** card i (in the order the preloader deals them) → its slot on screen, left to right */
const SLOT_OF_CARD = [1, 0, 2, 3, 4];
/** ring position in the pager for each page (layout x − 485) */
const RING_X = [98, 163, 225, 288, 351];
const PAGE_TIME = 7; // seconds a page plays before the next one
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/&%";

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

/** The title resolves from random glyphs, left to right. */
function decode(el: HTMLElement, text: string, duration = 0.42) {
  const chars = [...text.toUpperCase()];
  const o = { p: 0 };
  return gsap.to(o, {
    p: 1,
    duration,
    ease: `steps(${Math.max(8, chars.length * 2)})`,
    onUpdate: () => {
      const n = Math.floor(o.p * chars.length);
      el.textContent = chars
        .map((ch, k) => (k < n || !/[A-Z0-9]/.test(ch) ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0]))
        .join("");
    },
    onComplete: () => {
      el.textContent = text;
    },
  });
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
      .add(decode(title, c.story.title), 0.1)
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
  const swapCard = (c: Card, story: Story, dir: number) => {
    const next = imgFor(story.photo);
    const prev = c.img;
    const b = { v: 0 };
    const setBlur = () => c.blur?.setAttribute("stdDeviation", `${b.v.toFixed(1)} 0`);
    return gsap
      .timeline({
        onStart: () => {
          c.card.style.filter = `url(#mblur-${c.i})`;
          next.hidden = false;
          c.card.insertBefore(next, c.info.el);
          gsap.set(next, { xPercent: dir * 22, opacity: 0, zIndex: 2 });
          gsap.set(prev, { zIndex: 1 });
        },
        onComplete: () => {
          prev.remove();
          gsap.set(next, { clearProps: "transform,opacity,filter,zIndex" });
          c.card.style.filter = "none";
        },
      })
      .to(prev, { xPercent: -dir * 16, duration: 0.2, ease: "power2.in" }, 0)
      .to(b, { v: 36, duration: 0.2, ease: "power2.in", onUpdate: setBlur }, 0)
      .set(next, { opacity: 1 }, 0.12)
      .to(next, { xPercent: 0, duration: 0.38, ease: "expo.out" }, 0.12)
      .fromTo(next, { filter: "brightness(2.1) contrast(1.25)" }, { filter: "brightness(1) contrast(1)", duration: 0.4, ease: "expo.out" }, 0.12)
      .to(b, { v: 0, duration: 0.38, ease: "expo.out", onUpdate: setBlur }, 0.12)
      .add(() => {
        c.img = next;
        writeInfo(c, story);
        if (c.open) openCard(c);
      }, 0.14);
  };

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
    // the strip advances frame by frame in the direction of travel
    state.forEach((c, k) => {
      const order = dir > 0 ? c.slot : 4 - c.slot;
      tl.add(swapCard(c, stories[k], dir), 0.08 + order * 0.07);
    });
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
