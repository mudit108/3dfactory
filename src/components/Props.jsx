// Reusable factory props: pallets, stacks, rolls, bales, safety equipment,
// forklift, fans, signage.
import { memo, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Box, Cyl, CylX, RBox, TexPlane, Sphere } from './primitives'
import { MAT, colorMaterial, emissiveMaterial, fabricMaterial } from '../scene/materials'
import { GEO } from '../scene/geometries'
import { safetySignTexture, exitSignTexture, rng } from '../scene/textures'

const dummy = new THREE.Object3D()
const col = new THREE.Color()

export function Pallet({ position, rotation = 0 }) {
  return <mesh geometry={GEO.pallet} material={MAT.wood} position={position} rotation={[0, rotation, 0]} receiveShadow castShadow />
}

/** Pallet stacked with cartons (nx × nz × ny). */
export function CartonStack({ position, rotation = 0, nx = 2, nz = 2, ny = 3, wrap = false, seed = 1 }) {
  const r = useMemo(() => rng(seed), [seed])
  const boxes = useMemo(() => {
    const list = []
    for (let y = 0; y < ny; y++)
      for (let x = 0; x < nx; x++)
        for (let z = 0; z < nz; z++) {
          if (y === ny - 1 && r() < 0.2) continue
          list.push([(x - (nx - 1) / 2) * 0.58, 0.345 + y * 0.41, (z - (nz - 1) / 2) * 0.47, (r() - 0.5) * 0.05])
        }
    return list
  }, [nx, ny, nz, r])
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Pallet position={[0, 0, 0]} />
      {boxes.map(([x, y, z, ry], i) => (
        <Box key={i} size={[0.56, 0.4, 0.45]} position={[x, y, z]} rotation={[0, ry, 0]} material={MAT.cardboard} cast receive />
      ))}
      {wrap && (
        <Box size={[nx * 0.58 + 0.04, ny * 0.41 + 0.02, nz * 0.47 + 0.04]} position={[0, 0.145 + (ny * 0.41) / 2, 0]} material={colorMaterial('#dfe8ee', { transparent: true, opacity: 0.25, roughness: 0.1, depthWrite: false })} />
      )}
    </group>
  )
}

/** Instanced fabric rolls lying along x, pyramid stacked on pallets. */
export const RollStack = memo(function RollStack({ position, rotation = 0, colors = ['#e6e2d8'], rows = 4, layers = 3, pallet = true, seed = 1, rollLength = 1.6 }) {
  const ref = useRef()
  const items = useMemo(() => {
    const list = []
    const rr = 0.15
    for (let l = 0; l < layers; l++) {
      const n = rows - l
      for (let i = 0; i < n; i++) list.push([(i - (n - 1) / 2) * rr * 2, (pallet ? 0.145 : 0) + rr + l * rr * 1.72, 0])
    }
    return list
  }, [rows, layers, pallet])
  const mats = useMemo(() => [fabricMaterial('#ffffff', true), MAT.rollSide, MAT.rollSide], [])
  useLayoutEffect(() => {
    const r = rng(seed * 17 + 1)
    items.forEach(([x, y, z], i) => {
      dummy.position.set(0, y, x)
      dummy.rotation.set(0, 0, Math.PI / 2)
      dummy.scale.set(0.3, rollLength, 0.3)
      dummy.position.x = (r() - 0.5) * 0.06
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
      col.set(colors[Math.floor(r() * colors.length)]).offsetHSL(0, 0, (r() - 0.5) * 0.05)
      ref.current.setColorAt(i, col)
    })
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
    ref.current.computeBoundingSphere()
    ref.current.computeBoundingBox?.()
  }, [items, colors, seed, rollLength])
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {pallet && (
        <>
          <Pallet position={[0.0, 0, -0.32]} rotation={Math.PI / 2} />
          <Pallet position={[0.0, 0, 0.32]} rotation={Math.PI / 2} />
        </>
      )}
      <instancedMesh ref={ref} args={[GEO.roll, mats, items.length]} castShadow receiveShadow />
    </group>
  )
})

