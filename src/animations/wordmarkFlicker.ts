import { gsap } from "gsap";

/**
 * REQUIEM never sits completely still: every couple of seconds a letter (now
 * and then two) flickers in the site's stepped style, like a failing sign or a
 * frame jumping in the projector, the same blink the letters land with in the
 * preloader. Opacity only, so the wordmark's layout is never touched.
 */
const PATTERNS = [
  // a stutter: dims twice and comes back
  { opacity: [1, 0.15, 1, 0.35, 1], duration: 0.42, steps: 4 },
  // a short blackout
  { opacity: [1, 0, 0, 1], duration: 0.26, steps: 3 },
  // a single quick blink
  { opacity: [1, 0.2, 1], duration: 0.16, steps: 2 },
  // goes out, tries to come back, goes out, lands
  { opacity: [1, 0, 0.7, 0, 1], duration: 0.5, steps: 4 },
];

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export function startWordmarkFlicker({ minGap = 1.2, maxGap = 3.4 } = {}) {
  const letters = [
    ...document.querySelectorAll<SVGElement>('[data-wordmark] [data-glyph="R"], [data-wordmark] [data-glyph="mid"] path, [data-wordmark] [data-glyph="M"]'),
  ];
  if (!letters.length) return;
  let last = -1;

  const blink = (el: SVGElement) => {
    const p = PATTERNS[(Math.random() * PATTERNS.length) | 0];
    gsap.fromTo(el, { opacity: 1 }, { keyframes: { opacity: p.opacity }, duration: p.duration, ease: `steps(${p.steps})`, overwrite: "auto" });
  };

  const loop = () => {
    if (!document.hidden) {
      let i: number;
      do i = (Math.random() * letters.length) | 0;
      while (i === last);
      last = i;
      blink(letters[i]);
      // sometimes a second letter catches it a beat later
      if (Math.random() < 0.25) {
        let j: number;
        do j = (Math.random() * letters.length) | 0;
        while (j === i);
        gsap.delayedCall(rand(0.05, 0.18), () => blink(letters[j]));
      }
    }
    window.setTimeout(loop, rand(minGap, maxGap) * 1000);
  };
  window.setTimeout(loop, rand(1, 2) * 1000);
}
