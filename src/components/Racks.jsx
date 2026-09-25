// Steel pallet racking for yarn (cones & cartons) and finished fabric rolls.
// Racks are modelled along +x with the loading face towards +z.
import { memo, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Box, Label } from './primitives'
import { MAT, fabricMaterial } from '../scene/materials'
import { GEO } from '../scene/geometries'
import { rng } from '../scene/textures'

const dummy = new THREE.Object3D()
const col = new THREE.Color()

/** Frame: uprights, beams, bracing and wire decks. */
export function RackFrame({ length, depth, height, bays, levels, deck = true }) {
  const bayW = length / bays
  const xs = Array.from({ length: bays + 1 }, (_, i) => -length / 2 + i * bayW)
  const braceCount = Math.floor(height / 0.9)
  return (
    <group>
      {xs.map((x) => (
        <group key={x} position={[x, 0, 0]}>
          {[-1, 1].map((s) => (
            <group key={s}>
              <Box size={[0.09, height, 0.07]} position={[0, height / 2, (s * depth) / 2]} material={MAT.blueUpright} cast />
              <Box size={[0.16, 0.012, 0.14]} position={[0, 0.006, (s * depth) / 2]} material={MAT.galvanized} />
            </group>
          ))}
          {/* side-frame bracing */}
          {Array.from({ length: braceCount }, (_, i) => {
            const y0 = 0.25 + i * 0.9
            const len = Math.hypot(0.9, depth)
            const ang = Math.atan2(0.9, depth) * (i % 2 ? 1 : -1)
            return (
              <group key={i}>
                <Box size={[0.03, 0.035, depth]} position={[0, y0, 0]} material={MAT.blueUpright} />
                <Box size={[0.03, 0.03, len]} position={[0, y0 + 0.45, 0]} rotation={[ang, 0, 0]} material={MAT.blueUpright} />
              </group>
            )
          })}
          {/* post protector (floor level) */}
          <Box size={[0.14, 0.45, 0.1]} position={[0, 0.225, depth / 2 + 0.04]} material={MAT.yellow} />
        </group>
      ))}
      {levels.slice(1).map((y) => (
        <group key={y}>
          <Box size={[length, 0.11, 0.05]} position={[0, y - 0.055, depth / 2]} material={MAT.orangeBeam} cast />
          <Box size={[length, 0.11, 0.05]} position={[0, y - 0.055, -depth / 2]} material={MAT.orangeBeam} />
          {deck && <Box size={[length - 0.06, 0.02, depth - 0.04]} position={[0, y - 0.01, 0]} material={MAT.galvanized} receive />}
        </group>
      ))}
    </group>
  )
}

/**
 * Yarn rack with instanced cones + cartons.
 * fill 0..1 controls how many pallet positions are stocked.
 */
