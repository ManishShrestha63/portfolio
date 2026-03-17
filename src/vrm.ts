import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { VRMLoaderPlugin, VRMUtils, VRM, VRMHumanBoneName } from '@pixiv/three-vrm'

const VRM_URLS = ['/portfolio/models/character.vrm']

// ── Pose definitions ────────────────────────────────────────────────────────
type BoneRot = { x?: number; y?: number; z?: number }
type Pose = Partial<Record<VRMHumanBoneName, BoneRot>>

// Natural standing — arms relaxed at sides
const POSE_IDLE: Pose = {
  leftUpperArm:  { x:  0.05, y:  0.0,  z: -1.25 },
  rightUpperArm: { x:  0.05, y:  0.0,  z:  1.25 },
  leftLowerArm:  { x:  0.1,  y:  0.0,  z: -0.05 },
  rightLowerArm: { x:  0.1,  y:  0.0,  z:  0.05 },
  leftHand:      { x:  0.0,  y:  0.0,  z:  0.0  },
  rightHand:     { x:  0.0,  y:  0.0,  z:  0.0  },
}

// Arms folded across chest
const POSE_CROSSED: Pose = {
  leftUpperArm:  { x:  0.6,  y:  0.1,  z: -0.5  },
  rightUpperArm: { x:  0.6,  y: -0.1,  z:  0.5  },
  leftLowerArm:  { x:  0.15, y: -1.55, z:  0.05 },
  rightLowerArm: { x:  0.15, y:  1.55, z: -0.05 },
  leftHand:      { x:  0.0,  y: -0.3,  z:  0.0  },
  rightHand:     { x:  0.0,  y:  0.3,  z:  0.0  },
}

