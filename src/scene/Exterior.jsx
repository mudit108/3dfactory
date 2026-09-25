// Outdoor compound, entrance facade & gate, dispatch dock and truck.
import { useMemo } from 'react'
import * as THREE from 'three'
import { ENTRANCE, DISPATCH, COMPOUND } from '../data/layout'
import { useFactoryStore } from '../hooks/useFactoryStore'
import { Interactive } from '../components/Interactive'
import { Box, Label, TexPlane, Cyl, FloorRect } from '../components/primitives'
import { Truck, Car } from '../components/Vehicles'
import { RollStack, CartonStack, BaleStack, Tree, Plant, TrafficCone, Pallet } from '../components/Props'
import { MAT, colorMaterial, emissiveMaterial } from './materials'
import { GEO } from './geometries'
import { asphaltTexture, grassTexture, companySignTexture, hazardTexture } from './textures'
import { ZoneBanner } from './ProductionZone'

function Ground() {
  const grass = useMemo(() => new THREE.MeshStandardMaterial({ map: grassTexture([90, 90]), roughness: 1 }), [])
  const asphalt = useMemo(() => new THREE.MeshStandardMaterial({ map: asphaltTexture([30, 20]), roughness: 0.95 }), [])
  const road = useMemo(() => new THREE.MeshStandardMaterial({ map: asphaltTexture([60, 2]), color: '#8a8a8a', roughness: 0.95 }), [])
  const paint = useMemo(() => colorMaterial('#f1f1ea', { roughness: 0.8 }), [])
  const yellow = useMemo(() => colorMaterial('#e3b21c', { roughness: 0.8 }), [])
  return (
    <group>
      <mesh geometry={GEO.plane} material={grass} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} scale={[700, 700, 1]} receiveShadow />
      <mesh geometry={GEO.plane} material={asphalt} rotation={[-Math.PI / 2, 0, 0]} position={[2.5, -0.02, 3.5]} scale={[155, 97, 1]} receiveShadow />
      <mesh geometry={GEO.plane} material={road} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 60]} scale={[700, 10, 1]} receiveShadow />
      {Array.from({ length: 40 }, (_, i) => (
        <mesh key={i} geometry={GEO.plane} material={paint} rotation={[-Math.PI / 2, 0, 0]} position={[-195 + i * 10, -0.02, 60]} scale={[4, 0.15, 1]} />
      ))}
      {/* visitor parking bays */}
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={'p' + i} geometry={GEO.plane} material={paint} rotation={[-Math.PI / 2, 0, 0]} position={[8 + i * 3, -0.01, 40.5]} scale={[0.12, 5, 1]} />
      ))}
      {/* entrance walkway */}
      <FloorRect rect={[-11, 30.3, -2, 48]} width={0.15} material={yellow} y={-0.005} />
      {/* truck yard markings */}
      <FloorRect rect={[50.6, 10.4, 64, 17.6]} width={0.15} material={yellow} y={-0.005} />
    </group>
  )
}

