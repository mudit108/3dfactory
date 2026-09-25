import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { PerformanceMonitor, AdaptiveDpr } from '@react-three/drei'
import * as THREE from 'three'
import { useFactoryStore } from '../hooks/useFactoryStore'
import Lighting from './Lighting'
import Building from './Building'
import Services from './Services'
import FloorMarkings from './FloorMarkings'
import ProductionZone from './ProductionZone'
import { YarnStore, FinishedGoods } from './StoreZones'
import { AccountsOffice, ManagerOffice, Lobby } from './Offices'
import Exterior from './Exterior'
import WorkersLayer from './WorkersLayer'
import FlowPaths from './FlowPaths'
import SelectionHighlight from './SelectionHighlight'
import CameraRig from './CameraRig'
import WalkControls from './WalkControls'
import Effects from './Effects'
import { goToView } from './focus'

function ReadySignal() {
  const frames = useRef(0)
  const done = useRef(false)
  useFrame(() => {
    if (done.current) return
    frames.current += 1
    if (frames.current > 4) {
      done.current = true
      useFactoryStore.getState().setSceneReady()
      goToView('overview', 3.2)
    }
  })
  return null
}

function Factory() {
  return (
    <group>
      <Building />
      <Services />
      <FloorMarkings />
      <ProductionZone />
      <YarnStore />
      <FinishedGoods />
      <AccountsOffice />
      <ManagerOffice />
      <Lobby />
      <Exterior />
      <WorkersLayer />
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
      camera={{ position: [-70, 120, 170], fov: 45, near: 0.1, far: 1500 }}
      gl={{ antialias: true, powerPreference: 'high-performance', stencil: false, toneMapping: THREE.ACESFilmicToneMapping }}
      onCreated={({ gl }) => {
        gl.shadowMap.type = THREE.PCFSoftShadowMap
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
            <ReadySignal />
          </>
        )}
        <CameraRig />
        {mode === 'walk' && <WalkControls />}
        <Effects />
      </Suspense>
    </Canvas>
  )
}
