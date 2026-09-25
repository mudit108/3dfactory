// Office furniture and equipment.
import { useMemo } from 'react'
import { Box, Cyl, RBox, TexPlane } from './primitives'
import { MAT, colorMaterial } from '../scene/materials'
import { monitorTexture, whiteboardTexture } from '../scene/textures'

const laminate = () => colorMaterial('#8a6a4c', { roughness: 0.55 })
const greyMetal = () => colorMaterial('#5c636b', { roughness: 0.45, metalness: 0.5 })

export function Desk({ position, rotation = 0, width = 1.6, depth = 0.8, kind = 'accounts' }) {
  const top = useMemo(laminate, [])
  const leg = useMemo(greyMetal, [])
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <RBox size={[width, 0.04, depth]} radius={0.015} position={[0, 0.75, 0]} material={top} cast receive />
      {[-1, 1].map((s) => (
        <Box key={s} size={[0.05, 0.73, depth - 0.1]} position={[s * (width / 2 - 0.06), 0.365, 0]} material={leg} />
      ))}
      <Box size={[width - 0.16, 0.4, 0.02]} position={[0, 0.5, -depth / 2 + 0.08]} material={leg} />
      {/* drawer pedestal */}
      <Box size={[0.42, 0.6, depth - 0.12]} position={[width / 2 - 0.3, 0.33, 0]} material={top} cast />
      {[0.15, 0.33, 0.51].map((y) => (
        <Box key={y} size={[0.12, 0.015, 0.015]} position={[width / 2 - 0.3, y, depth / 2 - 0.05]} material={MAT.chrome} />
      ))}
      <Monitor position={[0, 0.77, -depth / 2 + 0.2]} kind={kind} />
      <Box size={[0.44, 0.02, 0.15]} position={[0, 0.78, 0.12]} material={MAT.black} />
      <RBox size={[0.06, 0.025, 0.1]} radius={0.01} position={[0.32, 0.78, 0.14]} material={MAT.black} />
      <RBox size={[0.2, 0.45, 0.42]} radius={0.02} position={[-width / 2 + 0.2, 0.225, 0]} material={MAT.black} />
    </group>
  )
}

export function Monitor({ position, rotation = 0, kind = 'accounts' }) {
  const tex = useMemo(() => monitorTexture(kind), [kind])
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Box size={[0.22, 0.015, 0.16]} position={[0, 0.008, 0]} material={MAT.black} />
      <Box size={[0.04, 0.25, 0.03]} position={[0, 0.13, -0.02]} material={MAT.black} />
      <RBox size={[0.6, 0.36, 0.035]} radius={0.01} position={[0, 0.38, 0]} material={MAT.black} cast />
      <TexPlane texture={tex} width={0.56} height={0.32} position={[0, 0.385, 0.019]} emissive />
    </group>
  )
}

export function OfficeChair({ position, rotation = 0, color = '#1f2937' }) {
  const fabric = useMemo(() => colorMaterial(color, { roughness: 0.85 }), [color])
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <RBox size={[0.5, 0.08, 0.48]} radius={0.03} position={[0, 0.47, 0]} material={fabric} cast />
      <RBox size={[0.48, 0.58, 0.07]} radius={0.04} position={[0, 0.82, -0.24]} rotation={[-0.1, 0, 0]} material={fabric} cast />
      <Cyl r={0.03} h={0.36} position={[0, 0.26, 0]} material={MAT.chrome} low />
      {Array.from({ length: 5 }, (_, i) => (
        <group key={i} rotation={[0, (i / 5) * Math.PI * 2, 0]}>
          <Box size={[0.03, 0.03, 0.3]} position={[0, 0.07, 0.15]} material={MAT.black} />
          <Cyl r={0.025} h={0.04} position={[0, 0.03, 0.29]} material={MAT.black} low />
        </group>
      ))}
      {[-1, 1].map((s) => (
        <Box key={s} size={[0.04, 0.03, 0.3]} position={[s * 0.27, 0.66, 0]} material={MAT.black} />
      ))}
    </group>
  )
}

export function FilingCabinet({ position, rotation = 0, drawers = 4 }) {
  const body = useMemo(() => colorMaterial('#7d858c', { roughness: 0.45, metalness: 0.4 }), [])
  const h = drawers * 0.33
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <RBox size={[0.47, h, 0.62]} radius={0.015} position={[0, h / 2, 0]} material={body} cast />
      {Array.from({ length: drawers }, (_, i) => (
        <group key={i}>
          <Box size={[0.43, 0.005, 0.005]} position={[0, 0.33 * (i + 1) - 0.005, 0.312]} material={MAT.darkSteel} />
          <Box size={[0.14, 0.025, 0.02]} position={[0, 0.33 * i + 0.24, 0.32]} material={MAT.chrome} />
          <Box size={[0.08, 0.04, 0.005]} position={[0, 0.33 * i + 0.2, 0.313]} material={MAT.paper} />
        </group>
      ))}
    </group>
  )
}

