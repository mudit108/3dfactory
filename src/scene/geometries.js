// Shared, memoised geometries. Most meshes use unit primitives scaled per
// instance so thousands of objects share a handful of GPU buffers.
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const cache = new Map()
const memo = (key, fn) => {
  if (!cache.has(key)) cache.set(key, fn())
  return cache.get(key)
}

export const GEO = {
  get box() { return memo('box', () => new THREE.BoxGeometry(1, 1, 1)) },
  get cyl() { return memo('cyl', () => new THREE.CylinderGeometry(0.5, 0.5, 1, 24)) },
  get cylLow() { return memo('cylLow', () => new THREE.CylinderGeometry(0.5, 0.5, 1, 12)) },
  get sphere() { return memo('sphere', () => new THREE.SphereGeometry(0.5, 20, 14)) },
  get sphereLow() { return memo('sphereLow', () => new THREE.SphereGeometry(0.5, 12, 8)) },
  get plane() { return memo('plane', () => new THREE.PlaneGeometry(1, 1)) },
  get cone() { return memo('cone', () => new THREE.ConeGeometry(0.5, 1, 16)) },
  get hemisphere() { return memo('hemi', () => new THREE.SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)) },
  get capsule() { return memo('capsule', () => new THREE.CapsuleGeometry(0.5, 1, 4, 10)) },
  get torus() { return memo('torus', () => new THREE.TorusGeometry(0.5, 0.06, 8, 32)) },
  get ring() { return memo('ring', () => new THREE.RingGeometry(0.86, 1, 64)) },
  get yarnCone() { return memo('yarnCone', () => yarnConeGeometry()) },
  get pallet() { return memo('pallet', () => palletGeometry()) },
  get roll() { return memo('roll', () => new THREE.CylinderGeometry(0.5, 0.5, 1, 16, 1)) },
}

export function roundedBox(w, h, d, r = 0.04, seg = 2) {
  return memo(`rb${w}_${h}_${d}_${r}_${seg}`, () => new RoundedBoxGeometry(w, h, d, seg, r))
}

/** I-beam extruded along +z (length L). flange width b, depth d. */
export function iBeam(b, d, L, tf = 0.02, tw = 0.012) {
  return memo(`ib${b}_${d}_${L}_${tf}_${tw}`, () => {
    const s = new THREE.Shape()
    const hb = b / 2
    const hd = d / 2
    const htw = tw / 2
    s.moveTo(-hb, -hd)
    s.lineTo(hb, -hd)
    s.lineTo(hb, -hd + tf)
    s.lineTo(htw, -hd + tf)
    s.lineTo(htw, hd - tf)
    s.lineTo(hb, hd - tf)
    s.lineTo(hb, hd)
    s.lineTo(-hb, hd)
    s.lineTo(-hb, hd - tf)
    s.lineTo(-htw, hd - tf)
    s.lineTo(-htw, -hd + tf)
    s.lineTo(-hb, -hd + tf)
    s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: L, bevelEnabled: false })
    g.translate(0, 0, -L / 2)
    g.computeVertexNormals()
    return g
  })
}

export function tube(points, radius = 0.03, segments = 32, radial = 8) {
  const key = 'tube' + radius + JSON.stringify(points)
  return memo(key, () => {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.2)
    return new THREE.TubeGeometry(curve, segments, radius, radial, false)
  })
}

function yarnConeGeometry() {
  // profile of a filament yarn package on a paper tube (height ~0.25 m)
  const pts = [
    [0.02, -0.01], [0.034, -0.01], [0.034, 0.0], [0.1, 0.0], [0.112, 0.012], [0.114, 0.03],
    [0.098, 0.19], [0.088, 0.21], [0.066, 0.228], [0.04, 0.236], [0.032, 0.238], [0.028, 0.262], [0.02, 0.262],
  ].map(([x, y]) => new THREE.Vector2(x, y))
  const g = new THREE.LatheGeometry(pts, 12)
  g.computeVertexNormals()
  return g
}

function palletGeometry() {
  const parts = []
  const add = (w, h, d, x, y, z) => {
    const b = new THREE.BoxGeometry(w, h, d)
    b.translate(x, y, z)
    parts.push(b)
  }
  // top deck boards (along x)
  for (let i = 0; i < 6; i++) add(1.2, 0.022, 0.13, 0, 0.129, -0.435 + i * 0.174)
  // stringer blocks
  for (const z of [-0.45, 0, 0.45]) for (const x of [-0.55, 0, 0.55]) add(0.12, 0.078, 0.1, x, 0.079, z)
  // stringers
  for (const z of [-0.45, 0, 0.45]) add(1.2, 0.022, 0.1, 0, 0.029, z)
  // bottom boards
  for (const x of [-0.55, 0, 0.55]) add(0.14, 0.018, 1.0, x, 0.009, 0)
  const g = mergeGeometries(parts)
  parts.forEach((p) => p.dispose())
  return g
}

/** Merge a list of {size:[w,h,d], pos:[x,y,z]} boxes into one geometry. */
export function mergedBoxes(key, boxes) {
  return memo('mb' + key, () => {
    const parts = boxes.map(({ size, pos, rot }) => {
      const b = new THREE.BoxGeometry(...size)
      if (rot) b.rotateY(rot)
      b.translate(...pos)
      return b
    })
    const g = mergeGeometries(parts)
    parts.forEach((p) => p.dispose())
    return g
  })
}
