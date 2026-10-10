// Orbit controls + smooth camera flights + shared camera state (minimap/zone).
import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useFactoryStore } from '../hooks/useFactoryStore'
import { camState } from './cameraState'
import { zoneAt } from '../data/layout'

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const v1 = new THREE.Vector3()
const dir = new THREE.Vector3()

export default function CameraRig() {
  const mode = useFactoryStore((s) => s.mode)
  const flight = useFactoryStore((s) => s.flight)
  const controls = useRef()
  const camera = useThree((s) => s.camera)
  const anim = useRef(null)
  const zoneTimer = useRef(0)

  useEffect(() => {
    camState.camera = camera
  }, [camera])

  useEffect(() => {
    camState.controls = controls.current || null
  })

  useEffect(() => {
    if (!flight || (mode === 'walk' || mode === 'fly')) return
    const fromTarget = controls.current ? controls.current.target.clone() : new THREE.Vector3(camState.targetX, 0, camState.targetZ)
    anim.current = {
      fromPos: camera.position.clone(),
      toPos: new THREE.Vector3(...flight.position),
      fromTarget,
      toTarget: new THREE.Vector3(...flight.target),
      t: 0,
      dur: flight.duration,
    }
    const dist = anim.current.fromPos.distanceTo(anim.current.toPos)
    anim.current.lift = Math.min(18, dist * 0.18)
  }, [flight, camera, mode])

  useFrame((state, dt) => {
    const c = controls.current
    const a = anim.current
    if (a && c) {
      a.t = Math.min(1, a.t + dt / a.dur)
      const k = ease(a.t)
      camera.position.lerpVectors(a.fromPos, a.toPos, k)
      camera.position.y += Math.sin(Math.PI * k) * a.lift
      c.target.lerpVectors(a.fromTarget, a.toTarget, k)
      if (a.t >= 1) anim.current = null
    } else if (c && mode === 'present') {
      // slow cinematic drift around the target while dwelling
      v1.copy(camera.position).sub(c.target)
      v1.applyAxisAngle(THREE.Object3D.DEFAULT_UP, dt * 0.035)
      camera.position.copy(c.target).add(v1)
    }
    // shared state for minimap
    camera.getWorldDirection(dir)
    camState.x = camera.position.x
    camState.y = camera.position.y
    camState.z = camera.position.z
    camState.yaw = Math.atan2(dir.x, dir.z)
    if (c && !(mode === 'walk' || mode === 'fly')) {
      camState.targetX = c.target.x
      camState.targetZ = c.target.z
    } else {
      camState.targetX = camera.position.x + dir.x * 4
      camState.targetZ = camera.position.z + dir.z * 4
    }
    zoneTimer.current += dt
    if (zoneTimer.current > 0.3) {
      zoneTimer.current = 0
      const z = (mode === 'walk' || mode === 'fly') ? zoneAt(camera.position.x, camera.position.z) : zoneAt(camState.targetX, camState.targetZ)
      useFactoryStore.getState().setCurrentZone(z)
    }
  })

  if ((mode === 'walk' || mode === 'fly')) return null
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minPolarAngle={0}
      maxPolarAngle={Math.PI}
      minDistance={0.3}
      maxDistance={900}
      enabled={mode === 'orbit'}
      zoomSpeed={0.9}
      rotateSpeed={0.6}
      panSpeed={0.9}
      screenSpacePanning
      enablePan
      keyPanSpeed={20}
      onStart={() => {
        anim.current = null
      }}
    />
  )
}