export function Printer({ position, rotation = 0 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <RBox size={[0.46, 0.26, 0.4]} radius={0.03} position={[0, 0.13, 0]} material={MAT.offWhite} cast />
      <Box size={[0.3, 0.04, 0.2]} position={[0, 0.27, -0.05]} material={MAT.darkSteel} />
      <Box size={[0.28, 0.01, 0.16]} position={[0, 0.12, 0.23]} material={MAT.paper} />
      <Box size={[0.08, 0.04, 0.02]} position={[0.14, 0.2, 0.2]} material={colorMaterial('#223a56')} />
    </group>
  )
}

export function Papers({ position, rotation = 0, n = 3 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {Array.from({ length: n }, (_, i) => (
        <Box key={i} size={[0.21, 0.004, 0.297]} position={[i * 0.02, i * 0.005, i * 0.015]} rotation={[0, i * 0.12, 0]} material={MAT.paper} />
      ))}
    </group>
  )
}

export function Calculator({ position, rotation = 0 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <RBox size={[0.11, 0.02, 0.17]} radius={0.008} material={colorMaterial('#2c2f33')} />
      <Box size={[0.08, 0.003, 0.035]} position={[0, 0.011, -0.055]} material={colorMaterial('#a8b5a2', { emissive: '#a8b5a2', emissiveIntensity: 0.2 })} />
      <Box size={[0.085, 0.003, 0.09]} position={[0, 0.011, 0.02]} material={colorMaterial('#6b7178')} />
    </group>
  )
}

export function Files({ position, rotation = 0 }) {
  const colors = ['#1f4e8c', '#8c1f2b', '#2d6a4f', '#c68b18', '#1f4e8c']
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {colors.map((c, i) => (
        <Box key={i} size={[0.06, 0.3, 0.24]} position={[i * 0.065, 0.15, 0]} material={colorMaterial(c)} />
      ))}
    </group>
  )
}

export function Sofa({ position, rotation = 0, color = '#4b5563', seats = 3 }) {
  const mat = useMemo(() => colorMaterial(color, { roughness: 0.9 }), [color])
  const w = seats * 0.7
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <RBox size={[w + 0.3, 0.42, 0.85]} radius={0.06} position={[0, 0.25, 0]} material={mat} cast />
      <RBox size={[w + 0.3, 0.5, 0.2]} radius={0.06} position={[0, 0.65, -0.33]} material={mat} cast />
      {[-1, 1].map((s) => (
        <RBox key={s} size={[0.18, 0.3, 0.85]} radius={0.06} position={[s * (w / 2 + 0.06), 0.56, 0]} material={mat} />
      ))}
      {Array.from({ length: seats }, (_, i) => (
        <RBox key={i} size={[0.66, 0.1, 0.62]} radius={0.04} position={[-w / 2 + 0.35 + i * 0.7, 0.51, 0.05]} material={mat} />
      ))}
    </group>
  )
}

export function Whiteboard({ position, rotation = 0 }) {
  const tex = useMemo(() => whiteboardTexture(), [])
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Box size={[1.9, 1.2, 0.04]} material={MAT.aluminium} />
      <TexPlane texture={tex} width={1.82} height={1.12} position={[0, 0, 0.021]} />
      <Box size={[1.6, 0.03, 0.08]} position={[0, -0.62, 0.04]} material={MAT.aluminium} />
    </group>
  )
}

export function Safe({ position, rotation = 0 }) {
  const body = useMemo(() => colorMaterial('#3c4a3f', { roughness: 0.4, metalness: 0.5 }), [])
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <RBox size={[0.6, 0.9, 0.6]} radius={0.03} position={[0, 0.45, 0]} material={body} cast />
      <Cyl r={0.07} h={0.03} rotation={[Math.PI / 2, 0, 0]} position={[0.1, 0.55, 0.31]} material={MAT.chrome} low />
      <Box size={[0.03, 0.2, 0.03]} position={[-0.12, 0.5, 0.31]} material={MAT.chrome} />
    </group>
  )
}

export function CoffeeTable({ position }) {
  const top = useMemo(laminate, [])
  return (
    <group position={position}>
      <RBox size={[1.1, 0.05, 0.6]} radius={0.02} position={[0, 0.42, 0]} material={MAT.glass} />
      <Box size={[1.0, 0.03, 0.5]} position={[0, 0.12, 0]} material={top} />
      {[[-0.5, -0.25], [0.5, -0.25], [-0.5, 0.25], [0.5, 0.25]].map(([x, z]) => (
        <Box key={x + '' + z} size={[0.04, 0.42, 0.04]} position={[x, 0.21, z]} material={MAT.chrome} />
      ))}
    </group>
  )
}
