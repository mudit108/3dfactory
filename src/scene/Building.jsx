// Pre-engineered steel building: floor, walls, portal frames, roof,
// skylights and an exterior skin that hides itself for cut-away views.
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BUILDING, ENTRANCE, RECEIVING_DOOR, FG_DOOR, LOOM_ROWS, LOOM_COLUMNS, loomPlacements } from '../data/layout'
import { useFactoryStore } from '../hooks/useFactoryStore'
import { MAT, colorMaterial } from './materials'
import { GEO, iBeam } from './geometries'
import { makeConcrete, epoxyTexture, plasterTexture, corrugatedTexture, hazardTexture, floorWearTexture } from './textures'
import { Box } from '../components/primitives'

const { minX, maxX, minZ, maxZ, eaveHeight: EAVE, ridgeHeight: RIDGE } = BUILDING
const DADO = 2.4
const SLOPE = Math.atan2(RIDGE - EAVE, maxZ)
export const roofY = (z) => EAVE + ((maxZ - Math.abs(z)) / maxZ) * (RIDGE - EAVE)

// ---- walls ------------------------------------------------------------------
const WALLS = [
  { id: 'back', axis: 'x', fixed: minZ, from: minX, to: maxX, rotY: 0, inward: [0, 0, 1], openings: [{ a: -30.8, b: -29.2, h: 2.3 }, { a: 29.2, b: 30.8, h: 2.3 }] },
  {
    id: 'front', axis: 'x', fixed: maxZ, from: minX, to: maxX, rotY: Math.PI, inward: [0, 0, -1],
    openings: [{ a: ENTRANCE.opening[0], b: ENTRANCE.opening[1], h: ENTRANCE.height }, { a: 30.2, b: 31.8, h: 2.3 }],
  },
  { id: 'left', axis: 'z', fixed: minX, from: minZ, to: maxZ, rotY: Math.PI / 2, inward: [1, 0, 0], openings: [{ a: RECEIVING_DOOR.minZ, b: RECEIVING_DOOR.maxZ, h: RECEIVING_DOOR.height }, { a: -12.8, b: -11.2, h: 2.3 }] },
  { id: 'right', axis: 'z', fixed: maxX, from: minZ, to: maxZ, rotY: -Math.PI / 2, inward: [-1, 0, 0], openings: [{ a: FG_DOOR.minZ, b: FG_DOOR.maxZ, h: FG_DOOR.height }, { a: -17.8, b: -16.2, h: 2.3 }] },
]

function wallPieces(wall) {
  const pieces = []
  const ops = [...wall.openings].sort((p, q) => p.a - q.a)
  let u = wall.from
  for (const o of ops) {
    if (o.a > u) pieces.push({ u0: u, u1: o.a, y0: 0 })
    pieces.push({ u0: o.a, u1: o.b, y0: o.h })
    u = o.b
  }
  if (u < wall.to) pieces.push({ u0: u, u1: wall.to, y0: 0 })
  return pieces
}

function WallPanel({ wall, u0, u1, y0, y1, material, offset = 0, outward = false }) {
  const len = u1 - u0
  const um = (u0 + u1) / 2
  const h = y1 - y0
  if (len <= 0.01 || h <= 0.01) return null
  const n = wall.inward
  const off = offset
  const pos = wall.axis === 'x' ? [um + n[0] * off, y0 + h / 2, wall.fixed + n[2] * off] : [wall.fixed + n[0] * off, y0 + h / 2, um + n[2] * off]
  return <mesh geometry={GEO.plane} material={material} position={pos} rotation={[0, wall.rotY + (outward ? Math.PI : 0), 0]} scale={[len, h, 1]} receiveShadow={!outward} castShadow={!outward && material.shadowSide === THREE.DoubleSide} />
}

function texMat(base, repeatU, repeatV, opts = {}) {
  const t = base.clone()
  t.repeat.set(repeatU, repeatV)
  t.needsUpdate = true
  return new THREE.MeshStandardMaterial({ map: t, shadowSide: THREE.DoubleSide, ...opts })
}

