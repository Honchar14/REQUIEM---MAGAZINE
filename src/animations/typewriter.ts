/**
 * Typewriter reveal: characters are struck one by one with an uneven rhythm,
 * each landing with a short ink flash. Layout never shifts: every character
 * is in place from the start, only hidden, so right-aligned labels type
 * left-to-right without moving.
 *
 * Every element has at most one run: starting a new one (a language switch
 * during the intro, say) cancels the old run, which then never writes its
 * stale text back. The text is taken when the run is prepared, so nothing
 * that happens to the element in the meantime (a flickered letter) is typed.
 */
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rand = (a: number, b: number) => a + Math.random() * (b - a);

type Opts = { min?: number; max?: number };
type Target = HTMLElement | HTMLInputElement;

const runs = new WeakMap<Element, number>();
let seq = 0;

/** the element is reserved by a typewriter run (waiting for its turn or typing) */
export const isTyping = (el: Element) => runs.has(el);
/** stops any run on the element; it is left as it is */
export function cancelTyping(el: Element) {
  runs.delete(el);
}
const claim = (el: Element) => {
  const id = ++seq;
  runs.set(el, id);
  return () => runs.get(el) === id;
};
const release = (el: Element, alive: () => boolean) => alive() && runs.delete(el);

async function typeElement(el: HTMLElement, text: string, alive: () => boolean, { min = 28, max = 70 }: Opts) {
  const frag = document.createDocumentFragment();
  const spans = [...text].map((ch) => {
    const s = document.createElement("span");
    s.textContent = ch;
    s.style.visibility = "hidden";
    frag.appendChild(s);
    return s;
  });
  el.replaceChildren(frag);
  el.style.visibility = "visible";
  for (const s of spans) {
    if (!alive()) return;
    s.style.visibility = "visible";
    if (s.textContent !== " ") {
      // the strike: dark for a frame, then full ink
      s.style.opacity = "0.35";
      requestAnimationFrame(() => (s.style.opacity = ""));
      await wait(rand(min, max));
    }
  }
  if (alive()) el.textContent = text; // back to plain text for anything that follows (flicker)
}

async function typePlaceholder(input: HTMLInputElement, text: string, alive: () => boolean, { min = 28, max = 70 }: Opts) {
  input.placeholder = "";
  input.style.visibility = "visible";
  for (let i = 1; i <= text.length; i++) {
    if (!alive()) return;
    input.placeholder = text.slice(0, i);
    await wait(rand(min, max));
  }
}

/** Hides the targets now; call the returned function to type them in order with overlap. */
export function prepareTypewriter(targets: Target[], { stagger = 110, ...opts }: Opts & { stagger?: number } = {}) {
  // reading order: row by row from the top, left to right
  const rects = new Map(targets.map((t) => [t, t.getBoundingClientRect()]));
  const pos = (t: Target) => rects.get(t)!;
  const jobs = [...targets]
    .sort((a, b) => Math.round(pos(a).top / 30) - Math.round(pos(b).top / 30) || pos(a).left - pos(b).left)
    .map((t) => {
      const text = t instanceof HTMLInputElement ? t.placeholder : (t.textContent ?? "");
      const alive = claim(t);
      t.style.visibility = "hidden";
      return { t, text, alive };
    });
  return () =>
    Promise.all(
      jobs.map(async ({ t, text, alive }, i) => {
        await wait(i * stagger + rand(0, 40));
        if (!alive()) return;
        if (t instanceof HTMLInputElement) await typePlaceholder(t, text, alive, opts);
        else await typeElement(t, text, alive, opts);
        release(t, alive);
      }),
    ).then(() => {});
}
