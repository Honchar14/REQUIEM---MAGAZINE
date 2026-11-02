import { gsap } from "gsap";

/**
 * Idle life for the REQUIEM wordmark: every few seconds a letter misbehaves,
 * then snaps back. Original letters are never moved — each effect hides the
 * letter, plays on temporary copies and restores it, so the layout stays exact.
 *
 * Variants (pick with ?wm=N while choosing; the default is set below):
 *   1  misprint   — double strike: the letter lands twice, a ghost impression offset
 *   2  photocopy  — a scanner band sweeps the word and erodes the letters to grain
 *   3  redaction  — a rough black marker bar covers 1–3 letters, then rips off
 *   4  loose type — a letter shakes loose, drops out and is set back in
 *   5  smear      — the letter drags sideways like ink under a roller
 *   0  slice      — the earlier VHS tracking slice
 */
export const DEFAULT_VARIANT = 0;

const NS = "http://www.w3.org/2000/svg";
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(a: T[]) => a[(Math.random() * a.length) | 0];
let uid = 0;
const id = (p: string) => `wm-${p}-${++uid}`;
const el = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  return n;
};

type Glyph = SVGGraphicsElement;
type Box = { x: number; y: number; w: number; h: number };

/** Letter bounds in wordmark (viewBox) units, including its current placement. */
function boxOf(g: Glyph): Box {
  const b = g.getBBox();
  const m = g.transform.baseVal.consolidate()?.matrix;
  return { x: b.x + (m?.e ?? 0), y: b.y + (m?.f ?? 0), w: b.width, h: b.height };
}

/** Hides a letter and returns a holder group with a copy of it, removed on cleanup. */
function stand_in(svg: SVGSVGElement, g: Glyph, copies = 1) {
  const layer = el("g");
  const holders = Array.from({ length: copies }, () => {
    const holder = el("g");
    const c = g.cloneNode(true) as Glyph;
    c.style.opacity = "";
    holder.appendChild(c);
    layer.appendChild(holder);
    return holder;
  });
  svg.appendChild(layer);
  const prev = g.style.opacity;
  g.style.opacity = "0";
  const done = () => {
    layer.remove();
    g.style.opacity = prev;
  };
  return { layer, holders, done };
}

/* ---------------- 1 · misprint ---------------- */
function misprint(svg: SVGSVGElement, glyphs: Glyph[]) {
  const i = (Math.random() * glyphs.length) | 0;
  const targets = Math.random() < 0.5 ? [glyphs[i]] : [glyphs[i], glyphs[Math.min(glyphs.length - 1, i + 1)]];
  [...new Set(targets)].forEach((g, k) => {
    const { holders, done } = stand_in(svg, g, 2);
    const [main, ghost] = holders;
    const dx = (Math.random() < 0.5 ? -1 : 1) * rand(8, 16);
    gsap.set(ghost, { opacity: 0 });
    gsap
      .timeline({ delay: k * 0.14, onComplete: done })
      .set(main, { y: 9 })
      .set(ghost, { x: dx, y: -4, opacity: 0.45 })
      .set(main, { y: -3 }, 0.07)
      .set(main, { y: 0 }, 0.13)
      .set(ghost, { opacity: 0.22 }, 0.2)
      .set(ghost, { opacity: 0.1, x: dx * 0.6 }, 0.32)
      .set(ghost, { opacity: 0 }, 0.42)
      .to({}, { duration: 0.46 });
  });
}

