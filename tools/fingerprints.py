"""
Generates the fingerprint marks for the cursor trail: original, procedural
prints (no photo source), white ridges on transparency, like a latent print
dusted with powder and lit from the side.

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
W, H = 420, 520  # px, a fingertip is taller than wide


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

    period = rng.uniform(10.5, 12)  # ~35 ridges across, readable at ~200px
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

    # ridges: thin bright lines
    ridge = (np.cos(2 * np.pi * phase) + 1) / 2
    ridge = ridge ** rng.uniform(7, 10)

    # where the powder took: broken ridges, gaps, a few smears
    take = noise(rng, 4) * 0.5 + noise(rng, 14) * 0.8
    take = np.clip((take + 0.45) * 2.0, 0, 1)
    pores = rng.random((H, W)) > 0.06  # tiny pores along the ridges
    ridge = ridge * take * pores

    # fingertip shape with a ragged edge; pressure is strongest a bit off-centre
    ex, ey = (x - W / 2) / (W * 0.43), (y - H * 0.47) / (H * 0.45)
    d = np.sqrt(ex**2 + ey**2) + noise(rng, 10) * 0.08 + noise(rng, 3) * 0.03
    shape = np.clip((1.0 - d) / 0.14, 0, 1)
    px, py = rng.uniform(-0.3, 0.3), rng.uniform(-0.25, 0.1)
    pressure = np.clip(1.15 - 0.55 * np.sqrt((ex - px) ** 2 + (ey - py) ** 2), 0.25, 1)
    # a partial print now and then: one side lifted off the glass
    if rng.random() < 0.5:
        side = rng.uniform(-0.6, 0.6)
        lift = np.clip((ex * np.cos(side) + ey * np.sin(side) + rng.uniform(0.25, 0.55)) * 3, 0, 1)
        shape *= lift

    a = ridge * shape * pressure

    # dust: fine grain over the print and a few specks around it
    grain = (rng.random((H, W)) ** 18) * 0.9
    halo = np.clip(1.25 - d, 0, 1)
    a = np.clip(a * 1.35 + grain * halo * 0.6, 0, 1)
    a = gaussian_filter(a, 0.45)

    rgba = np.zeros((H, W, 4), np.uint8)
    rgba[..., 0:3] = 255
    rgba[..., 3] = np.clip(a * 255, 0, 255).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    kinds = ["whorl", "loop", "arch", "loop", "whorl", "loop"]
    for i, k in enumerate(kinds, 1):
        im = print_mark(1000 + i * 17, k)
        # shown at ~200-250px tall
        im = im.resize((340, 420), Image.LANCZOS)
        path = os.path.join(OUT, f"print-{i}.webp")
        im.save(path, "WEBP", quality=78, method=6)
        print(path, os.path.getsize(path))
