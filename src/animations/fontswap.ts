import { gsap } from "gsap";

/**
 * REQUIEM font swap: every few seconds one letter is knocked out sideways with
 * a hard horizontal motion blur and the same letter from another typeface
 * slams into its slot at full cap height, on the wordmark's baseline.
 * Sometimes it flicks through two or three faces before one sticks; after a
 * beat the original letter snaps back the same way.
 *
 * The original letters are never moved: a swap hides the letter and plays on
 * temporary copies, then restores it.
 */
const NS = "http://www.w3.org/2000/svg";

/** Faces the letters jump into (loaded for R E Q U I M only, see index.html). Special Elite, as in the layout, comes up most. */
export const FACES = [
  { family: "Special Elite", weight: 400, style: "normal", odds: 3 },
  { family: "UnifrakturMaguntia", weight: 400, style: "normal", odds: 1.4 },
  { family: "Bodoni Moda", weight: 900, style: "italic", odds: 1.4 },
  { family: "Instrument Serif", weight: 400, style: "italic", odds: 1.2 },
  { family: "Rubik Dirt", weight: 400, style: "normal", odds: 1.2 },
];
type Face = (typeof FACES)[number];

const rand = (a: number, b: number) => a + Math.random() * (b - a);
let uid = 0;

type Glyph = SVGGraphicsElement;
type Box = { x: number; y: number; w: number; h: number };

const make = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  return n;
};

/** Matrix from an element's coordinates to the svg's own (viewBox) coordinates. */
const toRoot = (svg: SVGSVGElement, el: SVGGraphicsElement) => svg.getScreenCTM()!.inverse().multiply(el.getScreenCTM()!);

