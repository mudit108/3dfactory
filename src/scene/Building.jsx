// Pre-engineered steel building: floor, walls, portal frames, roof,
// skylights and an exterior skin that hides itself for cut-away views.
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BUILDING, ENTRANCE, DISPATCH, RECEIVING_DOOR } from '../data/layout'
import { MAT, colorMaterial } from './materials'
import { GEO, iBeam } from './geometries'
import { makeConcrete, epoxyTexture, plasterTexture, corrugatedTexture, hazardTexture } from './textures'
import { Box } from '../components/primitives'

const { minX, maxX, minZ, maxZ, eaveHeight: EAVE, ridgeHeight: RIDGE } = BUILDING
const DADO = 2.4
const SLOPE = Math.atan2(RIDGE - EAVE, maxZ)
export const roofY = (z) => EAVE + ((maxZ - Math.abs(z)) / maxZ) * (RIDGE - EAVE)

// ---- walls ------------------------------------------------------------------
const WALLS = [
  { id: 'back', axis: 'x', fixed: minZ, from: minX, to: maxX, rotY: 0, inward: [0, 0, 1], openings: [{ a: -40.5, b: -38.5, h: 2.3 }, { a: 8, b: 10, h: 2.3 }] },
  {
    id: 'front', axis: 'x', fixed: maxZ, from: minX, to: maxX, rotY: Math.PI, inward: [0, 0, -1],
    openings: [{ a: ENTRANCE.opening[0], b: ENTRANCE.opening[1], h: ENTRANCE.height }, { a: 18.6, b: 20.2, h: 2.3 }],
  },
  { id: 'left', axis: 'z', fixed: minX, from: minZ, to: maxZ, rotY: Math.PI / 2, inward: [1, 0, 0], openings: [{ a: RECEIVING_DOOR.minZ, b: RECEIVING_DOOR.maxZ, h: RECEIVING_DOOR.height }, { a: 20, b: 21.6, h: 2.3 }] },
  { id: 'right', axis: 'z', fixed: maxX, from: minZ, to: maxZ, rotY: -Math.PI / 2, inward: [-1, 0, 0], openings: [{ a: DISPATCH.door.minZ, b: DISPATCH.door.maxZ, h: DISPATCH.door.height }, { a: -8, b: -6.4, h: 2.3 }] },
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
  return <mesh geometry={GEO.plane} material={material} position={pos} rotation={[0, wall.rotY + (outward ? Math.PI : 0), 0]} scale={[len, h, 1]} receiveShadow={!outward} />
}