export const YarnRack = memo(function YarnRack({ rack, inventory, dims, seed = 1 }) {
  const { length, depth, height, bays, levels } = dims
  const coneRef = useRef()
  const cartonRef = useRef()
  const palletRef = useRef()
  const fill = Math.min(1, (inventory?.availableKg ?? 1000) / 2600 + 0.25)
  const color = inventory?.coneColor ?? '#f0ede6'

  const layout = useMemo(() => {
    const r = rng(seed * 97 + 13)
    const cones = []
    const cartons = []
    const pallets = []
    const bayW = length / bays
    levels.forEach((y, li) => {
      for (let b = 0; b < bays; b++) {
        for (let p = 0; p < 2; p++) {
          const cx = -length / 2 + bayW * b + bayW * (p === 0 ? 0.27 : 0.73)
          if (r() > fill) continue
          const base = y + (li === 0 ? 0 : 0.01)
          pallets.push([cx, base, 0])
          const top = base + 0.145
          if (r() < 0.72) {
            const layers = li === levels.length - 1 ? 2 : 2
            for (let l = 0; l < layers; l++) {
              for (let ix = 0; ix < 4; ix++) {
                for (let iz = 0; iz < 3; iz++) {
                  if (l === layers - 1 && r() < 0.12) continue
                  cones.push([cx - 0.39 + ix * 0.26, top + l * 0.285, -0.3 + iz * 0.28, r() * Math.PI])
                }
              }
            }
          } else {
            const stackH = li === levels.length - 1 ? 3 : 2
            for (let l = 0; l < stackH; l++) {
              for (let ix = 0; ix < 2; ix++) {
                for (let iz = 0; iz < 2; iz++) {
                  cartons.push([cx - 0.29 + ix * 0.58, top + 0.2 + l * 0.41, -0.22 + iz * 0.46, (r() - 0.5) * 0.06])
                }
              }
            }
          }
        }
      }
    })
    return { cones, cartons, pallets }
  }, [length, bays, levels, fill, seed])

  useLayoutEffect(() => {
    const base = new THREE.Color(color)
    const r = rng(seed * 31 + 7)
    layout.cones.forEach(([x, y, z, ry], i) => {
      dummy.position.set(x, y, z)
      dummy.rotation.set(0, ry, 0)
      dummy.scale.setScalar(1)
      dummy.updateMatrix()
      coneRef.current.setMatrixAt(i, dummy.matrix)
      col.copy(base).offsetHSL(0, 0, (r() - 0.5) * 0.05)
      coneRef.current.setColorAt(i, col)
    })
    coneRef.current.instanceMatrix.needsUpdate = true
    if (coneRef.current.instanceColor) coneRef.current.instanceColor.needsUpdate = true
    coneRef.current.computeBoundingSphere()
    coneRef.current.computeBoundingBox?.()
    layout.cartons.forEach(([x, y, z, ry], i) => {
      dummy.position.set(x, y, z)
      dummy.rotation.set(0, ry, 0)
      dummy.scale.set(0.56, 0.4, 0.44)
      dummy.updateMatrix()
      cartonRef.current.setMatrixAt(i, dummy.matrix)
    })
    cartonRef.current.instanceMatrix.needsUpdate = true
    cartonRef.current.computeBoundingSphere()
    cartonRef.current.computeBoundingBox?.()
    layout.pallets.forEach(([x, y, z], i) => {
      dummy.position.set(x, y, z)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.set(1, 1, Math.min(1, depth / 1.05))
      dummy.updateMatrix()
      palletRef.current.setMatrixAt(i, dummy.matrix)
    })
    palletRef.current.instanceMatrix.needsUpdate = true
    palletRef.current.computeBoundingSphere()
    palletRef.current.computeBoundingBox?.()
  }, [layout, color, seed, depth])

  const coneMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.55, metalness: 0.02 }), [])

  return (
    <group>
      <RackFrame length={length} depth={depth} height={height} bays={bays} levels={levels} />
      <instancedMesh ref={coneRef} args={[GEO.yarnCone, coneMat, Math.max(1, layout.cones.length)]} receiveShadow />
      <instancedMesh ref={cartonRef} args={[GEO.box, MAT.cardboard, Math.max(1, layout.cartons.length)]} castShadow receiveShadow />
      <instancedMesh ref={palletRef} args={[GEO.pallet, MAT.wood, Math.max(1, layout.pallets.length)]} receiveShadow />
      {/* rack label */}
      <Label
        width={1.9}
        height={0.42}
        position={[0, levels[1] - 0.06, depth / 2 + 0.03]}
        opts={{
          width: 512, height: 112, bg: '#f8fafc', radius: 6,
          lines: [
            { text: rack, size: 46, color: '#0f172a', align: 'left', x: 20, y: 40, weight: 800 },
            { text: inventory ? `${inventory.count}` : '', size: 40, color: '#1d4ed8', align: 'right', x: 492, y: 40, weight: 800 },
            { text: inventory ? `${inventory.yarnType} · ${inventory.variety}` : '', size: 30, color: '#334155', align: 'left', x: 20, y: 88, weight: 600 },
          ],
        }}
      />
    </group>
  )
})

