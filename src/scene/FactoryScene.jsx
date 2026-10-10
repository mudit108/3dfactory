import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { PerformanceMonitor, AdaptiveDpr } from '@react-three/drei'
import * as THREE from 'three'
import { useFactoryStore } from '../hooks/useFactoryStore'
import Lighting from './Lighting'
import Building from './Building'
import Services from './Services'
import ShedDetails from './ShedDetails'
import Vehicles from './Vehicles'
import FloorMarkings from './FloorMarkings'
import ProductionZone from './ProductionZone'
import { YarnStore, FinishedGoods } from './StoreZones'
import Exterior from './Exterior'
import WorkersLayer from './WorkersLayer'
import FlowPaths from './FlowPaths'
import SelectionHighlight from './SelectionHighlight'
import CameraRig from './CameraRig'
import WalkControls from './WalkControls'
import Effects from './Effects'
import { goToView } from './focus'
import { BUILDING } from '../data/layout'
import { factorySound } from '../services/factorySound'

function ReadySignal() {
  const frames = useRef(0)
  const done = useRef(false)
  useFrame(({ gl, scene, camera }) => {
    if (done.current) return
    frames.current += 1
    if (frames.current > 4) {
      done.current = true
      // pre-compile shaders of things that are hidden right now (roof, lights,
      // water mist…) so the first walk inside the shed doesn't stutter
      const hidden = []
      scene.traverse((o) => {
        if (o.userData?.prewarm && !o.visible) {
          o.visible = true
          hidden.push(o)
        }
      })
      try {
        if (gl.compileAsync && gl.extensions.has('KHR_parallel_shader_compile')) gl.compileAsync(scene, camera).catch(() => {})
        else gl.compile(scene, camera)
      } finally {
        hidden.forEach((o) => (o.visible = false))
      }
      useFactoryStore.getState().setSceneReady()
      goToView('overview', 3.2)
    }
  })
  return null
}

/** Tracks whether the camera is inside the shed (with hysteresis so it doesn't flicker). */
function InsideTracker() {
  useFrame(({ camera }) => {
    const st = useFactoryStore.getState()
    const p = camera.position
    const inPlan = p.x > BUILDING.minX && p.x < BUILDING.maxX && p.z > BUILDING.minZ && p.z < BUILDING.maxZ
    const inside = st.cameraInside ? inPlan && p.y < BUILDING.eaveHeight - 0.1 : inPlan && p.y < BUILDING.eaveHeight - 0.9
    if (inside !== st.cameraInside) st.setCameraInside(inside)
  })
  return null
}

/** Drives the procedural factory sound from camera position + running looms. */
function SoundController() {
  const acc = useRef(0)
  useFrame(({ camera }, dt) => {
    acc.current += dt
    if (acc.current < 0.2) return
    acc.current = 0
    const st = useFactoryStore.getState()
    if (!st.soundOn) return
    const p = camera.position
    // distance to the loom hall rectangle
    const dx = Math.max(-35 - p.x, 0, p.x - 24)
    const dz = Math.max(-20 - p.z, 0, p.z - 17)
    const dist = Math.hypot(dx, dz, Math.max(0, p.y - 2))
    const level = 1 / (1 + dist / 14)
    const running = st.machines.filter((m) => m.status === 'running').length / Math.max(1, st.machines.length)
    factorySound.update(st.cameraInside ? level : level * 0.45, running, !st.cameraInside)
  })
  return null
}

function Factory() {
  return (
    <group>
      <Building />
      <Services />
      <ShedDetails />
      <FloorMarkings />
      <ProductionZone />
      <YarnStore />
      <FinishedGoods />
      <Exterior />
      <WorkersLayer />
      <Vehicles />
      <FlowPaths />
    </group>
  )
}

export default function FactoryScene() {
  const loaded = useFactoryStore((s) => s.loaded)
  const mode = useFactoryStore((s) => s.mode)
  const quality = useFactoryStore((s) => s.quality)
  const setQuality = useFactoryStore((s) => s.setQuality)

  return (
    <Canvas
      shadows
      dpr={quality === 'performance' ? [0.75, 1] : quality === 'balanced' ? [1, 1.5] : [1, 2]}
      camera={{ position: [-70, 120, 170], fov: 45, near: 0.05, far: 3000 }}
      gl={{ antialias: true, powerPreference: 'high-performance', stencil: false, toneMapping: THREE.ACESFilmicToneMapping }}
      onCreated={({ gl, scene }) => {
        gl.shadowMap.type = THREE.PCFSoftShadowMap
        if (import.meta.env.DEV) window.__r3f = { gl, scene, THREE }
      }}
      onPointerMissed={(e) => {
        if (e.type === 'click' && useFactoryStore.getState().mode === 'orbit') useFactoryStore.getState().clearSelection()
      }}
    >
      <PerformanceMonitor
        onDecline={() => {
          const q = useFactoryStore.getState().quality
          if (q === 'high') setQuality('balanced')
        }}
      />
      <AdaptiveDpr pixelated={false} />
      <Suspense fallback={null}>
        <Lighting />
        {loaded && (
          <>
            <Factory />
            <SelectionHighlight />
            <InsideTracker />
            <SoundController />
            <ReadySignal />
          </>
        )}
        <CameraRig />
        {(mode === 'walk' || mode === 'fly') && <WalkControls key={mode} fly={mode === 'fly'} />}
        <Effects />
      </Suspense>
    </Canvas>
  )
}
