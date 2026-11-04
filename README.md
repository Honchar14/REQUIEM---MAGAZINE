# REQUIEM — Magazine

Concept website for **REQUIEM**, an independent magazine about youth culture: fashion, music, art and film. Grunge archive aesthetic — every story is a file.

Portfolio project. All people, brands and stories on the site are fictional.

## Stack

- [Vite](https://vite.dev) + TypeScript
- [GSAP](https://gsap.com) — animations
- Special Elite (Apache 2.0), self-hosted in `public/fonts`

## Scripts

```bash
npm install
npm run dev      # local dev server
npm run build    # production build into dist/
npm run preview  # preview the build
```

## Layouts

- **Desktop** — the 1920×1080 Figma frame, always fitted to the window
  (`--ux` follows the width, `--uy` the height, `--u` the smaller of the two).
- **Compact** — phones, portrait tablets and very short windows
  (`(orientation: portrait), (max-width: 767px), (max-height: 500px)`, kept in sync
  between `src/viewport.ts` and `src/style.css`). The page is laid out in flow:
  wordmark, labels, menu, pager, a swipeable photo strip that takes the remaining
  height, feature line, search. Story cards open with a tap.

## Structure

```
public/fonts             self-hosted Special Elite (latin)
public/media/icons       grunge SVG icons (search, globe, arrows, line, circles)
public/media/textures    background texture
public/media/news        news photos (5 pages × 5 stories)
public/media/prints      fingerprints for the cursor trail (tools/fingerprints.py)
src/assets/lines.svg     the grid lines, loaded beside the bundle during the preloader
src/animations           GSAP modules: preloader, slider, flickers, typewriter, prints
src/viewport.ts          design units, compact switch, resize event
src/i18n.ts              EN / ES
src/style.css            design tokens, desktop frame, compact layout
```

## Address-bar switches (for previews)

- `?lang=en|es` — language
- `?slide=film|flicker|shutter|scan|deal` (or 1–5) — page-change transition
- `?slidedemo` — short autoplay pages
- `?wm=blur|burn|ghost`, `?wmdemo` — wordmark flicker take and frequency

## Deploy

Deployed on Vercel. Every push to `main` goes to production, every PR gets a preview URL.