/** HDPE-wrapped fabric bales. */
export function BaleStack({ position, rotation = 0, n = 3, color = '#e9e7df' }) {
  const mat = useMemo(() => colorMaterial(color, { roughness: 0.55 }), [color])
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Pallet position={[0, 0, 0]} />
      {Array.from({ length: n }, (_, i) => (
        <group key={i} position={[((i % 2) - 0.5) * 0.56, 0.36 + Math.floor(i / 2) * 0.44, 0]}>
          <RBox size={[0.55, 0.42, 0.95]} radius={0.12} material={mat} cast receive />
          <Box size={[0.57, 0.02, 0.03]} position={[0, 0, 0.25]} material={MAT.bluePvc} />
          <Box size={[0.57, 0.02, 0.03]} position={[0, 0, -0.25]} material={MAT.bluePvc} />
        </group>
      ))}
    </group>
  )
}

export function FireExtinguisher({ position, rotation = 0, sign = true }) {
  const tex = useMemo(() => safetySignTexture('fire'), [])
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Cyl r={0.085} h={0.5} position={[0, 0.35, 0.1]} material={MAT.red} cast />
      <Sphere r={0.085} position={[0, 0.6, 0.1]} material={MAT.red} low />
      <Box size={[0.05, 0.08, 0.1]} position={[0, 0.68, 0.1]} material={MAT.darkSteel} />
      <Box size={[0.2, 0.06, 0.02]} position={[0, 0.24, 0.01]} material={MAT.darkSteel} />
      {sign && <TexPlane texture={tex} width={0.3} height={0.375} position={[0, 1.2, 0.012]} />}
    </group>
  )
}

export function FireBucketStand({ position, rotation = 0 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Box size={[1.4, 1.5, 0.05]} position={[0, 0.75, 0]} material={MAT.red} />
      <Box size={[1.5, 0.05, 0.12]} position={[0, 1.22, 0.07]} material={MAT.darkSteel} />
      {[-0.45, -0.15, 0.15, 0.45].map((x) => (
        <group key={x} position={[x, 0.98, 0.14]}>
          <mesh geometry={GEO.cylLow} scale={[0.24, 0.26, 0.24]} material={MAT.red} castShadow />
          <Cyl r={0.1} h={0.01} position={[0, 0.13, 0]} material={colorMaterial('#c9b37e')} low />
        </group>
      ))}
    </group>
  )
}

export function SafetySign({ kind, position, rotation = 0, size = 0.55 }) {
  const tex = useMemo(() => safetySignTexture(kind), [kind])
  return <TexPlane texture={tex} width={size} height={size * 1.25} position={position} rotation={[0, rotation, 0]} />
}

export function ExitSign({ position, rotation = 0 }) {
  const tex = useMemo(() => exitSignTexture(), [])
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Box size={[0.66, 0.26, 0.06]} material={MAT.white} />
      <TexPlane texture={tex} width={0.62} height={0.23} position={[0, 0, 0.032]} emissive />
    </group>
  )
}

export function TrafficCone({ position }) {
  return (
    <group position={position}>
      <mesh geometry={GEO.cone} scale={[0.32, 0.6, 0.32]} position={[0, 0.32, 0]} material={colorMaterial('#e8611a')} castShadow />
      <Cyl r={0.1} h={0.08} position={[0, 0.36, 0]} material={MAT.white} low />
      <Box size={[0.4, 0.03, 0.4]} position={[0, 0.015, 0]} material={colorMaterial('#d4561a')} />
    </group>
  )
}