/* ---------------- 2 · photocopy ---------------- */
function photocopy(svg: SVGSVGElement, glyphs: Glyph[]) {
  const vb = svg.viewBox.baseVal;
  const all = glyphs.map(boxOf);
  const top = Math.min(...all.map((b) => b.y)) - 10;
  const bottom = Math.max(...all.map((b) => b.y + b.h)) + 10;
  const band = 70;

  const defs = el("defs");
  const noiseId = id("noise");
  const filter = el("filter", { id: noiseId, x: 0, y: 0, width: 1, height: 1, filterUnits: "objectBoundingBox" });
  filter.appendChild(el("feTurbulence", { type: "fractalNoise", baseFrequency: 0.09, numOctaves: 2, seed: (Math.random() * 999) | 0, result: "n" }));
  filter.appendChild(el("feColorMatrix", { in: "n", type: "matrix", values: "0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 9 -4.2" }));
  defs.appendChild(filter);
  const maskId = id("copy");
  const mask = el("mask", { id: maskId, maskUnits: "userSpaceOnUse", x: -vb.width, y: -200, width: vb.width * 3, height: 800 });
  mask.appendChild(el("rect", { x: -vb.width, y: -200, width: vb.width * 3, height: 800, fill: "white" }));
  const hole = el("rect", { x: -vb.width, y: top - band, width: vb.width * 3, height: band, fill: "black" });
  const grain = el("rect", { x: -vb.width, y: top - band, width: vb.width * 3, height: band, filter: `url(#${noiseId})` });
  mask.append(hole, grain);
  defs.appendChild(mask);

  const light = el("rect", { x: 0, y: top - 3, width: vb.width, height: 3, fill: "#fff", opacity: 0 });
  svg.append(defs, light);
  const groups = [glyphs[0], glyphs[1].parentElement as unknown as Glyph, glyphs[glyphs.length - 1]];
  groups.forEach((g) => g.setAttribute("mask", `url(#${maskId})`));

  const pos = { y: top - band };
  gsap
    .timeline({
      onComplete: () => {
        groups.forEach((g) => g.removeAttribute("mask"));
        defs.remove();
        light.remove();
      },
    })
    .set(light, { opacity: 0.85 })
    .to(pos, {
      y: bottom,
      duration: 0.95,
      ease: "steps(14)",
      onUpdate: () => {
        hole.setAttribute("y", String(pos.y));
        grain.setAttribute("y", String(pos.y));
        light.setAttribute("y", String(pos.y + band));
      },
    })
    .to(light, { opacity: 0, duration: 0.1, ease: "steps(2)" });
}

/* ---------------- 3 · redaction ---------------- */
function redaction(svg: SVGSVGElement, glyphs: Glyph[]) {
  const n = 1 + ((Math.random() * 3) | 0);
  const start = (Math.random() * (glyphs.length - n + 1)) | 0;
  const boxes = glyphs.slice(start, start + n).map(boxOf);
  const x0 = Math.min(...boxes.map((b) => b.x)) - 14;
  const x1 = Math.max(...boxes.map((b) => b.x + b.w)) + 14;
  const hMin = Math.min(...boxes.map((b) => b.y));
  const hMax = Math.max(...boxes.map((b) => b.y + b.h));
  const barH = (hMax - hMin) * rand(0.42, 0.62);
  const y0 = hMin + rand(0.12, 0.88 - barH / (hMax - hMin)) * (hMax - hMin);
  const w = x1 - x0;
  // marker bar with ragged ends and slightly wavy edges
  const pts: string[] = [];
  const steps = 24;
  for (let i = 0; i <= steps; i++) pts.push(`${(w * i) / steps},${rand(-3, 3)}`);
  pts.push(`${w + rand(4, 12)},${barH * 0.3}`, `${w + rand(0, 8)},${barH * 0.7}`);
  for (let i = steps; i >= 0; i--) pts.push(`${(w * i) / steps},${barH + rand(-3, 3)}`);
  pts.push(`${-rand(4, 12)},${barH * 0.6}`, `${-rand(0, 8)},${barH * 0.25}`);
  const bar = el("polygon", { points: pts.join(" "), fill: "#0b0b0a" });
  const g = el("g", { transform: `translate(${x0} ${y0})` });
  g.appendChild(bar);
  svg.appendChild(g);
  gsap.set(bar, { scaleX: 0, transformOrigin: "0% 50%" });
  gsap
    .timeline({ onComplete: () => g.remove() })
    .to(bar, { scaleX: 1, duration: 0.2, ease: "steps(5)" })
    .to(bar, { keyframes: { opacity: [1, 0.85, 1] }, duration: 0.3, ease: "steps(2)" }, "+=0.45")
    .set(bar, { transformOrigin: "100% 50%" })
    .to(bar, { scaleX: 0, duration: 0.14, ease: "steps(3)" });
}

/* ---------------- 4 · loose type ---------------- */
function looseType(svg: SVGSVGElement, glyphs: Glyph[]) {
  const g = pick(glyphs);
  const { holders, done } = stand_in(svg, g);
  const [t] = holders;
  gsap.set(t, { transformOrigin: "50% 100%" });
  gsap
    .timeline({ onComplete: done })
    .to(t, { keyframes: { rotation: [0, -2.5, 2, -1.5, 0] }, duration: 0.22, ease: "steps(4)" })
    .to(t, { y: 46, rotation: 7, opacity: 0, duration: 0.2, ease: "steps(3)" })
    .set(t, { y: -38, rotation: -3 }, "+=0.38")
    .to(t, { opacity: 1, duration: 0.01 })
    .to(t, { y: 5, rotation: 0, duration: 0.08, ease: "steps(2)" })
    .to(t, { y: 0, duration: 0.06, ease: "steps(1)" });
}

