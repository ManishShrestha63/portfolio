import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { VRMLoaderPlugin, VRMUtils, VRM, VRMHumanBoneName } from '@pixiv/three-vrm'
import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from '@pixiv/three-vrm-animation'

const VRM_URLS = ['/portfolio/models/character.vrm']
const ANIM_BASE = '/portfolio/models/animations/'

// ── Camera keyframes (one per scroll section) ───────────────────────────────
interface CameraFrame {
  pos:        THREE.Vector3
  look:       THREE.Vector3
  charY:      number
  yawRange:   number
  pitchRange: number
}

const CAM: CameraFrame[] = [
  // 0 — Hero: straight on
  { pos: new THREE.Vector3(0,    0.65, 3.50), look: new THREE.Vector3(0.00, 0.50, 0), charY: -0.9,  yawRange: 25, pitchRange: 15 },
  // 1 — About: nudge right, look up slightly
  { pos: new THREE.Vector3(0.3,  0.65, 3.50), look: new THREE.Vector3(0.00, 0.60, 0), charY: -0.9,  yawRange: 20, pitchRange: 12 },
  // 2 — Skills: nudge left
  { pos: new THREE.Vector3(-0.3, 0.65, 3.50), look: new THREE.Vector3(0.00, 0.50, 0), charY: -0.9,  yawRange: 22, pitchRange: 13 },
  // 3 — Projects: closer, look at face
  { pos: new THREE.Vector3(0.2,  0.65, 3.10), look: new THREE.Vector3(0.00, 0.75, 0), charY: -0.9,  yawRange: 15, pitchRange: 10 },
  // 4 — Contact: pull back for full body
  { pos: new THREE.Vector3(0,    0.65, 3.80), look: new THREE.Vector3(0.00, 0.35, 0), charY: -0.9,  yawRange: 25, pitchRange: 15 },
]

// Scroll section → VRMA animation name
const SECTION_ANIMS = ['Relax', 'Thinking', 'LookAround', 'Clapping', 'Goodbye'] as const

// ── Section poses (fallback when animation not yet loaded) ───────────────────
interface BoneTarget { x: number; y: number; z: number }
type SectionPose = Partial<Record<VRMHumanBoneName, BoneTarget>>

// z-axis convention for this VRM model's normalized bones:
//   z = 0  → arm at natural resting side (DOWN)
//   z > 0  → arm swings outward toward T-pose (T-pose ≈ z=1.25)
const IDLE_POSE: SectionPose = {
  leftUpperArm:  { x:  0.05, y:  0,    z:  0.05 },
  rightUpperArm: { x:  0.05, y:  0,    z: -0.05 },
  leftLowerArm:  { x:  0.1,  y:  0,    z:  0    },
  rightLowerArm: { x:  0.1,  y:  0,    z:  0    },
  chest:         { x:  0,    y:  0,    z:  0    },
  spine:         { x:  0,    y:  0,    z:  0    },
  head:          { x:  0,    y:  0,    z:  0    },
}

