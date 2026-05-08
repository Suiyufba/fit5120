<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let terrain: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial> | null = null
let terrainBase: Float32Array | null = null
let objects: THREE.Group | null = null
let resizeObserver: ResizeObserver | null = null
let frameId = 0

function seededRandom(seed: number) {
  let value = seed % 2147483647
  return () => {
    value = (value * 16807) % 2147483647
    return (value - 1) / 2147483646
  }
}

function resize() {
  const canvas = canvasRef.value
  const host = canvas?.parentElement
  if (!host || !renderer || !camera) return

  const width = Math.max(1, host.clientWidth)
  const height = Math.max(1, host.clientHeight)
  renderer.setSize(width, height, false)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
}

function createScene(canvas: HTMLCanvasElement) {
  scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0x07110e, 0.072)

  camera = new THREE.PerspectiveCamera(34, 1, 0.1, 90)
  camera.position.set(2.3, 3.4, 10.4)
  camera.lookAt(0, -0.35, 0)

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.12

  scene.add(new THREE.HemisphereLight(0xe6f0c9, 0x08100e, 1.2))

  const key = new THREE.DirectionalLight(0xf6ffd3, 3.6)
  key.position.set(5.2, 6.4, 4.6)
  scene.add(key)

  const accent = new THREE.PointLight(0xc7ca72, 4.4, 13)
  accent.position.set(3.2, 2.6, -1.2)
  scene.add(accent)

  const fill = new THREE.PointLight(0x719164, 5.8, 16)
  fill.position.set(-4.8, 1.2, 3.2)
  scene.add(fill)

  const plane = new THREE.PlaneGeometry(18, 8, 128, 56)
  const position = plane.attributes.position
  terrainBase = new Float32Array(position.count)
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i)
    const y = position.getY(i)
    const ridge = Math.sin(x * 1.05) * 0.28 + Math.cos(y * 2.15) * 0.18
    const fold = Math.sin((x + y) * 0.72) * 0.18
    const falloff = Math.max(0, 1 - Math.abs(y) / 4.2)
    terrainBase[i] = (ridge + fold) * falloff
    position.setZ(i, terrainBase[i])
  }
  plane.computeVertexNormals()

  terrain = new THREE.Mesh(
    plane,
    new THREE.MeshStandardMaterial({
      color: 0x496947,
      roughness: 0.84,
      metalness: 0.05,
      emissive: 0x0d1c12,
      emissiveIntensity: 0.28,
    }),
  )
  terrain.rotation.x = -Math.PI * 0.44
  terrain.position.set(1.6, -1.75, -0.35)
  scene.add(terrain)

  const random = seededRandom(8755)
  objects = new THREE.Group()
  const darkMaterial = new THREE.MeshStandardMaterial({
    color: 0x11162a,
    roughness: 0.65,
    metalness: 0.2,
    emissive: 0x080b18,
    emissiveIntensity: 0.34,
  })
  const mossMaterial = new THREE.MeshStandardMaterial({
    color: 0x99b278,
    roughness: 0.86,
    metalness: 0.03,
    emissive: 0x182417,
    emissiveIntensity: 0.2,
  })

  for (let i = 0; i < 26; i += 1) {
    const radius = 0.18 + random() * 0.58
    const geometry =
      i % 4 === 0
        ? new THREE.TorusGeometry(radius, radius * 0.34, 18, 36)
        : new THREE.IcosahedronGeometry(radius, 2)
    const mesh = new THREE.Mesh(geometry, i % 5 === 0 ? mossMaterial : darkMaterial)
    mesh.position.set((random() - 0.25) * 10.5, (random() - 0.5) * 3.8, (random() - 0.5) * 4.5)
    mesh.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI)
    mesh.scale.setScalar(0.74 + random() * 0.9)
    objects.add(mesh)
  }
  objects.position.set(2.8, 0.45, -1.45)
  scene.add(objects)

  const particleGeometry = new THREE.BufferGeometry()
  const randomPoints = new Float32Array(180 * 3)
  for (let i = 0; i < 180; i += 1) {
    randomPoints[i * 3] = (random() - 0.5) * 18
    randomPoints[i * 3 + 1] = random() * 7 - 1
    randomPoints[i * 3 + 2] = -random() * 10
  }
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(randomPoints, 3))
  scene.add(
    new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({
        color: 0xdcebbf,
        size: 0.024,
        transparent: true,
        opacity: 0.48,
      }),
    ),
  )

  resizeObserver = new ResizeObserver(resize)
  if (canvas.parentElement) resizeObserver.observe(canvas.parentElement)
  resize()
}

function render(time = 0) {
  if (!renderer || !scene || !camera || !terrain || !terrainBase) return

  if (!reduceMotion) {
    const elapsed = time * 0.001
    const position = terrain.geometry.attributes.position
    for (let i = 0; i < position.count; i += 1) {
      const x = position.getX(i)
      const y = position.getY(i)
      position.setZ(i, terrainBase[i] + Math.sin(elapsed * 0.55 + x * 0.9 + y * 1.32) * 0.04)
    }
    position.needsUpdate = true
    terrain.geometry.computeVertexNormals()

    if (objects) {
      objects.rotation.y = Math.sin(elapsed * 0.2) * 0.2
      objects.children.forEach((child, index) => {
        child.rotation.y += 0.0012 + index * 0.000018
        child.rotation.x += 0.0008
      })
    }
  }

  renderer.render(scene, camera)
  frameId = window.requestAnimationFrame(render)
}

function dispose() {
  window.cancelAnimationFrame(frameId)
  resizeObserver?.disconnect()

  scene?.traverse((object) => {
    const mesh = object as THREE.Mesh
    mesh.geometry?.dispose()
    const material = mesh.material
    if (Array.isArray(material)) material.forEach((item) => item.dispose())
    else material?.dispose()
  })

  renderer?.dispose()
  renderer = null
  scene = null
  camera = null
  terrain = null
  terrainBase = null
  objects = null
  resizeObserver = null
}

onMounted(() => {
  if (!canvasRef.value) return
  createScene(canvasRef.value)
  render()
})

onBeforeUnmount(dispose)
</script>

<template>
  <canvas ref="canvasRef" class="home-hero-three" aria-hidden="true"></canvas>
</template>

<style scoped>
.home-hero-three {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
</style>
