import { gsap } from "gsap";

/**
 * REQUIEM never sits completely still: every couple of seconds a letter (now
 * and then two) flickers in the site's stepped style, and each flick carries a
 * hard horizontal motion blur, as if the frame jumped in the gate.
 *
 * Three takes, picked with ?wm= in the address (default "blur"):
 *   blur  — fast: 1–3 hard flicks, each dim frame smeared sideways, then sharp
 *   burn  — slow out, hard in: the letter drifts off into a blur and dies,
 *           stays dark for a beat, then slams back in from the other side
 *   ghost — the flicker leaves a blurred afterimage beside the letter
 *
 * Everything happens in an SVG filter (blur + offset + an afterimage copy) and
 * in opacity, so the wordmark's layout is never touched. The filter is only
 * attached while a letter is flickering.
 */
const NS = "http://www.w3.org/2000/svg";
type Take = "blur" | "burn" | "ghost";
type V = { o: number; b: number; dx: number; ga: number; gb: number; gdx: number };
type Fx = { el: SVGGraphicsElement; url: string; apply: (v: V) => void };

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const sign = () => (Math.random() < 0.5 ? -1 : 1);
const make = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  return n;
};

/** One filter per letter: the letter itself, blurred and shifted, over a faint blurred copy (the afterimage). */
function buildFx(svg: SVGSVGElement, el: SVGGraphicsElement, k: number): Fx {
  const id = `wm-fx-${k}`;
  const defs = svg.querySelector("defs") ?? svg.insertBefore(make("defs", {}), svg.firstChild);
  const f = make("filter", { id, x: "-60%", y: "-10%", width: "220%", height: "120%", "color-interpolation-filters": "sRGB" });
  const mainBlur = make("feGaussianBlur", { in: "SourceGraphic", stdDeviation: "0 0", result: "mb" });
  const mainOff = make("feOffset", { in: "mb", dx: 0, dy: 0, result: "mo" });
  // the letter's own brightness lives in the filter too, so the afterimage can outshine it
  const mainFade = make("feComponentTransfer", { in: "mo", result: "m" });
  const mainA = make("feFuncA", { type: "linear", slope: 1 });
  mainFade.appendChild(mainA);
  const ghostBlur = make("feGaussianBlur", { in: "SourceGraphic", stdDeviation: "0 0", result: "gb" });
  const ghostOff = make("feOffset", { in: "gb", dx: 0, dy: 0, result: "go" });
  const ghostFade = make("feComponentTransfer", { in: "go", result: "g" });
  const ghostA = make("feFuncA", { type: "linear", slope: 0 });
  ghostFade.appendChild(ghostA);
  const merge = make("feMerge", {});
  merge.append(make("feMergeNode", { in: "g" }), make("feMergeNode", { in: "m" }));
  f.append(mainBlur, mainOff, mainFade, ghostBlur, ghostOff, ghostFade, merge);
  defs.appendChild(f);
  return {
    el,
    url: `url(#${id})`,
    apply: (v) => {
      mainA.setAttribute("slope", v.o.toFixed(3));
      mainBlur.setAttribute("stdDeviation", `${v.b.toFixed(1)} 0`);
      mainOff.setAttribute("dx", v.dx.toFixed(1));
      ghostBlur.setAttribute("stdDeviation", `${v.gb.toFixed(1)} 0`);
      ghostOff.setAttribute("dx", v.gdx.toFixed(1));
      ghostA.setAttribute("slope", v.ga.toFixed(3));
    },
  };
}

const REST: V = { o: 1, b: 0, dx: 0, ga: 0, gb: 0, gdx: 0 };

