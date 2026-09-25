// Weaving hall: 18 waterjet looms, fabric inspection frames, beam storage.
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { loomPlacements, inspectionPlacements } from '../data/layout'
import { useFactoryStore } from '../hooks/useFactoryStore'
import { WaterjetLoom } from '../components/WaterjetLoom'
import { Interactive } from '../components/Interactive'
import { Box, CylX, RBox, Label } from '../components/primitives'
import { MAT, colorMaterial } from './materials'
import { fabricWeaveTexture } from './textures'
import { RollStack } from '../components/Props'

export function ZoneBanner({ text, sub, position, rotation = 0, width = 7, color = '#0f172a', accent = '#f59e0b' }) {
  const opts = useMemo(
    () => ({
      width: 1024, height: sub ? 220 : 160, bg: color, radius: 14, stripe: accent,
      lines: sub
        ? [
            { text, size: 92, color: '#ffffff', y: 86, weight: 800, letter: 6 },
            { text: sub, size: 40, color: '#cbd5e1', y: 170, weight: 600, letter: 4 },
          ]
        : [{ text, size: 92, color: '#ffffff', weight: 800, letter: 6 }],
    }),
    [text, sub, color, accent],
  )
  const h = width * ((sub ? 220 : 160) / 1024)
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Label width={width} height={h} opts={opts} position={[0, 0, 0.012]} />
      <Label width={width} height={h} opts={opts} position={[0, 0, -0.012]} rotation={[0, Math.PI, 0]} />
      <Box size={[width + 0.08, h + 0.08, 0.02]} material={MAT.darkSteel} />
      <Box size={[0.015, 2.2, 0.015]} position={[-width / 2 + 0.3, h / 2 + 1.1, 0]} material={MAT.darkSteel} />
      <Box size={[0.015, 2.2, 0.015]} position={[width / 2 - 0.3, h / 2 + 1.1, 0]} material={MAT.darkSteel} />
    </group>
  )
}

function InspectionMachine({ running }) {
  const clothMat = useMemo(() => {
    const t = fabricWeaveTexture([10, 4]).clone()
    t.needsUpdate = true
    return new THREE.MeshStandardMaterial({ color: '#ece9e1', map: t, roughness: 0.7, side: THREE.DoubleSide })
  }, [])
  const lightMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#f3f7ff', emissiveIntensity: running ? 1.8 : 0.15 }), [running])
  const r1 = useRef()
  const r2 = useRef()
  useFrame((_, dt) => {
    if (!running) return
    clothMat.map.offset.y -= dt * 0.25
    if (r1.current) r1.current.rotation.x -= dt * 1.5
    if (r2.current) r2.current.rotation.x += dt * 1.2
  })
  const frame = useMemo(() => colorMaterial('#4a5a6a', { metalness: 0.5, roughness: 0.45 }), [])
  return (
    <group>
      {[-1.45, 1.45].map((x) => (
        <group key={x}>
          <Box size={[0.1, 2.6, 0.1]} position={[x, 1.3, -0.5]} material={frame} cast />
          <Box size={[0.1, 1.2, 0.1]} position={[x, 0.6, 0.55]} material={frame} />
          <Box size={[0.1, 0.1, 1.2]} position={[x, 0.08, 0]} material={frame} />
        </group>
      ))}
      <Box size={[3.0, 0.1, 0.1]} position={[0, 2.55, -0.5]} material={frame} />
      {/* inclined light table */}
      <group position={[0, 1.55, -0.1]} rotation={[-0.55, 0, 0]}>
        <Box size={[2.6, 1.3, 0.08]} material={frame} />
        <Box size={[2.5, 1.2, 0.01]} position={[0, 0, 0.045]} material={lightMat} />
        <Box size={[2.45, 1.4, 0.004]} position={[0, 0, 0.06]} material={clothMat} />
      </group>
      <group ref={r1} position={[0, 2.35, -0.55]}>
        <CylX r={0.22} h={2.5} material={clothMat} cast />
      </group>
      <group ref={r2} position={[0, 0.55, 0.45]}>
        <CylX r={0.16} h={2.5} material={clothMat} cast />
      </group>
      <RBox size={[0.35, 0.45, 0.25]} radius={0.03} position={[1.75, 1.1, 0.4]} material={MAT.loomBody} />
      <Box size={[0.2, 0.12, 0.02]} position={[1.75, 1.2, 0.53]} material={colorMaterial(running ? '#22c55e' : '#f59e0b', { emissive: running ? '#22c55e' : '#f59e0b', emissiveIntensity: 1.5 })} />
      {/* inspection counter */}
      <Box size={[0.9, 0.05, 0.5]} position={[-1.9, 0.9, 0.6]} material={MAT.wood} />
      <Box size={[0.05, 0.9, 0.05]} position={[-1.9, 0.45, 0.6]} material={frame} />
    </group>
  )
}