/** Finished goods rack: rolls lie along the rack depth (z). */
export const FabricRack = memo(function FabricRack({ rack, stock, dims, seed = 1 }) {
  const { length, depth, height, bays, levels } = dims
  const rollRef = useRef()
  const fill = Math.min(1, (stock?.availableM ?? 4000) / 8000 + 0.3)
  const color = stock?.colorHex ?? '#e3dfd5'

  const rolls = useMemo(() => {
    const r = rng(seed * 53 + 3)
    const list = []
    const bayW = length / bays
    const rr = 0.15
    levels.forEach((y) => {
      for (let b = 0; b < bays; b++) {
        if (r() > fill) continue
        const x0 = -length / 2 + bayW * b + 0.12 + rr
        const n = Math.floor((bayW - 0.24) / (rr * 2))
        const base = y + 0.01 + rr
        for (let i = 0; i < n; i++) list.push([x0 + i * rr * 2, base, 0])
        if (r() < 0.85) for (let i = 0; i < n - 1; i++) list.push([x0 + rr + i * rr * 2, base + rr * 1.72, 0])
        if (r() < 0.4) for (let i = 1; i < n - 2; i++) list.push([x0 + rr * 2 + (i - 1) * rr * 2, base + rr * 3.44, 0])
      }
    })
    return list
  }, [length, bays, levels, fill, seed])

  const mats = useMemo(() => [fabricMaterial('#ffffff', true), MAT.rollSide, MAT.rollSide], [])

  useLayoutEffect(() => {
    const base = new THREE.Color(color)
    const r = rng(seed * 11 + 5)
    rolls.forEach(([x, y, z], i) => {
      dummy.position.set(x, y, z + (r() - 0.5) * 0.08)
      dummy.rotation.set(Math.PI / 2, 0, 0)
      dummy.scale.set(0.3, 1.62, 0.3)
      dummy.updateMatrix()
      rollRef.current.setMatrixAt(i, dummy.matrix)
      col.copy(base).offsetHSL(0, 0, (r() - 0.5) * 0.06)
      rollRef.current.setColorAt(i, col)
    })
    rollRef.current.instanceMatrix.needsUpdate = true
    if (rollRef.current.instanceColor) rollRef.current.instanceColor.needsUpdate = true
    rollRef.current.computeBoundingSphere()
    rollRef.current.computeBoundingBox?.()
  }, [rolls, color, seed])

  return (
    <group>
      <RackFrame length={length} depth={depth} height={height} bays={bays} levels={levels} deck={false} />
      {/* roll support bars */}
      {levels.slice(1).map((y) => (
        <group key={y}>
          {Array.from({ length: bays * 3 }, (_, i) => (
            <Box key={i} size={[0.05, 0.05, depth]} position={[-length / 2 + 0.45 + i * (length / (bays * 3)), y - 0.03, 0]} material={MAT.galvanized} />
          ))}
        </group>
      ))}
      <instancedMesh ref={rollRef} args={[GEO.roll, mats, Math.max(1, rolls.length)]} castShadow receiveShadow />
      <Label
        width={1.9}
        height={0.42}
        position={[0, levels[1] - 0.06, depth / 2 + 0.03]}
        opts={{
          width: 512, height: 112, bg: '#fffbeb', radius: 6,
          lines: [
            { text: rack, size: 46, color: '#0f172a', align: 'left', x: 20, y: 40, weight: 800 },
            { text: stock ? `LOT ${stock.lot.replace('LT-', '')}` : '', size: 32, color: '#b45309', align: 'right', x: 492, y: 40, weight: 800 },
            { text: stock ? stock.fabricType : '', size: 30, color: '#334155', align: 'left', x: 20, y: 88, weight: 600 },
          ],
        }}
      />
    </group>
  )
})
