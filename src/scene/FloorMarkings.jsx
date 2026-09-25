// Painted floor markings: aisles, pedestrian walkways, zone lettering.
import { useMemo } from 'react'
import { FloorLine, FloorRect, Label } from '../components/primitives'
import { colorMaterial } from './materials'
import { GEO } from './geometries'

function FloorText({ text, position, rotation = 0, width = 6, color = '#e3b21c' }) {
  return (
    <Label
      width={width}
      height={width * 0.16}
      position={[position[0], 0.014, position[1]]}
      rotation={[-Math.PI / 2, 0, rotation]}
      opts={{ width: 1024, height: 164, bg: null, lines: [{ text, size: 110, color, weight: 800, letter: 14 }] }}
    />
  )
}

export default function FloorMarkings() {
  const yellow = useMemo(() => colorMaterial('#d9a514', { roughness: 0.7 }), [])
  const white = useMemo(() => colorMaterial('#e8e6df', { roughness: 0.7 }), [])
  const walkway = useMemo(() => colorMaterial('#2f6e4e', { roughness: 0.6 }), [])
  return (
    <group>
      {/* main cross aisle (front) */}
      <FloorLine from={[-49, 12]} to={[44, 12]} width={0.12} material={yellow} />
      <FloorLine from={[-49, 16.5]} to={[44, 16.5]} width={0.12} material={yellow} />
      {/* pedestrian walkway from entrance */}
      <mesh geometry={GEO.plane} material={walkway} rotation={[-Math.PI / 2, 0, 0]} position={[-6.5, 0.009, 22.7]} scale={[2.4, 14.6, 1]} />
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} geometry={GEO.plane} material={white} rotation={[-Math.PI / 2, 0, 0]} position={[-6.5, 0.012, 16.9 + i * 1.6]} scale={[2.2, 0.35, 1]} />
      ))}
      <mesh geometry={GEO.plane} material={walkway} rotation={[-Math.PI / 2, 0, 0]} position={[-2.5, 0.009, 14.25]} scale={[82, 1.4, 1]} />
      {/* production aisles between loom rows */}
      {[-24.5, -15.5, -6.5].map((z) => (
        <FloorLine key={z} from={[-27, z]} to={[13, z]} width={0.1} material={white} />
      ))}
      {/* zone outlines */}
      <FloorRect rect={[-49.4, -29.4, -30.6, 13.4]} width={0.14} material={yellow} />
      <FloorRect rect={[23.5, -29.4, 49.4, -3]} width={0.14} material={yellow} />
      <FloorRect rect={[23.5, 4.2, 44, 28.6]} width={0.14} material={yellow} />
      <FloorRect rect={[14.8, -24, 22.3, 7]} width={0.1} material={white} />
      {/* painted zone names */}
      <FloorText text="YARN STOCK" position={[-37.5, 11]} width={7} />
      <FloorText text="WEAVING HALL" position={[-7, 9.2]} width={8} />
      <FloorText text="FINISHED GOODS" position={[33, -1.5]} width={8} />
      <FloorText text="DISPATCH" position={[30.5, 10.2]} width={6} />
      <FloorText text="INSPECTION" position={[18.5, 5.3]} width={4.4} color="#c4b5fd" />
    </group>
  )
}