export function initVRM(): void {
  const canvas        = document.getElementById('three-canvas') as HTMLCanvasElement
  const panel         = document.getElementById('charPanel') as HTMLElement
  const loadingScreen = document.getElementById('loadingScreen') as HTMLElement
  const loadingFill   = document.getElementById('loadingFill') as HTMLElement
  const loadingLabel  = document.getElementById('loadingLabel') as HTMLElement
  const loadingErr    = document.getElementById('loadingErr') as HTMLElement

  // ── Renderer ───────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace

  // ── Scene & Camera ─────────────────────────────────────────
  const scene  = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(28, window.innerWidth / window.innerHeight, 0.1, 20)
  camera.position.set(-0.7, 1.35, 4.2)
  camera.lookAt(0, 0.5, 0)

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

  // ── State ──────────────────────────────────────────────────
  let vrm: VRM | null = null
  const clock = new THREE.Clock()

  // Mouse
  let targetYaw = 0, targetPitch = 0
  let smoothYaw = 0, smoothPitch = 0
  let mouseNX = 0

  // Scroll
  let scrollPct = 0
  let scrollVelocity = 0

  // Intro slide-in
  let introProgress = 0
  let currentX = 3.0

  // Pose system
  type PoseName = 'idle' | 'crossed'
  let activePose: PoseName = 'idle'
  let poseBlend = 0.0   // 0 = idle, 1 = crossed
  let inactivityTimer = 0
  const INACTIVITY_THRESHOLD = 5.0  // seconds before switching to crossed

  // Expressions
  let exprHappy = 0
  let exprSurprised = 0
  let blinkTimer = 0
  let nextBlink = 2.0
  const BLINK_DURATION = 0.12

  // ── Input listeners ────────────────────────────────────────
  document.addEventListener('mousemove', (e: MouseEvent) => {
    mouseNX       = (e.clientX / innerWidth) * 2 - 1
    const mouseNY = (e.clientY / innerHeight) * -2 + 1
    targetYaw     = mouseNX * -25
    targetPitch   = mouseNY *  15
    inactivityTimer = 0
    activePose = 'idle'
  })

  document.addEventListener('click', () => { exprSurprised = 1.0 })

  window.addEventListener('scroll', () => {
    const maxScroll = document.body.scrollHeight - innerHeight
    const newPct = maxScroll > 0 ? scrollY / maxScroll : 0
    scrollVelocity = newPct - scrollPct
    scrollPct = newPct
    inactivityTimer = 0
  })

  // ── Loader ─────────────────────────────────────────────────
  const loader = new GLTFLoader()
  loader.register(parser => new VRMLoaderPlugin(parser))

  function spawnVRM(model: VRM): void {
    vrm = model
    scene.add(vrm.scene)
    if (vrm.lookAt) { vrm.lookAt.autoUpdate = false; vrm.lookAt.target = null }
    introProgress = 0
    currentX      = 3.0
    vrm.scene.position.set(currentX, -0.9, 0)
    vrm.scene.rotation.y = -0.4
    exprHappy = 0.9
    activePose = 'idle'
    poseBlend  = 0
  }

  async function loadVRM(url: string): Promise<void> {
    loadingErr.style.display = 'none'
    loadingFill.style.width  = '0%'
    loadingLabel.textContent = 'Fetching avatar'
    loadingScreen.classList.remove('hidden')

    if (vrm) { scene.remove(vrm.scene); VRMUtils.deepDispose(vrm.scene); vrm = null }

    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const total  = parseInt(res.headers.get('content-length') ?? '0')
    const reader = res.body!.getReader()
    const chunks: Uint8Array[] = []
    let loaded = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      loaded += value.length
      loadingFill.style.width = Math.min(total ? (loaded / total) * 100 : 50, 92) + '%'
      loadingLabel.textContent = 'Downloading avatar'
    }

    const combined = new Uint8Array(loaded)
    let offset = 0
    for (const chunk of chunks) { combined.set(chunk, offset); offset += chunk.length }

    loadingLabel.textContent = 'Parsing model'
    loadingFill.style.width  = '95%'

    const gltf = await new Promise<{ scene: THREE.Group; userData: { vrm: VRM } }>((resolve, reject) => {
      loader.parse(combined.buffer, '', resolve as never, reject)
    })

    const model = gltf.userData.vrm
    if (!model) throw new Error('Not a valid VRM file')

    try { VRMUtils.removeUnnecessaryJoints(gltf.scene as never) } catch (_e) {}
    try { VRMUtils.removeUnnecessaryVertices(gltf.scene as never) } catch (_e) {}

    spawnVRM(model)
    loadingFill.style.width = '100%'
    setTimeout(() => loadingScreen.classList.add('hidden'), 300)
  }

  function showError(): void {
    loadingFill.style.background = '#ff4444'
    loadingFill.style.width      = '100%'
    loadingLabel.textContent     = 'Default model unavailable'
    loadingErr.style.display     = 'block'
  }

  ;(async () => {
    for (const url of VRM_URLS) {
      try { await loadVRM(url); return } catch (e) { console.warn('Trying next VRM URL…', e) }
    }
    showError()
  })()

  // ── Drag & Drop ────────────────────────────────────────────
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
        const gltf = await new Promise<{ scene: THREE.Group; userData: { vrm: VRM } }>((resolve, reject) => {
          loader.parse(fileReader.result as ArrayBuffer, '', resolve as never, reject)
        })
        const model = gltf.userData.vrm
        if (!model) throw new Error('Not a VRM')
        try { VRMUtils.removeUnnecessaryJoints(gltf.scene as never) } catch (_e) {}
        try { VRMUtils.removeUnnecessaryVertices(gltf.scene as never) } catch (_e) {}
        spawnVRM(model)
        loadingFill.style.width = '100%'
        setTimeout(() => loadingScreen.classList.add('hidden'), 300)
      } catch (err) { console.error(err); showError() }
    }
    fileReader.readAsArrayBuffer(file)
  })

  // ── Helpers ────────────────────────────────────────────────
  function lerp(a: number, b: number, t: number): number { return a + (b - a) * t }
  function easeOutCubic(t: number): number { return 1 - Math.pow(1 - t, 3) }
  function clamp(v: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, v)) }

  function applyPoseBone(
    boneName: VRMHumanBoneName,
    poseA: Pose,
    poseB: Pose,
    blend: number,
    speed: number,
    dt: number,
    overrideX?: number,
    overrideY?: number
  ): void {
    if (!vrm?.humanoid) return
    const node = vrm.humanoid.getNormalizedBoneNode(boneName)
    if (!node) return
    const a = poseA[boneName] ?? {}
    const b = poseB[boneName] ?? {}
    const tx = overrideX ?? lerp(a.x ?? 0, b.x ?? 0, blend)
    const ty = overrideY ?? lerp(a.y ?? 0, b.y ?? 0, blend)
    const tz = lerp(a.z ?? 0, b.z ?? 0, blend)
    node.rotation.x = lerp(node.rotation.x, tx, dt * speed)
    node.rotation.y = lerp(node.rotation.y, ty, dt * speed)
    node.rotation.z = lerp(node.rotation.z, tz, dt * speed)
  }

  // ── Render loop ────────────────────────────────────────────
  function animate(): void {
    requestAnimationFrame(animate)
    const dt      = clock.getDelta()
    const elapsed = clock.getElapsedTime()

    if (!vrm) { renderer.render(scene, camera); return }

    // ── Inactivity → switch to crossed pose ───────────────
    inactivityTimer += dt
    if (inactivityTimer > INACTIVITY_THRESHOLD) activePose = 'crossed'
    const targetBlend = activePose === 'crossed' ? 1 : 0
    poseBlend = lerp(poseBlend, targetBlend, dt * 2.5)

    // ── Smooth mouse ──────────────────────────────────────
    smoothYaw   += (targetYaw   - smoothYaw)   * Math.min(dt * 6, 1)
    smoothPitch += (targetPitch - smoothPitch) * Math.min(dt * 6, 1)
    const yawRad   = (smoothYaw   * Math.PI) / 180
    const pitchRad = (smoothPitch * Math.PI) / 180

    // ── Intro slide-in from right ─────────────────────────
    if (introProgress < 1) {
      introProgress = Math.min(introProgress + dt / 1.4, 1)
      const eased = easeOutCubic(introProgress)
      currentX = lerp(3.0, 0, eased)
      vrm.scene.rotation.y = lerp(-0.4, 0, eased)
    } else {
      currentX = lerp(currentX, -scrollPct * 0.18, dt * 1.5)
    }

    // ── Position ──────────────────────────────────────────
    const scrollBounce = clamp(Math.abs(scrollVelocity) * 6, 0, 0.04)
    vrm.scene.position.x = currentX
    vrm.scene.position.y = -0.9
      + Math.sin(elapsed * 1.1) * 0.005
      + Math.sin(elapsed * 6)   * scrollBounce

    scrollVelocity = lerp(scrollVelocity, 0, dt * 8)

    if (introProgress >= 1) {
      vrm.scene.rotation.y = lerp(
        vrm.scene.rotation.y,
        Math.sin(elapsed * 0.35) * 0.025 + yawRad * 0.05,
        dt * 3
      )
    }

    // ── Humanoid bones ────────────────────────────────────
    if (vrm.humanoid) {
      const headTilt = (scrollPct - 0.5) * 0.22

      const head  = vrm.humanoid.getNormalizedBoneNode('head')
      const neck  = vrm.humanoid.getNormalizedBoneNode('neck')
      const chest = vrm.humanoid.getNormalizedBoneNode('chest')
      const spine = vrm.humanoid.getNormalizedBoneNode('spine')
      const hips  = vrm.humanoid.getNormalizedBoneNode('hips')

      if (head) {
        head.rotation.x = lerp(head.rotation.x, pitchRad * 0.28 + headTilt * 0.55, dt * 9)
        head.rotation.y = lerp(head.rotation.y, yawRad * 0.38, dt * 9)
      }
      if (neck) {
        neck.rotation.x = lerp(neck.rotation.x, pitchRad * 0.18 + headTilt * 0.28, dt * 8)
        neck.rotation.y = lerp(neck.rotation.y, yawRad * 0.22, dt * 8)
      }
      if (chest) {
        chest.rotation.x = lerp(chest.rotation.x, pitchRad * 0.06 + headTilt * 0.08, dt * 3)
        chest.rotation.y = lerp(chest.rotation.y, yawRad * 0.12, dt * 3)
      }
      if (spine) {
        spine.rotation.x = lerp(spine.rotation.x, headTilt * 0.14, dt * 2)
        spine.rotation.y = lerp(spine.rotation.y, yawRad * 0.06, dt * 3)
      }
      if (hips) {
        hips.rotation.z = Math.sin(elapsed * 0.9) * 0.012
      }

      // ── Arm poses — blend between idle and crossed ──────
      const poseA = POSE_IDLE
      const poseB = POSE_CROSSED

      // In idle: mouse raises the arm on the active side
      const idleLeftZ  = (POSE_IDLE.leftUpperArm?.z  ?? -1.25)
      const idleRightZ = (POSE_IDLE.rightUpperArm?.z ??  1.25)
      const leftLift   = activePose === 'idle' && mouseNX < -0.3
        ? clamp((Math.abs(mouseNX) - 0.3) * 0.35, 0, 0.25)
        : 0
      const rightLift  = activePose === 'idle' && mouseNX > 0.3
        ? clamp((mouseNX - 0.3) * 0.35, 0, 0.25)
        : 0

      // Upper arms — override Z in idle to include lift
      const leftUpperNode  = vrm.humanoid.getNormalizedBoneNode('leftUpperArm')
      const rightUpperNode = vrm.humanoid.getNormalizedBoneNode('rightUpperArm')

      if (leftUpperNode) {
        const tx = lerp(poseA.leftUpperArm?.x ?? 0, poseB.leftUpperArm?.x ?? 0, poseBlend)
        const ty = lerp(poseA.leftUpperArm?.y ?? 0, poseB.leftUpperArm?.y ?? 0, poseBlend)
        const tz = lerp(idleLeftZ + leftLift, poseB.leftUpperArm?.z ?? 0, poseBlend)
        leftUpperNode.rotation.x = lerp(leftUpperNode.rotation.x, tx, dt * 5)
        leftUpperNode.rotation.y = lerp(leftUpperNode.rotation.y, ty, dt * 5)
        leftUpperNode.rotation.z = lerp(leftUpperNode.rotation.z, tz, dt * 5)
      }
      if (rightUpperNode) {
        const tx = lerp(poseA.rightUpperArm?.x ?? 0, poseB.rightUpperArm?.x ?? 0, poseBlend)
        const ty = lerp(poseA.rightUpperArm?.y ?? 0, poseB.rightUpperArm?.y ?? 0, poseBlend)
        const tz = lerp(idleRightZ - rightLift, poseB.rightUpperArm?.z ?? 0, poseBlend)
        rightUpperNode.rotation.x = lerp(rightUpperNode.rotation.x, tx, dt * 5)
        rightUpperNode.rotation.y = lerp(rightUpperNode.rotation.y, ty, dt * 5)
        rightUpperNode.rotation.z = lerp(rightUpperNode.rotation.z, tz, dt * 5)
      }

      // Lower arms and hands
      applyPoseBone('leftLowerArm',  poseA, poseB, poseBlend, 5, dt)
      applyPoseBone('rightLowerArm', poseA, poseB, poseBlend, 5, dt)
      applyPoseBone('leftHand',      poseA, poseB, poseBlend, 4, dt)
      applyPoseBone('rightHand',     poseA, poseB, poseBlend, 4, dt)
    }

    // ── Expressions ───────────────────────────────────────
    if (vrm.expressionManager) {
      const em = vrm.expressionManager

      // Auto blink
      nextBlink -= dt
      if (nextBlink <= 0 && blinkTimer <= 0) {
        blinkTimer = BLINK_DURATION
        nextBlink  = 2.5 + Math.random() * 3.5
      }
      let blinkValue = 0
      if (blinkTimer > 0) {
        blinkTimer = Math.max(0, blinkTimer - dt)
        const t = 1 - blinkTimer / BLINK_DURATION
        blinkValue = t < 0.5 ? t * 2 : (1 - t) * 2
      }

      // Happy: burst on load → subtle idle, boosts when mouse is near
      exprHappy = lerp(exprHappy, 0.08, dt * 0.6)
      const mouseHappy = mouseNX > 0.2 ? clamp((mouseNX - 0.2) * 0.6, 0, 0.4) : 0
      // Relaxed expression when arms are crossed
      const crossedRelax = poseBlend * 0.3

      exprSurprised = lerp(exprSurprised, 0, dt * 4)
      const scrollSurprise = clamp(Math.abs(scrollVelocity) * 12, 0, 0.5)

      em.setValue('happy',     clamp(exprHappy + mouseHappy, 0, 1))
      em.setValue('relaxed',   clamp(crossedRelax, 0, 1))
      em.setValue('surprised', clamp(exprSurprised + scrollSurprise, 0, 1))
      em.setValue('blink',     blinkValue)
    }

    // ── VRM update + eye tracking ─────────────────────────
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
    const w = window.innerWidth, h = window.innerHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  })
}
