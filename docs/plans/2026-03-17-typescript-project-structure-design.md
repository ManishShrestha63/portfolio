# Portfolio — Vanilla TypeScript Project Structure Design

**Date:** 2026-03-17
**Status:** Approved

## Context

The existing portfolio is a single `portfolio.html` file with all CSS, HTML, and JavaScript embedded inline. The goal is to migrate it into a proper vanilla TypeScript project using Vite, deployable to GitHub Pages. Content updates will come in a separate pass.

## Decisions

- **Build tool:** Vite (fast dev server, simple GitHub Pages deployment via `base` config)
- **Language:** Vanilla TypeScript (strict mode, ESNext, DOM lib)
- **Structure:** Flat `src/` modules — one file per feature

## Project Structure

```
portfolio/
├── index.html               # shell — imports src/main.ts via <script type="module">
├── vite.config.ts           # base: '/portfolio/', build output → dist/
├── tsconfig.json            # strict, ESNext, DOM lib
├── package.json             # vite + typescript as devDependencies
├── .gitignore               # node_modules, dist
├── .github/
│   └── workflows/
│       └── deploy.yml       # GitHub Actions: build + deploy to gh-pages
├── public/
│   └── models/              # static .vrm files (served as-is by Vite)
└── src/
    ├── main.ts              # entry — imports and calls initCursor, initNav, initVRM
    ├── style.css            # all CSS verbatim from current portfolio.html
    ├── cursor.ts            # custom cursor dot + ring animation
    ├── nav.ts               # side nav active state, scroll progress line, smooth anchors
    └── vrm.ts               # Three.js renderer, scene, VRM loader, drag & drop, render loop
```

## Module Responsibilities

| Module | Exports | Extracted from |
|--------|---------|----------------|
| `cursor.ts` | `initCursor()` | `mousemove` handler, ring RAF loop |
| `nav.ts` | `initNav()` | scroll listener, active dot tracking, smooth anchor clicks |
| `vrm.ts` | `initVRM()` | renderer, scene, camera, lights, VRM loader, drag & drop, animate() |
| `main.ts` | — | orchestrates all three init calls |
| `style.css` | — | all `<style>` content from current HTML |

## GitHub Pages Deployment

- `vite.config.ts`: `base: '/portfolio/'` to match the GitHub repo name
- `npm run build` → outputs to `dist/`
- GitHub Actions workflow triggers on push to `main`, runs `npm ci && npm run build`, deploys `dist/` to `gh-pages` branch using `actions/deploy-pages`

## Out of Scope (this phase)

- Content updates (bio, projects, contact links) — deferred
- Adding new sections
- Custom VRM model
