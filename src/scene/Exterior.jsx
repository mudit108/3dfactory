// Outdoor ground, factory name facade sign, entrance canopy and trees.
import { useMemo } from 'react'
import * as THREE from 'three'
import { ENTRANCE } from '../data/layout'
import { Interactive } from '../components/Interactive'
import { useFactoryStore } from '../hooks/useFactoryStore'
import { Box, Label, TexPlane, Cyl, FloorRect } from '../components/primitives'
import { Tree, Plant } from '../components/Props'
import { MAT, colorMaterial } from './materials'
import { GEO } from './geometries'
import { asphaltTexture, grassTexture, companySignTexture } from './textures'

function Ground() {
  const grass = useMemo(() => new THREE.MeshStandardMaterial({ map: grassTexture([90, 90]), roughness: 1 }), [])
  const asphalt = useMemo(() => new THREE.MeshStandardMaterial({ map: asphaltTexture([30, 20]), roughness: 0.95 }), [])
  const road = useMemo(() => new THREE.MeshStandardMaterial({ map: asphaltTexture([60, 2]), color: '#8a8a8a', roughness: 0.95 }), [])
  const paint = useMemo(() => colorMaterial('#f1f1ea', { roughness: 0.8 }), [])
  const yellow = useMemo(() => colorMaterial('#e3b21c', { roughness: 0.8 }), [])
  return (
    <group>
      <mesh geometry={GEO.plane} material={grass} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} scale={[700, 700, 1]} receiveShadow />
      <mesh geometry={GEO.plane} material={asphalt} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 4]} scale={[140, 80, 1]} receiveShadow />
      <mesh geometry={GEO.plane} material={road} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 50]} scale={[700, 10, 1]} receiveShadow />
      {Array.from({ length: 40 }, (_, i) => (
        <mesh key={i} geometry={GEO.plane} material={paint} rotation={[-Math.PI / 2, 0, 0]} position={[-195 + i * 10, -0.02, 50]} scale={[4, 0.15, 1]} />
      ))}
      {/* entrance walkway */}
      <FloorRect rect={[-3.5, 22.3, 2.5, 40]} width={0.15} material={yellow} y={-0.005} />
    </group>
  )
}

function EntranceFacade() {
  const general = useFactoryStore((st) => st.settings?.general)
  const signTex = useMemo(() => companySignTexture(general?.factoryName, general?.tagline), [general?.factoryName, general?.tagline])
  const canopy = useMemo(() => colorMaterial('#2b3645', { metalness: 0.4, roughness: 0.4 }), [])
  const [o0, o1] = ENTRANCE.opening
  const cx = (o0 + o1) / 2
  const cd = ENTRANCE.canopyDepth
  const slat = useMemo(() => colorMaterial('#5d6873', { metalness: 0.5, roughness: 0.45 }), [])
  return (
    <group>
      {/* company sign board on the front facade */}
      <group position={[cx, 7.05, 22.42]}>
        <Box size={[20.6, 3.35, 0.18]} material={MAT.darkSteel} cast />
        <TexPlane texture={signTex} width={20.2} height={3.15} position={[0, 0, 0.095]} emissive />
        {[-8, -3, 3, 8].map((x) => (
          <Cyl key={x} r={0.06} h={0.9} rotation={[Math.PI / 2, 0, 0]} position={[x, 1.9, 0.5]} material={MAT.darkSteel} low />
        ))}
      </group>
      {/* canopy */}
      <group position={[cx, 5.45, 22 + cd / 2]}>
        <Box size={[o1 - o0 + 3.2, 0.35, cd]} material={canopy} cast />
        <Box size={[o1 - o0 + 3.2, 0.5, 0.1]} position={[0, -0.08, cd / 2]} material={MAT.aluminium} />
        {[-1, 1].map((s) => (
          <Box key={s} size={[0.3, 5.45, 0.3]} position={[s * ((o1 - o0) / 2 + 1.2), -2.72, cd / 2 - 0.3]} material={canopy} cast />
        ))}
        {[-2.4, 0, 2.4].map((x) => (
          <Cyl key={x} r={0.18} h={0.04} position={[x, -0.19, 0]} material={MAT.lampEmissive} low />
        ))}
      </group>
      {/* big sliding doors, parked open beside the opening */}
      {[o0 - (o1 - o0) / 4 - 0.1, o1 + (o1 - o0) / 4 + 0.1].map((x, i) => (
        <group key={i} position={[x, 0, 22.5]}>
          <Box size={[(o1 - o0) / 2, ENTRANCE.height - 0.1, 0.08]} position={[0, ENTRANCE.height / 2, 0]} material={slat} cast />
          {Array.from({ length: 12 }, (_, k) => (
            <Box key={k} size={[(o1 - o0) / 2, 0.03, 0.1]} position={[0, 0.3 + k * 0.42, 0.02]} material={MAT.darkSteel} />
          ))}
        </group>
      ))}
      <Box size={[o1 - o0 + 4, 0.14, 0.2]} position={[cx, ENTRANCE.height + 0.1, 22.55]} material={MAT.darkSteel} />
      <Plant position={[o0 - 1.6, 0, 33.5]} scale={1.6} />
      <Plant position={[o1 + 1.6, 0, 33.5]} scale={1.6} />
      <Label width={1.8} height={0.32} position={[cx, 5.2, 22 + cd + 0.06]} opts={{ width: 600, height: 106, bg: null, lines: [{ text: 'MAIN ENTRANCE', size: 58, color: '#f8fafc', weight: 800, letter: 8 }] }} emissive />
    </group>
  )
}

export default function Exterior() {
  return (
    <group>
      <Ground />
      <Interactive type="entrance" id="entrance" label="Factory information" sub="Company information" view="entrance">
        <EntranceFacade />
      </Interactive>
      {[
        [-70, 34], [-58, 36], [-40, 35], [40, 35], [58, 36], [70, 30],
        [-72, 10], [-72, -12], [-70, -32], [-45, -34], [-15, -35], [15, -34], [45, -35], [70, -32], [72, -10], [72, 12],
      ].map(([x, z], i) => (
        <Tree key={i} position={[x, 0, z]} seed={i + 1} scale={0.9 + (i % 3) * 0.15} />
      ))}
    </group>
  )
}
