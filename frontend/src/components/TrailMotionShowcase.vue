<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import * as THREE from 'three'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const router = useRouter()
const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let frameId = 0
let resizeObserver: ResizeObserver | null = null
let terrain: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial> | null = null
let terrainBase: Float32Array | null = null
let ridgeGroup: THREE.Group | null = null
let pointerX = 0
let pointerY = 0

function seededRandom(seed: number) {
  let value = seed % 2147483647
  return () => {
    value = (value * 16807) % 2147483647
    return (value - 1) / 2147483646
  }
}

function buildScene(canvas: HTMLCanvasElement) {
  const host = canvas.parentElement
  if (!host) return

  scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0x07120f, 0.09)

  camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80)
  camera.position.set(0, 3.3, 9.2)
  camera.lookAt(0, -0.3, 0)

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.08

  const ambient = new THREE.HemisphereLight(0xc9e7c3, 0x07100d, 1.3)
  scene.add(ambient)

  const key = new THREE.DirectionalLight(0xf4ffcf, 3.4)
  key.position.set(4.8, 5.4, 4.2)
  scene.add(key)

  const fill = new THREE.PointLight(0x7aa06d, 7, 12)
  fill.position.set(-4, 1.5, 2.8)
  scene.add(fill)

  const rim = new THREE.PointLight(0xe2d88d, 3, 9)
  rim.position.set(3.6, 2.4, -1.6)
  scene.add(rim)

  const geometry = new THREE.PlaneGeometry(16, 7.2, 116, 50)
  const position = geometry.attributes.position
  terrainBase = new Float32Array(position.count)
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i)
    const y = position.getY(i)
    const ridge = Math.sin(x * 1.18) * 0.22 + Math.cos(y * 2.35) * 0.18
    const shoulder = Math.sin((x + y) * 0.82) * 0.16
    const falloff = Math.max(0, 1 - Math.abs(y) / 4.2)
    terrainBase[i] = (ridge + shoulder) * falloff
    position.setZ(i, terrainBase[i])
  }
  geometry.computeVertexNormals()

  terrain = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color: 0x4f6c4a,
      roughness: 0.82,
      metalness: 0.06,
      emissive: 0x101d14,
      emissiveIntensity: 0.24,
    }),
  )
  terrain.rotation.x = -Math.PI * 0.44
  terrain.position.set(0, -1.45, 0.2)
  scene.add(terrain)

  ridgeGroup = new THREE.Group()
  const random = seededRandom(5120)
  const stoneMaterial = new THREE.MeshStandardMaterial({
    color: 0x151a2d,
    roughness: 0.68,
    metalness: 0.18,
    emissive: 0x090d1c,
    emissiveIntensity: 0.38,
  })
  const mossMaterial = new THREE.MeshStandardMaterial({
    color: 0x9fb77b,
    roughness: 0.9,
    metalness: 0.02,
    emissive: 0x162314,
    emissiveIntensity: 0.18,
  })

  for (let i = 0; i < 22; i += 1) {
    const radius = 0.18 + random() * 0.58
    const shape =
      i % 3 === 0
        ? new THREE.TorusGeometry(radius, radius * 0.34, 18, 32)
        : new THREE.IcosahedronGeometry(radius, 2)
    const mesh = new THREE.Mesh(shape, i % 4 === 0 ? mossMaterial : stoneMaterial)
    mesh.position.set((random() - 0.5) * 10.4, (random() - 0.48) * 2.2, (random() - 0.5) * 3.6)
    mesh.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI)
    mesh.scale.setScalar(0.78 + random() * 0.86)
    ridgeGroup.add(mesh)
  }
  ridgeGroup.position.set(0, 0.2, -1.1)
  scene.add(ridgeGroup)

  const pointsGeometry = new THREE.BufferGeometry()
  const points = new Float32Array(150 * 3)
  for (let i = 0; i < 150; i += 1) {
    points[i * 3] = (random() - 0.5) * 17
    points[i * 3 + 1] = random() * 6 - 0.8
    points[i * 3 + 2] = -random() * 9
  }
  pointsGeometry.setAttribute('position', new THREE.BufferAttribute(points, 3))
  scene.add(
    new THREE.Points(
      pointsGeometry,
      new THREE.PointsMaterial({
        color: 0xcfe8b4,
        size: 0.025,
        transparent: true,
        opacity: 0.62,
      }),
    ),
  )

  const handleResize = () => {
    if (!renderer || !camera) return
    const width = Math.max(1, host.clientWidth)
    const height = Math.max(1, host.clientHeight)
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }

  resizeObserver = new ResizeObserver(handleResize)
  resizeObserver.observe(host)
  handleResize()
}

function render(time = 0) {
  if (!renderer || !scene || !camera || !terrain || !terrainBase) return

  const elapsed = time * 0.001
  if (!prefersReducedMotion) {
    const position = terrain.geometry.attributes.position
    for (let i = 0; i < position.count; i += 1) {
      const x = position.getX(i)
      const y = position.getY(i)
      const drift = Math.sin(elapsed * 0.62 + x * 0.92 + y * 1.36) * 0.045
      position.setZ(i, terrainBase[i] + drift)
    }
    position.needsUpdate = true
    terrain.geometry.computeVertexNormals()

    if (ridgeGroup) {
      ridgeGroup.rotation.y = Math.sin(elapsed * 0.22) * 0.18 + pointerX * 0.18
      ridgeGroup.rotation.x = pointerY * 0.08
      ridgeGroup.children.forEach((child, index) => {
        child.position.y += Math.sin(elapsed * 0.85 + index) * 0.0008
        child.rotation.y += 0.0014 + index * 0.00002
      })
    }

    camera.position.x += (pointerX * 0.7 - camera.position.x) * 0.025
    camera.position.y += (3.3 + pointerY * 0.32 - camera.position.y) * 0.025
    camera.lookAt(0, -0.35, 0)
  }

  renderer.render(scene, camera)
  frameId = window.requestAnimationFrame(render)
}

