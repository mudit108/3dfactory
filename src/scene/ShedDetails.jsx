// Small, lived-in details that make the shed read as a real working factory:
// wall & pedestal fans, distribution boards, a shop-floor shrine, notice
// board, wall clock and drinking water point.
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BUILDING, LOOM_ROWS, LOOM_COLUMNS } from '../data/layout'
import { MAT, colorMaterial, emissiveMaterial } from './materials'
import { GEO, tube } from './geometries'
import { clockTexture, noticeBoardTexture, labelTexture } from './textures'
import { Box, Cyl, RBox, TexPlane } from '../components/primitives'
import { WaterDispenser } from '../components/Props'

const ZB = BUILDING.minZ + 0.12
const ZF = BUILDING.maxZ - 0.12

function FanBlades({ r = 0.32, n = 3, material }) {
  return Array.from({ length: n }, (_, i) => (
    <group key={i} rotation={[0, 0, (i / n) * Math.PI * 2]}>
      <mesh geometry={GEO.box} material={material} position={[0, r / 2 + 0.05, 0]} rotation={[0.35, 0, 0]} scale={[0.16, r, 0.012]} />
    </group>
  ))
}

/** Wall-mounted oscillating fan (very common in Surat weaving sheds). */
function WallFan({ position, rotation = 0, speed = 14, seed = 0 }) {
  const rotor = useRef()
  const head = useRef()
  useFrame((s, dt) => {
    if (rotor.current) rotor.current.rotation.z += dt * speed
    if (head.current) head.current.rotation.y = Math.sin(s.clock.elapsedTime * 0.35 + seed) * 0.6
  })
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Box size={[0.16, 0.22, 0.06]} position={[0, 0, 0.03]} material={MAT.white} />
      <Box size={[0.05, 0.05, 0.3]} position={[0, 0, 0.2]} material={MAT.white} />
      <group ref={head} position={[0, -0.02, 0.36]}>
        <group rotation={[0.45, 0, 0]}>
          <Cyl r={0.08} h={0.2} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.04]} material={MAT.white} low />
          <group ref={rotor} position={[0, 0, 0.18]}>
            <FanBlades material={MAT.white} />
          </group>
          {/* guard */}
          <mesh geometry={GEO.torus} material={MAT.steel} position={[0, 0, 0.18]} scale={[0.76, 0.76, 0.4]} />
          <mesh geometry={GEO.torus} material={MAT.steel} position={[0, 0, 0.18]} rotation={[0, Math.PI / 2, 0]} scale={[0.76, 0.76, 0.4]} />
        </group>
      </group>
    </group>
  )
}

function PedestalFan({ position, rotation = 0, speed = 12, seed = 0 }) {
  const rotor = useRef()
  const head = useRef()
  useFrame((s, dt) => {
    if (rotor.current) rotor.current.rotation.z += dt * speed
    if (head.current) head.current.rotation.y = Math.sin(s.clock.elapsedTime * 0.3 + seed) * 0.7
  })
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Cyl r={0.22} h={0.04} position={[0, 0.02, 0]} material={MAT.black} />
      <Cyl r={0.018} h={1.3} position={[0, 0.67, 0]} material={MAT.chrome} low />
      <group ref={head} position={[0, 1.35, 0]}>
        <Cyl r={0.07} h={0.18} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.06]} material={MAT.black} low />
        <group ref={rotor} position={[0, 0, 0.06]}>
          <FanBlades r={0.24} material={colorMaterial('#5aa0d8', { roughness: 0.4, transparent: true, opacity: 0.85 })} />
        </group>
        <mesh geometry={GEO.torus} material={MAT.steel} position={[0, 0, 0.06]} scale={[0.6, 0.6, 0.4]} />
      </group>
    </group>
  )
}

