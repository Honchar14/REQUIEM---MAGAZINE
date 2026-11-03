"""
Generates the fingerprint marks for the cursor trail: original, procedural
prints (no photo source), white ridges on transparency, like an inked
fingertip pressed onto paper: an elongated oval, dense ridges broken into
grain, uneven ink with heavy patches and gaps where the finger lifted.

Each print is a ridge field built from a core (whorl or loop) and a delta in
the zero-pole orientation model, warped by smooth noise, cut into a fingertip
shape with a ragged, pressure-dependent edge, broken up where the "powder"
did not take, and sprinkled with dust.

    python3 tools/fingerprints.py   ->  public/media/prints/print-1..6.webp
"""
import os
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "media", "prints")
W, H = 420, 600  # px, a fingertip is taller than wide


def noise(rng, sigma, shape=(H, W)):
    n = gaussian_filter(rng.standard_normal(shape), sigma)
    return n / (np.abs(n).max() + 1e-9)


def print_mark(seed, kind):
    rng = np.random.default_rng(seed)
    y, x = np.mgrid[0:H, 0:W].astype(np.float64)
    cx, cy = W * rng.uniform(0.44, 0.56), H * rng.uniform(0.38, 0.5)

    # warp the plane a little so ridges wander like skin
    wx = noise(rng, 38) * 16 + noise(rng, 12) * 3
    wy = noise(rng, 38) * 16 + noise(rng, 12) * 3
    X, Y = x + wx - cx, y + wy - cy

    period = rng.uniform(9.5, 10.8)  # ~35 ridges across, as on a real fingertip
    ang = rng.uniform(-0.35, 0.35)
    ca, sa = np.cos(ang), np.sin(ang)
    U, V = X * ca - Y * sa, X * sa + Y * ca

    if kind == "whorl":
        # elliptical rings with one or two whole turns of spiral through the core
        # (a whole number of turns keeps the ridges seamless)
        r = np.sqrt((U / 1.0) ** 2 + (V / 1.18) ** 2)
        theta = np.arctan2(V, U)
        phase = r / period + rng.choice([-2, -1, 1, 2]) * theta / (2 * np.pi)
    elif kind == "loop":
        # nested hairpins: round over the top, legs running down and out,
        # slanted like most loops
        tilt = rng.uniform(0.25, 0.5) * rng.choice([-1, 1])
        Ut, Vt = U * np.cos(tilt) - V * np.sin(tilt), U * np.sin(tilt) + V * np.cos(tilt)
        Vt = Vt + 30
        spread = 1 + np.clip(Vt, 0, None) / 420  # legs open slowly
        L = np.where(Vt < 0, np.sqrt(Ut**2 + (Vt * 1.1) ** 2), np.abs(Ut) / spread)
        phase = L / period
    else:
        # plain arch: ridges flow across and rise over the middle
        bump = rng.uniform(70, 110) * np.exp(-(U**2) / (2 * rng.uniform(70, 95) ** 2))
        phase = (V + bump * np.clip(1 - np.abs(V) / 260, 0, 1)) / period

    # ridges as inked strokes: the stroke widens where the ink is heavy
    wave = (np.cos(2 * np.pi * phase) + 1) / 2
    ink = noise(rng, 30) * 0.75 + noise(rng, 10) * 0.55 + noise(rng, 4) * 0.25  # how much ink reached the paper
    width = np.clip(0.5 + ink * 0.42, 0.12, 0.95)
    ridge = np.clip((wave - (1 - width)) / 0.16, 0, 1)

    # grain: the stroke breaks into dots where the paper is rough
    grain = rng.random((H, W))
    rough = np.clip(0.26 - ink * 0.35, 0.04, 0.6)
    ridge = ridge * (grain > rough) * np.clip(0.75 + ink * 0.45, 0.4, 1)
    # patches with no ink at all, and a few heavy smudges where ridges merge
    gaps = np.clip((noise(rng, 12) + 0.72) * 3.0, 0, 1) * np.clip((noise(rng, 30) + 0.85) * 3.0, 0, 1)
    smudge = np.clip((noise(rng, 11) - 0.55) * 3.0, 0, 1) * (grain > 0.45)
    ridge = np.clip(ridge * gaps + smudge * 0.55, 0, 1)

    # an elongated fingertip with a ragged, broken edge
    ex, ey = (x - W / 2) / (W * 0.42), (y - H * 0.5) / (H * 0.46)
    ex = ex * (1 + np.clip(-ey, 0, None) * rng.uniform(0.15, 0.35)) + ey * rng.uniform(-0.12, 0.12)  # narrower toward the tip
    d = np.sqrt(ex**2 + ey**2) + noise(rng, 9) * 0.1 + noise(rng, 3) * 0.05
    shape = np.clip((1.0 - d) / 0.1, 0, 1)
    # pressure fades toward the edge and toward one side
    px, py = rng.uniform(-0.25, 0.25), rng.uniform(-0.2, 0.2)
    pressure = np.clip(1.35 - 0.55 * np.sqrt((ex - px) ** 2 + (ey - py) ** 2), 0.45, 1)
    # often a notch where the finger did not touch (as in a real rolled print)
    if rng.random() < 0.5:
        nx, ny = rng.uniform(-0.3, 0.3), rng.uniform(-0.7, -0.4)
        notch = np.sqrt(((ex - nx) / 0.34) ** 2 + ((ey - ny) / 0.42) ** 2) + noise(rng, 8) * 0.35
        shape *= np.clip((notch - 0.8) * 2.5, 0, 1)

    a = ridge * shape * pressure
    # a little stray ink around it
    specks = (rng.random((H, W)) > 0.9985) * np.clip(1.3 - d, 0, 1)
    a = np.clip(a + specks, 0, 1)
    a = gaussian_filter(a, 0.55)

    rgba = np.zeros((H, W, 4), np.uint8)
    rgba[..., 0:3] = 255
    rgba[..., 3] = np.clip(a * 255, 0, 255).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    kinds = ["whorl", "loop", "loop", "whorl", "loop", "arch", "whorl", "loop"]
    for i, k in enumerate(kinds, 1):
        im = print_mark(2000 + i * 31, k)
        # shown at ~85-115px tall: 280px is sharp on retina
        im = im.resize((196, 280), Image.LANCZOS)
        path = os.path.join(OUT, f"print-{i}.webp")
        im.save(path, "WEBP", quality=78, method=6)
        print(path, os.path.getsize(path))
