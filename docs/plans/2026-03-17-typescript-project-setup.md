# Portfolio TypeScript Migration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate the existing single-file `portfolio.html` into a Vite + vanilla TypeScript project deployable to GitHub Pages.

**Architecture:** Vite bundles `src/main.ts` as the entry point, which imports three feature modules (`cursor.ts`, `nav.ts`, `vrm.ts`) and a global `style.css`. The HTML shell lives at `index.html`. GitHub Actions builds and deploys `dist/` to the `gh-pages` branch on every push to `main`.

**Tech Stack:** Vite 5, TypeScript 5 (strict), Three.js (via npm), @pixiv/three-vrm (via npm), GitHub Actions `actions/deploy-pages`

---

### Task 1: Initialize npm project and install dependencies

**Files:**
- Create: `package.json`
- Create: `.gitignore`

**Step 1: Initialize package.json**

Run in `c:/Users/250513SE1/Desktop/portfolio/`:
```bash
npm init -y
```

**Step 2: Install devDependencies**

```bash
npm install -D vite typescript @types/three
```

**Step 3: Install runtime dependencies**

```bash
npm install three @pixiv/three-vrm
```

**Step 4: Add scripts to package.json**

Edit `package.json` — replace the `"scripts"` section:
```json
"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  "preview": "vite preview"
}
```

**Step 5: Create .gitignore**

```
node_modules/
dist/
.DS_Store
*.local
```

**Step 6: Verify**

