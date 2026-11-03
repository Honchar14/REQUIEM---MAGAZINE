import { gsap } from "gsap";
import { uu } from "../viewport";

/**
 * Fingerprints follow the mouse: every so often along the cursor's path a
 * print is left on the dark surface, like a latent print under side light.
 * It surfaces slowly out of a soft blur, holds, and slowly fades away.
 *
 * The prints live on the background (behind the photos, the lines and the
 * type) and are made by tools/fingerprints.py, procedurally, from no real hand.
 * Mouse only: no prints for touch, and none with reduced motion.
 */
const SRC = [1, 2, 3, 4, 5, 6].map((i) => `/media/prints/print-${i}.webp`);
const MAX = 9; // prints on screen at once
const STEP = 230; // design px of cursor travel between two prints
const MIN_GAP = 140; // ms between two prints, however fast the mouse moves

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export function startPrints() {
  if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  const stage = document.querySelector<HTMLElement>("[data-stage]");
  const before = stage?.querySelector("[data-photos]");
  if (!stage || !before) return;

  const layer = document.createElement("div");
  layer.className = "prints";
  layer.setAttribute("aria-hidden", "true");
  stage.insertBefore(layer, before);

  // a small pool of images, reused in turn; the oldest print gives way to the newest
  const pool = Array.from({ length: MAX }, () => {
    const im = new Image();
    im.alt = "";
    im.decoding = "async";
    im.draggable = false;
    layer.appendChild(im);
    return { im, tl: null as gsap.core.Timeline | null };
  });
  // warm the cache so the first prints are not blank
  SRC.forEach((s) => (new Image().src = s));

  let next = 0;
  let lastSrc = -1;
  let last: { x: number; y: number } | null = null;
  let travelled = 0;
  let lastAt = 0;

  const leave = (x: number, y: number, angle: number) => {
    const slot = pool[next];
    next = (next + 1) % MAX;
    slot.tl?.kill();
    let s: number;
    do s = (Math.random() * SRC.length) | 0;
    while (s === lastSrc);
    lastSrc = s;

    const h = rand(190, 250) * uu();
    const w = h * (340 / 420);
    const im = slot.im;
    im.src = SRC[s];
    // tipped the way the hand travels, never quite straight
    const rot = (angle * 180) / Math.PI * 0.25 + rand(-34, 34);
    const peak = rand(0.5, 0.72);
    gsap.set(im, {
      width: w,
      height: h,
      x: x - w / 2 + rand(-18, 18) * uu(),
      y: y - h / 2 + rand(-18, 18) * uu(),
      rotation: rot,
      scale: rand(1.04, 1.08),
      opacity: 0,
      filter: "blur(3px) brightness(1.4)",
    });
    slot.tl = gsap
      .timeline()
      // surfaces slowly, as if the powder were taking
      .to(im, { opacity: peak, scale: 1, filter: "blur(0px) brightness(1)", duration: rand(1.1, 1.5), ease: "sine.out" })
      // holds, then slowly gives up
      .to(im, { opacity: 0, filter: "blur(1.5px) brightness(1)", duration: rand(2.6, 3.4), ease: "sine.inOut" }, `+=${rand(0.7, 1.3)}`)
      .set(im, { clearProps: "filter" });
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse" || document.hidden) return;
    const r = stage.getBoundingClientRect();
    const p = { x: e.clientX - r.left, y: e.clientY - r.top };
    if (!last) {
      last = p;
      return;
    }
    const dx = p.x - last.x;
    const dy = p.y - last.y;
    travelled += Math.hypot(dx, dy);
    const now = performance.now();
    if (travelled >= STEP * uu() && now - lastAt >= MIN_GAP) {
      leave(p.x, p.y, Math.atan2(dy, dx));
      travelled = 0;
      lastAt = now;
    }
    last = p;
  };
  window.addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("pointerleave", () => (last = null));
}