function CompoundWall() {
  const wall = useMemo(() => colorMaterial('#d8d0bd', { roughness: 0.95 }), [])
  const band = useMemo(() => colorMaterial('#7a8490', { roughness: 0.8 }), [])
  const z = COMPOUND.gateZ
  const [g0, g1] = COMPOUND.gateOpening
  const runs = [
    { a: [-78, z], b: [g0, z] },
    { a: [g1, z], b: [78, z] },
    { a: [-78, -45], b: [78, -45] },
    { a: [-78, -45], b: [-78, z] },
    { a: [78, -45], b: [78, z] },
  ]
  return (
    <group>
      {runs.map(({ a, b }, i) => {
        const len = Math.hypot(b[0] - a[0], b[1] - a[1])
        const ang = Math.atan2(b[1] - a[1], b[0] - a[0])
        return (
          <group key={i} position={[(a[0] + b[0]) / 2, 0, (a[1] + b[1]) / 2]} rotation={[0, -ang, 0]}>
            <Box size={[len, 2.2, 0.25]} position={[0, 1.1, 0]} material={wall} cast receive />
            <Box size={[len, 0.12, 0.35]} position={[0, 2.26, 0]} material={band} />
            <Box size={[len, 0.3, 0.27]} position={[0, 0.15, 0]} material={band} />
          </group>
        )
      })}
      {/* gate pillars */}
      {[g0, g1].map((x) => (
        <group key={x} position={[x, 0, z]}>
          <Box size={[0.9, 3.2, 0.9]} position={[0, 1.6, 0]} material={wall} cast />
          <Box size={[1.0, 0.18, 1.0]} position={[0, 3.29, 0]} material={band} />
          <Cyl r={0.18} h={0.25} position={[0, 3.5, 0]} material={emissiveMaterial('#fff3d6', 1.5)} low />
        </group>
      ))}
      <Label width={2.6} height={0.62} position={[g0, 2.4, z + 0.47]} opts={{ width: 700, height: 168, bg: '#152238', radius: 8, stripe: '#c8962e', lines: [{ text: 'SHREE SATIJI', size: 64, color: '#f3d27a', weight: 800, y: 62 }, { text: 'TEXTILES', size: 44, color: '#e2e8f0', weight: 700, y: 124, letter: 10 }] }} />
      {/* sliding gate (open) */}
      <group position={[g0 - 6.2, 0, z - 0.5]}>
        <Box size={[11.5, 0.08, 0.08]} position={[0, 1.9, 0]} material={MAT.darkSteel} />
        <Box size={[11.5, 0.08, 0.08]} position={[0, 0.2, 0]} material={MAT.darkSteel} />
        {Array.from({ length: 46 }, (_, i) => (
          <Box key={i} size={[0.04, 1.8, 0.04]} position={[-5.7 + i * 0.25, 1.05, 0]} material={MAT.darkSteel} />
        ))}
      </group>
      {/* boom barrier */}
      <group position={[g1 - 0.6, 0, z + 1.4]}>
        <Box size={[0.4, 1.0, 0.4]} position={[0, 0.5, 0]} material={MAT.yellow} />
        <group position={[0, 0.95, 0]} rotation={[0, 0, 1.2]}>
          <Box size={[10, 0.08, 0.08]} position={[-5, 0, 0]} material={colorMaterial('#e5e5e5')} />
          {Array.from({ length: 5 }, (_, i) => (
            <Box key={i} size={[1, 0.085, 0.085]} position={[-1.5 - i * 2, 0, 0]} material={MAT.red} />
          ))}
        </group>
      </group>
      {/* guard cabin */}
      <group position={[2.8, 0, z - 2.2]}>
        <Box size={[3, 2.7, 2.4]} position={[0, 1.35, 0]} material={wall} cast />
        <Box size={[3.4, 0.2, 2.8]} position={[0, 2.8, 0]} material={band} />
        <mesh geometry={GEO.plane} material={MAT.tintedGlass} position={[0, 1.6, 1.21]} scale={[2.2, 0.9, 1]} />
        <mesh geometry={GEO.plane} material={MAT.tintedGlass} position={[-1.51, 1.6, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[1.6, 0.9, 1]} />
        <Label width={1.5} height={0.3} position={[0, 2.35, 1.215]} opts={{ width: 500, height: 100, bg: '#1e3a5f', radius: 6, lines: [{ text: 'SECURITY', size: 56, color: '#fff', weight: 800, letter: 8 }] }} />
      </group>
    </group>
  )
}

function EntranceFacade() {
  const signTex = useMemo(() => companySignTexture(), [])
  const canopy = useMemo(() => colorMaterial('#2b3645', { metalness: 0.4, roughness: 0.4 }), [])
  const [o0, o1] = ENTRANCE.opening
  const cx = (o0 + o1) / 2
  const cd = ENTRANCE.canopyDepth
  const slat = useMemo(() => colorMaterial('#5d6873', { metalness: 0.5, roughness: 0.45 }), [])
  return (
    <group>
      {/* company sign board on the front facade */}
      <group position={[cx, 7.05, 30.42]}>
        <Box size={[20.6, 3.35, 0.18]} material={MAT.darkSteel} cast />
        <TexPlane texture={signTex} width={20.2} height={3.15} position={[0, 0, 0.095]} emissive />
        {[-8, -3, 3, 8].map((x) => (
          <Cyl key={x} r={0.06} h={0.9} rotation={[Math.PI / 2, 0, 0]} position={[x, 1.9, 0.5]} material={MAT.darkSteel} low />
        ))}
      </group>
      {/* canopy */}
      <group position={[cx, 5.45, 30 + cd / 2]}>
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
        <group key={i} position={[x, 0, 30.5]}>
          <Box size={[(o1 - o0) / 2, ENTRANCE.height - 0.1, 0.08]} position={[0, ENTRANCE.height / 2, 0]} material={slat} cast />
          {Array.from({ length: 12 }, (_, k) => (
            <Box key={k} size={[(o1 - o0) / 2, 0.03, 0.1]} position={[0, 0.3 + k * 0.42, 0.02]} material={MAT.darkSteel} />
          ))}
        </group>
      ))}
      <Box size={[o1 - o0 + 4, 0.14, 0.2]} position={[cx, ENTRANCE.height + 0.1, 30.55]} material={MAT.darkSteel} />
      <Plant position={[o0 - 1.6, 0, 33.5]} scale={1.6} />
      <Plant position={[o1 + 1.6, 0, 33.5]} scale={1.6} />
      <Label width={1.8} height={0.32} position={[cx, 5.2, 30 + cd + 0.06]} opts={{ width: 600, height: 106, bg: null, lines: [{ text: 'MAIN ENTRANCE', size: 58, color: '#f8fafc', weight: 800, letter: 8 }] }} emissive />
    </group>
  )
}

