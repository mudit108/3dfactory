// Low-poly procedural worker with simple procedural animation.
// The model faces +z. Activities: operate | lookAround | repair | inspect |
// carry | carryRoll | load | walk | sit | guard
import { memo, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { GEO } from '../scene/geometries'
import { MAT, colorMaterial } from '../scene/materials'
import { APPEARANCES } from '../data/workers'
import { RBox, Box, Cyl } from './primitives'

const SPECIAL = {
  office: { shirt: '#e8edf3', pants: '#2b3140', helmet: null, hair: '#1d1a17', skin: '#a0694a' },
  manager: { shirt: '#b9cde3', pants: '#3a3f47', helmet: null, hair: '#23201c', skin: '#8d5a3b' },
  security: { shirt: '#26364f', pants: '#26364f', helmet: null, cap: '#1c2638', skin: '#7a4b30' },
  visitor: { shirt: '#5d6e86', pants: '#c9bfa8', helmet: null, hair: '#1b1815', skin: '#9a6444' },
  visitorB: { shirt: '#8a4b3c', pants: '#2d3440', helmet: null, hair: '#2a2420', skin: '#b07a55' },
}

function useLook(appearance) {
  return useMemo(() => {
    const a = typeof appearance === 'string' ? SPECIAL[appearance] : APPEARANCES[appearance % APPEARANCES.length]
    return {
      shirt: colorMaterial(a.shirt, { roughness: 0.85 }),
      pants: colorMaterial(a.pants, { roughness: 0.9 }),
      skin: colorMaterial(a.skin, { roughness: 0.7 }),
      helmet: a.helmet ? colorMaterial(a.helmet, { roughness: 0.35, metalness: 0.05 }) : null,
      hair: a.hair ? colorMaterial(a.hair, { roughness: 0.9 }) : null,
      cap: a.cap ? colorMaterial(a.cap, { roughness: 0.8 }) : null,
      shoes: colorMaterial('#2a211b', { roughness: 0.7 }),
    }
  }, [appearance])
}

function pathInfo(path) {
  const segs = []
  let total = 0
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i]
    const b = path[i + 1]
    const len = Math.hypot(b[0] - a[0], b[1] - a[1])
    segs.push({ a, b, len, start: total })
    total += len
  }
  return { segs, total }
}

function samplePath(info, d) {
  for (const s of info.segs) {
    if (d <= s.start + s.len || s === info.segs[info.segs.length - 1]) {
      const k = s.len ? Math.min(1, Math.max(0, (d - s.start) / s.len)) : 0
      return {
        x: s.a[0] + (s.b[0] - s.a[0]) * k,
        z: s.a[1] + (s.b[1] - s.a[1]) * k,
        yaw: Math.atan2(s.b[0] - s.a[0], s.b[1] - s.a[1]),
      }
    }
  }
  return { x: 0, z: 0, yaw: 0 }
}

function lerpAngle(a, b, t) {
  let d = b - a
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return a + d * t
}