```bash
npm run dev
```
Expected: Vite dev server starts (will show blank page — that's fine at this stage).

**Step 7: Commit**

```bash
git add package.json package-lock.json .gitignore
git commit -m "chore: init vite + typescript project"
```

---

### Task 2: Configure TypeScript and Vite

**Files:**
- Create: `tsconfig.json`
- Create: `vite.config.ts`

**Step 1: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "useDefineForClassFields": true,
    "skipLibCheck": true,
    "outDir": "./dist"
  },
  "include": ["src"]
}
```

**Step 2: Create vite.config.ts**

> Note: Replace `'/portfolio/'` with your actual GitHub repo name if different.

```typescript
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/portfolio/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
```

**Step 3: Verify TypeScript config**

```bash
npx tsc --noEmit
```
Expected: No errors (src/ is empty — that's fine).

**Step 4: Commit**

```bash
git add tsconfig.json vite.config.ts
git commit -m "chore: add tsconfig and vite config"
```

---

### Task 3: Create index.html shell

**Files:**
- Create: `index.html`

**Step 1: Create index.html**

Extract all HTML from `portfolio.html` — keep everything inside `<body>` except the `<script>` tags. Replace the inline `<style>` block and `<script>` blocks with module imports:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Manish Shrestha — Full Stack Developer</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=JetBrains+Mono:ital,wght@0,300;0,400;0,500;1,300&display=swap" rel="stylesheet">
</head>
<body>

<!-- Cursor -->
<div class="cursor" id="cursor"></div>
<div class="cursor-ring" id="cursorRing"></div>

<!-- Background -->
<div class="bg-grid"></div>
<div class="progress-line" id="progressLine"></div>

<!-- Side Navigation -->
<nav id="sidenav">
  <a href="#hero"     class="nav-dot active" data-section="hero">    <span>Home</span></a>
  <a href="#about"    class="nav-dot"         data-section="about">   <span>About</span></a>
  <a href="#skills"   class="nav-dot"         data-section="skills">  <span>Skills</span></a>
  <a href="#projects" class="nav-dot"         data-section="projects"><span>Projects</span></a>
  <a href="#contact"  class="nav-dot"         data-section="contact"> <span>Contact</span></a>
</nav>

<div class="layout">

  <!-- BACKGROUND: Fixed 3D Character (full screen) -->
  <div class="character-panel" id="charPanel">
    <div class="loading-screen" id="loadingScreen">
      <div class="loading-label" id="loadingLabel">Initializing avatar</div>
      <div class="loading-track">
        <div class="loading-fill" id="loadingFill"></div>
      </div>
      <div class="loading-err" id="loadingErr">
        Could not load default model.<br>
        Drag &amp; drop your own .vrm file here.
      </div>
    </div>
    <canvas id="three-canvas"></canvas>
    <div class="status-badge">
      <div class="status-dot"></div>Open to opportunities
    </div>
  </div>

  <!-- FOREGROUND: Scrollable Portfolio Content -->
  <main class="content">

    <!-- HERO -->
    <section id="hero">
      <div class="hero-eyebrow">Available for hire · Osaka, Japan</div>
      <h1 class="hero-name">
        Manish<br>
        <span class="line2">Shrestha</span>
      </h1>
      <p class="hero-desc">
        Full-Stack Developer with <em>7+ years</em> building web apps,
        AI integrations, and SaaS platforms.<br>
        TypeScript · React · Node.js · AWS · OpenAI
      </p>
      <div class="cta-row">
        <a href="#projects" class="btn btn-primary">View Projects</a>
        <a href="#contact"  class="btn btn-ghost">Get In Touch</a>
      </div>
    </section>

    <!-- ABOUT -->
    <section id="about">
      <div class="section-label">About</div>
      <p class="about-text">
        Currently building AI-powered tools at <strong>Fules Design Co., Ltd.</strong>
        in Osaka — an invoice fraud detection system and a social media SaaS integrating
        12 platforms. I hold an <strong>MSc in Computer Science</strong> from Lincoln
        University College, Malaysia, and previously worked at ICIMOD in Nepal.
        <br><br>
        I care deeply about clean architecture, developer experience, and shipping
        products that actually work.
      </p>
      <div class="stats-row">
        <div class="stat">
          <div class="stat-num">7+</div>
          <div class="stat-label">Years exp.</div>
        </div>
        <div class="stat">
          <div class="stat-num">12</div>
          <div class="stat-label">SNS APIs</div>
        </div>
        <div class="stat">
          <div class="stat-num">10</div>
          <div class="stat-label">Fraud types</div>
        </div>
      </div>
    </section>

    <!-- SKILLS -->
    <section id="skills">
      <div class="section-label">Tech Stack</div>
      <div class="skills-grid">
        <div class="skill-item"><span class="skill-icon">⚡</span>TypeScript</div>
        <div class="skill-item"><span class="skill-icon">⚛</span>React / Next.js</div>
        <div class="skill-item"><span class="skill-icon">🟢</span>Node.js</div>
        <div class="skill-item"><span class="skill-icon">🍃</span>MongoDB / Redis</div>
        <div class="skill-item"><span class="skill-icon">☁</span>AWS</div>
        <div class="skill-item"><span class="skill-icon">🐍</span>FastAPI / Python</div>
        <div class="skill-item"><span class="skill-icon">🤖</span>OpenAI API</div>
        <div class="skill-item"><span class="skill-icon">💳</span>Stripe</div>
        <div class="skill-item"><span class="skill-icon">🐘</span>PostgreSQL</div>
        <div class="skill-item"><span class="skill-icon">🐳</span>Docker</div>
        <div class="skill-item"><span class="skill-icon">📦</span>n8n / Automation</div>
        <div class="skill-item"><span class="skill-icon">🔷</span>WordPress / PHP</div>
      </div>
    </section>

    <!-- PROJECTS -->
    <section id="projects">
      <div class="section-label">Projects</div>

      <div class="project-card">
        <div class="project-top">
          <div class="project-name">Invoice AI Check</div>
          <div class="project-tag">Active</div>
        </div>
        <p class="project-desc">
          AI-powered invoice fraud detection identifying 10 fraud categories using a
          two-pass OpenAI detection pipeline. Built for Japanese enterprise clients
          with a mobile companion app.
        </p>
        <div class="project-stack">
          <span class="pill">Node.js</span><span class="pill">Next.js</span>
          <span class="pill">FastAPI</span><span class="pill">OpenAI API</span>
          <span class="pill">Supabase</span><span class="pill">React Native</span>
        </div>
      </div>

      <div class="project-card">
        <div class="project-top">
          <div class="project-name">POSCOS / Post Controller</div>
          <div class="project-tag">SaaS</div>
        </div>
        <p class="project-desc">
          Social media management SaaS integrating 12 SNS channels. Real-time
          scheduling, cross-platform publishing, analytics, and subscription billing.
        </p>
        <div class="project-stack">
          <span class="pill">React 19</span><span class="pill">Node.js</span>
          <span class="pill">MongoDB</span><span class="pill">Redis</span>
          <span class="pill">Stripe</span>
        </div>
      </div>

      <div class="project-card">
        <div class="project-top">
          <div class="project-name">Yayoi × freee Middleware</div>
          <div class="project-tag">Integration</div>
        </div>
        <p class="project-desc">
          Accounting middleware bridging Yayoi Sales and freee APIs for automated
          invoice reconciliation and data sync for Japanese SMEs.
        </p>
        <div class="project-stack">
          <span class="pill">Node.js</span><span class="pill">TypeScript</span>
          <span class="pill">REST API</span>
        </div>
      </div>
    </section>

    <!-- CONTACT -->
    <section id="contact">
      <div class="section-label">Contact</div>
      <div class="contact-grid">
        <a href="mailto:manish@example.com" class="contact-link">
          <span class="c-icon">✉</span>manish@example.com
        </a>
        <a href="https://github.com/manish" class="contact-link">
          <span class="c-icon">⌥</span>github.com/manish
        </a>
        <a href="https://linkedin.com/in/manish" class="contact-link">
          <span class="c-icon">◈</span>linkedin.com/in/manish
        </a>
        <a href="https://findy-code.io" class="contact-link">
          <span class="c-icon">◉</span>Findy / BizReach profile
        </a>
      </div>
    </section>

    <div class="footer-pad"></div>
  </main>

</div>

<script type="module" src="/src/main.ts"></script>
</body>
</html>
```