function InnerWalls() {
  const plaster = useMemo(() => plasterTexture([1, 1]), [])
  const clad = useMemo(() => corrugatedTexture([1, 1], '#8f9aa5'), [])
  const windowMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#e8eef2', toneMapped: true }), [])
  const frameMat = useMemo(() => colorMaterial('#56606b', { metalness: 0.5, roughness: 0.5 }), [])
  return (
    <group>
      {WALLS.map((w) => (
        <group key={w.id}>
          {wallPieces(w).map((p, i) => {
            const len = p.u1 - p.u0
            const els = []
            if (p.y0 < DADO) {
              els.push(<WallPanel key={'d' + i} wall={w} u0={p.u0} u1={p.u1} y0={p.y0} y1={DADO} material={texMat(plaster, len / 4, 1, { roughness: 0.9 })} />)
            }
            els.push(
              <WallPanel key={'c' + i} wall={w} u0={p.u0} u1={p.u1} y0={Math.max(DADO, p.y0)} y1={EAVE} material={texMat(clad, len / 3, 1, { metalness: 0.4, roughness: 0.6 })} />,
            )
            return els
          })}
          {/* clerestory window band */}
          {Array.from({ length: Math.floor((w.to - w.from) / 5) }, (_, k) => {
            const a = w.from + k * 5 + 0.6
            return (
              <group key={'win' + k}>
                <WallPanel wall={w} u0={a} u1={a + 3.8} y0={5.4} y1={6.5} material={windowMat} offset={0.03} />
                <WallPanel wall={w} u0={a + 1.85} u1={a + 1.95} y0={5.4} y1={6.5} material={frameMat} offset={0.05} />
              </group>
            )
          })}
        </group>
      ))}
      {/* gable infill triangles (inner) */}
      {[minX, maxX].map((x) => (
        <Gable key={x} x={x} inward={x < 0 ? 1 : -1} material={texMat(clad, 20, 1, { metalness: 0.4, roughness: 0.6 })} />
      ))}
    </group>
  )
}

function Gable({ x, inward, material, outward = false }) {
  const geo = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(minZ, EAVE)
    s.lineTo(maxZ, EAVE)
    s.lineTo(0, RIDGE)
    s.closePath()
    const g = new THREE.ShapeGeometry(s)
    // map uvs to world units / 3 m
    const uv = g.attributes.uv
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 60, (uv.getY(i) - EAVE) / 2)
    return g
  }, [])
  const facing = outward ? -inward : inward
  // ShapeGeometry lies in XY (normal +z). Map shape-x → world z.
  return <mesh geometry={geo} material={material} position={[x + facing * 0.01, 0, 0]} rotation={[0, facing > 0 ? Math.PI / 2 : -Math.PI / 2, 0]} castShadow={!outward} />
}

// ---- exterior skin (visible only for low, outside camera positions) ----------
function ExteriorSkin() {
  const ref = useRef()
  const clad = useMemo(() => corrugatedTexture([1, 1], '#c3cad0'), [])
  const plinthMat = useMemo(() => colorMaterial('#8b8579', { roughness: 0.9 }), [])
  const trimMat = useMemo(() => colorMaterial('#2b4f7e', { roughness: 0.4, metalness: 0.4 }), [])
  const roofMat = useMemo(() => new THREE.MeshStandardMaterial({ map: corrugatedTexture([60, 1], '#b7bfc6'), metalness: 0.55, roughness: 0.45 }), [])
  useFrame(({ camera }) => {
    if (!ref.current) return
    const p = camera.position
    const outside = p.x < minX - 0.3 || p.x > maxX + 0.3 || p.z < minZ - 0.3 || p.z > maxZ + 0.3
    ref.current.visible = outside && p.y < 17 && !useFactoryStore.getState().openView
  })
  return (
    <group ref={ref}>
      {WALLS.map((w) => (
        <group key={w.id}>
          {wallPieces(w).map((p0, i) => {
            const p = { ...p0, u0: p0.u0 === w.from ? p0.u0 - 0.26 : p0.u0, u1: p0.u1 === w.to ? p0.u1 + 0.26 : p0.u1 }
            const len = p.u1 - p.u0
            return (
              <group key={i}>
                {p.y0 < 1 && <WallPanel wall={w} u0={p.u0} u1={p.u1} y0={0} y1={1} material={plinthMat} offset={-0.25} outward />}
                <WallPanel wall={w} u0={p.u0} u1={p.u1} y0={Math.max(1, p.y0)} y1={EAVE} material={texMat(clad, len / 3, 1, { metalness: 0.45, roughness: 0.5 })} offset={-0.25} outward />
              </group>
            )
          })}
          <WallPanel wall={w} u0={w.from} u1={w.to} y0={EAVE - 0.35} y1={EAVE + 0.05} material={trimMat} offset={-0.3} outward />
        </group>
      ))}
      {[minX - 0.25, maxX + 0.25].map((x) => (
        <Gable key={x} x={x} inward={x < 0 ? 1 : -1} outward material={texMat(clad, 20, 1, { metalness: 0.45, roughness: 0.5 })} />
      ))}
      {/* roof top */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          geometry={GEO.plane}
          material={roofMat}
          position={[0, (EAVE + RIDGE) / 2 + 0.12, (s * maxZ) / 2]}
          rotation={[-Math.PI / 2 + s * SLOPE, 0, 0]}
          scale={[maxX - minX + 1.2, Math.hypot(maxZ, RIDGE - EAVE) + 0.8, 1]}
        />
      ))}
      <Box size={[maxX - minX + 1.3, 0.35, 0.5]} position={[0, RIDGE + 0.2, 0]} material={MAT.galvanized} />
    </group>
  )
}

