import { gsap } from "gsap";

/** Splits an element's text into per-letter spans. */
export function splitChars(el: HTMLElement): HTMLSpanElement[] {
  const text = el.textContent ?? "";
  el.textContent = "";
  el.setAttribute("aria-label", text);
  return [...text].map((ch) => {
    const span = document.createElement("span");
    span.className = "char";
    span.setAttribute("aria-hidden", "true");
    span.textContent = ch;
    el.appendChild(span);
    return span;
  });
}

/** First-screen intro: letters of the wordmark flicker in like a bad projector. */
export function introWordmark(): gsap.core.Timeline | null {
  const el = document.querySelector<HTMLElement>('[data-anim="wordmark"]');
  if (!el) return null;

  const chars = splitChars(el);
  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

  tl.from(chars, {
    yPercent: 40,
    opacity: 0,
    filter: "blur(8px)",
    duration: 0.9,
    stagger: { each: 0.06, from: "random" },
  })
    .to(chars, { opacity: 0.35, duration: 0.05, repeat: 3, yoyo: true, stagger: { each: 0.03, from: "random" } }, "-=0.2")
    .from('[data-anim="fade"]', { opacity: 0, y: 12, duration: 0.8 }, "-=0.3")
    .from(".topbar > *", { opacity: 0, y: -10, duration: 0.6, stagger: 0.08 }, "-=0.6");

  return tl;
}