**Step 2: Verify dev server shows the page structure**

```bash
npm run dev
```
Expected: Page renders in browser, no styles yet (CSS not extracted), no JS behavior yet.

**Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add html shell without inline styles or scripts"
```

---

### Task 4: Extract CSS to src/style.css

**Files:**
- Create: `src/style.css`

**Step 1: Create src/style.css**

Copy the entire contents of the `<style>` block from `portfolio.html` (lines 10–343) verbatim into `src/style.css`. Do not change any selectors or values.

**Step 2: Verify file exists**

```bash
ls src/style.css
```

**Step 3: Commit**

```bash
git add src/style.css
git commit -m "feat: extract css to src/style.css"
```

---

### Task 5: Create src/cursor.ts

**Files:**
- Create: `src/cursor.ts`

**Step 1: Create src/cursor.ts**

```typescript
export function initCursor(): void {
  const cursorEl  = document.getElementById('cursor') as HTMLElement
  const cursorRing = document.getElementById('cursorRing') as HTMLElement

  const ringPos = { x: innerWidth / 2, y: innerHeight / 2 }
  const rawPos  = { x: innerWidth / 2, y: innerHeight / 2 }

  document.addEventListener('mousemove', (e: MouseEvent) => {
    rawPos.x = e.clientX
    rawPos.y = e.clientY
    cursorEl.style.left = e.clientX + 'px'
    cursorEl.style.top  = e.clientY + 'px'
  })

  function ringLoop(): void {
    ringPos.x += (rawPos.x - ringPos.x) * 0.1
    ringPos.y += (rawPos.y - ringPos.y) * 0.1
    cursorRing.style.left = ringPos.x + 'px'
    cursorRing.style.top  = ringPos.y + 'px'
    requestAnimationFrame(ringLoop)
  }

  ringLoop()
}
```

**Step 2: Commit**

```bash
git add src/cursor.ts
git commit -m "feat: extract cursor logic to cursor.ts"
```

---

### Task 6: Create src/nav.ts

**Files:**
- Create: `src/nav.ts`

**Step 1: Create src/nav.ts**

```typescript
export function initNav(): void {
  const progressLine = document.getElementById('progressLine') as HTMLElement
  const navDots = document.querySelectorAll<HTMLElement>('.nav-dot')

  window.addEventListener('scroll', () => {
    const maxScroll = document.body.scrollHeight - innerHeight
    const scrollPct = maxScroll > 0 ? scrollY / maxScroll : 0
    progressLine.style.height = (scrollPct * 100) + '%'

    let active = 'hero'
    document.querySelectorAll('section').forEach(s => {
      if (s.getBoundingClientRect().top <= innerHeight * 0.55) active = s.id
    })
    navDots.forEach(d => {
      d.classList.toggle('active', d.dataset['section'] === active)
    })
  })

  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault()
      const target = document.querySelector(a.getAttribute('href') ?? '')
      target?.scrollIntoView({ behavior: 'smooth' })
    })
  })
}
```

**Step 2: Commit**

```bash
git add src/nav.ts
git commit -m "feat: extract nav + scroll logic to nav.ts"
```

---

### Task 7: Create src/vrm.ts

**Files:**
- Create: `src/vrm.ts`

**Step 1: Create src/vrm.ts**

```typescript
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { VRMLoaderPlugin, VRMUtils, VRM } from '@pixiv/three-vrm'

