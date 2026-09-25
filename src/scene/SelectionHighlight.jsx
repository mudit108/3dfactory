// Corner-bracket highlight + pulsing floor ring for hovered/selected objects.
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useFactoryStore } from '../hooks/useFactoryStore'
import { interactiveRegistry } from './cameraState'
import { GEO } from './geometries'

const box = new THREE.Box3()

function Highlighter({ which, color }) {
  const lines = useRef()
  const ring = useRef()
  const fill = useRef()
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(48 * 3), 3))
    return g
  }, [])
  const lineMat = useMemo(() => new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95, depthTest: false, toneMapped: false }), [color])
  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }), [color])
  const fillMat = useMemo(() => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.06, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }), [color])

  useFrame((state) => {
    const st = useFactoryStore.getState()
    const item = which === 'selected' ? st.selected : st.hovered
    const hide = !item || (which === 'hovered' && st.selected?.key === item?.key) || st.mode === 'walk'
    const obj = item && interactiveRegistry.get(item.key)
    if (hide || !obj) {
      lines.current.visible = false
      ring.current.visible = false
      fill.current.visible = false
      return
    }
    box.setFromObject(obj)
    if (box.isEmpty()) return
    box.expandByScalar(0.12)
    const { min: a, max: b } = box
    const sx = b.x - a.x
    const sy = b.y - a.y
    const sz = b.z - a.z
    const L = [Math.min(sx, 1.2) * 0.28, Math.min(sy, 1.2) * 0.28, Math.min(sz, 1.2) * 0.28]
    const arr = geo.attributes.position.array
    let i = 0
    const push = (x, y, z) => {
      arr[i++] = x
      arr[i++] = y
      arr[i++] = z
    }
    for (const cx of [a.x, b.x])
      for (const cy of [a.y, b.y])
        for (const cz of [a.z, b.z]) {
          const dx = cx === a.x ? 1 : -1
          const dy = cy === a.y ? 1 : -1
          const dz = cz === a.z ? 1 : -1
          push(cx, cy, cz); push(cx + dx * L[0], cy, cz)
          push(cx, cy, cz); push(cx, cy + dy * L[1], cz)
          push(cx, cy, cz); push(cx, cy, cz + dz * L[2])
        }
    geo.attributes.position.needsUpdate = true
    geo.computeBoundingSphere()
    lines.current.visible = true
    const t = state.clock.elapsedTime
    const r = Math.max(sx, sz) * 0.62 + 0.3
    ring.current.visible = true
    ring.current.position.set((a.x + b.x) / 2, a.y + 0.04, (a.z + b.z) / 2)
    const pulse = 1 + Math.sin(t * 4) * 0.04
    ring.current.scale.set(r * pulse, r * pulse, 1)
    fill.current.visible = true
    fill.current.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2)
    fill.current.scale.set(sx, sy, sz)
    lineMat.opacity = which === 'selected' ? 0.95 : 0.6 + Math.sin(t * 6) * 0.2
  })

  return (
    <group>
      <lineSegments ref={lines} geometry={geo} material={lineMat} renderOrder={999} frustumCulled={false} />
      <mesh ref={ring} geometry={GEO.ring} material={ringMat} rotation={[-Math.PI / 2, 0, 0]} />
      <mesh ref={fill} geometry={GEO.box} material={fillMat} />
    </group>
  )
}

export default function SelectionHighlight() {
  return (
    <>
      <Highlighter which="hovered" color="#7dd3fc" />
      <Highlighter which="selected" color="#fbbf24" />
    </>
  )
}