function DispatchDock({ truck }) {
  const P = DISPATCH.platform
  const R = DISPATCH.ramp
  const concrete = useMemo(() => colorMaterial('#9d9a92', { roughness: 0.9 }), [])
  const hazard = useMemo(() => new THREE.MeshStandardMaterial({ map: hazardTexture([30, 1]), roughness: 0.6 }), [])
  const rampLen = Math.hypot(R.maxX - R.minX, P.height)
  const rampAng = Math.atan2(P.height, R.maxX - R.minX)
  const yellow = useMemo(() => colorMaterial('#e3b21c', { roughness: 0.8 }), [])
  return (
    <group>
      {/* dock platform */}
      <Box size={[P.maxX - P.minX, P.height, P.maxZ - P.minZ]} position={[(P.minX + P.maxX) / 2, P.height / 2, (P.minZ + P.maxZ) / 2]} material={concrete} cast receive />
      <mesh geometry={GEO.plane} material={hazard} position={[P.minX - 0.005, P.height - 0.08, (P.minZ + R.minZ) / 2]} rotation={[0, -Math.PI / 2, 0]} scale={[R.minZ - P.minZ, 0.16, 1]} />
      {/* ramp */}
      <Box size={[rampLen, 0.12, R.maxZ - R.minZ]} position={[(R.minX + R.maxX) / 2, P.height / 2 - 0.02, (R.minZ + R.maxZ) / 2]} rotation={[0, 0, rampAng]} material={MAT.grating} cast />
      {/* edge railing */}
      {Array.from({ length: 7 }, (_, i) => (
        <Box key={i} size={[0.05, 1.0, 0.05]} position={[P.minX + 0.05, P.height + 0.5, P.minZ + 0.2 + i * ((R.minZ - P.minZ - 0.4) / 6)]} material={MAT.yellow} />
      ))}
      <Box size={[0.05, 0.05, R.minZ - P.minZ - 0.2]} position={[P.minX + 0.05, P.height + 1.0, (P.minZ + R.minZ) / 2]} material={MAT.yellow} />
      <Box size={[0.04, 0.04, R.minZ - P.minZ - 0.2]} position={[P.minX + 0.05, P.height + 0.5, (P.minZ + R.minZ) / 2]} material={MAT.yellow} />
      {/* dock leveller + bumpers + shutter */}
      <Box size={[0.9, 0.05, 2.4]} position={[50.2, P.height - 0.02, 14]} material={MAT.galvanized} />
      {[12.5, 15.5].map((z) => (
        <Box key={z} size={[0.18, 0.4, 0.3]} position={[50.35, P.height - 0.3, z]} material={MAT.rubber} />
      ))}
      <Box size={[0.6, 0.6, 6.4]} position={[49.95, DISPATCH.door.height + 0.3, 14]} material={MAT.galvanized} />
      <Box size={[0.2, DISPATCH.door.height, 0.14]} position={[49.95, DISPATCH.door.height / 2, DISPATCH.door.minZ - 0.07]} material={MAT.yellow} />
      <Box size={[0.2, DISPATCH.door.height, 0.14]} position={[49.95, DISPATCH.door.height / 2, DISPATCH.door.maxZ + 0.07]} material={MAT.yellow} />
      <Cyl r={0.08} h={0.1} rotation={[0, 0, Math.PI / 2]} position={[49.8, DISPATCH.door.height + 0.9, 17.6]} material={emissiveMaterial('#22c55e', 4)} low />
      {/* staging on platform */}
      <RollStack position={[46.4, P.height, 20.9]} rows={5} layers={4} colors={['#e8e6df', '#d9d2c1']} seed={41} />
      <RollStack position={[46.4, P.height, 18.9]} rows={5} layers={3} colors={['#28324a']} seed={42} />
      <RollStack position={[48.6, P.height, 8.4]} rotation={Math.PI / 2} rows={4} layers={3} colors={['#1f2124', '#3b3f45']} seed={43} />
      <CartonStack position={[46.3, P.height, 8.4]} ny={2} seed={44} />
      {/* floor staging bays */}
      {[[27, 7], [31, 7], [35, 7], [27, 24], [31, 24], [35, 24]].map(([x, z], i) => (
        <group key={i}>
          <FloorRect rect={[x - 1.6, z - 1.6, x + 1.6, z + 1.6]} width={0.08} material={yellow} y={0.013} />
          {i % 3 === 0 && <RollStack position={[x, 0, z]} rows={4} layers={3} colors={['#e8e6df', '#8fb3cf']} seed={50 + i} />}
          {i % 3 === 1 && <BaleStack position={[x, 0, z]} n={4} />}
          {i % 3 === 2 && <CartonStack position={[x, 0, z]} ny={3} seed={60 + i} wrap />}
          <Label width={0.9} height={0.24} position={[x, 0.016, z + 1.95]} rotation={[-Math.PI / 2, 0, 0]} opts={{ width: 300, height: 80, bg: null, lines: [{ text: `BAY D${i + 1}`, size: 54, color: '#e3b21c', weight: 800 }] }} />
        </group>
      ))}
      {/* order board */}
      <group position={[33.5, 0, 15.8]}>
        <Box size={[0.06, 2.1, 0.06]} position={[-0.9, 1.05, 0]} material={MAT.darkSteel} />
        <Box size={[0.06, 2.1, 0.06]} position={[0.9, 1.05, 0]} material={MAT.darkSteel} />
        <Label width={2.0} height={1.1} position={[0, 1.7, 0.04]} opts={{ width: 600, height: 330, bg: '#0f172a', radius: 12, lines: [
          { text: 'TODAY’S DISPATCH', size: 44, color: '#fb923c', weight: 800, y: 50 },
          { text: 'SO-0487  Bhiwandi   LOADING', size: 30, color: '#e2e8f0', weight: 600, y: 120 },
          { text: 'SO-0488  Kanha Sarees  16:00', size: 30, color: '#e2e8f0', weight: 600, y: 175 },
          { text: 'SO-0491  BagLine    TOMORROW', size: 30, color: '#94a3b8', weight: 600, y: 230 },
          { text: 'Rolls loaded 42 / 60', size: 30, color: '#fbbf24', weight: 700, y: 290 },
        ] }} />
        <Label width={2.0} height={1.1} position={[0, 1.7, -0.04]} rotation={[0, Math.PI, 0]} opts={{ width: 600, height: 330, bg: '#0f172a', radius: 12, lines: [{ text: 'DISPATCH', size: 80, color: '#fb923c', weight: 800 }] }} />
      </group>
      <ZoneBanner text="DISPATCH" sub="LOADING BAY 1" position={[41, 5.8, 14]} width={5} accent="#fb923c" rotation={-Math.PI / 2} />

      {/* truck outside the dock */}
      <Interactive type="truck" id="truck" label={`Truck ${truck?.number ?? ''}`} sub={truck ? `Loading · ${truck.rollsLoaded}/${truck.rollsTotal} rolls` : ''} position={DISPATCH.truck.position}>
        <Truck rollsLoaded={truck?.rollsLoaded ?? 42} rollsTotal={truck?.rollsTotal ?? 60} />
      </Interactive>
      <TrafficCone position={[51.2, 0, 9.8]} />
      <TrafficCone position={[51.2, 0, 18.2]} />
      {/* wheel chocks */}
      <Box size={[0.3, 0.2, 0.25]} position={[51.2, 0.1, 15.2]} material={MAT.yellow} />
    </group>
  )
}

