// Tiny building blocks that draw from the shared geometry/material pools.
import { useMemo } from 'react'
import * as THREE from 'three'
import { Billboard } from '@react-three/drei'
import { GEO, roundedBox } from '../scene/geometries'
import { labelTexture } from '../scene/textures'
import { labelMaterial } from '../scene/materials'

export function Box({ size = [1, 1, 1], material, cast = false, receive = false, ...props }) {
  return <mesh geometry={GEO.box} scale={size} material={material} castShadow={cast} receiveShadow={receive} {...props} />
}

/** Cylinder with radius r and height h (axis = local y). */
export function Cyl({ r = 0.5, h = 1, material, cast = false, receive = false, low = false, ...props }) {
  return (
    <mesh geometry={low ? GEO.cylLow : GEO.cyl} scale={[r * 2, h, r * 2]} material={material} castShadow={cast} receiveShadow={receive} {...props} />
  )
}

/** Cylinder lying along x. */
export function CylX({ r, h, rotation, ...props }) {
  return <Cyl r={r} h={h} rotation={[0, 0, Math.PI / 2]} {...props} />
}

export function RBox({ size = [1, 1, 1], radius = 0.04, material, cast = false, receive = false, ...props }) {
  const g = roundedBox(size[0], size[1], size[2], Math.min(radius, Math.min(...size) / 2.05), 2)
  return <mesh geometry={g} material={material} castShadow={cast} receiveShadow={receive} {...props} />
}

export function Sphere({ r = 0.5, material, low = false, cast = false, ...props }) {
  return <mesh geometry={low ? GEO.sphereLow : GEO.sphere} scale={r * 2} material={material} castShadow={cast} {...props} />
}

/** Flat textured sign/label plane. opts are passed to labelTexture. */
export function Label({ width = 1, height = 0.25, opts, emissive = false, doubleSide = false, ...props }) {
  const mat = useMemo(() => {
    const tex = labelTexture(opts)
    return labelMaterial(tex, { emissive, side: doubleSide ? THREE.DoubleSide : THREE.FrontSide })
  }, [opts, emissive, doubleSide])
  return <mesh geometry={GEO.plane} scale={[width, height, 1]} material={mat} {...props} />
}

/** Plane with arbitrary texture. */
export function TexPlane({ texture, width = 1, height = 1, emissive = false, doubleSide = false, ...props }) {
  const mat = useMemo(
    () => labelMaterial(texture, { emissive, side: doubleSide ? THREE.DoubleSide : THREE.FrontSide }),
    [texture, emissive, doubleSide],
  )
  return <mesh geometry={GEO.plane} scale={[width, height, 1]} material={mat} {...props} />
}

/** Camera-facing label. */
export function FloatingLabel({ position, width = 1.4, height = 0.4, opts }) {
  return (
    <Billboard position={position} follow>
      <Label width={width} height={height} opts={opts} emissive />
    </Billboard>
  )
}

/** Flat plane on the floor spanning two points (used for painted lines). */
export function FloorLine({ from, to, width = 0.1, material, y = 0.012 }) {
  const dx = to[0] - from[0]
  const dz = to[1] - from[1]
  const len = Math.hypot(dx, dz)
  const ang = Math.atan2(dx, dz)
  return (
    <mesh
      geometry={GEO.plane}
      material={material}
      position={[(from[0] + to[0]) / 2, y, (from[1] + to[1]) / 2]}
      rotation={[-Math.PI / 2, 0, ang]}
      scale={[width, len, 1]}
      receiveShadow
    />
  )
}

/** Rectangle outline painted on the floor. rect = [x1, z1, x2, z2] */
export function FloorRect({ rect, width = 0.1, material, y }) {
  const [x1, z1, x2, z2] = rect
  return (
    <group>
      <FloorLine from={[x1, z1]} to={[x2, z1]} width={width} material={material} y={y} />
      <FloorLine from={[x1, z2]} to={[x2, z2]} width={width} material={material} y={y} />
      <FloorLine from={[x1, z1]} to={[x1, z2]} width={width} material={material} y={y} />
      <FloorLine from={[x2, z1]} to={[x2, z2]} width={width} material={material} y={y} />
    </group>
  )
}

/** A sheet (plane) spanning between two points in the YZ plane, width along x. */
export function Sheet({ from, to, width, material, x = 0 }) {
  const [y1, z1] = from
  const [y2, z2] = to
  const dy = y2 - y1
  const dz = z2 - z1
  const len = Math.hypot(dy, dz)
  const theta = Math.atan2(dz, dy)
  return (
    <mesh
      geometry={GEO.plane}
      material={material}
      position={[x, (y1 + y2) / 2, (z1 + z2) / 2]}
      rotation={[theta, 0, 0]}
      scale={[width, len, 1]}
    />
  )
}
