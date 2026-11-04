/**
 * Design units for the 1920×1080 Figma frame, measured from the area the
 * visitor actually sees (no scrollbars, no browser bars).
 *
 *   ux — 1 design px horizontally
 *   uy — 1 design px vertically
 *   uu — the smaller of the two, for sizes that must not distort (type, letters)
 *
 * Phones, portrait tablets and very short windows get the compact layout
 * (style.css, same media query): the page is laid out in flow there, and
 * uu() is a fixed type scale instead of a share of the 1920 frame.
 */
const W = 1920;
const H = 1080;

/** keep in sync with the @media rules marked "compact" in style.css */
export const COMPACT_QUERY = "(orientation: portrait), (max-width: 767px), (max-height: 500px)";
const compactMq = window.matchMedia(COMPACT_QUERY);
export const isCompact = () => compactMq.matches;

const area = () => {
  const el = document.documentElement;
  return { w: el.clientWidth || window.innerWidth, h: el.clientHeight || window.innerHeight };
};

export const ux = () => area().w / W;
export const uy = () => area().h / H;
/** compact: 18 design px of type ≈ 13.5–17px, following the short side of the screen */
const compactUnit = () => {
  const { w, h } = area();
  return Math.min(0.95, Math.max(0.74, Math.min(w, h) / 470));
};
export const uu = () => (isCompact() ? compactUnit() : Math.min(ux(), uy()));

/**
 * Fraction of the font size from the top of a line-height:1 box to the text
 * baseline. Fonts report their vertical metrics differently per OS/browser, so
 * it is measured on the real font instead of guessed; every label is then
 * placed by its Figma baseline and lands on the same pixel everywhere.
 */
function baselineOf(font: string) {
  const probe = document.createElement("div");
  probe.style.cssText = `position:absolute;left:-9999px;top:0;font:${font};line-height:1;white-space:nowrap;visibility:hidden`;
  probe.textContent = "Hg";
  const mark = document.createElement("span");
  mark.style.cssText = "display:inline-block;width:0;height:0";
  probe.appendChild(mark);
  document.body.appendChild(probe);
  const ratio = (mark.getBoundingClientRect().top - probe.getBoundingClientRect().top) / 100;
  probe.remove();
  return String(ratio);
}
function measureBaseline() {
  const root = document.documentElement.style;
  root.setProperty("--bl", baselineOf("100px 'Special Elite'"));
  // the news card titles are set in Helvetica Bold (Arial where Helvetica is missing)
  root.setProperty("--blh", baselineOf("700 100px 'Helvetica Neue', Helvetica, Arial, sans-serif"));
}

/** fired on document after the units are updated (resize, rotation, layout switch) */
export const RESIZE_EVENT = "requiem:resize";

let watching = false;
/** Writes the units into CSS custom properties and keeps them current. */
export function watchViewport() {
  if (watching) return;
  watching = true;
  const html = document.documentElement;
  const root = html.style;
  const apply = () => {
    root.setProperty("--ux", `${ux()}px`);
    root.setProperty("--uy", `${uy()}px`);
    root.setProperty("--u", `${uu()}px`);
    html.classList.toggle("is-compact", isCompact());
  };
  apply();
  measureBaseline();
  document.fonts?.ready.then(() => {
    measureBaseline();
    document.dispatchEvent(new CustomEvent(RESIZE_EVENT));
  });
  let raf = 0;
  const schedule = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      apply();
      document.dispatchEvent(new CustomEvent(RESIZE_EVENT));
    });
  };
  window.addEventListener("resize", schedule);
  window.visualViewport?.addEventListener("resize", schedule);
  compactMq.addEventListener?.("change", schedule);
}

/** Runs fn after every viewport change (units already updated). */
export const onViewport = (fn: () => void) => document.addEventListener(RESIZE_EVENT, fn);
