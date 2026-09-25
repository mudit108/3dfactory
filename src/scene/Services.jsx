// Building services & safety: high-bay lighting, fans, cable trays, water
// headers, emergency exits, fire equipment and signage.
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Sparkles } from '@react-three/drei'
import { BUILDING, LOOM_ROWS, LOOM_COLUMNS } from '../data/layout'
import { MAT, colorMaterial } from './materials'
import { GEO } from './geometries'
import { beamTexture } from './textures'
import { Box, Cyl } from '../components/primitives'
import { HVLSFan, ExhaustFan, FireExtinguisher, FireBucketStand, ExitSign, SafetySign } from '../components/Props'
import { useFactoryStore } from '../hooks/useFactoryStore'

const dummy = new THREE.Object3D()

function HighBayLights() {
  const body = useRef()
  const lens = useRef()
  const rods = useRef()
  const spots = useMemo(() => {
    const list = []
    for (let x = -45; x <= 45.01; x += 7.5) for (let z = -25; z <= 25.01; z += 8.33) list.push([x, z])
    // skip lights inside the offices / mezzanine footprint
    return list.filter(([x, z]) => !(z > 17 && ((x > -27 && x < -13) || (x > 2 && x < 16))))
  }, [])
  useLayoutEffect(() => {
    spots.forEach(([x, z], i) => {
      dummy.position.set(x, 7.1, z)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.set(0.55, 0.18, 0.55)
      dummy.updateMatrix()
      body.current.setMatrixAt(i, dummy.matrix)
      dummy.position.set(x, 7.0, z)
      dummy.scale.set(0.46, 0.02, 0.46)
      dummy.updateMatrix()
      lens.current.setMatrixAt(i, dummy.matrix)
      const top = BUILDING.eaveHeight + ((BUILDING.maxZ - Math.abs(z)) / BUILDING.maxZ) * 2 - 0.2
      dummy.position.set(x, (7.2 + top) / 2, z)
      dummy.scale.set(0.02, top - 7.2, 0.02)
      dummy.updateMatrix()
      rods.current.setMatrixAt(i, dummy.matrix)
    })
    ;[body, lens, rods].forEach((r) => {
      r.current.instanceMatrix.needsUpdate = true
      r.current.computeBoundingSphere()
    })
  }, [spots])
  return (
    <group>
      <instancedMesh ref={body} args={[GEO.cylLow, MAT.darkSteel, spots.length]} />
      <instancedMesh ref={lens} args={[GEO.cylLow, MAT.lampEmissive, spots.length]} />
      <instancedMesh ref={rods} args={[GEO.box, MAT.darkSteel, spots.length]} />
    </group>
  )
}

