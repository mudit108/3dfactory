// Shared materials. Re-using one material instance across hundreds of meshes
// keeps shader programs and GPU state changes to a minimum.
import * as THREE from 'three'
import {
  corrugatedTexture, woodTexture, cardboardTexture, fabricWeaveTexture, hazardTexture, gratingTexture,
  threadsTexture, rollSideTexture,
} from './textures'

const cache = new Map()
const m = (key, fn) => {
  if (!cache.has(key)) cache.set(key, fn())
  return cache.get(key)
}
const std = (p) => new THREE.MeshStandardMaterial(p)

export const MAT = {
  // ---- metals ----
  get steel() { return m('steel', () => std({ color: '#9aa3ab', metalness: 0.75, roughness: 0.38 })) },
  get darkSteel() { return m('darkSteel', () => std({ color: '#3b4148', metalness: 0.7, roughness: 0.45 })) },
  get chrome() { return m('chrome', () => std({ color: '#d7dde2', metalness: 1, roughness: 0.16 })) },
  get galvanized() { return m('galv', () => std({ color: '#b3b9be', metalness: 0.8, roughness: 0.42 })) },
  get structure() { return m('structure', () => std({ color: '#5f6f82', metalness: 0.55, roughness: 0.5 })) },
  get rafter() { return m('rafter', () => std({ color: '#6c7a8c', metalness: 0.55, roughness: 0.5 })) },
  get castIron() { return m('castIron', () => std({ color: '#2b2f33', metalness: 0.5, roughness: 0.6 })) },
  get aluminium() { return m('alu', () => std({ color: '#c7ccd1', metalness: 0.85, roughness: 0.3 })) },
  get brass() { return m('brass', () => std({ color: '#b08d45', metalness: 0.9, roughness: 0.3 })) },

  // ---- loom paint ----
  get loomBody() { return m('loomBody', () => std({ color: '#d8d4c6', metalness: 0.25, roughness: 0.42 })) },
  get loomAccent() { return m('loomAccent', () => std({ color: '#2f6b66', metalness: 0.3, roughness: 0.45 })) },
  get loomDark() { return m('loomDark', () => std({ color: '#30353a', metalness: 0.4, roughness: 0.5 })) },
  get motor() { return m('motor', () => std({ color: '#4b6178', metalness: 0.5, roughness: 0.45 })) },

  // ---- paints / plastics ----
  get yellow() { return m('yellow', () => std({ color: '#e0ad1f', metalness: 0.2, roughness: 0.5 })) },
  get orangeBeam() { return m('orange', () => std({ color: '#dd6a1f', metalness: 0.35, roughness: 0.5 })) },
  get blueUpright() { return m('blueUp', () => std({ color: '#2f5d9a', metalness: 0.35, roughness: 0.5 })) },
  get red() { return m('red', () => std({ color: '#b3261e', metalness: 0.3, roughness: 0.45 })) },
  get green() { return m('green', () => std({ color: '#2e7d4f', metalness: 0.2, roughness: 0.5 })) },
  get black() { return m('black', () => std({ color: '#1a1c1e', metalness: 0.2, roughness: 0.6 })) },
  get rubber() { return m('rubber', () => std({ color: '#151617', metalness: 0, roughness: 0.9 })) },
  get bluePvc() { return m('bluePvc', () => std({ color: '#2f65a8', metalness: 0.1, roughness: 0.4 })) },
  get greyPvc() { return m('greyPvc', () => std({ color: '#8c9196', metalness: 0.1, roughness: 0.45 })) },
  get white() { return m('white', () => std({ color: '#eceae4', metalness: 0.05, roughness: 0.6 })) },
  get offWhite() { return m('offwhite', () => std({ color: '#d9d6cd', metalness: 0.05, roughness: 0.7 })) },
  get paper() { return m('paper', () => std({ color: '#f4f2ea', roughness: 0.9 })) },
  get paperTube() { return m('paperTube', () => std({ color: '#b38b5a', roughness: 0.85 })) },
  get plasticTank() { return m('tank', () => std({ color: '#9ec7d8', metalness: 0, roughness: 0.2, transparent: true, opacity: 0.55 })) },
  get water() { return m('water', () => new THREE.MeshBasicMaterial({ color: '#bfe8ff', transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })) },
  get concreteBlock() { return m('cblock', () => std({ color: '#a4a29b', roughness: 0.92 })) },
  get plinth() { return m('plinth', () => std({ color: '#7d7f7f', roughness: 0.85 })) },
  get glass() {
    return m('glass', () => new THREE.MeshPhysicalMaterial({
      color: '#bcd4de', metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.22,
      envMapIntensity: 1.6, depthWrite: false, side: THREE.DoubleSide,
    }))
  },
  get tintedGlass() {
    return m('tglass', () => new THREE.MeshPhysicalMaterial({
      color: '#6f8fa3', metalness: 0.3, roughness: 0.08, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide,
    }))
  },
  get skylight() { return m('skylight', () => new THREE.MeshBasicMaterial({ color: '#f5f1e6', side: THREE.BackSide, transparent: true, opacity: 0.92 })) },
  get lampEmissive() { return m('lampEm', () => std({ color: '#fffaf0', emissive: '#fff4de', emissiveIntensity: 3.2, roughness: 0.4 })) },
  get panelEmissive() { return m('panelEm', () => std({ color: '#ffffff', emissive: '#f4f8ff', emissiveIntensity: 1.6 })) },
  get screenOff() { return m('screenOff', () => std({ color: '#0b0f14', metalness: 0.4, roughness: 0.2 })) },

  // ---- textured ----
  get wood() { return m('wood', () => std({ map: woodTexture(), roughness: 0.85 })) },
  get cardboard() { return m('cardboard', () => std({ map: cardboardTexture(), roughness: 0.9 })) },
  get cardboardPlain() { return m('cardboardP', () => std({ color: '#ad875a', roughness: 0.9 })) },
  get hazard() { return m('hazard', () => std({ map: hazardTexture([3, 1]), roughness: 0.6 })) },
  get grating() { return m('grating', () => std({ map: gratingTexture([60, 1]), metalness: 0.6, roughness: 0.5 })) },
  get roofSheet() { return m('roofSheet', () => std({ map: corrugatedTexture([40, 1], '#aab2ba'), metalness: 0.5, roughness: 0.55, side: THREE.BackSide })) },
  get cladding() { return m('cladding', () => std({ map: corrugatedTexture([30, 1], '#8e9aa6'), metalness: 0.45, roughness: 0.55 })) },
  get claddingOuter() { return m('claddingO', () => std({ map: corrugatedTexture([30, 1], '#b8c0c7'), metalness: 0.45, roughness: 0.5 })) },
  get warpSheet() {
    return m('warpSheet', () => std({
      color: '#f3f1ea', alphaMap: threadsTexture([1, 1], '#ffffff', 256), transparent: true, side: THREE.DoubleSide,
      roughness: 0.6, depthWrite: false, alphaTest: 0.05,
    }))
  },
  get heddles() {
    return m('heddles', () => std({
      color: '#8c949b', metalness: 0.8, roughness: 0.35, alphaMap: threadsTexture([1, 1], '#ffffff', 128),
      transparent: true, side: THREE.DoubleSide, alphaTest: 0.2,
    }))
  },
  get reed() {
    return m('reedM', () => std({
      color: '#c9cfd4', metalness: 0.9, roughness: 0.25, alphaMap: threadsTexture([1, 1], '#ffffff', 512),
      transparent: true, side: THREE.DoubleSide, alphaTest: 0.2,
    }))
  },
  get rollSide() { return m('rollSide', () => std({ map: rollSideTexture(), roughness: 0.8 })) },
}

