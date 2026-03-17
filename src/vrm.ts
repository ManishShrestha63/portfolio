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