const VRM_URLS = [
  'https://pixiv.github.io/three-vrm/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm',
  'https://cdn.jsdelivr.net/gh/pixiv/three-vrm/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm',
  'https://raw.githubusercontent.com/pixiv/three-vrm/dev/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm',
]

export function initVRM(): void {
  const canvas        = document.getElementById('three-canvas') as HTMLCanvasElement
  const panel         = document.getElementById('charPanel') as HTMLElement
  const loadingScreen = document.getElementById('loadingScreen') as HTMLElement
  const loadingFill   = document.getElementById('loadingFill') as HTMLElement
  const loadingLabel  = document.getElementById('loadingLabel') as HTMLElement
  const loadingErr    = document.getElementById('loadingErr') as HTMLElement

  // Renderer
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace

  // Scene & Camera
  const scene  = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(28, window.innerWidth / window.innerHeight, 0.1, 20)
  camera.position.set(-0.7, 1.35, 4.2)
  camera.lookAt(0, 0.5, 0)

  // Lighting
  scene.add(new THREE.AmbientLight(0xffffff, 0.7))
  const dirLight = new THREE.DirectionalLight(0x88ddff, 1.4)
  dirLight.position.set(1.5, 3, 2.5)
  scene.add(dirLight)
  const fillLight = new THREE.DirectionalLight(0xffd166, 0.45)
  fillLight.position.set(-2, 1, 1)
  scene.add(fillLight)
  const rimLight = new THREE.DirectionalLight(0x00aaff, 0.3)
  rimLight.position.set(0, 4, -3)
  scene.add(rimLight)

  // State
  let vrm: VRM | null = null
  const clock = new THREE.Clock()
  let scrollPct = 0
  let targetYaw = 0
  let targetPitch = 0
  let smoothYaw = 0
  let smoothPitch = 0

  // Mouse → eye tracking
  document.addEventListener('mousemove', (e: MouseEvent) => {
    const nx = (e.clientX / innerWidth)  *  2 - 1
    const ny = (e.clientY / innerHeight) * -2 + 1
    targetYaw   = nx * -25
    targetPitch = ny *  15
  })

  // Scroll → progress
  window.addEventListener('scroll', () => {
    const maxScroll = document.body.scrollHeight - innerHeight
    scrollPct = maxScroll > 0 ? scrollY / maxScroll : 0
  })

  // VRM Loader
  const loader = new GLTFLoader()
  loader.register(parser => new VRMLoaderPlugin(parser))

  async function loadVRM(url: string): Promise<void> {
    loadingErr.style.display = 'none'
    loadingFill.style.width  = '0%'
    loadingLabel.textContent = 'Fetching avatar'
    loadingScreen.classList.remove('hidden')

    if (vrm) { scene.remove(vrm.scene); VRMUtils.deepDispose(vrm.scene); vrm = null }

    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const total = parseInt(res.headers.get('content-length') ?? '0')
    const reader = res.body!.getReader()
    const chunks: Uint8Array[] = []
    let loaded = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      loaded += value.length
      const pct = total ? (loaded / total) * 100 : 50
      loadingFill.style.width = Math.min(pct, 92) + '%'
      loadingLabel.textContent = 'Downloading avatar'
    }

    const combined = new Uint8Array(loaded)
    let offset = 0
    for (const chunk of chunks) { combined.set(chunk, offset); offset += chunk.length }

    loadingLabel.textContent = 'Parsing model'
    loadingFill.style.width  = '95%'

    const gltf = await new Promise<{ userData: { vrm: VRM } }>((resolve, reject) => {
      loader.parse(combined.buffer, '', resolve as never, reject)
    })

    const model = gltf.userData.vrm
    if (!model) throw new Error('Not a valid VRM file')

    try { VRMUtils.removeUnnecessaryJoints(gltf.scene as never) } catch (_) {}
    try { VRMUtils.removeUnnecessaryVertices(gltf.scene as never) } catch (_) {}

    vrm = model
    scene.add(vrm.scene)

    if (vrm.lookAt) { vrm.lookAt.autoUpdate = false; vrm.lookAt.target = null }
    vrm.scene.rotation.y = Math.PI
    vrm.scene.position.set(0, -0.9, 0)

    loadingFill.style.width = '100%'
    setTimeout(() => loadingScreen.classList.add('hidden'), 300)
  }

  function showError(): void {
    loadingFill.style.background = '#ff4444'
    loadingFill.style.width      = '100%'
    loadingLabel.textContent     = 'Default model unavailable'
    loadingErr.style.display     = 'block'
  }

  // Try URLs in order
  ;(async () => {
    for (const url of VRM_URLS) {
      try { await loadVRM(url); return } catch (e) { console.warn('Trying next VRM URL…', e) }
    }
    showError()
  })()

  // Drag & Drop
  panel.addEventListener('dragover', (e: DragEvent) => {
    e.preventDefault()
    panel.style.outline = '2px dashed rgba(0,212,255,0.4)'
  })
  panel.addEventListener('dragleave', () => { panel.style.outline = '' })
  panel.addEventListener('drop', (e: DragEvent) => {
    e.preventDefault()
    panel.style.outline = ''
    const file = e.dataTransfer?.files[0]
    if (!file || (!file.name.endsWith('.vrm') && !file.name.endsWith('.glb'))) return

    const fileReader = new FileReader()
    fileReader.onload = async () => {
      try {
        loadingErr.style.display = 'none'
        loadingFill.style.width  = '0%'
        loadingLabel.textContent = 'Parsing dropped model'
        loadingScreen.classList.remove('hidden')
        if (vrm) { scene.remove(vrm.scene); VRMUtils.deepDispose(vrm.scene); vrm = null }
        loadingFill.style.width = '60%'
        const gltf = await new Promise<{ userData: { vrm: VRM } }>((resolve, reject) => {
          loader.parse(fileReader.result as ArrayBuffer, '', resolve as never, reject)
        })
        const model = gltf.userData.vrm
        if (!model) throw new Error('Not a VRM')
        try { VRMUtils.removeUnnecessaryJoints(gltf.scene as never) } catch (_) {}
        try { VRMUtils.removeUnnecessaryVertices(gltf.scene as never) } catch (_) {}
        vrm = model
        scene.add(vrm.scene)
        if (vrm.lookAt) { vrm.lookAt.autoUpdate = false; vrm.lookAt.target = null }
        vrm.scene.rotation.y = Math.PI
        vrm.scene.position.set(0, -0.9, 0)
        loadingFill.style.width = '100%'
        setTimeout(() => loadingScreen.classList.add('hidden'), 300)
      } catch (err) { console.error(err); showError() }
    }
    fileReader.readAsArrayBuffer(file)
  })

  // Render loop
  function lerp(a: number, b: number, t: number): number { return a + (b - a) * t }

  function animate(): void {
    requestAnimationFrame(animate)
    const dt      = clock.getDelta()
    const elapsed = clock.getElapsedTime()

    if (vrm) {
      smoothYaw   += (targetYaw   - smoothYaw)   * Math.min(dt * 6, 1)
      smoothPitch += (targetPitch - smoothPitch) * Math.min(dt * 6, 1)

      if (vrm.lookAt?.applier) {
        vrm.lookAt.applier.applyYawPitch(smoothYaw, smoothPitch)
      }

      vrm.scene.position.y = -0.9 + Math.sin(elapsed * 1.1) * 0.005
      vrm.scene.rotation.y = Math.PI + Math.sin(elapsed * 0.35) * 0.025

      if (vrm.humanoid) {
        const headTilt = (scrollPct - 0.5) * 0.25
        const head  = vrm.humanoid.getNormalizedBoneNode('head')
        const neck  = vrm.humanoid.getNormalizedBoneNode('neck')
        const spine = vrm.humanoid.getNormalizedBoneNode('spine')
        if (head)  head.rotation.x  = lerp(head.rotation.x,  headTilt * 0.6,  dt * 2)
        if (neck)  neck.rotation.x  = lerp(neck.rotation.x,  headTilt * 0.3,  dt * 2)
        if (spine) spine.rotation.x = lerp(spine.rotation.x, headTilt * 0.15, dt * 1.5)
      }

      if (vrm.lookAt) { vrm.lookAt.target = null; vrm.lookAt.autoUpdate = false }
      vrm.update(dt)
    }

    renderer.render(scene, camera)
  }

  animate()

  // Resize
  window.addEventListener('resize', () => {
    const w = window.innerWidth
    const h = window.innerHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  })
}
```

**Step 2: Commit**

```bash
git add src/vrm.ts
git commit -m "feat: extract three.js + vrm logic to vrm.ts"
```

---

### Task 8: Create src/main.ts

**Files:**
- Create: `src/main.ts`

**Step 1: Create src/main.ts**

```typescript
import './style.css'
import { initCursor } from './cursor'
import { initNav } from './nav'
import { initVRM } from './vrm'

