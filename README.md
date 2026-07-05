# Murmur

A single-page site for **Murmur**, a digital studio whose identity is
murmuration. The hero object is one `THREE.Points` dot field (10,000 dots
desktop) behaving as a living flock; scrolling dissolves and re-knits it
into a different formation per chapter (ribbon → a six-fold snowflake that
grows from its heart outward → a held frame around the work → the word
*craft* → a rose-curve flower around the CTA).

Every representational formation (snowflake, flower, *craft*) is a
silhouette DRAWN on a 512² offscreen canvas, then sampled into
weighted-random dot targets — recognizability comes from the drawing, not
from parametric 3D lofts. The ice/steel dot indices are routed to each
shape's glow/edge regions (snowflake tips, flower heart) so the
bloom-catching dots always land where the shape wants them.

## Stack

React 19 · @react-three/fiber 9 · drei · three · GSAP 3 (ScrollTrigger) ·
Lenis · Tailwind 3.4 · TypeScript · Vite.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

## Architecture

| Path | Role |
| --- | --- |
| `src/state/sceneState.ts` | The single shared scene state + chapter store + dev assertion that exactly ONE scrubbed writer exists. |
| `src/scene/silhouette.ts` | Draws the exact snowflake / flower / word silhouettes on a 512² canvas and scans them into weighted, radius-tagged lit-pixel pools for sampling. |
| `src/scene/formations.ts` | Precomputed Float32 target buffers (ribbon, snowflake, frame, word, flower, scatter, capture) plus per-formation knit-delay arrays. Snowflake delay = radial distance (grows outward); flower delay = petal order (assembles petal by petal). FRAME is re-projected from DOM bounds on refresh — screen-space is truth. |
| `src/scene/Flock.tsx` | The one object: a single `THREE.Points` with a custom shader (per-vertex size + color, depth-fog alpha for the halo). Zero-allocation per-frame update with trig drift, staggered knit morphs (per-dot delay, arc-in swirl, back.out settle), scroll-velocity turbulence. No pointer input influences the flock. |
| `src/scene/curl.ts` | Cheap analytic flow field for organic drift. |
| `src/scene/Scene.tsx` | Canvas, fog, stars, environment, bloom, camera rig, context-loss handling. |
| `src/scroll/masterTimeline.ts` | ONE master scrubbed ScrollTrigger over `<main>` (desktop). Below 1024px / reduced motion, formations become 1.1s time-based morphs on boundary triggers. |
| `src/scroll/morph.ts` | Time-based morph via the CAPTURE snapshot slot. |
| `src/hooks/useLenisGsap.ts` | Lenis ↔ GSAP wiring, scroll-velocity → turbulence. |
| `src/dom/*` | Preloader, Dock, ChapterLine, Hero, Studio, Work, Craft, Footer, Reveal, sr-only article. |

## Media

Replace the `{{WORK_01_MP4}}`–`{{WORK_03_MP4}}` tokens in
`src/dom/Work.tsx` with real video URLs; the cards render a quiet gradient
placeholder until then.