export const Worker = memo(function Worker({
  appearance = 0,
  activity = 'lookAround',
  position = [0, 0, 0],
  rotation = 0,
  path,
  speed = 1.05,
  pause = 1.8,
  seed = 0,
  vest = false,
  scale = 1,
  carryColor = '#ece8de',
}) {
  const look = useLook(appearance)
  const root = useRef()
  const hips = useRef()
  const torso = useRef()
  const head = useRef()
  const lArm = useRef()
  const rArm = useRef()
  const lFore = useRef()
  const rFore = useRef()
  const lLeg = useRef()
  const rLeg = useRef()
  const lShin = useRef()
  const rShin = useRef()
  const carryBox = useRef()
  const carryRoll = useRef()
  const clipboard = useRef()

  const info = useMemo(() => (path ? pathInfo(path) : null), [path])
  const walker = useRef({ d: (seed * 7.3) % 5, dir: 1, wait: 0, yaw: rotation })
  const vestMat = useMemo(() => colorMaterial('#f06a1d', { roughness: 0.7 }), [])
  const rollMat = useMemo(() => colorMaterial(carryColor, { roughness: 0.55 }), [carryColor])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime + seed * 3.17
    dt = Math.min(dt, 0.05)
    // ---- defaults (neutral stance) ----
    let hipY = 0.96
    let lA = 0.05, rA = 0.05, lAz = 0.08, rAz = -0.08, lF = -0.15, rF = -0.15
    let lL = 0, rL = 0, lS = 0, rS = 0
    let headYaw = 0, headPitch = 0, torsoPitch = 0, torsoYaw = 0
    let walking = false
    let carrying = null
    const breathe = Math.sin(t * 1.6) * 0.012

    if (info && ['carry', 'carryRoll', 'load', 'walk'].includes(activity)) {
      const w = walker.current
      if (w.wait > 0) {
        w.wait -= dt
      } else {
        w.d += w.dir * speed * dt
        if (w.d >= info.total) {
          w.d = info.total
          w.dir = -1
          w.wait = pause
        } else if (w.d <= 0) {
          w.d = 0
          w.dir = 1
          w.wait = pause
        } else walking = true
      }
      const p = samplePath(info, w.d)
      const targetYaw = w.dir === 1 ? p.yaw : p.yaw + Math.PI
      w.yaw = lerpAngle(w.yaw, w.wait > 0 ? w.yaw : targetYaw, Math.min(1, dt * 6))
      root.current.position.set(p.x, position[1], p.z)
      root.current.rotation.y = w.yaw
      const outbound = activity === 'walk' ? false : w.dir === 1 ? w.wait <= 0 || w.d < info.total : false
      // at the far end the item is being put down
      carrying = activity === 'walk' ? null : outbound && !(w.wait > 0 && w.d >= info.total) ? (activity === 'carry' ? 'box' : 'roll') : null
      if (w.wait > 0 && w.d >= info.total && activity !== 'walk') {
        // placing / reaching motion
        const k = Math.sin((1 - w.wait / pause) * Math.PI)
        torsoPitch = 0.45 * k
        lA = rA = -1.1 * k
        lF = rF = -0.4
      }
      if (w.wait > 0 && w.d <= 0 && activity !== 'walk') {
        const k = Math.sin((1 - w.wait / pause) * Math.PI)
        torsoPitch = 0.5 * k
        lA = rA = -1.0 * k
      }
    }

    if (walking) {
      const ph = t * 6.2
      const sw = Math.sin(ph)
      lL = sw * 0.45
      rL = -sw * 0.45
      lS = Math.max(0, -sw) * 0.7 + 0.05
      rS = Math.max(0, sw) * 0.7 + 0.05
      lA = -sw * 0.35
      rA = sw * 0.35
      hipY = 0.96 + Math.abs(Math.cos(ph)) * 0.025 - 0.012
      torsoYaw = sw * 0.06
    }

    if (carrying === 'box') {
      lA = rA = -1.05
      lF = rF = -0.55
      lAz = 0.25
      rAz = -0.25
    } else if (carrying === 'roll') {
      rA = -2.6
      rF = -1.3
      rAz = -0.15
    }

    switch (activity) {
      case 'operate': {
        const slow = Math.sin(t * 0.25)
        root.current.position.x = position[0] + slow * 0.55
        const reach = Math.sin(t * 2.2)
        lA = -0.9 + reach * 0.15
        rA = -0.75 - Math.sin(t * 1.7) * 0.2
        lF = rF = -0.5
        torsoPitch = 0.12
        headPitch = 0.28 + Math.sin(t * 0.7) * 0.08
        headYaw = Math.sin(t * 0.33) * 0.35
        const step = Math.cos(t * 0.25) * 0.25 // stepping as they move along
        lL = step * 0.4
        rL = -step * 0.4
        break
      }
      case 'lookAround':
        headYaw = Math.sin(t * 0.45) * 0.8
        headPitch = Math.sin(t * 0.3) * 0.1
        lA = 0.05
        rA = -0.3
        rF = -1.2
        rAz = -0.3
        torsoYaw = Math.sin(t * 0.45) * 0.15
        break
      case 'repair': {
        hipY = 0.62
        lL = rL = -1.25
        lS = rS = 1.75
        torsoPitch = 0.35
        const w = Math.sin(t * 7)
        lA = -1.2 + w * 0.1
        rA = -1.4 - w * 0.15
        lF = rF = -0.3
        headPitch = 0.2
        break
      }
      case 'inspect':
        if (!info) {
          lA = -0.9
          lF = -0.9
          lAz = 0.35
          rA = -0.65 + Math.sin(t * 5) * 0.05
          rF = -0.9
          headPitch = 0.3 + Math.max(0, Math.sin(t * 0.4)) * 0.3
          headYaw = Math.sin(t * 0.21) * 0.5
          root.current.rotation.y = rotation + Math.sin(t * 0.18) * 0.35
        }
        break
      case 'sit': {
        hipY = 0.52
        lL = rL = -Math.PI / 2
        lS = rS = Math.PI / 2
        const ty = Math.sin(t * 9)
        lA = -0.95 + ty * 0.04
        rA = -0.95 - ty * 0.04
        lF = rF = -0.55
        headPitch = 0.12 + Math.sin(t * 0.4) * 0.05
        headYaw = Math.sin(t * 0.23) * 0.2
        break
      }
      case 'guard':
        lA = rA = 0.35
        lAz = 0.3
        rAz = -0.3
        lF = rF = -0.9
        headYaw = Math.sin(t * 0.35) * 0.9
        root.current.rotation.y = rotation + Math.sin(t * 0.12) * 0.4
        break
      default:
        break
    }

    hips.current.position.y = hipY + breathe * 0.3
    torso.current.rotation.x = torsoPitch
    torso.current.rotation.y = torsoYaw
    torso.current.scale.set(1, 1 + breathe, 1)
    head.current.rotation.set(headPitch, headYaw, 0)
    lArm.current.rotation.set(lA, 0, lAz)
    rArm.current.rotation.set(rA, 0, rAz)
    lFore.current.rotation.x = lF
    rFore.current.rotation.x = rF
    lLeg.current.rotation.x = lL
    rLeg.current.rotation.x = rL
    lShin.current.rotation.x = lS
    rShin.current.rotation.x = rS
    if (carryBox.current) carryBox.current.visible = carrying === 'box'
    if (carryRoll.current) carryRoll.current.visible = carrying === 'roll'
    if (clipboard.current) clipboard.current.visible = activity === 'inspect' && !info
  })

  const arm = (side, ref, foreRef) => (
    <group ref={ref} position={[side * 0.235, 0.52, 0]}>
      <mesh geometry={GEO.sphereLow} scale={0.12} material={look.shirt} />
      <mesh geometry={GEO.capsule} scale={[0.1, 0.13, 0.1]} position={[0, -0.12, 0]} material={look.shirt} castShadow />
      <group ref={foreRef} position={[0, -0.26, 0]}>
        <mesh geometry={GEO.capsule} scale={[0.082, 0.12, 0.082]} position={[0, -0.11, 0]} material={look.skin} />
        <mesh geometry={GEO.sphereLow} scale={0.09} position={[0, -0.24, 0.01]} material={look.skin} />
        {side === -1 && (
          <group ref={clipboard} position={[0, -0.24, 0.1]} rotation={[-0.9, 0, 0]} visible={false}>
            <Box size={[0.22, 0.3, 0.012]} material={MAT.wood} />
            <Box size={[0.19, 0.24, 0.004]} position={[0, -0.01, 0.008]} material={MAT.paper} />
          </group>
        )}
      </group>
    </group>
  )

  const leg = (side, ref, shinRef) => (
    <group ref={ref} position={[side * 0.095, 0, 0]}>
      <mesh geometry={GEO.capsule} scale={[0.13, 0.26, 0.13]} position={[0, -0.2, 0]} material={look.pants} castShadow />
      <group ref={shinRef} position={[0, -0.42, 0]}>
        <mesh geometry={GEO.capsule} scale={[0.11, 0.26, 0.11]} position={[0, -0.2, 0]} material={look.pants} castShadow />
        <RBox size={[0.115, 0.085, 0.27]} radius={0.03} position={[0, -0.49, 0.045]} material={look.shoes} />
      </group>
    </group>
  )

  return (
    <group ref={root} position={position} rotation={[0, rotation, 0]} scale={scale}>
      <group ref={hips} position={[0, 0.96, 0]}>
        <RBox size={[0.33, 0.17, 0.21]} radius={0.05} position={[0, 0.02, 0]} material={look.pants} />
        {leg(-1, lLeg, lShin)}
        {leg(1, rLeg, rShin)}
        <group ref={torso}>
          <RBox size={[0.39, 0.5, 0.22]} radius={0.07} position={[0, 0.33, 0]} material={look.shirt} cast />
          <Box size={[0.34, 0.045, 0.215]} position={[0, 0.1, 0]} material={MAT.black} />
          {vest && (
            <group>
              <RBox size={[0.41, 0.36, 0.235]} radius={0.06} position={[0, 0.33, 0]} material={vestMat} />
              <Box size={[0.415, 0.03, 0.24]} position={[0, 0.26, 0]} material={MAT.chrome} />
              <Box size={[0.415, 0.03, 0.24]} position={[0, 0.38, 0]} material={MAT.chrome} />
            </group>
          )}
          <Cyl r={0.048} h={0.1} position={[0, 0.62, 0]} material={look.skin} low />
          <group ref={head} position={[0, 0.73, 0]}>
            <mesh geometry={GEO.sphere} scale={[0.2, 0.235, 0.215]} material={look.skin} castShadow />
            <Box size={[0.03, 0.05, 0.03]} position={[0, -0.01, 0.11]} material={look.skin} />
            {look.helmet && (
              <group position={[0, 0.035, 0]}>
                <mesh geometry={GEO.hemisphere} scale={[0.25, 0.26, 0.26]} material={look.helmet} castShadow />
                <Cyl r={0.135} h={0.014} position={[0, 0.002, 0.025]} material={look.helmet} low />
                <Box size={[0.03, 0.02, 0.26]} position={[0, 0.12, 0]} material={look.helmet} />
              </group>
            )}
            {look.hair && <mesh geometry={GEO.hemisphere} scale={[0.215, 0.2, 0.225]} position={[0, 0.03, -0.01]} material={look.hair} />}
            {look.cap && (
              <group position={[0, 0.06, 0]}>
                <Cyl r={0.115} h={0.07} material={look.cap} low />
                <Box size={[0.16, 0.012, 0.09]} position={[0, -0.03, 0.12]} material={look.cap} />
              </group>
            )}
          </group>
          {arm(-1, lArm, lFore)}
          {arm(1, rArm, rFore)}
          {/* carried items */}
          <group ref={carryBox} position={[0, 0.2, 0.34]} visible={false}>
            <Box size={[0.5, 0.34, 0.36]} material={MAT.cardboard} cast />
          </group>
          <group ref={carryRoll} position={[0.16, 0.66, 0.05]} visible={false}>
            <Cyl r={0.13} h={1.55} rotation={[Math.PI / 2, 0, 0]} material={rollMat} cast />
          </group>
        </group>
      </group>
    </group>
  )
})