/** Electrical distribution board at the end of each loom row, fed from the cable tray. */
function DistributionBoard({ position }) {
  const conduit = useMemo(() => tube([[0, 2.0, 0], [0, 3.3, 0], [0.1, 4.0, -0.4], [0.3, 4.15, -0.95]], 0.03, 16, 6), [])
  const door = useMemo(() => colorMaterial('#a9aea6', { metalness: 0.35, roughness: 0.5 }), [])
  return (
    <group position={position}>
      {[-0.45, 0.45].map((x) => (
        <Box key={x} size={[0.06, 2.2, 0.06]} position={[x, 1.1, -0.1]} material={MAT.darkSteel} />
      ))}
      <RBox size={[0.8, 1.0, 0.26]} radius={0.02} position={[0, 1.45, 0]} material={door} cast />
      <Box size={[0.03, 0.18, 0.03]} position={[0.32, 1.45, 0.14]} material={MAT.black} />
      <Box size={[0.18, 0.18, 0.005]} position={[0, 1.78, 0.132]} material={colorMaterial('#f5c518')} />
      <Box size={[0.08, 0.08, 0.006]} position={[0, 1.78, 0.136]} material={MAT.black} />
      {/* indicator lamps */}
      {['#ef4444', '#f59e0b', '#22c55e'].map((c, i) => (
        <Cyl key={c} r={0.018} h={0.02} rotation={[Math.PI / 2, 0, 0]} position={[-0.2 + i * 0.07, 1.2, 0.14]} material={emissiveMaterial(c, 2.5)} low />
      ))}
      <mesh geometry={conduit} material={MAT.galvanized} />
    </group>
  )
}

/** Small shop-floor shrine — almost every Indian factory has one near the entrance. */
function Shrine({ position, rotation = 0 }) {
  const flame = useRef()
  const plaque = useMemo(
    () => labelTexture({
      width: 256, height: 320, bg: '#7a1d10', radius: 6,
      lines: [
        { text: 'शुभ', size: 70, color: '#ffd166', y: 120, weight: 800 },
        { text: 'लाभ', size: 70, color: '#ffd166', y: 220, weight: 800 },
      ],
    }),
    [],
  )
  useFrame((s) => {
    if (!flame.current) return
    const t = s.clock.elapsedTime
    flame.current.scale.y = 1 + Math.sin(t * 17) * 0.15 + Math.sin(t * 7.3) * 0.1
  })
  const marigold = colorMaterial('#f28c18', { roughness: 0.8 })
  // garland drapes from the top corners of the frame
  const garland = useMemo(() => {
    const pts = []
    for (let i = 0; i <= 16; i++) {
      const u = i / 16
      const x = -0.27 + u * 0.54
      const sag = Math.sin(u * Math.PI) * 0.13
      pts.push([x, 1.93 - sag, 0.08 + Math.sin(u * Math.PI) * 0.02])
    }
    return tube(pts, 0.028, 40, 6)
  }, [])
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* wall shelf + red cloth */}
      <Box size={[1.1, 0.05, 0.42]} position={[0, 1.2, 0.21]} material={MAT.wood} cast />
      <Box size={[1.12, 0.012, 0.44]} position={[0, 1.232, 0.21]} material={colorMaterial('#b3121d', { roughness: 0.85 })} />
      <Box size={[1.12, 0.16, 0.01]} position={[0, 1.16, 0.43]} material={colorMaterial('#b3121d', { roughness: 0.85 })} />
      {/* framed plaque */}
      <Box size={[0.52, 0.64, 0.04]} position={[0, 1.6, 0.04]} material={MAT.brass} />
      <TexPlane texture={plaque} width={0.44} height={0.55} position={[0, 1.6, 0.065]} />
      {/* marigold garland */}
      <mesh geometry={garland} material={marigold} />
      {/* brass diya with flame */}
      <Cyl r={0.05} h={0.03} position={[-0.25, 1.255, 0.25]} material={MAT.brass} low />
      <group ref={flame} position={[-0.25, 1.29, 0.25]}>
        <mesh geometry={GEO.cone} scale={[0.025, 0.06, 0.025]} position={[0, 0.03, 0]} material={emissiveMaterial('#ffb547', 6)} />
      </group>
      {/* incense holder + coconut + flowers */}
      <Cyl r={0.004} h={0.2} position={[0.22, 1.34, 0.22]} rotation={[0, 0, 0.2]} material={colorMaterial('#5b2a12')} low />
      <mesh geometry={GEO.sphereLow} scale={0.11} position={[0.05, 1.29, 0.24]} material={colorMaterial('#6b4423', { roughness: 0.95 })} />
      {[-0.1, 0.32, 0.38].map((x, i) => (
        <mesh key={i} geometry={GEO.sphereLow} scale={0.05} position={[x, 1.26, 0.33]} material={marigold} />
      ))}
    </group>
  )
}