initCursor()
initNav()
initVRM()
```

**Step 2: Verify dev server works end-to-end**

```bash
npm run dev
```
Expected: Portfolio renders in browser at `http://localhost:5173` with full styles, cursor, nav, and VRM character loading.

**Step 3: Commit**

```bash
git add src/main.ts
git commit -m "feat: wire all modules in main.ts"
```

---

### Task 9: Verify TypeScript compiles cleanly

**Step 1: Run type check**

```bash
npx tsc --noEmit
```
Expected: Zero errors. Fix any type errors before proceeding.

**Step 2: Run build**

```bash
npm run build
```
Expected: `dist/` folder created with `index.html`, bundled JS, and CSS.

**Step 3: Preview the production build**

```bash
npm run preview
```
Expected: Portfolio renders correctly at `http://localhost:4173/portfolio/`.

**Step 4: Commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: resolve typescript type errors"
```

---

### Task 10: Set up GitHub Actions deploy workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

**Step 1: Create the workflow file**

```bash
mkdir -p .github/workflows
```

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

**Step 2: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add github actions deploy workflow"
```

---

### Task 11: Initialize git repo and push to GitHub

**Step 1: Initialize git (if not already done)**

```bash
git init
git branch -M main
```

**Step 2: Create repo on GitHub**

Go to github.com → New repository → name it `portfolio` → public → no README (we have files already).

**Step 3: Add remote and push**

```bash
git remote add origin https://github.com/YOUR_USERNAME/portfolio.git
git push -u origin main
```

**Step 4: Enable GitHub Pages**

In the repo → Settings → Pages → Source: **GitHub Actions**

**Step 5: Verify deployment**

After the Actions workflow runs (~1-2 min), visit:
`https://YOUR_USERNAME.github.io/portfolio/`

Expected: Portfolio is live and fully functional.

---

## Summary

| Task | Output |
|------|--------|
| 1 | `package.json`, `.gitignore`, npm deps |
| 2 | `tsconfig.json`, `vite.config.ts` |
| 3 | `index.html` shell |
| 4 | `src/style.css` |
| 5 | `src/cursor.ts` |
| 6 | `src/nav.ts` |
| 7 | `src/vrm.ts` |
| 8 | `src/main.ts` |
| 9 | Type check + production build verified |
| 10 | `.github/workflows/deploy.yml` |
| 11 | Pushed to GitHub, Pages live |