// ---- structure ----------------------------------------------------------------------
function Structure({ open }) {
  const colGeo = useMemo(() => iBeam(0.3, 0.45, 1, 0.022, 0.012), [])
  const rafterGeo = useMemo(() => iBeam(0.22, 0.55, 1, 0.02, 0.01), [])
  const hazard = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ map: hazardTexture([2, 3]), roughness: 0.6 })
    return m
  }, [])
  const columns = useMemo(() => {
    const list = []
    for (let x = minX; x <= maxX + 0.01; x += 10) {
      list.push({ x: x === minX ? x + 0.25 : x === maxX ? x - 0.25 : x, z: minZ + 0.25, h: EAVE, perimeter: true })
      list.push({ x: x === minX ? x + 0.25 : x === maxX ? x - 0.25 : x, z: maxZ - 0.25, h: EAVE, perimeter: true })
    }
    for (let z = -20; z <= 20; z += 10) {
      list.push({ x: minX + 0.25, z, h: roofY(z) - 0.3, perimeter: true })
      list.push({ x: maxX - 0.25, z, h: roofY(z) - 0.3, perimeter: true })
    }
    return list
  }, [])

  const rafterLen = Math.hypot(maxZ, RIDGE - EAVE)
  const frames = []
  for (let x = minX; x <= maxX + 0.01; x += 10) frames.push(x === minX ? x + 0.25 : x === maxX ? x - 0.25 : x)

  return (
    <group>
      {columns.map((c, i) => (
        <group key={i} position={[c.x, 0, c.z]}>
          <mesh geometry={colGeo} material={MAT.structure} position={[0, c.h / 2, 0]} rotation={[Math.PI / 2, 0, c.perimeter && Math.abs(c.z) > maxZ - 1 ? 0 : Math.PI / 2]} scale={[1, 1, c.h]} castShadow />
          <Box size={[0.6, 0.1, 0.6]} position={[0, 0.05, 0]} material={MAT.concreteBlock} />
          {!c.perimeter && <mesh geometry={GEO.box} material={hazard} position={[0, 0.65, 0]} scale={[0.52, 1.2, 0.62]} />}
        </group>
      ))}
      {frames.map((x) => (
        <group key={'f' + x} visible={!open} userData={{ prewarm: true }}>
        <group key={x}>
          {[-1, 1].map((s) => (
            <mesh
              key={s}
              geometry={rafterGeo}
              material={MAT.rafter}
              position={[x, (EAVE + RIDGE) / 2 - 0.32, (s * maxZ) / 2]}
              rotation={[s === -1 ? -SLOPE : SLOPE, 0, 0]}
              scale={[1, 1, rafterLen]}
            />
          ))}
          {/* haunch plates at eaves + apex */}
          <Box size={[0.24, 0.9, 1.2]} position={[x, EAVE - 0.55, minZ + 0.7]} material={MAT.rafter} />
          <Box size={[0.24, 0.9, 1.2]} position={[x, EAVE - 0.55, maxZ - 0.7]} material={MAT.rafter} />
          <Box size={[0.26, 0.8, 1.4]} position={[x, RIDGE - 0.6, 0]} material={MAT.rafter} />
        </group>
        </group>
      ))}
      {/* eave beams */}
      <Box size={[maxX - minX, 0.3, 0.2]} position={[0, EAVE - 0.2, minZ + 0.3]} material={MAT.structure} />
      <Box size={[maxX - minX, 0.3, 0.2]} position={[0, EAVE - 0.2, maxZ - 0.3]} material={MAT.structure} />
      {/* wall X-bracing in end bays */}
      {[[minX, minX + 10], [maxX - 10, maxX]].map(([a, b]) =>
        [minZ + 0.35, maxZ - 0.35].map((z) => {
          const len = Math.hypot(b - a, EAVE - 1)
          const ang = Math.atan2(EAVE - 1, b - a)
          return (
            <group key={a + '' + z}>
              <Box size={[len, 0.04, 0.04]} position={[(a + b) / 2, EAVE / 2 + 0.2, z]} rotation={[0, 0, ang]} material={MAT.darkSteel} />
              <Box size={[len, 0.04, 0.04]} position={[(a + b) / 2, EAVE / 2 + 0.2, z]} rotation={[0, 0, -ang]} material={MAT.darkSteel} />
            </group>
          )
        }),
      )}
    </group>
  )
}