function WallClock({ position, rotation = 0 }) {
  const hour = useRef()
  const minute = useRef()
  const tex = useMemo(() => clockTexture(), [])
  useFrame(() => {
    const d = new Date()
    const m = d.getMinutes() + d.getSeconds() / 60
    const h = (d.getHours() % 12) + m / 60
    if (minute.current) minute.current.rotation.z = -(m / 60) * Math.PI * 2
    if (hour.current) hour.current.rotation.z = -(h / 12) * Math.PI * 2
  })
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Cyl r={0.3} h={0.05} rotation={[Math.PI / 2, 0, 0]} material={MAT.black} />
      <TexPlane texture={tex} width={0.56} height={0.56} position={[0, 0, 0.027]} />
      <group ref={hour} position={[0, 0, 0.032]}>
        <Box size={[0.025, 0.15, 0.006]} position={[0, 0.07, 0]} material={MAT.black} />
      </group>
      <group ref={minute} position={[0, 0, 0.036]}>
        <Box size={[0.018, 0.22, 0.006]} position={[0, 0.1, 0]} material={MAT.black} />
      </group>
    </group>
  )
}

function NoticeBoard({ position, rotation = 0, title }) {
  const tex = useMemo(() => noticeBoardTexture(title), [title])
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Box size={[1.6, 1.08, 0.04]} material={MAT.wood} />
      <TexPlane texture={tex} width={1.5} height={1.0} position={[0, 0, 0.022]} />
    </group>
  )
}

/** Hanging yarn-waste bins & cleaning brooms near the looms. */
function WasteBin({ position }) {
  const bag = useMemo(() => colorMaterial('#3a6fb0', { roughness: 0.8 }), [])
  return (
    <group position={position}>
      <Cyl r={0.26} h={0.62} position={[0, 0.31, 0]} material={bag} cast />
      <mesh geometry={GEO.sphereLow} scale={[0.46, 0.18, 0.46]} position={[0, 0.63, 0]} material={MAT.offWhite} />
    </group>
  )
}

export default function ShedDetails() {
  const wallFansBack = [-30, -20, -10, 0, 10, 20]
  const wallFansFront = [-30, -20, -12, 12, 20]
  return (
    <group>
      {wallFansBack.map((x, i) => (
        <WallFan key={'b' + x} position={[x + 2.2, 3.4, ZB]} seed={i * 1.3} speed={13 + (i % 3)} />
      ))}
      {wallFansFront.map((x, i) => (
        <WallFan key={'f' + x} position={[x + 2.2, 3.4, ZF]} rotation={Math.PI} seed={i * 0.9 + 2} speed={12 + (i % 4)} />
      ))}
      {/* pedestal fans between looms, beside the operators */}
      {[[1, 0], [4, 1], [6, 2], [2, 3], [7, 0]].map(([c, r], i) => (
        <PedestalFan key={i} position={[LOOM_COLUMNS[c] + 2.8, 0, LOOM_ROWS[r] + 1.5]} rotation={Math.PI + (i % 2 ? 0.5 : -0.5)} seed={i} />
      ))}
      {/* distribution boards at the left end of every loom row */}
      {LOOM_ROWS.map((z) => (
        <DistributionBoard key={z} position={[LOOM_COLUMNS[0] - 3.1, 0, z - 0.6]} />
      ))}
      {/* waste bins */}
      {LOOM_ROWS.map((z, i) => (
        <WasteBin key={'w' + z} position={[LOOM_COLUMNS[3 + (i % 3) * 2] + 2.8, 0, z - 1.0]} />
      ))}
      {/* entrance wall: shrine, clock, notice board, water point */}
      <Shrine position={[7.2, 0, ZF - 0.02]} rotation={Math.PI} />
      <WallClock position={[-0.5, 6.0, ZF - 0.04]} rotation={Math.PI} />
      <NoticeBoard position={[-8.6, 1.75, ZF - 0.04]} rotation={Math.PI} title="PRODUCTION BOARD" />
      <NoticeBoard position={[-10.6, 1.75, ZF - 0.04]} rotation={Math.PI} title="SHIFT ROSTER" />
      <WaterDispenser position={[10.2, 0, ZF - 0.45]} rotation={Math.PI} />
    </group>
  )
}