function texMat(base, repeatU, repeatV, opts = {}) {
  const t = base.clone()
  t.repeat.set(repeatU, repeatV)
  t.needsUpdate = true
  return new THREE.MeshStandardMaterial({ map: t, ...opts })
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
  return <mesh geometry={geo} material={material} position={[x + facing * 0.01, 0, 0]} rotation={[0, facing > 0 ? Math.PI / 2 : -Math.PI / 2, 0]} />
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
    ref.current.visible = outside && p.y < 17
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
function Structure() {
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
    for (let x = -40; x <= 40; x += 10) list.push({ x, z: 13, h: roofY(13) - 0.5, perimeter: false })
    return list
  }, [])

  const rafterLen = Math.hypot(maxZ, RIDGE - EAVE)
  const frames = []
  for (let x = minX; x <= maxX + 0.01; x += 10) frames.push(x === minX ? x + 0.25 : x === maxX ? x - 0.25 : x)

  return (
    <group>
      {columns.map((c, i) => (
        <group key={i} position={[c.x, 0, c.z]}>
          <mesh geometry={colGeo} material={MAT.structure} position={[0, c.h / 2, 0]} rotation={[Math.PI / 2, 0, c.perimeter && Math.abs(c.z) > 29 ? 0 : Math.PI / 2]} scale={[1, 1, c.h]} castShadow />
          <Box size={[0.6, 0.1, 0.6]} position={[0, 0.05, 0]} material={MAT.concreteBlock} />
          {!c.perimeter && <mesh geometry={GEO.box} material={hazard} position={[0, 0.65, 0]} scale={[0.52, 1.2, 0.62]} />}
        </group>
      ))}
      {frames.map((x) => (
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
      ))}
      {/* eave beams */}
      <Box size={[maxX - minX, 0.3, 0.2]} position={[0, EAVE - 0.2, minZ + 0.3]} material={MAT.structure} />
      <Box size={[maxX - minX, 0.3, 0.2]} position={[0, EAVE - 0.2, maxZ - 0.3]} material={MAT.structure} />
      {/* interior tie beam along column row */}
      <Box size={[80, 0.35, 0.2]} position={[0, roofY(13) - 0.85, 13]} material={MAT.structure} />
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

/** Purlins, roof sheeting (inner) and skylights. Hidden when viewed from above. */
function RoofDetail() {
  const ref = useRef()
  useFrame(({ camera }) => {
    if (ref.current) ref.current.visible = camera.position.y < RIDGE + 0.8
  })
  const purlins = []
  for (let d = 1; d < maxZ; d += 2) {
    purlins.push(-maxZ + d, maxZ - d)
  }
  const len = maxX - minX
  const slopeLen = Math.hypot(maxZ, RIDGE - EAVE)
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
              <Box size={[Math.hypot(10, 30), 0.03, 0.03]} rotation={[0, Math.atan2(30, 10), 0]} material={MAT.darkSteel} />
              <Box size={[Math.hypot(10, 30), 0.03, 0.03]} rotation={[0, -Math.atan2(30, 10), 0]} material={MAT.darkSteel} />
            </group>
          )),
        )}
      </group>
      {/* roof sheets – BackSide material, visible from inside only */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          geometry={GEO.plane}
          material={MAT.roofSheet}
          position={[0, (EAVE + RIDGE) / 2, (s * maxZ) / 2]}
          rotation={[-Math.PI / 2 + s * SLOPE, 0, 0]}
          scale={[len, slopeLen, 1]}
        />
      ))}
      {/* skylight strips */}
      {[-1, 1].map((s) =>
        Array.from({ length: 10 }, (_, i) => (
          <mesh
            key={s + '_' + i}
            geometry={GEO.plane}
            material={MAT.skylight}
            position={[minX + 5 + i * 10, (EAVE + RIDGE) / 2 - 0.03, (s * maxZ) / 2]}
            rotation={[-Math.PI / 2 + s * SLOPE, 0, 0]}
            scale={[1.4, slopeLen - 8, 1]}
          />
        )),
      )}
    </group>
  )
}

// ---- floor ------------------------------------------------------------------------------
function Floor() {
  const concrete = useMemo(() => new THREE.MeshStandardMaterial({ map: makeConcrete([20, 12]), roughness: 0.82, metalness: 0.02 }), [])
  const epoxy = useMemo(() => new THREE.MeshStandardMaterial({ map: epoxyTexture([10, 10]), roughness: 0.38, metalness: 0.05 }), [])
  const wetMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#5a6a62', roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.35, depthWrite: false }), [])
  return (
    <group>
      <mesh geometry={GEO.plane} material={concrete} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} scale={[maxX - minX, maxZ - minZ, 1]} receiveShadow />
      {/* production zone epoxy coating */}
      <mesh geometry={GEO.plane} material={epoxy} rotation={[-Math.PI / 2, 0, 0]} position={[-7, 0.003, -8.5]} scale={[42, 39, 1]} receiveShadow />
      {/* damp patches near looms (waterjet) */}
      {[-20, -11, -2].map((z) => (
        <mesh key={z} geometry={GEO.plane} material={wetMat} rotation={[-Math.PI / 2, 0, 0]} position={[-6.8, 0.006, z + 0.3]} scale={[41, 1.6, 1]} />
      ))}
      {/* drainage channels with gratings behind each loom row */}
      {[-20, -11, -2].map((z) => (
        <group key={'dr' + z}>
          <mesh geometry={GEO.plane} material={MAT.grating} rotation={[-Math.PI / 2, 0, 0]} position={[-6.75, 0.008, z - 1.62]} scale={[40, 0.36, 1]} />
          <Box size={[40, 0.02, 0.04]} position={[-6.75, 0.01, z - 1.82]} material={MAT.galvanized} />
          <Box size={[40, 0.02, 0.04]} position={[-6.75, 0.01, z - 1.42]} material={MAT.galvanized} />
        </group>
      ))}
    </group>
  )
}

export default function Building() {
  return (
    <group>
      <Floor />
      <InnerWalls />
      <ExteriorSkin />
      <Structure />
      <RoofDetail />
    </group>
  )
}