const SKY_W = 2.2
const SLOPE_LEN = Math.hypot(maxZ, RIDGE - EAVE)
const SKY_X = Array.from({ length: Math.round((maxX - minX) / 10) }, (_, i) => minX + 5 + i * 10)

/** Alpha map for the inner roof sheet: opaque except the skylight strips (lets sun through in the shadow pass). */
function skylightAlpha() {
  const W = 1100
  const H = 64
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#000'
  const v0 = (3 / SLOPE_LEN) * H
  for (const x of SKY_X) ctx.fillRect(((x - SKY_W / 2 - minX) / (maxX - minX)) * W, v0, (SKY_W / (maxX - minX)) * W, H - 2 * v0)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.NoColorSpace
  t.magFilter = THREE.NearestFilter
  return t
}

/** Purlins, roof sheeting (inner) and skylights. Purlins hidden when viewed from above. */
function RoofDetail() {
  const ref = useRef()
  const sheets = useRef([])
  const roofMat = useMemo(() => {
    const m = MAT.roofSheet.clone()
    m.alphaMap = skylightAlpha()
    m.alphaTest = 0.5
    m.shadowSide = THREE.DoubleSide
    return m
  }, [])
  useFrame(({ camera }) => {
    if (ref.current) ref.current.visible = camera.position.y < RIDGE + 0.8
    // the roof only shades the floor when we are looking from inside the shed
    const inside = useFactoryStore.getState().cameraInside
    for (const m of sheets.current) if (m) m.castShadow = inside
  })
  const purlins = []
  for (let d = 1; d < maxZ; d += 2) {
    purlins.push(-maxZ + d, maxZ - d)
  }
  const len = maxX - minX
  return (
    <group>
      <group ref={ref}>
        {purlins.map((z) => (
          <Box key={z} size={[len, 0.2, 0.07]} position={[0, roofY(z) - 0.16, z]} material={MAT.galvanized} />
        ))}
        {/* ridge purlins */}
        <Box size={[len, 0.2, 0.07]} position={[0, RIDGE - 0.16, -0.3]} material={MAT.galvanized} />
        <Box size={[len, 0.2, 0.07]} position={[0, RIDGE - 0.16, 0.3]} material={MAT.galvanized} />
        {/* roof X bracing in end bays */}
        {[minX + 5, maxX - 5].map((x) =>
          [-1, 1].map((s) => (
            <group key={x + '' + s} position={[x, (EAVE + RIDGE) / 2 - 0.08, (s * maxZ) / 2]} rotation={[s === -1 ? -SLOPE : SLOPE, 0, 0]}>
              <Box size={[Math.hypot(10, maxZ), 0.03, 0.03]} rotation={[0, Math.atan2(maxZ, 10), 0]} material={MAT.darkSteel} />
              <Box size={[Math.hypot(10, maxZ), 0.03, 0.03]} rotation={[0, -Math.atan2(maxZ, 10), 0]} material={MAT.darkSteel} />
            </group>
          )),
        )}
      </group>
      {/* roof sheets – BackSide material, visible from inside only; skylight strips are cut out */}
      {[-1, 1].map((s, i) => (
        <mesh
          key={s}
          ref={(el) => (sheets.current[i] = el)}
          geometry={GEO.plane}
          material={roofMat}
          position={[0, (EAVE + RIDGE) / 2, (s * maxZ) / 2]}
          rotation={[-Math.PI / 2 + s * SLOPE, 0, 0]}
          scale={[len, SLOPE_LEN, 1]}
        />
      ))}
      {/* translucent polycarbonate skylights */}
      {[-1, 1].map((s) =>
        SKY_X.map((x, i) => (
          <mesh
            key={s + '_' + i}
            geometry={GEO.plane}
            material={MAT.skylight}
            position={[x, (EAVE + RIDGE) / 2 + 0.02, (s * maxZ) / 2]}
            rotation={[-Math.PI / 2 + s * SLOPE, 0, 0]}
            scale={[SKY_W, SLOPE_LEN - 6, 1]}
          />
        )),
      )}
    </group>
  )
}