export default function ProductionZone() {
  const machines = useFactoryStore((s) => s.machines)
  const showLabels = useFactoryStore((s) => s.showLabels)
  const byId = useMemo(() => Object.fromEntries(machines.map((m) => [m.id, m])), [machines])
  const statusKey = machines.map((m) => m.status).join(',')
  // re-render looms only when a status changes (not on every live tick)
  const looms = useMemo(
    () =>
      loomPlacements.map((p, i) => ({ ...p, machine: byId[p.id], index: i })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [statusKey, machines.length],
  )

  return (
    <group>
      {looms.map(({ id, position, machine, index }) => (
        <Interactive
          key={id}
          type="machine"
          id={id}
          label={`Waterjet Loom ${id}`}
          sub={machine ? `${machine.status.toUpperCase()} · ${machine.efficiency}% eff.` : ''}
          status={machine?.status}
          position={position}
        >
          <WaterjetLoom machine={machine} index={index} showLabel={showLabels} />
        </Interactive>
      ))}

      {inspectionPlacements.map((p, i) => (
        <Interactive key={p.id} type="inspection" id={p.id} label={`Fabric Inspection ${p.id}`} sub={i === 0 ? 'Inspecting · 18 m/min' : 'Standby'} position={p.position}>
          <InspectionMachine running={i === 0} />
          <Label
            width={1.2}
            height={0.3}
            position={[0, 2.85, -0.5]}
            opts={{ width: 400, height: 100, bg: '#1e1b4b', radius: 10, lines: [{ text: p.id, size: 50, color: '#e0e7ff', weight: 800 }] }}
          />
        </Interactive>
      ))}
      {/* inspected rolls waiting to move to finished goods */}
      <RollStack position={[20.8, 0, -8.5]} rotation={Math.PI / 2} rows={4} layers={3} colors={['#e9e6dd', '#d7d9db']} seed={4} />
      <RollStack position={[20.8, 0, 3.2]} rotation={Math.PI / 2} rows={3} layers={2} colors={['#3a3f46', '#e2ddcf']} seed={8} />

      {/* spare warp beams on a rack behind the looms */}
      <group position={[-15, 0, -27.8]}>
        {[0, 1, 2, 3].map((i) => (
          <group key={i} position={[i * 3.4 - 5, 0.5, 0]}>
            <CylX r={0.055} h={3.0} material={MAT.steel} />
            <CylX r={0.36} h={2.5} material={colorMaterial(i % 2 ? '#efece4' : '#f3f1ea', { roughness: 0.6 })} cast />
            <CylX r={0.42} h={0.035} position={[-1.27, 0, 0]} material={MAT.galvanized} />
            <CylX r={0.42} h={0.035} position={[1.27, 0, 0]} material={MAT.galvanized} />
          </group>
        ))}
        <Box size={[14, 0.08, 0.3]} position={[0, 0.08, 0.4]} material={MAT.yellow} />
        <Box size={[14, 0.08, 0.3]} position={[0, 0.08, -0.4]} material={MAT.yellow} />
      </group>

      <ZoneBanner text="WATERJET WEAVING" sub="18 LOOMS · SHED A" position={[-7, 5.4, -24.6]} width={7.5} accent="#34d399" />
      <ZoneBanner text="FABRIC INSPECTION" position={[21.2, 4.6, -6.5]} width={4.6} accent="#a78bfa" rotation={Math.PI / 2} />
    </group>
  )
}
