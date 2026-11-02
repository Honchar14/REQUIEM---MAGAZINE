/**
 * Typewriter "breathing": random letters flip to upper case for a moment,
 * like a misaligned type bar. Works on any element with plain text; the text
 * can be swapped later with setFlickerText (the language switch does).
 */
type Target = { chars: HTMLSpanElement[]; base: string[] };

function wrap(el: HTMLElement): Target {
  const text = el.textContent ?? "";
  el.setAttribute("aria-label", text);
  el.textContent = "";
  const chars: HTMLSpanElement[] = [];
  const base: string[] = [];
  for (const ch of text) {
    const s = document.createElement("span");
    s.textContent = ch;
    s.setAttribute("aria-hidden", "true");
    el.appendChild(s);
    chars.push(s);
    base.push(ch);
  }
  return { chars, base };
}

/** elements that are flickering → their letters and the flicker that owns them */
const owners = new WeakMap<HTMLElement, { t: Target; rebuild: () => void }>();

/** Replaces the text of an element, keeping its flicker running on the new letters. */
export function setFlickerText(el: HTMLElement, text: string) {
  const o = owners.get(el);
  el.textContent = text;
  if (!o) return;
  const fresh = wrap(el);
  o.t.chars = fresh.chars;
  o.t.base = fresh.base;
  o.rebuild();
}

export function startFlicker(
  els: Iterable<HTMLElement>,
  { rate = 0.012, interval = 90, hold = [90, 260] as [number, number], chance = 1 } = {},
): () => void {
  let letters: [Target, number][] = [];
  const targets: Target[] = [];
  const rebuild = () => {
    letters = [];
    for (const t of targets) t.base.forEach((ch, i) => /\p{L}/u.test(ch) && letters.push([t, i]));
  };
  for (const el of els) {
    const t = wrap(el);
    targets.push(t);
    owners.set(el, { t, rebuild });
  }
  rebuild();

  const id = window.setInterval(() => {
    if (!letters.length || Math.random() > chance) return;
    const n = Math.max(1, Math.round(letters.length * rate));
    for (let k = 0; k < n; k++) {
      const [t, i] = letters[(Math.random() * letters.length) | 0];
      const span = t.chars[i];
      const ch = t.base[i];
      if (!span) continue;
      const flipped = ch === ch.toLowerCase() ? ch.toUpperCase() : ch.toLowerCase();
      span.textContent = flipped;
      const back = hold[0] + Math.random() * (hold[1] - hold[0]);
      // put back the letter this span was given, even if the text was swapped since
      window.setTimeout(() => (span.textContent = ch), back);
    }
  }, interval);

  return () => window.clearInterval(id);
}