/** fast: one to three hard flicks; every dim frame is smeared sideways, alternating direction */
function takeBlur(tl: gsap.core.Timeline, v: V) {
  const hits = 1 + ((Math.random() * 3) | 0);
  let t = 0;
  let dir = sign();
  for (let h = 0; h < hits; h++) {
    const dim = rand(0.04, 0.07);
    tl.set(v, { o: rand(0.05, 0.4), b: rand(14, 30), dx: dir * rand(6, 18) }, t);
    // it comes back a touch blurred and settles a frame later
    tl.set(v, { o: 1, b: rand(3, 7), dx: -dir * rand(1, 4) }, t + dim);
    tl.set(v, { ...REST }, t + dim + 0.035);
    t += dim + rand(0.06, 0.11);
    dir = -dir;
  }
}

/** slow out, hard in: drifts off into a blur and dies, a beat of dark, then slams back */
function takeBurn(tl: gsap.core.Timeline, v: V) {
  const dir = sign();
  const out = rand(0.45, 0.65);
  tl.to(v, { o: 0, b: 32, dx: dir * 24, duration: out, ease: "power2.in" }, 0)
    .set(v, { o: 1, b: 42, dx: -dir * 36 }, out + rand(0.1, 0.22))
    .to(v, { b: 0, dx: 0, duration: 0.16, ease: "steps(3)" }, ">");
}

/** the stepped flicker leaves a blurred afterimage beside the letter */
function takeGhost(tl: gsap.core.Timeline, v: V) {
  const dir = sign();
  tl.set(v, { o: 0.15, ga: 0.85, gb: 8, gdx: dir * 26 }, 0)
    .set(v, { o: 1, ga: 0.55, gb: 16, gdx: dir * 40 }, 0.07)
    .set(v, { o: 0.3, ga: 0.7, gb: 12, gdx: -dir * 20 }, 0.14)
    .set(v, { o: 1, ga: 0.3, gb: 22, gdx: -dir * 48 }, 0.21)
    .set(v, { ...REST }, 0.3);
}

const TAKES: Record<Take, (tl: gsap.core.Timeline, v: V) => void> = { blur: takeBlur, burn: takeBurn, ghost: takeGhost };

export function startWordmarkFlicker({ minGap = 1.2, maxGap = 3.4 } = {}) {
  const svg = document.querySelector<SVGSVGElement>("[data-wordmark]");
  if (!svg) return;
  const letters = [
    ...svg.querySelectorAll<SVGGraphicsElement>('[data-glyph="R"], [data-glyph="mid"] path, [data-glyph="M"]'),
  ];
  if (!letters.length) return;
  const params = new URLSearchParams(location.search);
  const take: Take = (["blur", "burn", "ghost"] as Take[]).find((t) => t === params.get("wm")) ?? "blur";
  // ?wmdemo shortens the gaps, for previews
  if (params.has("wmdemo")) [minGap, maxGap] = [0.45, 0.9];

  const fx = letters.map((el, k) => buildFx(svg, el, k));
  const busy = new Set<number>();
  let last = -1;

  const flicker = (k: number) => {
    if (busy.has(k)) return;
    busy.add(k);
    const f = fx[k];
    const v: V = { ...REST };
    f.el.setAttribute("filter", f.url);
    const tl = gsap.timeline({
      onUpdate: () => f.apply(v),
      onComplete: () => {
        f.apply(REST);
        f.el.removeAttribute("filter");
        busy.delete(k);
      },
    });
    TAKES[take](tl, v);
    // make sure the last state is the clean letter
    tl.add(() => f.apply(REST), "+=0.02");
  };

  const loop = () => {
    if (!document.hidden) {
      let i: number;
      do i = (Math.random() * letters.length) | 0;
      while (i === last);
      last = i;
      flicker(i);
      // sometimes a second letter catches it a beat later
      if (Math.random() < 0.25) {
        let j: number;
        do j = (Math.random() * letters.length) | 0;
        while (j === i);
        gsap.delayedCall(rand(0.06, 0.2), () => flicker(j));
      }
    }
    window.setTimeout(loop, rand(minGap, maxGap) * 1000);
  };
  window.setTimeout(loop, rand(1, 2) * 1000);
}