function handlePointerMove(event: PointerEvent) {
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 2
  pointerY = -(((event.clientY - rect.top) / rect.height - 0.5) * 2)
}

function disposeScene() {
  window.cancelAnimationFrame(frameId)
  resizeObserver?.disconnect()
  resizeObserver = null

  scene?.traverse((object) => {
    const mesh = object as THREE.Mesh
    mesh.geometry?.dispose()
    const material = mesh.material
    if (Array.isArray(material)) {
      material.forEach((item) => item.dispose())
    } else {
      material?.dispose()
    }
  })

  renderer?.dispose()
  renderer = null
  scene = null
  camera = null
  terrain = null
  terrainBase = null
  ridgeGroup = null
}

onMounted(() => {
  if (!canvasRef.value) return
  buildScene(canvasRef.value)
  render()
})

onBeforeUnmount(disposeScene)
</script>

<template>
  <section class="trail-motion hs-shell" aria-labelledby="trail-motion-title" @pointermove="handlePointerMove">
    <div class="trail-motion__stage">
      <canvas ref="canvasRef" class="trail-motion__canvas" aria-hidden="true"></canvas>
      <div class="trail-motion__veil" aria-hidden="true"></div>
      <div class="trail-motion__content">
        <div class="trail-motion__badge" aria-hidden="true">
          <span class="material-symbols-outlined">terrain</span>
        </div>
        <div>
          <p class="trail-motion__eyebrow">Blender-inspired Three.js layer</p>
          <h2 id="trail-motion-title">3D trail intelligence, alive on the homepage.</h2>
        </div>
        <button class="trail-motion__action" type="button" @click="router.push('/route-planner')">
          <span class="material-symbols-outlined" aria-hidden="true">route</span>
          Plan with terrain context
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.trail-motion {
  margin-top: -0.5rem;
}

.trail-motion__stage {
  position: relative;
  min-height: clamp(210px, 30vw, 340px);
  overflow: hidden;
  border: 1px solid rgba(255, 250, 242, 0.2);
  border-radius: 1rem;
  background:
    radial-gradient(circle at 74% 12%, rgba(203, 206, 129, 0.22), transparent 14rem),
    linear-gradient(135deg, #050817 0%, #0b1224 46%, #09120d 100%);
  box-shadow: 0 34px 90px rgba(19, 43, 35, 0.2);
  isolation: isolate;
}

.trail-motion__canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.trail-motion__veil {
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    linear-gradient(90deg, rgba(4, 7, 21, 0.9) 0%, rgba(4, 7, 21, 0.55) 39%, rgba(4, 7, 21, 0.16) 100%),
    linear-gradient(0deg, rgba(5, 10, 19, 0.82), rgba(5, 10, 19, 0.16) 52%, rgba(255, 255, 255, 0));
  pointer-events: none;
}

.trail-motion__content {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: clamp(1rem, 3vw, 1.6rem);
  min-height: inherit;
  padding: clamp(1.3rem, 4vw, 2.5rem);
  color: #fffaf2;
}

.trail-motion__badge {
  display: grid;
  place-items: center;
  width: 4.25rem;
  aspect-ratio: 1;
  border-radius: 0.9rem;
  background: linear-gradient(145deg, #d8e6b8 0%, #7fa06c 100%);
  color: #0d1f19;
  box-shadow: 0 18px 44px rgba(143, 174, 131, 0.28);
}

.trail-motion__badge .material-symbols-outlined {
  font-size: 2.35rem;
  font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24;
}

.trail-motion__eyebrow {
  margin: 0 0 0.55rem;
  color: rgba(255, 250, 242, 0.66);
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.trail-motion h2 {
  max-width: 43rem;
  margin: 0;
  color: #fffaf2;
  font-size: 4rem;
  line-height: 0.98;
  letter-spacing: 0;
}

.trail-motion__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  min-height: 3.1rem;
  border: 1px solid rgba(255, 250, 242, 0.24);
  border-radius: 999px;
  background: rgba(255, 250, 242, 0.12);
  padding: 0.8rem 1.1rem;
  color: #fffaf2;
  font-size: 0.86rem;
  font-weight: 900;
  white-space: nowrap;
  backdrop-filter: blur(14px);
  transition: background 0.18s ease, transform 0.18s ease;
}

.trail-motion__action:hover {
  background: rgba(255, 250, 242, 0.2);
  transform: translateY(-1px);
}

@media (max-width: 860px) {
  .trail-motion__content {
    grid-template-columns: auto minmax(0, 1fr);
    align-content: end;
  }

  .trail-motion__action {
    grid-column: 1 / -1;
    justify-self: start;
  }

  .trail-motion h2 {
    font-size: 3rem;
  }
}

@media (max-width: 560px) {
  .trail-motion {
    width: min(100% - 1.5rem, 1180px);
  }

  .trail-motion__stage {
    min-height: 360px;
  }

  .trail-motion__content {
    grid-template-columns: 1fr;
    align-items: end;
  }

  .trail-motion__badge {
    width: 3.25rem;
  }

  .trail-motion__badge .material-symbols-outlined {
    font-size: 1.85rem;
  }

  .trail-motion h2 {
    font-size: 2.2rem;
  }

  .trail-motion__action {
    width: 100%;
    white-space: normal;
  }
}
</style>