/** An element's box in the svg's viewBox coordinates. */
function boxOf(svg: SVGSVGElement, g: Glyph): Box {
  const b = g.getBBox();
  const m = toRoot(svg, g);
  const pts = [
    [b.x, b.y],
    [b.x + b.width, b.y],
    [b.x, b.y + b.height],
    [b.x + b.width, b.y + b.height],
  ].map(([x, y]) => new DOMPoint(x, y).matrixTransform(m));
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

/** Ink metrics of a face at 1000px: cap height (from E) and each letter's horizontal ink. */
const ctx = document.createElement("canvas").getContext("2d")!;
const metrics = new Map<string, { cap: number; ink: Record<string, { l: number; r: number }> }>();
function metricsOf(face: Face) {
  let m = metrics.get(face.family);
  if (m) return m;
  ctx.font = `${face.style} ${face.weight} 1000px "${face.family}"`;
  const ink: Record<string, { l: number; r: number }> = {};
  for (const ch of "REQUIM") {
    const t = ctx.measureText(ch);
    ink[ch] = { l: -t.actualBoundingBoxLeft, r: t.actualBoundingBoxRight };
  }
  m = { cap: ctx.measureText("E").actualBoundingBoxAscent, ink };
  metrics.set(face.family, m);
  return m;
}

/** A horizontal motion-blur filter whose strength we drive directly. */
function blurFilter(defs: SVGDefsElement) {
  const id = `fs-blur-${++uid}`;
  const f = make("filter", { id, x: "-80%", y: "-10%", width: "260%", height: "120%" });
  const g = make("feGaussianBlur", { stdDeviation: "0 0" });
  f.appendChild(g);
  defs.appendChild(f);
  return { url: `url(#${id})`, set: (v: number) => g.setAttribute("stdDeviation", `${Math.max(0, v).toFixed(1)} 0`) };
}

/** The same character in another face: full cap height, on the baseline, centred in the slot. */
function letterIn(svg: SVGSVGElement, ch: string, face: Face, slot: Box, line: { cap: number; base: number }) {
  const m = metricsOf(face);
  let size = (line.cap / m.cap) * 1000;
  const ink = m.ink[ch];
  // very wide faces (blackletter M) would run into the neighbours: keep them within ~1.2 of the slot
  const inkW = ((ink.r - ink.l) * size) / 1000;
  if (inkW > slot.w * 1.2) size *= (slot.w * 1.2) / inkW;
  const cx = slot.x + slot.w / 2;
  const t = make("text", {
    x: (cx - (((ink.l + ink.r) / 2) * size) / 1000).toFixed(2),
    y: line.base.toFixed(2),
    "font-family": `"${face.family}"`,
    "font-size": size.toFixed(2),
    "font-weight": face.weight,
    "font-style": face.style,
    fill: "currentColor",
  });
  t.textContent = ch;
  const holder = make("g");
  holder.appendChild(t);
  svg.appendChild(holder);
  return holder;
}

function pickFace(not: number[]) {
  const pool = FACES.map((f, i) => ({ i, w: not.includes(i) ? 0 : f.odds }));
  let r = Math.random() * pool.reduce((s, p) => s + p.w, 0);
  for (const p of pool) if ((r -= p.w) < 0) return p.i;
  return 0;
}

/** One swap on one letter. Resolves when the original is back. */
function swap(svg: SVGSVGElement, glyph: Glyph, ch: string, line: { cap: number; base: number }, lastFace: { i: number }) {
  return new Promise<void>((done) => {
    const slot = boxOf(svg, glyph);
    const defs = make("defs");
    svg.appendChild(defs);

    // stand-in for the original letter, so it can blur away without touching the real one
    const outHolder = make("g");
    const place = make("g", { transform: (() => {
      const m = toRoot(svg, glyph.parentNode as SVGGraphicsElement);
      return `matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f})`;
    })() });
    const copy = glyph.cloneNode(true) as Glyph;
    place.appendChild(copy);
    outHolder.appendChild(place);
    svg.appendChild(outHolder);
    const prev = glyph.style.opacity;
    glyph.style.opacity = "0";

    const dir = Math.random() < 0.5 ? -1 : 1;
    const hits = Math.random() < 0.35 ? 2 + ((Math.random() * 2) | 0) : 1; // sometimes it flicks through faces
    const faces: number[] = [];
    for (let k = 0; k < hits; k++) faces.push(pickFace([lastFace.i, faces[faces.length - 1] ?? -1]));
    lastFace.i = faces[faces.length - 1];

    const outBlur = blurFilter(defs);
    outHolder.setAttribute("filter", outBlur.url);
    const tl = gsap.timeline({
      onComplete: () => {
        defs.remove();
        outHolder.remove();
        glyph.style.opacity = prev;
        done();
      },
    });

    // 1 — the original is knocked out sideways
    const ob = { v: 0 };
    tl.to(outHolder, { x: dir * 70, opacity: 0, duration: 0.09, ease: "steps(2)" }, 0).to(
      ob,
      { v: 44, duration: 0.09, ease: "steps(2)", onUpdate: () => outBlur.set(ob.v) },
      0,
    );

    // 2 — one or more faces slam in; the last one holds
    let at = 0.06;
    let current: SVGGElement | null = null;
    faces.forEach((fi, k) => {
      const last = k === faces.length - 1;
      const el = letterIn(svg, ch, FACES[fi], slot, line);
      const bl = blurFilter(defs);
      el.setAttribute("filter", bl.url);
      bl.set(48);
      gsap.set(el, { opacity: 0 });
      const b = { v: 48 };
      const prevEl: SVGGElement | null = current;
      tl.set(el, { opacity: 1, x: -dir * 90 }, at)
        .to(el, { x: dir * 10, duration: 0.12, ease: "steps(3)" }, at)
        .to(b, { v: 0, duration: 0.14, ease: "steps(4)", onUpdate: () => bl.set(b.v) }, at)
        .to(el, { x: 0, duration: 0.04, ease: "steps(1)" }, at + 0.12);
      if (prevEl) tl.set(prevEl, { opacity: 0 }, at).add(() => prevEl.remove(), at + 0.01);
      current = el;
      at += last ? rand(0.8, 1.6) : rand(0.13, 0.18);
      if (last) {
        // 3 — it is knocked away and the original snaps back
        const ib = { v: 0 };
        const back = { v: 48 };
        tl.to(el, { x: dir * 70, opacity: 0, duration: 0.09, ease: "steps(2)" }, at)
          .to(ib, { v: 44, duration: 0.09, ease: "steps(2)", onUpdate: () => bl.set(ib.v) }, at)
          .add(() => el.remove(), at + 0.1)
          .set(outHolder, { x: -dir * 90, opacity: 1 }, at + 0.06)
          .to(outHolder, { x: 0, duration: 0.12, ease: "steps(3)" }, at + 0.06)
          .to(back, { v: 0, duration: 0.14, ease: "steps(4)", onUpdate: () => outBlur.set(back.v) }, at + 0.06);
      }
    });
  });
}

export async function startFontSwap({ minGap = 1.5, maxGap = 3.5 } = {}) {
  const svg = document.querySelector<SVGSVGElement>("[data-wordmark]");
  if (!svg) return;
  // the faces must be ready before a letter can be measured
  await Promise.all(
    FACES.map((f) => document.fonts.load(`${f.style} ${f.weight} 100px "${f.family}"`, "REQUIEM").catch(() => [])),
  );
  const mid = [...svg.querySelectorAll<Glyph>('[data-glyph="mid"] path')];
  const glyphs: Glyph[] = [svg.querySelector<Glyph>('[data-glyph="R"]')!, ...mid, svg.querySelector<Glyph>('[data-glyph="M"]')!];
  const chars = [..."REQUIEM"];
  const lastFace = { i: -1 };
  let lastLetter = -1;

  const loop = async () => {
    if (!document.hidden) {
      let i: number;
      do i = (Math.random() * glyphs.length) | 0;
      while (i === lastLetter);
      lastLetter = i;
      // cap height and baseline of the wordmark, read off its E (it may have been re-justified on resize)
      const e = boxOf(svg, mid[0]);
      await swap(svg, glyphs[i], chars[i], { cap: e.h, base: e.y + e.h }, lastFace);
    }
    setTimeout(loop, rand(minGap, maxGap) * 1000);
  };
  setTimeout(loop, rand(1, 2) * 1000);
}