export default function Exterior() {
  const truck = useFactoryStore((s) => s.dispatch?.truck)
  return (
    <group>
      <Ground />
      <CompoundWall />
      <Interactive type="entrance" id="entrance" label="Main Entrance — Shree Satiji Textiles" sub="Company & visitor information" view="entrance">
        <EntranceFacade />
      </Interactive>
      <DispatchDock truck={truck} />
      {/* parked cars (visitor parking) */}
      <Car position={[9.5, 0, 40.5]} rotation={Math.PI / 2} color="#b9c0c7" />
      <Car position={[15.5, 0, 40.5]} rotation={Math.PI / 2} color="#7a1f2b" />
      <Car position={[21.5, 0, 40.5]} rotation={-Math.PI / 2} color="#2c3440" />
      {/* spare empty pallets outside */}
      {[0, 1, 2, 3, 4].map((i) => (
        <Pallet key={i} position={[56, i * 0.145, 24]} />
      ))}
      {/* trees */}
      {[
        [-70, 44], [-60, 45], [-48, 44], [-30, 45], [30, 45], [45, 44], [60, 45], [72, 40],
        [-72, 20], [-72, 0], [-72, -20], [-70, -38], [-50, -40], [-20, -40], [10, -40], [40, -40], [70, -38], [72, -15], [72, 32],
      ].map(([x, z], i) => (
        <Tree key={i} position={[x, 0, z]} seed={i + 1} scale={0.9 + (i % 3) * 0.15} />
      ))}
    </group>
  )
}
