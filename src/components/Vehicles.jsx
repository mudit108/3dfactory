// Delivery truck (container body) and simple parked cars.
import { useMemo } from 'react'
import { Box, RBox, Label, Cyl } from './primitives'
import { MAT, colorMaterial, emissiveMaterial } from '../scene/materials'
import { RollStack } from './Props'

function Wheel({ position, r = 0.52, w = 0.3 }) {
  return (
    <group position={position} rotation={[Math.PI / 2, 0, 0]}>
      <Cyl r={r} h={w} material={MAT.rubber} cast />
      <Cyl r={r * 0.55} h={w + 0.02} material={MAT.galvanized} />
      <Cyl r={r * 0.2} h={w + 0.05} material={MAT.darkSteel} low />
    </group>
  )
}

/**
 * Local frame: rear of the cargo box at x = 0, cab towards +x, width along z.
 * Cargo floor at y ≈ 1.1 to match the dock height.
 */
export function Truck({ rollsLoaded = 42, rollsTotal = 60 }) {
  const cab = useMemo(() => colorMaterial('#1f4e8c', { roughness: 0.35, metalness: 0.35 }), [])
  const bodyMat = useMemo(() => colorMaterial('#d9dde1', { roughness: 0.5, metalness: 0.3 }), [])
  const stripe = useMemo(() => colorMaterial('#e0a31c', { roughness: 0.4 }), [])
  const glass = MAT.tintedGlass
  const L = 7.2
  const W = 2.5
  const H = 2.6
  const floorY = 1.1
  const loadFrac = rollsLoaded / rollsTotal
  const filled = L * 0.92 * loadFrac
  return (
    <group>
      {/* chassis */}
      <Box size={[9.6, 0.25, 1.0]} position={[4.9, 0.85, 0]} material={MAT.castIron} cast />
      <Box size={[L, 0.12, W]} position={[L / 2, floorY - 0.06, 0]} material={MAT.darkSteel} cast />
      {/* container body: sides + front + roof (rear open) */}
      <Box size={[L, H, 0.05]} position={[L / 2, floorY + H / 2, W / 2]} material={bodyMat} cast />
      <Box size={[L, H, 0.05]} position={[L / 2, floorY + H / 2, -W / 2]} material={bodyMat} cast />
      <Box size={[0.05, H, W]} position={[L, floorY + H / 2, 0]} material={bodyMat} cast />
      <Box size={[L, 0.05, W]} position={[L / 2, floorY + H, 0]} material={bodyMat} />
      {/* ribs */}
      {Array.from({ length: 9 }, (_, i) => (
        <group key={i}>
          <Box size={[0.06, H, 0.04]} position={[0.2 + i * 0.85, floorY + H / 2, W / 2 + 0.03]} material={MAT.galvanized} />
          <Box size={[0.06, H, 0.04]} position={[0.2 + i * 0.85, floorY + H / 2, -W / 2 - 0.03]} material={MAT.galvanized} />
        </group>
      ))}
      <Box size={[L, 0.18, 0.02]} position={[L / 2, floorY + 0.35, W / 2 + 0.05]} material={stripe} />
      <Box size={[L, 0.18, 0.02]} position={[L / 2, floorY + 0.35, -W / 2 - 0.05]} material={stripe} />
      <Label
        width={4.2}
        height={0.6}
        position={[L / 2, floorY + 1.6, W / 2 + 0.06]}
        opts={{ width: 1024, height: 146, bg: null, lines: [{ text: 'SHREE GANESH ROADLINES', size: 78, color: '#1f3a68', weight: 800 }] }}
      />
      {/* rear doors swung open */}
      {[-1, 1].map((s) => (
        <group key={s} position={[0, floorY + H / 2, (s * W) / 2]} rotation={[0, s * -1.45, 0]}>
          <Box size={[0.05, H - 0.05, W / 2]} position={[0, 0, (-s * W) / 4]} material={bodyMat} cast />
          <Box size={[0.07, 0.07, W / 2 - 0.1]} position={[-0.03, 0.4, (-s * W) / 4]} material={MAT.steel} />
        </group>
      ))}
      <Box size={[0.2, 0.18, W]} position={[-0.05, floorY - 0.15, 0]} material={MAT.hazard} />
      {/* load inside (from the front of the box) */}
      {filled > 0.4 && (
        <group position={[L - filled / 2 - 0.1, floorY, 0]}>
          {Array.from({ length: Math.max(1, Math.floor(filled / 2.2)) }, (_, i) => (
            <RollStack key={i} position={[filled / 2 - 1.1 - i * 2.2, 0, 0]} rotation={Math.PI / 2} rows={7} layers={5} pallet={false} colors={['#e8e6df', '#28324a', '#d9d2c1']} seed={i + 3} rollLength={1.55} />
          ))}
        </group>
      )}
      {/* cab */}
      <group position={[L + 0.2, 0, 0]}>
        <RBox size={[2.1, 2.1, W]} radius={0.14} position={[1.05, 2.05, 0]} material={cab} cast />
        <RBox size={[0.3, 1.0, W - 0.1]} radius={0.08} position={[2.15, 1.4, 0]} material={cab} />
        <Box size={[0.04, 0.9, W - 0.3]} position={[2.12, 2.55, 0]} rotation={[0, 0, 0.12]} material={glass} />
        <Box size={[1.0, 0.7, 0.03]} position={[1.35, 2.45, W / 2 + 0.005]} material={glass} />
        <Box size={[1.0, 0.7, 0.03]} position={[1.35, 2.45, -W / 2 - 0.005]} material={glass} />
        <Box size={[0.06, 0.55, 1.4]} position={[2.32, 1.3, 0]} material={MAT.chrome} />
        {[-0.35, -0.2, -0.05].map((y) => (
          <Box key={y} size={[0.065, 0.03, 1.36]} position={[2.33, 1.45 + y, 0]} material={MAT.darkSteel} />
        ))}
        {[-1, 1].map((s) => (
          <group key={s}>
            <Cyl r={0.12} h={0.06} rotation={[0, 0, Math.PI / 2]} position={[2.31, 1.35, s * 0.95]} material={emissiveMaterial('#fff6d8', 1.8)} low />
            <Box size={[0.04, 0.3, 0.14]} position={[1.9, 2.5, s * (W / 2 + 0.25)]} material={MAT.black} />
            <Box size={[0.3, 0.03, 0.03]} position={[1.9, 2.5, s * (W / 2 + 0.12)]} material={MAT.black} />
          </group>
        ))}
        <Box size={[0.25, 0.35, W + 0.2]} position={[2.3, 0.75, 0]} material={MAT.castIron} cast />
        <Box size={[1.2, 0.1, W + 0.05]} position={[1.0, 3.13, 0]} material={stripe} />
        <Label width={0.62} height={0.16} position={[2.44, 0.75, 0]} rotation={[0, Math.PI / 2, 0]} opts={{ width: 512, height: 128, bg: '#f4d03f', radius: 8, lines: [{ text: 'GJ 05 BX 4821', size: 64, color: '#111', weight: 800 }] }} />
        <Box size={[0.9, 0.5, 0.5]} position={[0.2, 0.95, -1.05]} material={MAT.chrome} />
      </group>
      {/* wheels */}
      <Wheel position={[1.2, 0.52, 1.0]} />
      <Wheel position={[1.2, 0.52, -1.0]} />
      <Wheel position={[2.35, 0.52, 1.0]} />
      <Wheel position={[2.35, 0.52, -1.0]} />
      <Wheel position={[8.45, 0.52, 1.05]} />
      <Wheel position={[8.45, 0.52, -1.05]} />
      {/* mud flaps */}
      <Box size={[0.03, 0.45, 0.5]} position={[0.55, 0.45, 1.0]} material={MAT.rubber} />
      <Box size={[0.03, 0.45, 0.5]} position={[0.55, 0.45, -1.0]} material={MAT.rubber} />
    </group>
  )
}

export function Car({ position, rotation = 0, color = '#9aa4ad' }) {
  const body = useMemo(() => colorMaterial(color, { roughness: 0.3, metalness: 0.5 }), [color])
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <RBox size={[4.2, 0.7, 1.75]} radius={0.2} position={[0, 0.6, 0]} material={body} cast />
      <RBox size={[2.3, 0.6, 1.6]} radius={0.2} position={[-0.2, 1.15, 0]} material={body} cast />
      <Box size={[2.2, 0.45, 1.62]} position={[-0.2, 1.17, 0]} material={MAT.tintedGlass} />
      {[[-1.3, 0.8], [1.3, 0.8], [-1.3, -0.8], [1.3, -0.8]].map(([x, z]) => (
        <group key={x + '' + z} position={[x, 0.33, z]} rotation={[Math.PI / 2, 0, 0]}>
          <Cyl r={0.33} h={0.22} material={MAT.rubber} />
        </group>
      ))}
    </group>
  )
}
