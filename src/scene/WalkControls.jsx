// First-person modes:
//  • Walkthrough – eye height, WASD, collisions with walls & machines
//  • Free Fly    – fly anywhere (WASD + Space/E up, Q/C down), no limits
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useFactoryStore } from '../hooks/useFactoryStore'
import { buildColliders, WALK_BOUNDS, WALK_START } from './colliders'
import { goToView } from './focus'

const RADIUS = 0.35
const EYE = 1.65

function blocked(x, z, colliders) {
  if (x < WALK_BOUNDS[0] || x > WALK_BOUNDS[2] || z < WALK_BOUNDS[1] || z > WALK_BOUNDS[3]) return true
  for (const [x1, z1, x2, z2] of colliders) {
    if (x > x1 - RADIUS && x < x2 + RADIUS && z > z1 - RADIUS && z < z2 + RADIUS) return true
  }
  return false
}

export default function WalkControls({ fly = false }) {
  const { camera, gl } = useThree()
  const colliders = useMemo(() => buildColliders(), [])
  const keys = useRef({})
  const look = useRef({ yaw: WALK_START.yaw, pitch: -0.04 })
  const wasLocked = useRef(false)
  const bob = useRef(0)
  const lockRequest = useFactoryStore((s) => s.walkLockRequest)

  // initial pose
  useEffect(() => {
    const prevFov = camera.fov
    if (fly) {
      // start flying from wherever the camera currently is, looking the same way
      const d = new THREE.Vector3()
      camera.getWorldDirection(d)
      look.current.yaw = Math.atan2(-d.x, -d.z)
      look.current.pitch = Math.asin(THREE.MathUtils.clamp(d.y, -1, 1))
    } else {
      camera.position.set(...WALK_START.position)
    }
    camera.rotation.order = 'YXZ'
    camera.fov = 70
    camera.updateProjectionMatrix()
    return () => {
      camera.fov = prevFov
      camera.rotation.order = 'XYZ'
      camera.updateProjectionMatrix()
    }
  }, [camera, fly])

  // pointer lock handling
  useEffect(() => {
    if (lockRequest > 0 && document.pointerLockElement !== gl.domElement) {
      try {
        const p = gl.domElement.requestPointerLock?.()
        if (p && p.catch) p.catch(() => {})
      } catch {
        /* pointer lock unavailable (touch devices) */
      }
    }
  }, [lockRequest, gl])

  useEffect(() => {
    const st = useFactoryStore.getState
    const exit = () => {
      if (fly) {
        // stay where you are: hand the current viewpoint back to the orbit camera
        const d = new THREE.Vector3()
        camera.getWorldDirection(d)
        const pos = camera.position.toArray()
        const tgt = camera.position.clone().addScaledVector(d, 12).toArray()
        st().setMode('orbit')
        setTimeout(() => st().flyTo(pos, tgt, 0.05), 30)
      } else {
        st().setMode('orbit')
        setTimeout(() => goToView('overview', 1.6), 30)
      }
    }
    const onLockChange = () => {
      const locked = document.pointerLockElement === gl.domElement
      st().setWalkLocked(locked)
      if (locked) wasLocked.current = true
      else if (wasLocked.current) exit()
    }
    const onMove = (e) => {
      if (document.pointerLockElement !== gl.domElement) return
      look.current.yaw -= e.movementX * 0.0022
      look.current.pitch = THREE.MathUtils.clamp(look.current.pitch - e.movementY * 0.0022, -1.55, 1.55)
    }
    // drag-to-look fallback (touch / no pointer lock)
    let drag = null
    const onDown = (e) => {
      if (document.pointerLockElement === gl.domElement) return
      drag = { x: e.clientX, y: e.clientY }
    }
    const onDrag = (e) => {
      if (!drag) return
      look.current.yaw -= (e.clientX - drag.x) * 0.005
      look.current.pitch = THREE.MathUtils.clamp(look.current.pitch - (e.clientY - drag.y) * 0.005, -1.55, 1.55)
      drag = { x: e.clientX, y: e.clientY }
    }
    const onUp = () => {
      drag = null
    }
    const onKey = (e) => {
      if (e.code === 'Escape') {
        if (document.pointerLockElement === gl.domElement) document.exitPointerLock()
        exit()
        return
      }
      if (e.code === 'Space') e.preventDefault()
      keys.current[e.code] = e.type === 'keydown'
    }
    document.addEventListener('pointerlockchange', onLockChange)
    document.addEventListener('mousemove', onMove)
    gl.domElement.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onDrag)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    return () => {
      document.removeEventListener('pointerlockchange', onLockChange)
      document.removeEventListener('mousemove', onMove)
      gl.domElement.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onDrag)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
      if (document.pointerLockElement === gl.domElement) document.exitPointerLock()
      st().setWalkLocked(false)
    }
  }, [gl, fly, camera])

  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05)
    const k = keys.current
    const pad = useFactoryStore.getState().walkInput
    let f = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0) + pad.forward
    let r = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0) + pad.right
    const len = Math.hypot(f, r)
    if (len > 1) {
      f /= len
      r /= len
    }
    const { yaw, pitch } = look.current
    if (fly) {
      const up = (k.Space || k.KeyE ? 1 : 0) - (k.KeyQ || k.KeyC || k.ControlLeft ? 1 : 0) + (pad.up || 0)
      const sp = (k.ShiftLeft || k.ShiftRight ? 26 : 9) * dt
      const cp = Math.cos(pitch)
      const fwd = [-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp]
      camera.position.x += (fwd[0] * f + Math.cos(yaw) * r) * sp
      camera.position.y += (fwd[1] * f + up) * sp
      camera.position.z += (fwd[2] * f - Math.sin(yaw) * r) * sp
      camera.position.y = THREE.MathUtils.clamp(camera.position.y, 0.25, 400)
      camera.rotation.set(pitch, yaw, 0, 'YXZ')
      return
    }
    const speed = (k.ShiftLeft || k.ShiftRight ? 6.5 : 3.4) * dt
    const fx = -Math.sin(yaw)
    const fz = -Math.cos(yaw)
    const rx = Math.cos(yaw)
    const rz = -Math.sin(yaw)
    const dx = (fx * f + rx * r) * speed
    const dz = (fz * f + rz * r) * speed
    let x = camera.position.x
    let z = camera.position.z
    if (!blocked(x + dx, z, colliders)) x += dx
    if (!blocked(x, z + dz, colliders)) z += dz
    const moving = Math.abs(dx) + Math.abs(dz) > 0.0001
    bob.current += moving ? dt * 9 : 0
    camera.position.set(x, EYE + (moving ? Math.sin(bob.current) * 0.035 : 0), z)
    camera.rotation.set(pitch, yaw, 0, 'YXZ')
  })

  return null
}