export function initVRM(): void {
  const canvas        = document.getElementById('three-canvas') as HTMLCanvasElement
  const panel         = document.getElementById('charPanel') as HTMLElement
  const loadingScreen = document.getElementById('loadingScreen') as HTMLElement
  const loadingFill   = document.getElementById('loadingFill') as HTMLElement
  const loadingLabel  = document.getElementById('loadingLabel') as HTMLElement
  const loadingErr    = document.getElementById('loadingErr') as HTMLElement

  // Panel is position:fixed 50vw × 100vh — use window dimensions directly
  const getPW = () => window.innerWidth
  const getPH = () => window.innerHeight

  // ── Renderer ───────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(getPW(), getPH())
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace

  // ── Scene & Camera ─────────────────────────────────────────
  const scene  = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(52, getPW() / getPH(), 0.1, 20)

  const cameraPos    = CAM[0].pos.clone()
  const cameraLookAt = CAM[0].look.clone()
  camera.position.copy(cameraPos)
  camera.lookAt(cameraLookAt)

  // ── Lighting ───────────────────────────────────────────────
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

  // ── Matrix rain background ─────────────────────────────────
  // Three depth layers — camera orbit/parallax reveals depth between them
  const MATRIX_CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヲン0123456789ABCDEF<>{}[]/\\'

  // Scene config (baked-in values)
  const sceneCfg = { charX: 1.10, camLookX: 0.00, rainX: 2.00, camZ: 3.50, camY: 0.65 }

  const rainMeshes: THREE.Mesh[] = []

  function createRainLayer(params: {
    z: number; w: number; h: number
    res: number; fontSize: number
    opacity: number; speed: number
  }): () => void {
    const { z, w, h, res, fontSize, opacity, speed } = params
    const cw = res, ch = Math.round(res * (h / w))
    const cv  = document.createElement('canvas')
    cv.width  = cw; cv.height = ch
    const ctx = cv.getContext('2d')!
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, cw, ch)

    const cols  = Math.floor(cw / fontSize)
    const rows  = Math.floor(ch / fontSize)
    const drops = Array.from({ length: cols }, () => -Math.random() * rows)

    const tex  = new THREE.CanvasTexture(cv)
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({
        map: tex, transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false, opacity,
      })
    )
    mesh.position.set(sceneCfg.rainX, 0.6, z)
    scene.add(mesh)
    rainMeshes.push(mesh)

    let frame = 0
    return function update() {
      if (++frame % 3 !== 0) return          // ~20 fps canvas updates

      ctx.fillStyle = 'rgba(0,0,0,0.055)'    // trail fade
      ctx.fillRect(0, 0, cw, ch)
      ctx.shadowColor = '#00d4ff'

      for (let i = 0; i < cols; i++) {
        const row = drops[i]
        if (row < 0) { drops[i] += speed * 0.5; continue }

        const x = i * fontSize
        const y = Math.floor(row) * fontSize

        // Head — bright white/cyan
        ctx.shadowBlur = 8
        ctx.fillStyle  = '#cfffff'
        ctx.font       = `bold ${fontSize}px monospace`
        ctx.fillText(MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)], x, y)

        // Trailing glyphs — fading cyan
        ctx.font = `${fontSize}px monospace`
        ctx.shadowBlur = 3
        for (let j = 1; j <= 5 && row - j >= 0; j++) {
          ctx.globalAlpha = Math.max(0, 1 - j * 0.18)
          ctx.fillStyle   = j === 1 ? '#66eeff' : '#00d4ff'
          ctx.fillText(MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)], x, y - j * fontSize)
        }
        ctx.globalAlpha = 1
        ctx.shadowBlur  = 0

        drops[i] += speed
        if (drops[i] > rows && Math.random() > 0.975) drops[i] = -Math.random() * 15
      }
      tex.needsUpdate = true
    }
  }

  // Near layer — slightly faster, brighter
  const updateNear = createRainLayer({ z: -2.5, w: 10, h: 8,  res: 512, fontSize: 12, opacity: 0.55, speed: 0.18 })
  // Mid layer — main dense layer
  const updateMid  = createRainLayer({ z: -4.5, w: 14, h: 11, res: 768, fontSize: 14, opacity: 0.65, speed: 0.12 })
  // Far layer — slow, dim, ambient
  const updateFar  = createRainLayer({ z: -7.0, w: 18, h: 16, res: 512, fontSize: 10, opacity: 0.35, speed: 0.07 })

  // ── Contact shadow (blob shadow under character feet) ──────
  const shadowCv  = document.createElement('canvas')
  shadowCv.width  = 256
  shadowCv.height = 256
  const sctx = shadowCv.getContext('2d')!
  // Outer cyan rim → dark core → transparent edges
  const shadowGrad = sctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  shadowGrad.addColorStop(0,    'rgba(0, 10, 30,  0.85)')
  shadowGrad.addColorStop(0.45, 'rgba(0, 20, 50,  0.60)')
  shadowGrad.addColorStop(0.72, 'rgba(0, 80, 140, 0.25)')
  shadowGrad.addColorStop(0.90, 'rgba(0,180, 255, 0.08)')
  shadowGrad.addColorStop(1,    'rgba(0,  0,   0, 0)')
  sctx.fillStyle = shadowGrad
  sctx.fillRect(0, 0, 256, 256)

  const shadowTex  = new THREE.CanvasTexture(shadowCv)
  const shadowMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 0.7),   // wide ellipse footprint
    new THREE.MeshBasicMaterial({
      map:         shadowTex,
      transparent: true,
      depthWrite:  false,
      opacity:     0.9,
    })
  )
  shadowMesh.rotation.x = -Math.PI / 2  // flat on ground
  shadowMesh.position.set(0, -0.88, 0.1)
  scene.add(shadowMesh)

  // ── State ──────────────────────────────────────────────────
  let vrm: VRM | null = null
  const clock = new THREE.Clock()

  const isMobile = () => window.innerWidth < 768

  // Mouse
  let targetYaw = 0, targetPitch = 0
  let smoothYaw = 0, smoothPitch = 0
  let mouseNX = 0, mouseNY = 0

  // Scroll
  let scrollPct = 0
  let scrollVelocity = 0

  // Intro slide-in
  let introProgress = 0
  let currentX = 3.0

  // Expressions
  let exprHappy = 0
  let exprSurprised = 0
  let blinkTimer = 0
  let nextBlink = 2.0
  const BLINK_DURATION = 0.12

  // ── Drag / grab state ──────────────────────────────────────
  let isDragging  = false
  let dragYaw     = 0   // accumulated Y rotation from drag (radians)
  let dragLean    = 0   // accumulated X lean from drag (radians)
  let dragLastX   = 0
  let dragLastY   = 0
  const cursorRing = document.getElementById('cursorRing') as HTMLElement

  // ── Idle cycling ───────────────────────────────────────────
  const IDLE_TIMEOUT = 8   // seconds of inactivity before cycling starts
  const ALL_ANIMS = ['Relax','Thinking','LookAround','Clapping','Goodbye','Blush','Sad','Sleepy','Angry','Surprised','Jump']
  let lastInteraction = performance.now()
  let idleCycling     = false
  let idleQueue:  string[] = []
  let lastIdleAnim    = ''

  function idleNext(): void {
    if (!idleCycling || !vrm || !mixer) return

    if (idleQueue.length === 0) {
      idleQueue = [...ALL_ANIMS].sort(() => Math.random() - 0.5)
    }
    // Avoid immediate repeat of the last animation
    if (idleQueue[0] === lastIdleAnim && idleQueue.length > 1) {
      idleQueue.push(idleQueue.shift()!)
    }
    const name = idleQueue.shift()!
    lastIdleAnim = name

    // Play once — when it finishes, automatically chain to the next
    loadAnimClip(name).then(clip => {
      if (!clip || !mixer || !idleCycling) return
      const action = mixer.clipAction(clip)
      action.setLoop(THREE.LoopOnce, 1)
      action.clampWhenFinished = true
      action.reset()
      action.play()
      if (currentAction && currentAction !== action) currentAction.crossFadeTo(action, 0.5, true)
      currentAction = action

      const onFinished = (e: { action: THREE.AnimationAction }) => {
        if (e.action !== action) return
        mixer!.removeEventListener('finished', onFinished as never)
        idleNext()  // chain to next animation
      }
      mixer.addEventListener('finished', onFinished as never)
    })
  }

  function touchInteraction(): void {
    lastInteraction = performance.now()
    if (idleCycling) {
      idleCycling        = false
      currentAnimSection = -1   // force section anim to re-trigger
    }
  }

  // ── Animation system ───────────────────────────────────────
  let mixer: THREE.AnimationMixer | null = null
  let currentAction: THREE.AnimationAction | null = null
  const animCache = new Map<string, THREE.AnimationClip>()
  let currentAnimSection = -1
  let oneShotPlaying = false

  async function loadAnimClip(name: string): Promise<THREE.AnimationClip | null> {
    if (animCache.has(name)) return animCache.get(name)!
    if (!vrm) return null
    try {
      const gltf = await new Promise<{ userData: { vrmAnimations?: unknown[] } }>((resolve, reject) => {
        loader.load(`${ANIM_BASE}${name}.vrma`, resolve as never, undefined, reject)
      })
      const vrmAnim = gltf.userData.vrmAnimations?.[0]
      if (!vrmAnim) return null
      const clip = createVRMAnimationClip(vrmAnim as never, vrm!)
      animCache.set(name, clip)
      return clip
    } catch (e) {
      console.warn(`[vrm] Failed to load animation: ${name}`, e)
      return null
    }
  }

  async function playAnim(name: string, loop = true): Promise<void> {
    if (!vrm || !mixer) return
    const clip = await loadAnimClip(name)
    if (!clip) return

    const newAction = mixer.clipAction(clip)
    newAction.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity)
    newAction.clampWhenFinished = !loop
    newAction.reset()
    newAction.play()

    if (currentAction && currentAction !== newAction) {
      currentAction.crossFadeTo(newAction, 0.5, true)
    }
    currentAction = newAction
  }

  async function playOneShotThenReturn(name: string, returnToName: string): Promise<void> {
    if (!vrm || !mixer || oneShotPlaying) return
    oneShotPlaying = true

    const clip = await loadAnimClip(name)
    if (!clip) { oneShotPlaying = false; return }

    const shot = mixer.clipAction(clip)
    shot.setLoop(THREE.LoopOnce, 1)
    shot.clampWhenFinished = true
    shot.reset()
    shot.play()
    if (currentAction && currentAction !== shot) currentAction.crossFadeTo(shot, 0.3, true)
    currentAction = shot

    // Listen for finish then crossfade back to section animation
    const onFinished = (e: { action: THREE.AnimationAction }) => {
      if (e.action !== shot) return
      mixer!.removeEventListener('finished', onFinished as never)
      oneShotPlaying = false
      playAnim(returnToName, true)
    }
    mixer.addEventListener('finished', onFinished as never)
  }

  // ── Input listeners ────────────────────────────────────────
  document.addEventListener('mousemove', (e: MouseEvent) => {
    touchInteraction()
    mouseNX     = (e.clientX / innerWidth)  *  2 - 1
    mouseNY     = (e.clientY / innerHeight) * -2 + 1
    targetYaw   = mouseNX * -25
    targetPitch = mouseNY *  15

    if (isDragging) {
      const dx = e.clientX - dragLastX
      const dy = e.clientY - dragLastY
      dragLastX = e.clientX
      dragLastY = e.clientY
      dragYaw  = clamp(dragYaw  + dx * 0.012, -Math.PI * 0.75, Math.PI * 0.75)
      dragLean = clamp(dragLean + dy * 0.006, -0.45, 0.45)
    }
  })

  panel.addEventListener('mouseenter', () => { cursorRing.classList.add('grabbable') })
  panel.addEventListener('mouseleave', () => {
    cursorRing.classList.remove('grabbable')
    if (isDragging) {
      isDragging = false
      cursorRing.classList.remove('grabbing')
    }
  })

  panel.addEventListener('mousedown', (e: MouseEvent) => {
    if (e.button !== 0) return
    touchInteraction()
    isDragging = true
    dragLastX  = e.clientX
    dragLastY  = e.clientY
    cursorRing.classList.add('grabbing')
    cursorRing.classList.remove('grabbable')
    e.preventDefault()
  })

  document.addEventListener('mouseup', () => {
    if (!isDragging) return
    isDragging = false
    cursorRing.classList.remove('grabbing')
    if (panel.matches(':hover')) cursorRing.classList.add('grabbable')
  })

  document.addEventListener('click', () => {
    touchInteraction()
    // Only trigger Surprised if it wasn't the end of a drag
    if (Math.abs(dragYaw) < 0.05 && Math.abs(dragLean) < 0.05) {
      exprSurprised = 1.0
      const returnAnim = SECTION_ANIMS[currentAnimSection] ?? 'Relax'
      playOneShotThenReturn('Surprised', returnAnim)
    }
  })

  window.addEventListener('scroll', () => {
    touchInteraction()
    const maxScroll = document.body.scrollHeight - innerHeight
    const newPct = maxScroll > 0 ? scrollY / maxScroll : 0
    scrollVelocity = newPct - scrollPct
    scrollPct = newPct

    // Fast scroll → brief Jump (only on desktop, not if already in one-shot)
    if (!isMobile() && Math.abs(scrollVelocity) > 0.04 && !oneShotPlaying) {
      const returnAnim = SECTION_ANIMS[currentAnimSection] ?? 'Relax'
      playOneShotThenReturn('Jump', returnAnim)
    }
  })

  // ── Helpers ────────────────────────────────────────────────
  function lerp(a: number, b: number, t: number): number { return a + (b - a) * t }
  function clamp(v: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, v)) }
  function easeOutCubic(t: number): number { return 1 - Math.pow(1 - t, 3) }
  function smoothstep(t: number): number {
    const c = clamp(t, 0, 1)
    return c * c * (3 - 2 * c)
  }

  function lerpBone(
    boneName: VRMHumanBoneName,
    tx: number, ty: number, tz: number,
    speed: number, dt: number
  ): void {
    if (!vrm?.humanoid) return
    const node = vrm.humanoid.getNormalizedBoneNode(boneName)
    if (!node) return
    node.rotation.x = lerp(node.rotation.x, tx, dt * speed)
    node.rotation.y = lerp(node.rotation.y, ty, dt * speed)
    node.rotation.z = lerp(node.rotation.z, tz, dt * speed)
  }

  // ── Loader ─────────────────────────────────────────────────
  const loader = new GLTFLoader()
  loader.register(parser => new VRMLoaderPlugin(parser))
  loader.register(parser => new VRMAnimationLoaderPlugin(parser))

  function spawnVRM(model: VRM): void {
    vrm = model
    scene.add(vrm.scene)
    if (vrm.lookAt) { vrm.lookAt.autoUpdate = false; vrm.lookAt.target = null }

    // Snap to idle immediately — prevents T-pose flash
    if (vrm.humanoid) {
      for (const [boneName, rot] of Object.entries(IDLE_POSE)) {
        const node = vrm.humanoid.getNormalizedBoneNode(boneName as VRMHumanBoneName)
        if (node && rot) { node.rotation.x = rot.x; node.rotation.y = rot.y; node.rotation.z = rot.z }
      }
    }

    // Scale up model
    vrm.scene.scale.setScalar(1.35)

    // Create animation mixer
    mixer = new THREE.AnimationMixer(vrm.scene)

    // Enter from right
    introProgress = 0
    currentX = sceneCfg.charX + 3.0
    vrm.scene.position.set(currentX, -0.9, 0)
    vrm.scene.rotation.y = Math.PI + 0.4
    exprHappy = 0.9
    currentAnimSection = -1  // force section anim to trigger on first frame
    oneShotPlaying = false

    // Start Relax immediately, then preload remaining anims in background
    playAnim('Relax', true)
    // Preload all section + common idle animations in parallel so they're ready instantly
    const preloadList = ['Thinking','LookAround','Clapping','Goodbye','Blush','Sad','Sleepy','Angry','Surprised','Jump']
    for (const name of preloadList) loadAnimClip(name)
  }

  async function loadVRM(url: string): Promise<void> {
    loadingErr.style.display = 'none'
    loadingFill.style.width  = '0%'
    loadingLabel.textContent = 'Fetching avatar'
    loadingScreen.classList.remove('hidden')

    if (vrm) {
      scene.remove(vrm.scene)
      VRMUtils.deepDispose(vrm.scene)
      vrm = null
      mixer = null
      currentAction = null
      animCache.clear()
    }

    const gltf = await new Promise<{ scene: THREE.Group; userData: { vrm: VRM } }>((resolve, reject) => {
      loader.load(
        url,
        resolve as never,
        (ev: ProgressEvent) => {
          if (ev.lengthComputable) {
            const pct = (ev.loaded / ev.total) * 92
            loadingFill.style.width  = pct + '%'
            loadingLabel.textContent = pct < 50 ? 'Downloading avatar' : 'Parsing model'
          }
        },
        reject
      )
    })

    const model = gltf.userData.vrm
    if (!model) throw new Error('Not a valid VRM file')

    spawnVRM(model)
    loadingFill.style.width = '100%'
    setTimeout(() => {
      loadingScreen.classList.add('hidden')
      document.dispatchEvent(new CustomEvent('vrm:ready'))
    }, 300)
  }

  function showError(): void {
    loadingFill.style.background = '#ff4444'
    loadingFill.style.width      = '100%'
    loadingLabel.textContent     = 'Default model unavailable'
    loadingErr.style.display     = 'block'
    document.dispatchEvent(new CustomEvent('vrm:ready'))
  }

  ;(async () => {
    for (const url of VRM_URLS) {
      try { await loadVRM(url); return } catch (e) { console.warn('Trying next VRM URL…', e) }
    }
    showError()
  })()

  // ── Drag & Drop ────────────────────────────────────────────
  panel.addEventListener('dragover', (e: DragEvent) => {
    e.preventDefault(); panel.style.outline = '2px dashed rgba(0,212,255,0.4)'
  })
  panel.addEventListener('dragleave', () => { panel.style.outline = '' })
  panel.addEventListener('drop', (e: DragEvent) => {
    e.preventDefault(); panel.style.outline = ''
    const file = e.dataTransfer?.files[0]
    if (!file || (!file.name.endsWith('.vrm') && !file.name.endsWith('.glb'))) return
    const fr = new FileReader()
    fr.onload = async () => {
      try {
        loadingErr.style.display = 'none'
        loadingFill.style.width  = '0%'
        loadingLabel.textContent = 'Parsing dropped model'
        loadingScreen.classList.remove('hidden')
        if (vrm) { scene.remove(vrm.scene); VRMUtils.deepDispose(vrm.scene); vrm = null; mixer = null; currentAction = null; animCache.clear() }
        loadingFill.style.width = '60%'
        const gltf = await new Promise<{ scene: THREE.Group; userData: { vrm: VRM } }>((resolve, reject) => {
          loader.parse(fr.result as ArrayBuffer, '', resolve as never, reject)
        })
        const model = gltf.userData.vrm
        if (!model) throw new Error('Not a VRM')
        spawnVRM(model)
        loadingFill.style.width = '100%'
        setTimeout(() => loadingScreen.classList.add('hidden'), 300)
      } catch (err) { console.error(err); showError() }
    }
    fr.readAsArrayBuffer(file)
  })

  // ── Render loop ────────────────────────────────────────────
  const _tmpVec = new THREE.Vector3()

  function animate(): void {
    requestAnimationFrame(animate)
    const dt      = Math.min(clock.getDelta(), 0.05)  // cap dt to prevent lerp overshoot on slow loads
    const elapsed = clock.getElapsedTime()
    const mobile  = isMobile()

    // ── Scroll section ─────────────────────────────────────
    const sectionIdx      = clamp(Math.floor(scrollPct * 5), 0, 4)
    const sectionProgress = smoothstep((scrollPct * 5) - sectionIdx)
    const nextIdx         = Math.min(sectionIdx + 1, 4)
    const camA            = CAM[sectionIdx]
    const camB            = CAM[nextIdx]

    const curYawRange   = lerp(camA.yawRange,   camB.yawRange,   sectionProgress)
    const curPitchRange = lerp(camA.pitchRange,  camB.pitchRange, sectionProgress)
    const curCharY      = lerp(camA.charY,       camB.charY,      sectionProgress)

    // ── Section animation change ───────────────────────────
    if (sectionIdx !== currentAnimSection && !oneShotPlaying && !idleCycling) {
      currentAnimSection = sectionIdx
      playAnim(SECTION_ANIMS[sectionIdx], true)
    }

    // ── Idle cycling ───────────────────────────────────────
    const idleSeconds = (performance.now() - lastInteraction) / 1000
    if (idleSeconds > IDLE_TIMEOUT && !idleCycling && !oneShotPlaying) {
      idleCycling  = true
      lastIdleAnim = SECTION_ANIMS[currentAnimSection] ?? ''
      idleNext()
    }

    // ── Camera ─────────────────────────────────────────────
    if (!mobile) {
      _tmpVec.lerpVectors(camA.pos,  camB.pos,  sectionProgress)
      _tmpVec.y = sceneCfg.camY
      _tmpVec.z = sceneCfg.camZ
      cameraPos.lerp(_tmpVec, dt * 3)
      _tmpVec.lerpVectors(camA.look, camB.look, sectionProgress)
      _tmpVec.x = sceneCfg.camLookX
      cameraLookAt.lerp(_tmpVec, dt * 3)
    }

    const px = mouseNX * 0.08
    const py = mouseNY * 0.04
    camera.position.set(cameraPos.x + px, cameraPos.y + py, cameraPos.z)
    camera.lookAt(cameraLookAt)

    if (!vrm) { renderer.render(scene, camera); return }

    // ── Matrix rain update ─────────────────────────────────
    updateNear(); updateMid(); updateFar()

    // ── Update animation mixer ─────────────────────────────
    if (mixer) mixer.update(dt)

    // ── Smooth mouse ───────────────────────────────────────
    const scaledTargetYaw   = (targetYaw   / 25) * curYawRange
    const scaledTargetPitch = (targetPitch / 15) * curPitchRange
    smoothYaw   += (scaledTargetYaw   - smoothYaw)   * Math.min(dt * 6, 1)
    smoothPitch += (scaledTargetPitch - smoothPitch) * Math.min(dt * 6, 1)
    const yawRad   = (smoothYaw   * Math.PI) / 180
    const pitchRad = (smoothPitch * Math.PI) / 180

    // ── Facing angle — rotate character to look toward the camera ──
    // Camera is at X≈0, character is at X=charX; atan2 gives the turn needed
    const faceOffset = Math.atan2(-sceneCfg.charX, sceneCfg.camZ)

    // ── Intro slide-in ─────────────────────────────────────
    if (introProgress < 1) {
      introProgress = Math.min(introProgress + dt / 1.4, 1)
      const eased = easeOutCubic(introProgress)
      currentX = lerp(sceneCfg.charX + 3.0, sceneCfg.charX, eased)
      vrm.scene.rotation.y = lerp(Math.PI + 0.4 + faceOffset, Math.PI + faceOffset, eased)
    } else if (!mobile) {
      currentX = lerp(currentX, sceneCfg.charX, dt * 1.5)
    }

    // ── Position ───────────────────────────────────────────
    const scrollBounce = clamp(Math.abs(scrollVelocity) * 6, 0, 0.04)
    vrm.scene.position.x = currentX
    vrm.scene.position.y = curCharY
      + Math.sin(elapsed * 1.1) * 0.005
      + Math.sin(elapsed * 6)   * scrollBounce

    // Shadow follows character X; shrinks slightly when character bobs up
    const bobOffset  = vrm.scene.position.y - curCharY
    const shadowScale = Math.max(0.7, 1 - bobOffset * 4)
    shadowMesh.position.x  = currentX
    shadowMesh.scale.setScalar(shadowScale)

    scrollVelocity = lerp(scrollVelocity, 0, dt * 8)

    // Ease drag values back to neutral when released
    if (!isDragging) {
      dragYaw  = lerp(dragYaw,  0, dt * 2.5)
      dragLean = lerp(dragLean, 0, dt * 2.5)
    }

    if (introProgress >= 1 && !mobile) {
      const idleSway = Math.sin(elapsed * 0.35) * 0.02
      const targetRY = Math.PI + faceOffset + dragYaw + idleSway + yawRad * 0.04
      vrm.scene.rotation.y = lerp(
        vrm.scene.rotation.y,
        targetRY,
        isDragging ? dt * 18 : dt * 3
      )
    }

    // ── Humanoid bones ─────────────────────────────────────
    if (vrm.humanoid) {
      const animRunning = currentAction?.isRunning() ?? false

      if (!animRunning) {
        // Fallback: drive all bones manually to idle pose
        for (const [boneName, rot] of Object.entries(IDLE_POSE)) {
          lerpBone(boneName as VRMHumanBoneName, rot.x, rot.y, rot.z, 4, dt)
        }
      }

      // Head & neck mouse tracking — always additive on top of animation
      const head = vrm.humanoid.getNormalizedBoneNode('head')
      const neck = vrm.humanoid.getNormalizedBoneNode('neck')
      const chest = vrm.humanoid.getNormalizedBoneNode('chest')
      const spine = vrm.humanoid.getNormalizedBoneNode('spine')
      const hips  = vrm.humanoid.getNormalizedBoneNode('hips')

      if (animRunning) {
        // Additive mouse on top of VRMA-driven pose
        if (head)  { head.rotation.x  += pitchRad * 0.2;  head.rotation.y  += yawRad * 0.28  }
        if (neck)  { neck.rotation.x  += pitchRad * 0.12; neck.rotation.y  += yawRad * 0.18  }
        if (chest) { chest.rotation.y += yawRad   * 0.06                                      }
        if (spine) { spine.rotation.y += yawRad   * 0.04                                      }
      } else {
        // Smooth lerp toward mouse target (no VRMA active)
        if (head) {
          head.rotation.x = lerp(head.rotation.x, pitchRad * 0.28, dt * 9)
          head.rotation.y = lerp(head.rotation.y, yawRad   * 0.38, dt * 9)
        }
        if (neck) {
          neck.rotation.x = lerp(neck.rotation.x, pitchRad * 0.18, dt * 8)
          neck.rotation.y = lerp(neck.rotation.y, yawRad   * 0.22, dt * 8)
        }
        if (chest) {
          chest.rotation.x = lerp(chest.rotation.x, pitchRad * 0.06, dt * 3)
          chest.rotation.y = lerp(chest.rotation.y, yawRad   * 0.1,  dt * 3)
        }
        if (spine) {
          spine.rotation.y = lerp(spine.rotation.y, yawRad * 0.05, dt * 3)
        }
      }

      if (hips) hips.rotation.z = Math.sin(elapsed * 0.9) * 0.012

      // Drag lean — additive forward/back tilt on top of animation
      if (isDragging && spine && chest) {
        spine.rotation.x += dragLean * 0.25
        chest.rotation.x += dragLean * 0.15
      }
    }

    // ── Expressions ────────────────────────────────────────
    if (vrm.expressionManager) {
      const em = vrm.expressionManager

      nextBlink -= dt
      if (nextBlink <= 0 && blinkTimer <= 0) {
        blinkTimer = BLINK_DURATION
        nextBlink  = 2.5 + Math.random() * 3.5
      }
      let blinkValue = 0
      if (blinkTimer > 0) {
        blinkTimer = Math.max(0, blinkTimer - dt)
        const bt = 1 - blinkTimer / BLINK_DURATION
        blinkValue = bt < 0.5 ? bt * 2 : (1 - bt) * 2
      }

      exprHappy = lerp(exprHappy, 0.08, dt * 0.6)
      const mouseHappy = mouseNX > 0.2 ? clamp((mouseNX - 0.2) * 0.6, 0, 0.4) : 0
      exprSurprised = lerp(exprSurprised, 0, dt * 4)
      const scrollSurprise = clamp(Math.abs(scrollVelocity) * 12, 0, 0.5)

      em.setValue('happy',     clamp(exprHappy + mouseHappy, 0, 1))
      em.setValue('surprised', clamp(exprSurprised + scrollSurprise, 0, 1))
      em.setValue('blink',     blinkValue)
    }

    // ── VRM update + eye tracking ──────────────────────────
    if (vrm.lookAt) { vrm.lookAt.target = null; vrm.lookAt.autoUpdate = false }
    vrm.update(dt)
    if (vrm.lookAt?.applier) {
      vrm.lookAt.applier.applyYawPitch(smoothYaw, smoothPitch)
    }

    renderer.render(scene, camera)
  }

  animate()

  // ── Resize ─────────────────────────────────────────────────
  window.addEventListener('resize', () => {
    const w = getPW(), h = getPH()
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
    if (!isMobile()) {
      const idx = clamp(Math.floor(scrollPct * 5), 0, 4)
      cameraPos.copy(CAM[idx].pos)
      cameraLookAt.copy(CAM[idx].look)
    }
  })
}
