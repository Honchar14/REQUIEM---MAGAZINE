import { isTyping } from "./typewriter";

/**
 * Typewriter "breathing": random letters flip to upper case for a moment,
 * like a misaligned type bar. Works on any element with plain text.
 *
 * One shared clock drives every flickering element: letters are flipped and
 * put back in the same tick (no timer per letter), nothing runs while the tab
 * is hidden, and an element whose text was replaced (language switch, retype)
 * is re-split by itself as soon as nobody is typing into it.
 */
type Target = { el: HTMLElement; chars: HTMLSpanElement[]; base: string[]; letters: number[] };
type Group = { targets: Target[]; rate: number; interval: number; hold: [number, number]; chance: number; next: number };
type Flip = { span: HTMLSpanElement; ch: string; at: number };

const TICK = 40; // ms
const groups: Group[] = [];
const flips: Flip[] = [];
const owner = new WeakMap<HTMLElement, Target>();
let clock = 0;

function wrap(t: Target) {
  const text = t.el.textContent ?? "";
  t.el.setAttribute("aria-label", text);
  const frag = document.createDocumentFragment();
  t.chars = [];
  t.base = [];
  t.letters = [];
  let i = 0;
  for (const ch of text) {
    const s = document.createElement("span");
    s.textContent = ch;
    s.setAttribute("aria-hidden", "true");
    frag.appendChild(s);
    t.chars.push(s);
    t.base.push(ch);
    if (/\p{L}/u.test(ch)) t.letters.push(i);
    i++;
  }
  t.el.replaceChildren(frag);
}

/** the element's own letters are still in place (nobody replaced its text) */
const intact = (t: Target) => t.chars.length > 0 && t.chars[0].parentNode === t.el;

function tick() {
  const now = performance.now();
  // put back letters whose moment is over
  for (let k = flips.length - 1; k >= 0; k--) {
    const f = flips[k];
    if (f.at <= now) {
      f.span.textContent = f.ch;
      flips[k] = flips[flips.length - 1];
      flips.pop();
    }
  }
  if (document.hidden) return;
  for (const g of groups) {
    if (now < g.next) continue;
    g.next = now + g.interval;
    if (Math.random() > g.chance) continue;
    // re-split any element whose text was swapped, once it is no longer being typed
    let total = 0;
    for (const t of g.targets) {
      if (!intact(t)) {
        if (isTyping(t.el) || !t.el.isConnected) continue;
        wrap(t);
      }
      total += t.letters.length;
    }
    if (!total) continue;
    const n = Math.max(1, Math.round(total * g.rate));
    for (let k = 0; k < n; k++) {
      let r = (Math.random() * total) | 0;
      const t = g.targets.find((t) => intact(t) && (r -= t.letters.length) < 0);
      if (!t) continue;
      const i = t.letters[r + t.letters.length];
      const span = t.chars[i];
      const ch = t.base[i];
      if (!span || span.textContent !== ch) continue; // already flipped
      span.textContent = ch === ch.toLowerCase() ? ch.toUpperCase() : ch.toLowerCase();
      flips.push({ span, ch, at: now + g.hold[0] + Math.random() * (g.hold[1] - g.hold[0]) });
    }
  }
}

/** Replaces the text of an element; a flickering element picks up the new letters by itself. */
export function setFlickerText(el: HTMLElement, text: string) {
  el.textContent = text;
  const t = owner.get(el);
  if (t && !isTyping(el)) wrap(t);
}

export function startFlicker(
  els: Iterable<HTMLElement>,
  { rate = 0.012, interval = 90, hold = [90, 260] as [number, number], chance = 1 } = {},
): () => void {
  const targets: Target[] = [];
  for (const el of els) {
    const t: Target = { el, chars: [], base: [], letters: [] };
    if (!isTyping(el)) wrap(t);
    owner.set(el, t);
    targets.push(t);
  }
  const g: Group = { targets, rate, interval, hold, chance, next: 0 };
  groups.push(g);
  if (!clock) clock = window.setInterval(tick, TICK);
  return () => {
    groups.splice(groups.indexOf(g), 1);
    if (!groups.length) {
      window.clearInterval(clock);
      clock = 0;
    }
  };
}
