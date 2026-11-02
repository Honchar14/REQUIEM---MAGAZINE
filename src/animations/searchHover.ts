/**
 * Search hover: the placeholder is retyped on a loop behind a caret,
 * "Search|" → erased back to "Sea|" → typed out to "Search|" → …
 * The caret stays solid while letters move and blinks while it waits.
 * Stops (and puts "Search" back) when the pointer leaves, and stays off
 * while the field is focused or has text, so it never fights the real caret.
 */
const CARET = "|";
const BLINK = 530; // ms per caret phase while waiting
const ERASE = [70, 110]; // ms per letter
const TYPE = [95, 170];
const HOLD_FULL = 1400; // "Search|" waits a little longer
const HOLD_SHORT = 650; // "Sea|"

const rand = ([a, b]: number[]) => a + Math.random() * (b - a);

export function initSearchHover() {
  const label = document.querySelector<HTMLElement>(".ui__search");
  const input = label?.querySelector<HTMLInputElement>("input");
  if (!label || !input) return;
  // the word follows the language switch (it writes data-word)
  let word = input.dataset.word || input.placeholder || "Search";
  let short = word.slice(0, 3); // "Sea"

  let timer = 0;
  let running = false;

  const show = (n: number, caret: boolean) => (input.placeholder = word.slice(0, n) + (caret ? CARET : ""));

  /** Wait `ms` with the caret blinking, then call `next`. */
  const hold = (n: number, ms: number, next: () => void) => {
    let on = true;
    let left = ms;
    const tick = () => {
      if (!running) return;
      if (left <= 0) return next();
      show(n, on);
      const step = Math.min(BLINK, left);
      left -= step;
      on = !on;
      timer = window.setTimeout(tick, step);
    };
    tick();
  };

  const erase = (n: number) => {
    if (!running) return;
    show(n, true);
    if (n <= short.length) return hold(n, HOLD_SHORT, () => type(n + 1));
    timer = window.setTimeout(() => erase(n - 1), rand(ERASE));
  };

  const type = (n: number) => {
    if (!running) return;
    show(n, true);
    if (n >= word.length) return hold(n, HOLD_FULL, () => erase(n - 1));
    timer = window.setTimeout(() => type(n + 1), rand(TYPE));
  };

  const start = () => {
    if (running || document.activeElement === input || input.value) return;
    word = input.dataset.word || word;
    short = word.slice(0, 3);
    running = true;
    hold(word.length, 600, () => erase(word.length - 1));
  };

  const stop = () => {
    running = false;
    clearTimeout(timer);
    input.placeholder = word;
  };

  label.addEventListener("pointerenter", start);
  label.addEventListener("pointerleave", stop);
  input.addEventListener("focus", stop);
  input.addEventListener("input", stop);
  input.addEventListener("blur", () => label.matches(":hover") && start());
}