/** Overhead cable tray + water header above each loom row. */
function OverheadServices() {
  const x0 = LOOM_COLUMNS[0] - 2.5
  const x1 = LOOM_COLUMNS[LOOM_COLUMNS.length - 1] + 2.5
  const len = x1 - x0
  const cx = (x0 + x1) / 2
  return (
    <group>
      {LOOM_ROWS.map((z) => (
        <group key={z}>
          {/* cable tray at the conduit drop height */}
          <group position={[cx + 1.68 - 1.68, 4.18, z - 0.95]}>
            <Box size={[len, 0.02, 0.36]} material={MAT.galvanized} />
            <Box size={[len, 0.1, 0.02]} position={[0, 0.05, 0.18]} material={MAT.galvanized} />
            <Box size={[len, 0.1, 0.02]} position={[0, 0.05, -0.18]} material={MAT.galvanized} />
            <Box size={[len, 0.05, 0.22]} position={[0, 0.035, 0]} material={MAT.black} />
          </group>
          {/* water supply header */}
          <mesh geometry={GEO.cylLow} material={MAT.bluePvc} position={[cx, 4.7, z - 1.35]} rotation={[0, 0, Math.PI / 2]} scale={[0.14, len, 0.14]} />
          {/* hangers */}
          {Array.from({ length: Math.floor(len / 4) + 1 }, (_, i) => (
            <Box key={i} size={[0.02, 4.5, 0.02]} position={[x0 + i * 4, 6.45, z - 1.1]} material={MAT.darkSteel} />
          ))}
          {/* drops from header to each loom */}
          {LOOM_COLUMNS.map((x) => (
            <mesh key={x} geometry={GEO.cylLow} material={MAT.bluePvc} position={[x - 2.05, 2.85, z - 1.35]} scale={[0.05, 3.7, 0.05]} />
          ))}
        </group>
      ))}
      {/* main feeder: header → water treatment tanks on the back wall */}
      <mesh geometry={GEO.cylLow} material={MAT.bluePvc} position={[x0 - 0.5, 4.7, -12]} rotation={[Math.PI / 2, 0, 0]} scale={[0.2, 36, 0.2]} />
      {/* water treatment / softening tanks */}
      {[-24, -20.8].map((x) => (
        <group key={x} position={[x, 0, -28.3]}>
          <Cyl r={1.1} h={3.6} position={[0, 1.9, 0]} material={colorMaterial('#3f7fb8', { roughness: 0.35 })} cast />
          <mesh geometry={GEO.hemisphere} scale={[2.2, 0.8, 2.2]} position={[0, 3.7, 0]} material={colorMaterial('#3f7fb8', { roughness: 0.35 })} />
          <Box size={[2.4, 0.1, 2.4]} position={[0, 0.05, 0]} material={MAT.concreteBlock} />
          <Cyl r={0.1} h={4.2} position={[1.2, 2.1, 0.4]} material={MAT.bluePvc} low />
        </group>
      ))}
      <Box size={[1.4, 1.2, 0.8]} position={[-17.8, 0.6, -28.8]} material={colorMaterial('#6c7682', { metalness: 0.4, roughness: 0.5 })} cast />
      {/* main electrical panel (MCC) along back wall */}
      <group position={[-2, 0, -29.45]}>
        {Array.from({ length: 5 }, (_, i) => (
          <group key={i} position={[i * 0.85, 0, 0]}>
            <Box size={[0.8, 2.1, 0.6]} position={[0, 1.05, 0]} material={colorMaterial('#b8bcb4', { metalness: 0.3, roughness: 0.5 })} cast />
            <Box size={[0.04, 0.2, 0.02]} position={[0.3, 1.1, 0.31]} material={MAT.darkSteel} />
            <Box size={[0.2, 0.2, 0.01]} position={[0, 1.7, 0.305]} material={colorMaterial('#f5c518')} />
          </group>
        ))}
        <Box size={[4.4, 0.3, 0.4]} position={[1.7, 3.2, 0]} material={MAT.galvanized} />
      </group>
    </group>
  )
}

function ExitDoor({ position, rotation, width = 1.6 }) {
  const door = useMemo(() => colorMaterial('#2f6b4f', { metalness: 0.4, roughness: 0.5 }), [])
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Box size={[width / 2 - 0.02, 2.2, 0.05]} position={[-width / 4, 1.1, 0.03]} material={door} />
      <Box size={[width / 2 - 0.02, 2.2, 0.05]} position={[width / 4, 1.1, 0.03]} material={door} />
      <Box size={[width - 0.1, 0.05, 0.08]} position={[0, 1.05, 0.09]} material={MAT.chrome} />
      <Box size={[width + 0.2, 0.12, 0.1]} position={[0, 2.32, 0.03]} material={MAT.darkSteel} />
      <ExitSign position={[0, 2.7, 0.08]} />
    </group>
  )
}