export function PalletJack({ position, rotation = 0 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {[-0.2, 0.2].map((x) => (
        <Box key={x} size={[0.16, 0.06, 1.15]} position={[x, 0.08, 0]} material={MAT.red} cast />
      ))}
      <RBox size={[0.6, 0.3, 0.2]} radius={0.04} position={[0, 0.2, -0.65]} material={MAT.red} cast />
      <Cyl r={0.03} h={1.1} position={[0, 0.7, -0.85]} rotation={[-0.35, 0, 0]} material={MAT.darkSteel} low />
      <Box size={[0.3, 0.05, 0.05]} position={[0, 1.22, -1.05]} material={MAT.rubber} />
      <CylX r={0.09} h={0.08} position={[0, 0.09, -0.7]} material={MAT.rubber} />
    </group>
  )
}

export function Forklift({ position, rotation = 0, loaded = true }) {
  const body = useMemo(() => colorMaterial('#d98e04', { roughness: 0.45, metalness: 0.2 }), [])
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <RBox size={[1.1, 0.7, 1.9]} radius={0.1} position={[0, 0.65, 0]} material={body} cast />
      <RBox size={[1.12, 0.6, 0.5]} radius={0.1} position={[0, 0.85, -0.85]} material={MAT.darkSteel} cast />
      <Box size={[0.5, 0.1, 0.45]} position={[0, 1.05, -0.2]} material={MAT.rubber} />
      <Box size={[0.5, 0.45, 0.08]} position={[0, 1.3, -0.42]} material={MAT.rubber} />
      <Cyl r={0.16} h={0.03} position={[0, 1.45, 0.35]} rotation={[-0.9, 0, 0]} material={MAT.rubber} low />
      {/* overhead guard */}
      {[[-0.5, -0.55], [0.5, -0.55], [-0.5, 0.55], [0.5, 0.55]].map(([x, z]) => (
        <Box key={x + '' + z} size={[0.06, 1.3, 0.06]} position={[x, 1.65, z]} material={MAT.black} />
      ))}
      <Box size={[1.1, 0.05, 1.2]} position={[0, 2.3, 0]} material={MAT.black} />
      {/* mast + forks */}
      <Box size={[0.08, 2.4, 0.12]} position={[-0.38, 1.3, 1.05]} material={MAT.darkSteel} cast />
      <Box size={[0.08, 2.4, 0.12]} position={[0.38, 1.3, 1.05]} material={MAT.darkSteel} cast />
      <Box size={[0.9, 0.5, 0.06]} position={[0, loaded ? 0.55 : 0.3, 1.14]} material={MAT.darkSteel} />
      {[-0.28, 0.28].map((x) => (
        <Box key={x} size={[0.1, 0.05, 1.1]} position={[x, loaded ? 0.33 : 0.08, 1.7]} material={MAT.darkSteel} />
      ))}
      {loaded && <CartonStack position={[0, 0.36, 1.75]} nx={2} nz={2} ny={2} seed={9} />}
      {[[-0.52, 0.55, 0.3], [0.52, 0.55, 0.3], [-0.52, -0.6, 0.25], [0.52, -0.6, 0.25]].map(([x, z, r]) => (
        <CylX key={x + '' + z} r={r} h={0.22} position={[x, r, z]} material={MAT.rubber} cast />
      ))}
      <Cyl r={0.05} h={0.06} position={[0, 2.36, -0.4]} material={emissiveMaterial('#ffae00', 3)} low />
    </group>
  )
}

/** Large-diameter HVLS ceiling fan. */
export function HVLSFan({ position, radius = 3.2, speed = 0.9 }) {
  const rotor = useRef()
  useFrame((_, dt) => {
    if (rotor.current) rotor.current.rotation.y += dt * speed
  })
  return (
    <group position={position}>
      <Cyl r={0.04} h={1.6} position={[0, 0.8, 0]} material={MAT.darkSteel} low />
      <Cyl r={0.28} h={0.35} material={MAT.darkSteel} />
      <group ref={rotor} position={[0, -0.2, 0]}>
        <Cyl r={0.22} h={0.08} material={MAT.yellow} />
        {Array.from({ length: 6 }, (_, i) => (
          <group key={i} rotation={[0, (i / 6) * Math.PI * 2, 0]}>
            <Box size={[radius, 0.03, 0.22]} position={[radius / 2 + 0.15, 0, 0]} rotation={[0.1, 0, 0]} material={MAT.aluminium} />
          </group>
        ))}
      </group>
    </group>
  )
}

