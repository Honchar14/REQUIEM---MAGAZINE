/**
 * Typewriter reveal: characters are struck one by one with an uneven rhythm,
 * each landing with a short ink flash. Layout never shifts: every character
 * is in place from the start, only hidden, so right-aligned labels type
 * left-to-right without moving.
 */
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rand = (a: number, b: number) => a + Math.random() * (b - a);

type Opts = { min?: number; max?: number };

async function typeElement(el: HTMLElement, { min = 28, max = 70 }: Opts) {
  const text = el.textContent ?? "";
  el.textContent = "";
  const spans = [...text].map((ch) => {
    const s = document.createElement("span");
    s.textContent = ch;
    s.style.visibility = "hidden";
    el.appendChild(s);
    return s;
  });
  el.style.visibility = "visible";
  for (const s of spans) {
    s.style.visibility = "visible";
    if (s.textContent !== " ") {
      // the strike: dark for a frame, then full ink
      s.style.opacity = "0.35";
      requestAnimationFrame(() => (s.style.opacity = ""));
      await wait(rand(min, max));
    }
  }
  el.textContent = text; // back to plain text for anything that follows (flicker)
}

async function typePlaceholder(input: HTMLInputElement, { min = 28, max = 70 }: Opts) {
  const text = input.placeholder;
  input.placeholder = "";
  input.style.visibility = "visible";
  for (let i = 1; i <= text.length; i++) {
    input.placeholder = text.slice(0, i);
    await wait(rand(min, max));
  }
}

/** Hides the targets now; call the returned function to type them in order with overlap. */
export function prepareTypewriter(targets: (HTMLElement | HTMLInputElement)[], { stagger = 110, ...opts }: Opts & { stagger?: number } = {}) {
  // reading order: row by row from the top, left to right
  const pos = (t: HTMLElement) => t.getBoundingClientRect();
  targets = [...targets].sort((a, b) => Math.round(pos(a).top / 30) - Math.round(pos(b).top / 30) || pos(a).left - pos(b).left);
  for (const t of targets) t.style.visibility = "hidden";
  return () =>
    Promise.all(
      targets.map(async (t, i) => {
        await wait(i * stagger + rand(0, 40));
        if (t instanceof HTMLInputElement) await typePlaceholder(t, opts);
        else await typeElement(t, opts);
      }),
    ).then(() => {});
}
