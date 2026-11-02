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

/** Writes the units into CSS custom properties and keeps them current. */
export function watchViewport(onChange?: () => void) {
  const root = document.documentElement.style;
  const apply = () => {
    root.setProperty("--ux", `${ux()}px`);
    root.setProperty("--uy", `${uy()}px`);
    root.setProperty("--u", `${uu()}px`);
  };
  apply();
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