// ---- floor ------------------------------------------------------------------------------
const LOOM_SPOTS = loomPlacements.map((l) => [l.position[0], l.position[2]])
const AISLES = [
  [[-34.6, -11.6], [22.6, -11.6]], [[-34.6, -2.5], [22.6, -2.5]], [[-34.6, 6.6], [22.6, 6.6]], [[-34.6, 15.4], [22.6, 15.4]],
  [[-35.6, -20], [-35.6, 20]], [[22.6, -20], [22.6, 20]], [[-42.5, 13], [-35.6, 13]], [[-42.6, -20], [-42.6, 18]],
  [[27.5, -8], [50, -8]], [[27.5, -18], [27.5, 18]], [[-0.5, 21], [-0.5, 15.4]], [[40, 11], [54, 11]],
]
/** Sub-rectangle texture transform so a world-space floor map lines up on a smaller plane. */
function subRect(tex, cx, cz, w, h) {
  const t = tex.clone()
  t.repeat.set(w / (maxX - minX), h / (maxZ - minZ))
  t.offset.set((cx - w / 2 - minX) / (maxX - minX), 1 - (cz + h / 2 - minZ) / (maxZ - minZ))
  t.needsUpdate = true
  return t
}

function Floor() {
  const x0 = LOOM_COLUMNS[0] - 2.6
  const x1 = LOOM_COLUMNS[LOOM_COLUMNS.length - 1] + 2.6
  const cx = (x0 + x1) / 2
  const w = x1 - x0
  const { concrete, epoxy, overlay } = useMemo(() => {
    const ao = floorWearTexture('ao', { loomSpots: LOOM_SPOTS, aisles: AISLES })
    const rough = floorWearTexture('rough', { loomSpots: LOOM_SPOTS, aisles: AISLES })
    const tint = floorWearTexture('color', { loomSpots: LOOM_SPOTS, aisles: AISLES })
    const concrete = new THREE.MeshStandardMaterial({
      map: makeConcrete([22, 9]), aoMap: ao, aoMapIntensity: 1, roughnessMap: rough, roughness: 0.92, metalness: 0.02,
    })
    const epoxy = new THREE.MeshStandardMaterial({
      map: epoxyTexture([12, 8]), aoMap: subRect(ao, cx, -4, w + 1.5, 35), roughnessMap: subRect(rough, cx, -4, w + 1.5, 35),
      roughness: 0.55, metalness: 0.05,
    })
    // unlit multiply pass: stains & tyre marks show under direct sun as well
    const overlay = new THREE.MeshBasicMaterial({
      map: tint, transparent: true, blending: THREE.MultiplyBlending, premultipliedAlpha: true, depthWrite: false, toneMapped: false,
    })
    return { concrete, epoxy, overlay }
  }, [cx, w])
  return (
    <group>
      <mesh geometry={GEO.plane} material={concrete} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} scale={[maxX - minX, maxZ - minZ, 1]} receiveShadow />
      {/* weaving hall epoxy coating */}
      <mesh geometry={GEO.plane} material={epoxy} rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.003, -4]} scale={[w + 1.5, 35, 1]} receiveShadow />
      <mesh geometry={GEO.plane} material={overlay} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} scale={[maxX - minX, maxZ - minZ, 1]} renderOrder={1} />
      {/* drainage channels with gratings behind each loom row */}
      {LOOM_ROWS.map((z) => (
        <group key={'dr' + z}>
          <mesh geometry={GEO.plane} material={MAT.grating} rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.008, z - 1.62]} scale={[w - 2, 0.36, 1]} />
          <Box size={[w - 2, 0.02, 0.04]} position={[cx, 0.01, z - 1.82]} material={MAT.galvanized} />
          <Box size={[w - 2, 0.02, 0.04]} position={[cx, 0.01, z - 1.42]} material={MAT.galvanized} />
        </group>
      ))}
    </group>
  )
}

export default function Building() {
  const openView = useFactoryStore((s) => s.openView)
  const inside = useFactoryStore((s) => s.cameraInside)
  // "Open view" removes the roof only when looking in from outside/above —
  // from inside the shed the roof never blocks the view, so it stays.
  const showRoof = !openView || inside
  return (
    <group>
      <Floor />
      <InnerWalls />
      <ExteriorSkin />
      <Structure open={!showRoof} />
      {/* kept mounted (toggled, not re-created) so crossing the eaves never recompiles shaders */}
      <group visible={showRoof} userData={{ prewarm: true }}>
        <RoofDetail />
      </group>
    </group>
  )
}
