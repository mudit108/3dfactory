// Coloured floor pads under every loom, so problem looms stand out across the shed.
import { useMemo } from 'react'
import { useFactoryStore } from '../hooks/useFactoryStore'
import { loomPlacements } from '../data/layout'
import { heatColor } from '../ui/heatScale'

export default function HeatmapLayer() {
  const colorBy = useFactoryStore((s) => s.colorBy)
  const machines = useFactoryStore((s) => s.machines)
  const key = colorBy === 'off' ? '' : machines.map((m) => heatColor(colorBy, m, machines)).join(',')
  const pads = useMemo(() => {
    if (colorBy === 'off') return []
    const byId = Object.fromEntries(machines.map((m) => [m.id, m]))
    return loomPlacements.map((p) => ({ id: p.id, position: p.position, color: byId[p.id] ? heatColor(colorBy, byId[p.id], machines) : '#334155' }))
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  if (colorBy === 'off') return null
  return (
    <group>
      {pads.map((p) => (
        <mesh key={p.id} position={[p.position[0], 0.022, p.position[2] + 0.25]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
          <planeGeometry args={[5.1, 4.1]} />
          <meshBasicMaterial color={p.color} transparent opacity={0.62} toneMapped={false} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}
