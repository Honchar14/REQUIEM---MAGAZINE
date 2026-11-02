# REQUIEM — Magazine

Concept website for **REQUIEM**, an independent magazine about youth culture: fashion, music, art and film. Grunge archive aesthetic — every story is a file.

Portfolio project. All people, brands and stories on the site are fictional.

## Stack

- [Vite](https://vite.dev) + TypeScript
- [GSAP](https://gsap.com) + ScrollTrigger — animations
- [Lenis](https://lenis.darkroom.engineering) — smooth scroll
- Fonts (Google Fonts): Anton, Special Elite, Archivo, Archivo Black, Courier Prime

## Scripts

```bash
npm install
npm run dev      # local dev server
npm run build    # production build into dist/
npm run preview  # preview the build
```

## Structure

```
public/assets/icons      grunge SVG icons (search, globe, arrows, line, circles)
public/assets/textures   background textures
src/animations           GSAP / Lenis modules
src/style.css            design tokens and base styles
```

## Deploy

Deployed on Vercel. Every push to `main` goes to production, every PR gets a preview URL.
