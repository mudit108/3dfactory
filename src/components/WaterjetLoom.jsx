// Procedural industrial waterjet loom. Local frame: origin on the floor at the
// machine centre, operator side facing +z, weaving width along x.
import { memo, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
import { Box, Cyl, CylX, RBox, Sheet, Label, TexPlane, FloorRect } from './primitives'
import { MAT, colorMaterial, emissiveMaterial, fabricMaterial } from '../scene/materials'
import { GEO, tube } from '../scene/geometries'
import { hmiTexture } from '../scene/textures'

const WARP_COLORS = ['#f1eee6', '#ecebe6', '#e7e2d4', '#f3f1eb', '#dfe3e6', '#ebe5d6']
const CLOTH_COLORS = ['#e9e6dd', '#e2ddcf', '#d7d9db', '#ece8de', '#3a3f46', '#2b3550', '#cfc3a6', '#e6e2d8']

const STATUS_COLOR = { running: '#22c55e', idle: '#f59e0b', maintenance: '#ef4444' }

// pipes/cables are identical on every loom → shared geometry
const pipeWater = () => tube([[-2.05, 0, -0.95], [-2.05, 1.0, -0.95], [-2.05, 1.45, -0.7], [-1.97, 1.4, -0.4]], 0.022)
const pipeDrain = () => tube([[-1.3, 0.14, -0.5], [-1.55, 0.08, -0.95], [-1.6, 0.03, -1.35], [-1.6, 0.02, -1.6]], 0.03)
const cablePanel = () => tube([[1.45, 1.5, 0.62], [1.7, 1.46, 0.3], [1.72, 1.44, -0.4], [1.68, 1.5, -0.9]], 0.014)
const conduit = () => tube([[1.68, 1.5, -0.9], [1.68, 2.4, -0.95], [1.68, 4.15, -0.95]], 0.022, 8)
const weftFeed = () => tube([[-2.12, 1.33, 0.56], [-2.0, 1.34, 0.46], [-1.9, 1.3, 0.32], [-1.62, 1.16, 0.15]], 0.004, 16, 4)

function ConeMarker({ position }) {
  return (
    <group position={position}>
      <mesh geometry={GEO.cone} scale={[0.32, 0.6, 0.32]} position={[0, 0.32, 0]} material={colorMaterial('#e8611a')} castShadow />
      <mesh geometry={GEO.cyl} scale={[0.2, 0.08, 0.2]} position={[0, 0.36, 0]} material={MAT.white} />
      <Box size={[0.4, 0.03, 0.4]} position={[0, 0.015, 0]} material={colorMaterial('#d4561a')} />
    </group>
  )
}

function StatusBadge({ id, status }) {
  const opts = useMemo(
    () => ({
      width: 320, height: 88, bg: 'rgba(12,18,28,0.88)', radius: 20, border: STATUS_COLOR[status], borderWidth: 5,
      lines: [
        { text: id, size: 40, color: '#f8fafc', y: 44, x: 26, align: 'left', weight: 800 },
        { text: status === 'running' ? 'RUN' : status === 'idle' ? 'IDLE' : 'MAINT', size: 26, color: STATUS_COLOR[status], y: 46, x: 298, align: 'right', weight: 800 },
      ],
    }),
    [id, status],
  )
  return (
    <Billboard position={[0, 2.75, 0]}>
      <Label width={1.3} height={0.36} opts={opts} emissive />
    </Billboard>
  )
}

export const WaterjetLoom = memo(function WaterjetLoom({ machine, index = 0, showLabel = true }) {
  const status = machine?.status ?? 'running'
  const running = status === 'running'
  const warpColor = WARP_COLORS[index % WARP_COLORS.length]
  const clothColor = CLOTH_COLORS[(index * 3) % CLOTH_COLORS.length]
  const beamFill = (machine?.warpBeamRemaining ?? 60) / 100
  const beamR = 0.16 + beamFill * 0.22
  const clothR = 0.1 + Math.min(1, (machine?.production ?? 600) / 1400) * 0.14

  const heald1 = useRef()
  const heald2 = useRef()
  const sley = useRef()
  const roll = useRef()
  const jet = useRef()
  const beacon = useRef()
  const drum = useRef()

  const warpMat = useMemo(() => fabricMaterial(warpColor), [warpColor])
  const clothMat = useMemo(() => fabricMaterial(clothColor), [clothColor])
  const hmi = useMemo(() => hmiTexture(machine?.id ?? 'WJ', status), [machine?.id, status])
  const floorLineMat = useMemo(() => colorMaterial('#d9a514', { roughness: 0.7 }), [])

  const speed = 3.1 + (index % 5) * 0.12
  const phase0 = index * 0.37

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    if (status === 'maintenance' && beacon.current) {
      beacon.current.visible = Math.sin(t * 5) > 0
    }
    if (!running) return
    const p = t * speed + phase0
    const s = Math.sin(p * Math.PI * 2)
    if (heald1.current) heald1.current.position.y = 1.16 + s * 0.035
    if (heald2.current) heald2.current.position.y = 1.16 - s * 0.035
    if (sley.current) sley.current.position.z = 0.1 + Math.pow(Math.max(0, Math.sin(p * Math.PI * 2 + 1.2)), 6) * 0.07
    const f = p % 1
    if (jet.current) {
      const on = f > 0.05 && f < 0.42
      jet.current.visible = on
      if (on) jet.current.scale.x = Math.min(1, (f - 0.05) / 0.22)
    }
    if (roll.current) roll.current.rotation.x -= dt * 0.08
    if (drum.current) drum.current.rotation.x += dt * 9
  })

  const lightMat = (color, on) => (on ? emissiveMaterial(color, 4) : colorMaterial(color, { roughness: 0.3, transparent: true, opacity: 0.45 }))

  return (
    <group>
      {/* foundation + safety outline */}
      <Box size={[4.0, 0.08, 2.7]} position={[0, 0.04, -0.05]} material={MAT.plinth} receive />
      <FloorRect rect={[-2.5, -1.75, 2.5, 2.25]} width={0.07} material={floorLineMat} y={0.013} />
      <Box size={[3.0, 0.06, 1.5]} position={[0, 0.11, 0.05]} material={MAT.darkSteel} receive />

      {/* side frames (cast housings) */}
      {[-1, 1].map((sx) => (
        <group key={sx} position={[sx * 1.5, 0, 0]}>
          <RBox size={[0.3, 1.32, 2.0]} radius={0.05} position={[0, 0.74, -0.1]} material={MAT.loomBody} cast receive />
          <RBox size={[0.03, 0.86, 1.3]} radius={0.012} position={[sx * 0.16, 0.74, -0.05]} material={MAT.loomAccent} />
          <Box size={[0.36, 0.08, 2.1]} position={[0, 0.12, -0.1]} material={MAT.castIron} />
          {/* foot bolts */}
          {[-0.95, 0.75].map((z) => (
            <Cyl key={z} r={0.03} h={0.05} position={[sx * 0.14, 0.18, z]} material={MAT.chrome} low />
          ))}
        </group>
      ))}

      {/* cross members */}
      <Box size={[2.72, 0.18, 0.18]} position={[0, 0.32, -0.12]} material={MAT.loomBody} cast />
      <Box size={[2.72, 0.26, 0.28]} position={[0, 0.58, 0.28]} material={MAT.loomBody} cast />
      <Box size={[2.72, 0.14, 0.14]} position={[0, 1.33, -0.72]} material={MAT.loomBody} />
      <Box size={[2.9, 0.09, 0.16]} position={[0, 1.2, 0.68]} material={MAT.steel} cast />

      {/* warp beam */}
      <group position={[0, 0.64, -0.96]}>
        <CylX r={0.055} h={3.15} material={MAT.steel} />
        <CylX r={beamR} h={2.6} material={warpMat} cast />
        {[-1.33, 1.33].map((x) => (
          <CylX key={x} r={0.43} h={0.035} position={[x, 0, 0]} material={MAT.galvanized} cast />
        ))}
      </group>
      {/* back rest roller */}
      <CylX r={0.05} h={2.85} position={[0, 1.44, -0.72]} material={MAT.chrome} />
      {/* warp sheet: beam → back rest → healds */}
      <Sheet from={[0.64 + beamR, -0.96]} to={[1.44, -0.74]} width={2.58} material={MAT.warpSheet} />
      <Sheet from={[1.46, -0.72]} to={[1.17, -0.12]} width={2.58} material={MAT.warpSheet} />
      {/* drop-wire (warp stop motion) */}
      <Box size={[2.64, 0.07, 0.2]} position={[0, 1.44, -0.44]} material={MAT.loomDark} />
      <Box size={[2.7, 0.03, 0.03]} position={[0, 1.5, -0.38]} material={MAT.aluminium} />

      {/* heald frames */}
      {[heald1, heald2].map((ref, i) => (
        <group key={i} ref={ref} position={[0, 1.16, -0.22 + i * 0.09]}>
          <Box size={[2.58, 0.36, 0.012]} material={MAT.heddles} />
          <Box size={[2.66, 0.035, 0.03]} position={[0, 0.2, 0]} material={MAT.aluminium} />
          <Box size={[2.66, 0.035, 0.03]} position={[0, -0.2, 0]} material={MAT.aluminium} />
          <Box size={[0.035, 0.44, 0.03]} position={[-1.32, 0, 0]} material={MAT.aluminium} />
          <Box size={[0.035, 0.44, 0.03]} position={[1.32, 0, 0]} material={MAT.aluminium} />
        </group>
      ))}

      {/* sley + reed (beats up) */}
      <group ref={sley} position={[0, 0, 0.1]}>
        <Box size={[2.7, 0.09, 0.12]} position={[0, 0.99, 0]} material={MAT.loomDark} />
        <Box size={[2.6, 0.19, 0.012]} position={[0, 1.13, 0]} material={MAT.reed} />
        <Box size={[2.64, 0.025, 0.03]} position={[0, 1.235, 0]} material={MAT.aluminium} />
        {[-1.15, 1.15].map((x) => (
          <Box key={x} size={[0.06, 0.42, 0.06]} position={[x, 0.76, -0.02]} material={MAT.loomDark} />
        ))}
      </group>

      {/* woven cloth: fell → breast beam → take-up roll */}
      <Sheet from={[1.13, 0.16]} to={[1.25, 0.66]} width={2.56} material={clothMat} />
      <Sheet from={[1.24, 0.75]} to={[0.42 + clothR, 0.5]} width={2.56} material={clothMat} />
      <group position={[0, 0.42, 0.5]}>
        <group ref={roll}>
          <CylX r={clothR} h={2.56} material={clothMat} cast />
        </group>
        <CylX r={0.03} h={2.9} material={MAT.steel} />
      </group>
      {/* temples */}
      {[-1.24, 1.24].map((x) => (
        <CylX key={x} r={0.022} h={0.14} position={[x, 1.16, 0.26]} material={MAT.brass} />
      ))}

      {/* waterjet insertion: pump, nozzle, tank */}
      <RBox size={[0.26, 0.34, 0.32]} radius={0.03} position={[-1.88, 0.96, 0.1]} material={MAT.loomDark} cast />
      <Cyl r={0.05} h={0.12} position={[-1.88, 1.18, 0.1]} material={MAT.chrome} />
      <Box size={[0.3, 0.05, 0.05]} position={[-1.52, 1.15, 0.14]} material={MAT.chrome} />
      <group position={[-1.95, 1.48, -0.38]}>
        <Cyl r={0.11} h={0.46} material={MAT.plasticTank} />
        <Cyl r={0.095} h={0.28} position={[0, -0.08, 0]} material={colorMaterial('#5aa7cf', { transparent: true, opacity: 0.6 })} />
        <Cyl r={0.06} h={0.05} position={[0, 0.25, 0]} material={MAT.loomDark} />
      </group>
      <mesh geometry={pipeWater()} material={MAT.bluePvc} />
      <mesh geometry={pipeDrain()} material={MAT.rubber} />
      <group ref={jet} position={[-1.3, 1.15, 0.14]} visible={false}>
        <Box size={[2.6, 0.01, 0.01]} position={[1.3, 0, 0]} material={MAT.water} />
      </group>

      {/* weft supply: package stand + measuring drum */}
      <Cyl r={0.018} h={1.28} position={[-2.14, 0.64, 0.58]} material={MAT.steel} low />
      <Box size={[0.3, 0.03, 0.3]} position={[-2.14, 0.015, 0.58]} material={MAT.darkSteel} />
      <mesh geometry={GEO.yarnCone} position={[-2.14, 1.24, 0.58]} rotation={[0, 0, -0.9]} material={warpMat} castShadow />
      <mesh geometry={weftFeed()} material={MAT.offWhite} />
      <group position={[-1.9, 1.3, 0.34]}>
        <group ref={drum}>
          <CylX r={0.075} h={0.16} material={MAT.aluminium} />
        </group>
        <Box size={[0.12, 0.12, 0.12]} position={[0.12, 0, 0]} material={MAT.loomAccent} />
      </group>

      {/* dobby / cam box and drive */}
      <RBox size={[0.34, 0.36, 0.62]} radius={0.04} position={[-1.5, 1.58, -0.28]} material={MAT.loomAccent} cast />
      <RBox size={[0.1, 0.74, 0.52]} radius={0.03} position={[1.72, 0.7, -0.28]} material={MAT.loomAccent} cast />
      <group position={[1.98, 0.46, -0.28]}>
        <CylX r={0.17} h={0.4} material={MAT.motor} cast />
        <CylX r={0.15} h={0.46} material={MAT.darkSteel} />
        {[-0.12, -0.04, 0.04, 0.12].map((x) => (
          <CylX key={x} r={0.18} h={0.015} position={[x, 0, 0]} material={MAT.motor} low />
        ))}
        <Box size={[0.34, 0.08, 0.3]} position={[0, -0.2, 0]} material={MAT.darkSteel} />
      </group>
      <Cyl r={0.09} h={0.34} position={[0.9, 0.3, 0.86]} material={MAT.greyPvc} />

      {/* control panel with HMI */}
      <group position={[1.5, 1.66, 0.72]} rotation={[-0.25, -0.2, 0]}>
        <RBox size={[0.44, 0.5, 0.13]} radius={0.03} material={MAT.loomBody} cast />
        <TexPlane texture={hmi} width={0.33} height={0.23} position={[0, 0.08, 0.067]} emissive />
        {['#16a34a', '#dc2626', '#e5b400'].map((c, i) => (
          <Cyl key={c} r={0.022} h={0.03} rotation={[Math.PI / 2, 0, 0]} position={[-0.12 + i * 0.07, -0.16, 0.07]} material={colorMaterial(c)} low />
        ))}
        <Cyl r={0.035} h={0.04} rotation={[Math.PI / 2, 0, 0]} position={[0.15, -0.16, 0.075]} material={MAT.red} low />
      </group>
      <mesh geometry={cablePanel()} material={MAT.rubber} />
      <mesh geometry={conduit()} material={MAT.galvanized} />

      {/* signal tower */}
      <group position={[1.56, 1.4, -0.72]}>
        <Cyl r={0.014} h={0.4} position={[0, 0.2, 0]} material={MAT.steel} low />
        <Cyl r={0.042} h={0.065} position={[0, 0.44, 0]} material={lightMat('#22c55e', status === 'running')} low />
        <Cyl r={0.042} h={0.065} position={[0, 0.51, 0]} material={lightMat('#f59e0b', status === 'idle')} low />
        <Cyl r={0.042} h={0.065} position={[0, 0.58, 0]} material={lightMat('#ef4444', false)} low />
        {status === 'maintenance' && (
          <Cyl ref={beacon} r={0.045} h={0.068} position={[0, 0.58, 0]} material={emissiveMaterial('#ff3b30', 6)} low />
        )}
        <Cyl r={0.035} h={0.02} position={[0, 0.62, 0]} material={MAT.loomDark} low />
      </group>

      {/* ID plate */}
      <Label
        width={0.34}
        height={0.12}
        position={[1.5, 1.02, 0.92]}
        opts={{ width: 256, height: 90, bg: '#0f1720', radius: 8, lines: [{ text: machine?.id ?? '', size: 52, color: '#f5f5f4', weight: 800 }] }}
      />

      {status === 'maintenance' && (
        <group>
          {/* opened side cover + tools + cones */}
          <group position={[-1.67, 0.74, 0.6]} rotation={[0, -1.2, 0]}>
            <RBox size={[0.03, 0.86, 1.3]} radius={0.012} position={[0, 0, -0.65]} material={MAT.loomAccent} />
          </group>
          <RBox size={[0.5, 0.24, 0.26]} radius={0.03} position={[-2.5, 0.12, 0.9]} material={MAT.red} cast />
          <Box size={[0.36, 0.03, 0.06]} position={[-2.5, 0.27, 0.9]} material={MAT.darkSteel} />
          <ConeMarker position={[-2.7, 0, 2.05]} />
          <ConeMarker position={[2.7, 0, 2.05]} />
          <Box size={[5.4, 0.08, 0.02]} position={[0, 0.62, 2.05]} material={MAT.hazard} />
          <group position={[0.2, 0, 2.3]}>
            <Label
              width={0.9}
              height={0.5}
              position={[0, 0.72, 0]}
              opts={{ width: 360, height: 200, bg: '#f5c518', radius: 10, lines: [{ text: 'UNDER', size: 60, color: '#111', y: 70 }, { text: 'MAINTENANCE', size: 46, color: '#111', y: 140 }] }}
              doubleSide
            />
            <Box size={[0.04, 0.9, 0.04]} position={[-0.4, 0.45, -0.02]} material={MAT.darkSteel} />
            <Box size={[0.04, 0.9, 0.04]} position={[0.4, 0.45, -0.02]} material={MAT.darkSteel} />
          </group>
        </group>
      )}

      {status === 'idle' && (
        <group position={[0, 0, -2.45]}>
          {/* staged replacement beam on a beam trolley */}
          <Box size={[2.8, 0.08, 0.5]} position={[0, 0.28, 0]} material={MAT.yellow} cast />
          {[-1.2, 1.2].map((x) => (
            <group key={x}>
              <Box size={[0.08, 0.5, 0.08]} position={[x, 0.52, 0]} material={MAT.yellow} />
              <Cyl r={0.08} h={0.06} rotation={[0, 0, Math.PI / 2]} position={[x, 0.08, 0.15]} material={MAT.rubber} low />
              <Cyl r={0.08} h={0.06} rotation={[0, 0, Math.PI / 2]} position={[x, 0.08, -0.15]} material={MAT.rubber} low />
            </group>
          ))}
          <group position={[0, 0.78, 0]}>
            <CylX r={0.055} h={3.0} material={MAT.steel} />
            <CylX r={0.37} h={2.5} material={warpMat} cast />
            <CylX r={0.42} h={0.035} position={[-1.27, 0, 0]} material={MAT.galvanized} />
            <CylX r={0.42} h={0.035} position={[1.27, 0, 0]} material={MAT.galvanized} />
          </group>
        </group>
      )}

      {showLabel && machine && <StatusBadge id={machine.id} status={status} />}
    </group>
  )
})

export { STATUS_COLOR }
