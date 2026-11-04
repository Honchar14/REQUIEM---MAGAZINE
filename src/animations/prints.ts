import { gsap } from "gsap";
import { uu } from "../viewport";

/**
 * Fingerprints follow the mouse, as in the reference: along the cursor's path
 * an inked fingertip is pressed every ~150px; it is there at once, stays for
 * about a second and fades out in half a second. The prints lie over the whole
 * page (type, lines and photos too), lightening it like powder on glass.
 *
 * The prints are made by tools/fingerprints.py, procedurally, from no real hand.
 * Mouse only: no prints for touch, and none with reduced motion.
 */
const SRC = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => `/media/prints/print-${i}.webp`);
const RATIO = 196 / 280; // print image width / height
const MAX = 14; // prints on screen at once
const STEP = 150; // design px of cursor travel between two prints
const MIN_GAP = 70; // ms between two prints, however fast the mouse moves

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export function startPrints() {
  if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  const stage = document.querySelector<HTMLElement>("[data-stage]");
  if (!stage) return;

  const layer = document.createElement("div");
  layer.className = "prints";
  layer.setAttribute("aria-hidden", "true");
  stage.appendChild(layer);
  // a full-screen "difference" layer is blended over the page on every frame:
  // it is only shown while a print is on it
  let live = 0;
  const shown = (d: number) => {
    live += d;
    layer.style.visibility = live > 0 ? "" : "hidden";
  };
  shown(0);

  // a pool of images, reused in turn; the oldest print gives way to the newest
  const pool = Array.from({ length: MAX }, () => {
    const im = new Image();
    im.alt = "";
    im.decoding = "async";
    im.draggable = false;
    layer.appendChild(im);
    return { im, tl: null as gsap.core.Timeline | null, on: false };
  });
  // warm the cache so the first prints are not blank
  SRC.forEach((s) => (new Image().src = s));

  let next = 0;
  let lastSrc = -1;
  let last: { x: number; y: number } | null = null;
  let travelled = 0;
  let lastAt = 0;

  const press = (x: number, y: number) => {
    const slot = pool[next];
    next = (next + 1) % MAX;
    slot.tl?.kill();
    if (!slot.on) {
      slot.on = true;
      shown(1);
    }
    let s: number;
    do s = (Math.random() * SRC.length) | 0;
    while (s === lastSrc);
    lastSrc = s;

    const h = rand(96, 122) * uu();
    const w = h * RATIO;
    const im = slot.im;
    im.src = SRC[s];
    gsap.set(im, {
      width: w,
      height: h,
      x: x - w / 2 + rand(-10, 10) * uu(),
      y: y - h / 2 + rand(-10, 10) * uu(),
      rotation: rand(-38, 38),
      opacity: 0,
    });
    const peak = rand(0.62, 0.85);
    slot.tl = gsap
      .timeline({
        onComplete: () => {
          slot.on = false;
          shown(-1);
        },
      })
      // pressed: there at once
      .to(im, { opacity: peak, duration: 0.06, ease: "none" })
      // stays a moment, then fades
      .to(im, { opacity: 0, duration: rand(0.4, 0.6), ease: "power1.in" }, `+=${rand(0.9, 1.15)}`);
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse" || document.hidden) return;
    // the stage is fixed to the viewport (inset: 0): client coordinates are stage coordinates
    const p = { x: e.clientX, y: e.clientY };
    if (!last) {
      last = p;
      return;
    }
    travelled += Math.hypot(p.x - last.x, p.y - last.y);
    last = p;
    const now = performance.now();
    if (travelled >= STEP * uu() && now - lastAt >= MIN_GAP) {
      press(p.x, p.y);
      travelled = 0;
      lastAt = now;
    }
  };
  window.addEventListener("pointermove", onMove, { passive: true });
  document.documentElement.addEventListener("pointerleave", () => (last = null));
}