/** Wall-mounted exhaust fan (rotating blades). */
export function ExhaustFan({ position, rotation = 0 }) {
  const rotor = useRef()
  useFrame((_, dt) => {
    if (rotor.current) rotor.current.rotation.z += dt * 7
  })
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Box size={[1.3, 1.3, 0.2]} material={MAT.galvanized} />
      <Cyl r={0.56} h={0.22} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.02]} material={MAT.black} />
      <group ref={rotor} position={[0, 0, 0.1]}>
        {Array.from({ length: 5 }, (_, i) => (
          <Box key={i} size={[0.12, 0.5, 0.02]} position={[Math.sin((i / 5) * Math.PI * 2) * 0.25, Math.cos((i / 5) * Math.PI * 2) * 0.25, 0]} rotation={[0.4, 0, -(i / 5) * Math.PI * 2]} material={MAT.aluminium} />
        ))}
      </group>
      {[-0.3, -0.1, 0.1, 0.3].map((y) => (
        <Box key={y} size={[1.12, 0.012, 0.012]} position={[0, y, 0.13]} material={MAT.steel} />
      ))}
    </group>
  )
}

export function Plant({ position, scale = 1 }) {
  const leaf = useMemo(() => colorMaterial('#3f6b3a', { roughness: 0.8 }), [])
  return (
    <group position={position} scale={scale}>
      <Cyl r={0.17} h={0.35} position={[0, 0.175, 0]} material={colorMaterial('#6b4a33')} />
      <Cyl r={0.15} h={0.02} position={[0, 0.34, 0]} material={colorMaterial('#3b2a1e')} low />
      {[[0, 0.62, 0, 0.26], [0.12, 0.5, 0.05, 0.18], [-0.1, 0.52, -0.06, 0.2], [0.03, 0.8, -0.04, 0.17]].map(([x, y, z, r], i) => (
        <mesh key={i} geometry={GEO.sphereLow} scale={[r * 2, r * 2.4, r * 2]} position={[x, y, z]} material={leaf} castShadow />
      ))}
    </group>
  )
}

export function Tree({ position, scale = 1, seed = 1 }) {
  const r = rng(seed)
  const green = useMemo(() => colorMaterial(['#46613a', '#51693d', '#3c5633'][seed % 3], { roughness: 0.9, flatShading: true }), [seed])
  const trunk = useMemo(() => colorMaterial('#5a4331', { roughness: 0.9 }), [])
  return (
    <group position={position} scale={scale}>
      <Cyl r={0.18} h={3} position={[0, 1.5, 0]} material={trunk} low cast />
      {[0, 1, 2].map((i) => (
        <mesh key={i} geometry={icosa()} scale={1.9 - i * 0.35 + r() * 0.3} position={[(r() - 0.5) * 0.8, 3.4 + i * 1.1, (r() - 0.5) * 0.8]} material={green} castShadow />
      ))}
    </group>
  )
}
let _ico
const icosa = () => (_ico ||= new THREE.IcosahedronGeometry(1, 0))

export function WaterDispenser({ position, rotation = 0 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <RBox size={[0.34, 1.0, 0.34]} radius={0.03} position={[0, 0.5, 0]} material={MAT.white} cast />
      <Cyl r={0.14} h={0.42} position={[0, 1.21, 0]} material={colorMaterial('#7fb9df', { transparent: true, opacity: 0.6, roughness: 0.1 })} />
      <Box size={[0.06, 0.05, 0.05]} position={[-0.07, 0.8, 0.18]} material={MAT.bluePvc} />
      <Box size={[0.06, 0.05, 0.05]} position={[0.07, 0.8, 0.18]} material={MAT.red} />
    </group>
  )
}