const fabricCache = new Map()
/** Fabric material for a given colour (cached). */
export function fabricMaterial(color, sheen = false) {
  const key = color + sheen
  if (!fabricCache.has(key)) {
    fabricCache.set(
      key,
      sheen
        ? new THREE.MeshPhysicalMaterial({ color, map: fabricWeaveTexture([10, 4]), roughness: 0.55, sheen: 1, sheenColor: '#ffffff', sheenRoughness: 0.4 })
        : new THREE.MeshStandardMaterial({ color, map: fabricWeaveTexture([10, 4]), roughness: 0.75, side: THREE.DoubleSide }),
    )
  }
  return fabricCache.get(key)
}

const colorCache = new Map()
export function colorMaterial(color, opts = {}) {
  const key = color + JSON.stringify(opts)
  if (!colorCache.has(key)) colorCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...opts }))
  return colorCache.get(key)
}

const emissiveCache = new Map()
export function emissiveMaterial(color, intensity = 2) {
  const key = color + intensity
  if (!emissiveCache.has(key)) {
    emissiveCache.set(key, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, toneMapped: true }))
  }
  return emissiveCache.get(key)
}

const basicTexCache = new Map()
/** Unlit material showing a (label) texture. */
export function labelMaterial(texture, { transparent = true, emissive = false, side = THREE.FrontSide } = {}) {
  const key = texture.uuid + emissive + side
  if (!basicTexCache.has(key)) {
    basicTexCache.set(
      key,
      emissive
        ? new THREE.MeshBasicMaterial({ map: texture, transparent, side, toneMapped: false })
        : new THREE.MeshStandardMaterial({ map: texture, transparent, side, roughness: 0.6, metalness: 0 }),
    )
  }
  return basicTexCache.get(key)
}
