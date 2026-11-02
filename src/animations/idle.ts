import { gsap } from "gsap";

/**
 * Idle life for the REQUIEM wordmark: every few seconds one letter misbehaves
 * like a worn film print or a VHS tracking error, then snaps back.
 *
 *  - slice:  the letter is cut into 2–3 horizontal bands that slide apart
 *  - blink:  a stepped projector flicker
 *  - weave:  now and then the whole word jolts, like film in a loose gate
 */
const SVG_NS = "http://www.w3.org/2000/svg";
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(a: T[]) => a[(Math.random() * a.length) | 0];

let clipId = 0;

function slice(svg: SVGSVGElement, glyph: SVGGraphicsElement) {
  const box = glyph.getBBox();
  const top = box.y - 4;
  const bottom = box.y + box.height + 4;
  // 2–3 random cut lines → 3–4 bands
  const cuts = Array.from({ length: Math.random() < 0.5 ? 2 : 3 }, () => rand(top + 20, bottom - 20)).sort((a, b) => a - b);
  const edges = [top, ...cuts, bottom];

  const layer = document.createElementNS(SVG_NS, "g");
  const defs = document.createElementNS(SVG_NS, "defs");
  layer.appendChild(defs);
  const vbWidth = svg.viewBox.baseVal.width;
  const bands: SVGGElement[] = [];

  for (let i = 0; i < edges.length - 1; i++) {
    const id = `wm-slice-${++clipId}`;
    const clip = document.createElementNS(SVG_NS, "clipPath");
    clip.id = id;
    clip.setAttribute("clipPathUnits", "userSpaceOnUse");
    const r = document.createElementNS(SVG_NS, "rect");
    r.setAttribute("x", String(-vbWidth));
    r.setAttribute("y", String(edges[i]));
    r.setAttribute("width", String(vbWidth * 3));
    r.setAttribute("height", String(edges[i + 1] - edges[i]));
    clip.appendChild(r);
    defs.appendChild(clip);

    const clipped = document.createElementNS(SVG_NS, "g");
    clipped.setAttribute("clip-path", `url(#${id})`);
    const band = document.createElementNS(SVG_NS, "g"); // moves inside its fixed clip
    const copy = glyph.cloneNode(true) as SVGGraphicsElement;
    copy.removeAttribute("opacity");
    copy.style.opacity = "";
    band.appendChild(copy);
    clipped.appendChild(band);
    layer.appendChild(clipped);
    bands.push(band);
  }

  svg.appendChild(layer);
  const prevOpacity = glyph.style.opacity;
  glyph.style.opacity = "0";

  const tl = gsap.timeline({
    onComplete: () => {
      layer.remove();
      glyph.style.opacity = prevOpacity;
    },
  });
  bands.forEach((band, i) => {
    const dx = (i % 2 ? 1 : -1) * rand(28, 70);
    tl.to(band, { x: dx, duration: 0.06, ease: "steps(1)" }, i * 0.02)
      .to(band, { x: dx * -0.5, duration: 0.06, ease: "steps(1)" }, 0.1 + i * 0.015)
      .to(band, { x: dx * 0.25, duration: 0.06, ease: "steps(1)" }, 0.2)
      .to(band, { x: 0, duration: 0.05, ease: "steps(1)" }, 0.29);
  });
  tl.to({}, { duration: 0.06 });
}

function blink(glyph: SVGGraphicsElement) {
  gsap.to(glyph, {
    keyframes: { opacity: [1, 0.15, 1, 0.4, 1] },
    duration: 0.32,
    ease: "steps(4)",
    clearProps: "opacity",
  });
}

function weave(glyphs: SVGGraphicsElement[]) {
  const wrap = glyphs[0].parentElement!.closest("svg")!;
  gsap.fromTo(
    wrap,
    { y: 0 },
    { keyframes: { y: [0, -3, 2, -1, 0] }, duration: 0.28, ease: "steps(4)", clearProps: "transform" },
  );
}

export function startWordmarkIdle({ minGap = 4, maxGap = 9 } = {}) {
  const svg = document.querySelector<SVGSVGElement>("[data-wordmark]");
  if (!svg) return () => {};
  const glyphs = [
    svg.querySelector<SVGGraphicsElement>('[data-glyph="R"]')!,
    ...svg.querySelectorAll<SVGGraphicsElement>('[data-glyph="mid"] path'),
    svg.querySelector<SVGGraphicsElement>('[data-glyph="M"]')!,
  ];

  // the slice reads best on wide letters; the thin I only blinks
  const wide = glyphs.filter((g) => g.getBBox().width > 100);

  let count = 0;
  let timer = 0;
  const tick = () => {
    if (!document.hidden) {
      count++;
      if (count % 5 === 0) weave(glyphs);
      else if (Math.random() < 0.6) slice(svg, pick(wide));
      else blink(pick(glyphs));
    }
    timer = window.setTimeout(tick, rand(minGap, maxGap) * 1000);
  };
  timer = window.setTimeout(tick, rand(2, 4) * 1000);
  return () => window.clearTimeout(timer);
}