/* ---------------- 5 · smear ---------------- */
function smear(svg: SVGSVGElement, glyphs: Glyph[]) {
  const g = pick(glyphs);
  const trails = 6;
  const { layer, holders, done } = stand_in(svg, g, trails + 1);
  const blurId = id("smear");
  const defs = el("defs");
  const f = el("filter", { id: blurId, x: "-50%", y: "-10%", width: "200%", height: "120%" });
  f.appendChild(el("feGaussianBlur", { stdDeviation: "14 0" }));
  defs.appendChild(f);
  layer.prepend(defs);
  const main = holders[trails];
  const trail = holders.slice(0, trails);
  trail.forEach((h) => h.setAttribute("filter", `url(#${blurId})`));
  const dir = Math.random() < 0.5 ? -1 : 1;
  gsap.set(trail, { opacity: 0 });
  const tl = gsap.timeline({ onComplete: done });
  trail.forEach((h, i) => {
    const k = i + 1;
    tl.to(h, { x: dir * k * 16, opacity: 0.55 - i * 0.08, duration: 0.12, ease: "steps(3)" }, i * 0.012).to(
      h,
      { x: 0, opacity: 0, duration: 0.22, ease: "steps(4)" },
      0.26 + i * 0.01,
    );
  });
  tl.to(main, { keyframes: { x: [0, dir * 6, dir * -2, 0] }, duration: 0.3, ease: "steps(3)" }, 0);
}

/* ---------------- 0 · slice (previous) ---------------- */
function slice(svg: SVGSVGElement, glyphs: Glyph[]) {
  const g = pick(glyphs.filter((x) => x.getBBox().width > 100));
  const box = g.getBBox();
  const top = box.y - 4;
  const bottom = box.y + box.height + 4;
  const cuts = Array.from({ length: Math.random() < 0.5 ? 2 : 3 }, () => rand(top + 20, bottom - 20)).sort((a, b) => a - b);
  const edges = [top, ...cuts, bottom];
  const vbW = svg.viewBox.baseVal.width;
  const { layer, holders, done } = stand_in(svg, g, edges.length - 1);
  const defs = el("defs");
  layer.prepend(defs);
  holders.forEach((h, i) => {
    const cid = id("slice");
    const clip = el("clipPath", { id: cid, clipPathUnits: "userSpaceOnUse" });
    clip.appendChild(el("rect", { x: -vbW, y: edges[i], width: vbW * 3, height: edges[i + 1] - edges[i] }));
    defs.appendChild(clip);
    const wrap = el("g", { "clip-path": `url(#${cid})` });
    layer.insertBefore(wrap, h);
    wrap.appendChild(h);
  });
  const tl = gsap.timeline({ onComplete: done });
  holders.forEach((h, i) => {
    const dx = (i % 2 ? 1 : -1) * rand(28, 70);
    tl.to(h, { x: dx, duration: 0.06, ease: "steps(1)" }, i * 0.02)
      .to(h, { x: dx * -0.5, duration: 0.06, ease: "steps(1)" }, 0.1 + i * 0.015)
      .to(h, { x: dx * 0.25, duration: 0.06, ease: "steps(1)" }, 0.2)
      .to(h, { x: 0, duration: 0.05, ease: "steps(1)" }, 0.29);
  });
}

const EFFECTS = [slice, misprint, photocopy, redaction, looseType, smear];

export function startWordmarkIdle() {
  const svg = document.querySelector<SVGSVGElement>("[data-wordmark]");
  if (!svg) return () => {};
  const glyphs: Glyph[] = [
    svg.querySelector<Glyph>('[data-glyph="R"]')!,
    ...svg.querySelectorAll<Glyph>('[data-glyph="mid"] path'),
    svg.querySelector<Glyph>('[data-glyph="M"]')!,
  ];

  // ?wm=N previews one variant at a faster pace, so it is easy to judge
  const q = new URLSearchParams(location.search).get("wm");
  const preview = q !== null && /^[0-5]$/.test(q);
  const variant = preview ? Number(q) : DEFAULT_VARIANT;
  const [minGap, maxGap] = preview ? [2, 3.2] : [4, 9];
  const run = EFFECTS[variant];

  let timer = 0;
  const tick = () => {
    if (!document.hidden) run(svg, glyphs);
    timer = window.setTimeout(tick, rand(minGap, maxGap) * 1000);
  };
  timer = window.setTimeout(tick, (preview ? 1.2 : rand(2, 4)) * 1000);
  return () => window.clearTimeout(timer);
}
