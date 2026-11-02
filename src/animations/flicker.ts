/**
 * Typewriter "breathing": random letters flip to upper case for a moment,
 * like a misaligned type bar. Works on any element with plain text.
 */
type Target = { chars: HTMLSpanElement[]; base: string[] };

function wrap(el: HTMLElement): Target {
  const text = el.textContent ?? "";
  if (!el.getAttribute("aria-label")) el.setAttribute("aria-label", text);
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

export function startFlicker(
  els: Iterable<HTMLElement>,
  { rate = 0.012, interval = 90, hold = [90, 260] as [number, number], chance = 1 } = {},
): () => void {
  const targets = [...els].map(wrap);
  const letters: [Target, number][] = [];
  for (const t of targets) t.base.forEach((ch, i) => /[a-z]/i.test(ch) && letters.push([t, i]));
  if (!letters.length) return () => {};

  const id = window.setInterval(() => {
    if (Math.random() > chance) return;
    const n = Math.max(1, Math.round(letters.length * rate));
    for (let k = 0; k < n; k++) {
      const [t, i] = letters[(Math.random() * letters.length) | 0];
      const ch = t.base[i];
      const flipped = ch === ch.toLowerCase() ? ch.toUpperCase() : ch.toLowerCase();
      t.chars[i].textContent = flipped;
      const back = hold[0] + Math.random() * (hold[1] - hold[0]);
      window.setTimeout(() => (t.chars[i].textContent = ch), back);
    }
  }, interval);

  return () => window.clearInterval(id);
}