function LightShafts() {
  const quality = useFactoryStore((s) => s.quality)
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: beamTexture(), transparent: true, opacity: 0.1, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }),
    [],
  )
  if (quality === 'performance') return null
  const shafts = [
    [-15, -15], [-5, -15], [5, -15], [-15, 12], [-35, -15], [35, -18], [25, 18], [-5, 12], [5, 8],
  ]
  return (
    <group>
      {shafts.map(([x, z], i) => (
        <group key={i} position={[x, 4.8, z * 0.95]} rotation={[0.22 * Math.sign(-z), 0, 0.12]}>
          <mesh geometry={GEO.plane} material={mat} scale={[1.6, 9.2, 1]} />
          <mesh geometry={GEO.plane} material={mat} rotation={[0, Math.PI / 2, 0]} scale={[8, 9.2, 1]} />
        </group>
      ))}
      <Sparkles count={160} scale={[40, 6, 36]} position={[-7, 3.5, -8]} size={1.6} speed={0.15} opacity={0.35} color="#fff8e6" noise={0.6} />
      <Sparkles count={70} scale={[18, 6, 40]} position={[-40, 3.5, -8]} size={1.4} speed={0.12} opacity={0.3} color="#fff8e6" />
      <Sparkles count={70} scale={[26, 6, 30]} position={[36, 3.5, -13]} size={1.4} speed={0.12} opacity={0.3} color="#fff8e6" />
    </group>
  )
}

export default function Services() {
  return (
    <group>
      <HighBayLights />
      <OverheadServices />
      <HVLSFan position={[-17, 6.6, -15.5]} />
      <HVLSFan position={[1, 6.6, -15.5]} speed={0.8} />
      <HVLSFan position={[-17, 6.6, -6.5]} speed={1.0} />
      <HVLSFan position={[1, 6.6, -6.5]} speed={0.85} />
      {[-45, -30, -15, 15, 30, 45].map((x) => (
        <ExhaustFan key={x} position={[x, 7.2, -29.85]} rotation={0} />
      ))}
      {[-20, 0, 20].map((z) => (
        <ExhaustFan key={'r' + z} position={[49.85, 7.2, z]} rotation={-Math.PI / 2} />
      ))}
      {/* emergency exits */}
      <ExitDoor position={[-39.5, 0, -29.95]} rotation={0} />
      <ExitDoor position={[9, 0, -29.95]} rotation={0} />
      <ExitDoor position={[19.4, 0, 29.95]} rotation={Math.PI} />
      <ExitDoor position={[-49.95, 0, 20.8]} rotation={Math.PI / 2} />
      <ExitDoor position={[49.95, 0, -7.2]} rotation={-Math.PI / 2} />
      {/* fire safety on interior columns + walls */}
      {[-30, -10, 10, 30].map((x) => (
        <FireExtinguisher key={x} position={[x, 0.4, 13.42]} />
      ))}
      <FireExtinguisher position={[-49.72, 0.4, -12]} rotation={Math.PI / 2} />
      <FireExtinguisher position={[49.72, 0.4, 2]} rotation={-Math.PI / 2} />
      <FireExtinguisher position={[20, 0.4, -29.72]} />
      <FireBucketStand position={[-29, 0, -29.7]} />
      <FireBucketStand position={[26, 0, 29.7]} rotation={Math.PI} />
      {/* signage */}
      <SafetySign kind="helmet" position={[-6, 3.2, 29.7]} rotation={Math.PI} />
      <SafetySign kind="nosmoking" position={[-12.5, 3.2, -29.72]} />
      <SafetySign kind="wet" position={[20, 1.6, 13.34]} />
      <SafetySign kind="helmet" position={[-10.8, 3.2, -29.72]} />
      <SafetySign kind="nosmoking" position={[-49.72, 3.2, -4]} rotation={Math.PI / 2} />
      <SafetySign kind="firstaid" position={[-3.5, 1.7, 29.7]} rotation={Math.PI} size={0.45} />
      <SafetySign kind="nosmoking" position={[49.72, 3.2, -18]} rotation={-Math.PI / 2} />
      <SafetySign kind="caution" position={[0, 1.9, 13.34]} size={0.45} />
      <LightShafts />
    </group>
  )
}
