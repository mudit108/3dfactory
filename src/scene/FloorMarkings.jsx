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
      {/* main front aisle + green pedestrian walkway */}
      <FloorLine from={[-54, 14.4]} to={[54, 14.4]} width={0.12} material={yellow} />
      <mesh geometry={GEO.plane} material={walkway} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.009, 15.6]} scale={[104, 1.4, 1]} />
      <mesh geometry={GEO.plane} material={walkway} rotation={[-Math.PI / 2, 0, 0]} position={[-0.5, 0.009, 19]} scale={[2.4, 6, 1]} />
      {Array.from({ length: 4 }, (_, i) => (
        <mesh key={i} geometry={GEO.plane} material={white} rotation={[-Math.PI / 2, 0, 0]} position={[-0.5, 0.012, 17.4 + i * 1.4]} scale={[2.2, 0.35, 1]} />
      ))}
      {/* aisles between loom rows */}
      {[-11.5, -2.5, 6.5].map((z) => (
        <FloorLine key={z} from={[-34, z]} to={[22, z]} width={0.1} material={white} />
      ))}
      {/* zone outlines */}
      <FloorRect rect={[-54.4, -21.4, -35.6, 21.4]} width={0.14} material={yellow} />
      <FloorRect rect={[24.4, -21.4, 54.4, 21.4]} width={0.14} material={yellow} />
      {/* painted zone names */}
      <FloorText text="YARN STOCK" position={[-45, 21]} width={7} />
      <FloorText text="WATERJET LOOMS" position={[-6, 18.6]} width={9} />
      <FloorText text="FINISHED STOCK" position={[39.5, 9]} width={8} />
    </group>
  )
}
