// Visualises "every part of the factory is connected":
//  • animated floor chevrons for the material flow (Yarn → … → Dispatch)
//  • glowing EMS data links from every zone to Accounts and the Manager
import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Line } from '@react-three/drei'
import * as THREE from 'three'
import { FLOW_SEGMENTS, DATA_HUBS } from '../data/layout'
import { useFactoryStore } from '../hooks/useFactoryStore'
import { GEO } from './geometries'
import { chevronTexture, glowTexture } from './textures'
import { Label } from '../components/primitives'

const dummy = new THREE.Object3D()
const SPACING = 1.5

function polyInfo(points) {
  const segs = []
  let total = 0
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, az] = points[i]
    const [bx, bz] = points[i + 1]
    const len = Math.hypot(bx - ax, bz - az)
    segs.push({ ax, az, bx, bz, len, start: total, yaw: Math.atan2(bx - ax, bz - az) })
    total += len
  }
  return { segs, total }
}

function FlowSegment({ points, color }) {
  const ref = useRef()
  const info = useMemo(() => polyInfo(points), [points])
  const count = Math.max(1, Math.floor(info.total / SPACING))
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: chevronTexture(), color, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 }),
    [color],
  )
  const laneMat = useMemo(() => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.13, depthWrite: false }), [color])
  useFrame((state) => {
    const off = (state.clock.elapsedTime * 1.2) % SPACING
    for (let i = 0; i < count; i++) {
      const d = i * SPACING + off
      const s = info.segs.find((q) => d <= q.start + q.len) || info.segs[info.segs.length - 1]
      const k = Math.min(1, (d - s.start) / s.len)
      dummy.position.set(s.ax + (s.bx - s.ax) * k, 0.03, s.az + (s.bz - s.az) * k)
      dummy.rotation.set(-Math.PI / 2, 0, s.yaw - Math.PI / 2)
      // fade in/out at ends
      const edge = Math.min(d, info.total - d)
      dummy.scale.setScalar(Math.min(1, Math.max(0.01, edge / 1.2)) * 0.8)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    }
    ref.current.instanceMatrix.needsUpdate = true
  })
  useLayoutEffect(() => {
    ref.current.frustumCulled = false
  }, [])
  return (
    <group>
      <instancedMesh ref={ref} args={[GEO.plane, mat, count]} />
      {info.segs.map((s, i) => (
        <mesh
          key={i}
          geometry={GEO.plane}
          material={laneMat}
          position={[(s.ax + s.bx) / 2, 0.02, (s.az + s.bz) / 2]}
          rotation={[-Math.PI / 2, 0, s.yaw]}
          scale={[1.0, s.len + 1.0, 1]}
        />
      ))}
    </group>
  )
}

const STAGE_LABELS = [
  { n: 1, text: 'YARN', color: '#60a5fa', at: [-36.5, 7.5] },
  { n: 2, text: 'WEAVING', color: '#34d399', at: [-27, -3] },
  { n: 3, text: 'INSPECTION', color: '#a78bfa', at: [15, -6.5] },
  { n: 4, text: 'FINISHED GOODS', color: '#fbbf24', at: [30, -6.5] },
  { n: 5, text: 'DISPATCH', color: '#fb923c', at: [40.5, 14] },
]

function StageMarker({ n, text, color, at }) {
  const opts = useMemo(
    () => ({
      width: 512, height: 112, bg: 'rgba(10,15,24,0.85)', radius: 56, border: color, borderWidth: 6,
      lines: [
        { text: String(n), size: 60, color, weight: 800, x: 58, align: 'center', y: 58 },
        { text, size: 44, color: '#f8fafc', weight: 800, x: 112, align: 'left', y: 58, letter: 3 },
      ],
    }),
    [n, text, color],
  )
  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, toneMapped: false, depthWrite: false }), [color])
  return (
    <group position={[at[0], 0, at[1]]}>
      <mesh geometry={GEO.ring} material={ringMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 0]} scale={0.9} />
      <Billboard position={[0, 3.1, 0]}>
        <Label width={2.2} height={0.48} opts={opts} emissive />
      </Billboard>
      <mesh geometry={GEO.box} material={ringMat} position={[0, 1.45, 0]} scale={[0.02, 2.9, 0.02]} />
    </group>
  )
}

function DataLink({ from, to, color = '#38bdf8', speed = 0.25, phase = 0 }) {
  const curve = useMemo(() => {
    const a = new THREE.Vector3(...from)
    const b = new THREE.Vector3(...to)
    const mid = a.clone().lerp(b, 0.5)
    mid.y = Math.max(a.y, b.y) + a.distanceTo(b) * 0.12 + 2
    return new THREE.QuadraticBezierCurve3(a, mid, b)
  }, [from, to])
  const points = useMemo(() => curve.getPoints(40), [curve])
  const pulse = useRef()
  const pulseMat = useMemo(
    () => new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: true }),
    [color],
  )
  useFrame((state) => {
    const t = (state.clock.elapsedTime * speed + phase) % 1
    curve.getPoint(t, pulse.current.position)
  })
  return (
    <group>
      <Line points={points} color={color} lineWidth={1.4} transparent opacity={0.35} dashed dashSize={0.8} gapSize={0.5} />
      <sprite ref={pulse} material={pulseMat} scale={0.7} />
    </group>
  )
}

function HubNode({ position, color }) {
  const ref = useRef()
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2.5, toneMapped: false }), [color])
  const geo = useMemo(() => new THREE.OctahedronGeometry(0.28, 0), [])
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.8
      ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 1.5) * 0.12
    }
  })
  return <mesh ref={ref} geometry={geo} material={mat} position={position} />
}

export default function FlowPaths() {
  const show = useFactoryStore((s) => s.showFlow)
  if (!show) return null
  const hubs = DATA_HUBS
  const links = [
    ['yarn', 'accounts'], ['production', 'accounts'], ['finished', 'accounts'], ['dispatch', 'accounts'], ['inspection', 'accounts'],
    ['yarn', 'manager'], ['production', 'manager'], ['finished', 'manager'], ['dispatch', 'manager'], ['accounts', 'manager'],
  ]
  return (
    <group>
      {FLOW_SEGMENTS.map((s) => (
        <FlowSegment key={s.stage} points={s.points} color={s.color} />
      ))}
      {STAGE_LABELS.map((s) => (
        <StageMarker key={s.n} {...s} />
      ))}
      {links.map(([a, b], i) => (
        <DataLink key={a + b} from={hubs[a]} to={hubs[b]} color={b === 'accounts' ? '#f472b6' : '#22d3ee'} phase={i * 0.13} speed={0.18 + (i % 3) * 0.04} />
      ))}
      {Object.entries(hubs).map(([k, p]) => (
        <HubNode key={k} position={p} color={k === 'accounts' ? '#f472b6' : k === 'manager' ? '#22d3ee' : '#7dd3fc'} />
      ))}
    </group>
  )
}
