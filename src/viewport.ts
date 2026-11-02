/**
 * Design units for the 1920×1080 Figma frame, measured from the area the
 * visitor actually sees (no scrollbars, no browser bars).
 *
 *   ux — 1 design px horizontally
 *   uy — 1 design px vertically
 *   uu — the smaller of the two, for sizes that must not distort (type, letters)
 */
const W = 1920;
const H = 1080;

const area = () => {
  const el = document.documentElement;
  return { w: el.clientWidth || window.innerWidth, h: el.clientHeight || window.innerHeight };
};

export const ux = () => area().w / W;
export const uy = () => area().h / H;
export const uu = () => Math.min(ux(), uy());

/**
 * Fraction of the font size from the top of a line-height:1 box to the text
 * baseline. Fonts report their vertical metrics differently per OS/browser, so
 * it is measured on the real font instead of guessed; every label is then
 * placed by its Figma baseline and lands on the same pixel everywhere.
 */
function measureBaseline() {
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:absolute;left:-9999px;top:0;font:100px 'Special Elite';line-height:1;white-space:nowrap;visibility:hidden";
  probe.textContent = "Hg";
  const mark = document.createElement("span");
  mark.style.cssText = "display:inline-block;width:0;height:0";
  probe.appendChild(mark);
  document.body.appendChild(probe);
  const ratio = (mark.getBoundingClientRect().top - probe.getBoundingClientRect().top) / 100;
  probe.remove();
  document.documentElement.style.setProperty("--bl", String(ratio));
}

/** Writes the units into CSS custom properties and keeps them current. */
export function watchViewport(onChange?: () => void) {
  const root = document.documentElement.style;
  const apply = () => {
    root.setProperty("--ux", `${ux()}px`);
    root.setProperty("--uy", `${uy()}px`);
    root.setProperty("--u", `${uu()}px`);
  };
  apply();
  measureBaseline();
  document.fonts?.ready.then(measureBaseline);
  let raf = 0;
  const schedule = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      apply();
      onChange?.();
    });
  };
  window.addEventListener("resize", schedule);
  window.visualViewport?.addEventListener("resize", schedule);
}
