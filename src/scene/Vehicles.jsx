// Moving material-handling traffic: a forklift shuttling yarn pallets in the
// yarn store and a warp-beam trolley being pushed along the loom aisle.
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MAT, colorMaterial, emissiveMaterial } from './materials'
import { Box, Cyl, CylX } from '../components/primitives'
import { Forklift } from '../components/Props'
import { Worker } from '../components/Worker'

function lerpAngle(a, b, k) {
  let d = b - a
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return a + d * k
}

/**
 * Moves its children back and forth along a polyline at walking/driving pace,
 * easing in/out at the ends. `reverse` = drive backwards on the way back
 * (like a forklift) instead of turning round.
 */
function PathMover({ path, speed = 1, pause = 3, reverse = false, offset = 0, stateRef, children }) {
  const ref = useRef()
  const info = useMemo(() => {
    const seg = []
    let total = 0
    for (let i = 0; i < path.length - 1; i++) {
      const [x0, z0] = path[i]
      const [x1, z1] = path[i + 1]
      const len = Math.hypot(x1 - x0, z1 - z0)
      seg.push({ x0, z0, x1, z1, len, start: total, yaw: Math.atan2(x1 - x0, z1 - z0) })
      total += len
    }
    return { seg, total }
  }, [path])
  const st = useRef({ d: offset * info.total, dir: 1, wait: 0, yaw: info.seg[0].yaw })
  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05)
    const s = st.current
    let moving = false
    if (s.wait > 0) s.wait -= dt
    else {
      const toEnd = s.dir === 1 ? info.total - s.d : s.d
      const fromStart = s.dir === 1 ? s.d : info.total - s.d
      const v = speed * Math.min(1, 0.2 + Math.min(toEnd, fromStart) / 2)
      s.d += s.dir * v * dt
      moving = true
      if (s.d >= info.total) {
        s.d = info.total
        s.dir = -1
        s.wait = pause
      } else if (s.d <= 0) {
        s.d = 0
        s.dir = 1
        s.wait = pause
      }
    }
    const g = info.seg.find((q) => s.d <= q.start + q.len + 1e-6) || info.seg[info.seg.length - 1]
    const k = (s.d - g.start) / g.len
    const target = reverse || s.dir === 1 ? g.yaw : g.yaw + Math.PI
    // turn on the spot while paused at the ends
    s.yaw = lerpAngle(s.yaw, target, Math.min(1, dt * (s.wait > 0 ? 1.4 : 3)))
    if (ref.current) {
      ref.current.position.set(g.x0 + (g.x1 - g.x0) * k, 0, g.z0 + (g.z1 - g.z0) * k)
      ref.current.rotation.y = s.yaw
    }
    if (stateRef) stateRef.current = { moving, dir: s.dir, reversing: reverse && s.dir === -1 && moving }
  })
  return <group ref={ref}>{children}</group>
}

/** Yellow warp-beam trolley with a fresh beam (beam axis along travel). */
function BeamTrolley() {
  const warp = useMemo(() => colorMaterial('#f1eee6', { roughness: 0.6 }), [])
  return (
    <group>
      <Box size={[0.7, 0.07, 2.4]} position={[0, 0.26, 0]} material={MAT.yellow} cast />
      {[-1.05, 1.05].map((z) => (
        <group key={z}>
          <Box size={[0.07, 0.6, 0.07]} position={[0, 0.58, z]} material={MAT.yellow} />
          {[-0.28, 0.28].map((x) => (
            <Cyl key={x} r={0.08} h={0.06} rotation={[0, 0, Math.PI / 2]} position={[x, 0.08, z]} material={MAT.rubber} low />
          ))}
        </group>
      ))}
      {/* push handle */}
      <Box size={[0.07, 0.8, 0.07]} position={[-0.3, 0.65, -1.2]} rotation={[-0.25, 0, 0]} material={MAT.yellow} />
      <Box size={[0.07, 0.8, 0.07]} position={[0.3, 0.65, -1.2]} rotation={[-0.25, 0, 0]} material={MAT.yellow} />
      <Box size={[0.7, 0.05, 0.05]} position={[0, 1.02, -1.3]} material={MAT.rubber} />
      {/* beam */}
      <group position={[0, 0.82, 0]} rotation={[0, Math.PI / 2, 0]}>
        <CylX r={0.05} h={2.9} material={MAT.steel} />
        <CylX r={0.33} h={2.4} material={warp} cast />
        <CylX r={0.4} h={0.035} position={[-1.22, 0, 0]} material={MAT.galvanized} />
        <CylX r={0.4} h={0.035} position={[1.22, 0, 0]} material={MAT.galvanized} />
      </group>
    </group>
  )
}

function FlashingBeacon({ position, stateRef }) {
  const ref = useRef()
  useFrame((s) => {
    if (!ref.current) return
    const moving = stateRef.current?.moving
    ref.current.visible = moving && Math.sin(s.clock.elapsedTime * 9) > 0
  })
  return <Cyl ref={ref} r={0.055} h={0.07} position={position} material={emissiveMaterial('#ff9d00', 8)} low />
}

export default function Vehicles() {
  const forklift = useRef({ moving: false })
  const trolley = useRef({ moving: false })
  return (
    <group>
      {/* forklift: yarn store aisle, reverses back like a real one */}
      <PathMover path={[[-50.5, 17.5], [-50.5, -17]]} speed={1.7} pause={4} reverse stateRef={forklift} offset={0.3}>
        <Forklift position={[0, 0, 0]} />
        <Worker appearance={3} activity="drive" position={[0, 0.58, -0.22]} driveRef={forklift} seed={41} vest />
        <FlashingBeacon position={[0.3, 2.37, -0.4]} stateRef={forklift} />
      </PathMover>
      {/* warp-beam trolley along the loom aisle between rows 3 and 4 */}
      <PathMover path={[[-33.4, 6.7], [20.4, 6.7]]} speed={0.75} pause={5} stateRef={trolley} offset={0.15}>
        <BeamTrolley />
        <Worker appearance={5} activity="push" position={[0, 0, -1.95]} driveRef={trolley} seed={17} />
      </PathMover>
    </group>
  )
}
