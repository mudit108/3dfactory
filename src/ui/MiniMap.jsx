import { useEffect, useRef } from 'react'
import { Map as MapIcon } from 'lucide-react'
import { ZONES, loomPlacements, yarnRackPlacements, finishedRackPlacements, DISPATCH } from '../data/layout'
import { useFactoryStore } from '../hooks/useFactoryStore'
import { camState } from '../scene/cameraState'
import { goToView } from '../scene/focus'
import { STATUS_STYLES } from './format'

const ZONE_VIEW = { yarn: 'yarn', production: 'production', inspection: 'looms', finished: 'finished', dispatch: 'dispatch', accounts: 'accounts', manager: 'manager', entrance: 'entrance' }

export default function MiniMap({ size = 'md' }) {
  const marker = useRef()
  const cone = useRef()
  const target = useRef()
  const machines = useFactoryStore((s) => s.machines)
  const currentZone = useFactoryStore((s) => s.currentZone)
  const mode = useFactoryStore((s) => s.mode)
  const statusById = Object.fromEntries(machines.map((m) => [m.id, m.status]))

  useEffect(() => {
    let raf
    const tick = () => {
      const x = Math.max(-60, Math.min(66, camState.x))
      const z = Math.max(-38, Math.min(42, camState.z))
      const deg = (-camState.yaw * 180) / Math.PI
      if (marker.current) marker.current.setAttribute('transform', `translate(${x} ${z}) rotate(${deg})`)
      if (target.current) target.current.setAttribute('transform', `translate(${camState.targetX} ${camState.targetZ})`)
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [])

  const go = (zoneId) => {
    const st = useFactoryStore.getState()
    if (st.mode === 'walk') return
    if (st.mode === 'present') st.setMode('orbit')
    setTimeout(() => goToView(ZONE_VIEW[zoneId]), 0)
  }

  const w = size === 'sm' ? 190 : 250
  return (
    <div className="glass pointer-events-auto rounded-2xl p-2" style={{ width: w + 16 }}>
      <div className="mb-1 flex items-center justify-between px-1">
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
          <MapIcon className="h-3.5 w-3.5" /> Plant Map
        </span>
        <span className="text-[10px] text-slate-500">100 × 60 m</span>
      </div>
      <svg viewBox="-55 -36 122 76" width={w} height={(w * 76) / 122} className="block">
        <defs>
          <radialGradient id="mm-cone" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="scale(14)">
            <stop offset="0" stopColor="#fbbf24" stopOpacity="0.55" />
            <stop offset="1" stopColor="#fbbf24" stopOpacity="0" />
          </radialGradient>
          <pattern id="mm-grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M10 0H0V10" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.3" />
          </pattern>
        </defs>
        <rect x="-50" y="-30" width="100" height="60" rx="1" fill="#0b1220" stroke="#475569" strokeWidth="0.6" />
        <rect x="-50" y="-30" width="100" height="60" fill="url(#mm-grid)" />
        {ZONES.map((z) => {
          const [x1, z1, x2, z2] = z.rect
          const active = currentZone === z.id
          return (
            <g key={z.id} onClick={() => go(z.id)} className="cursor-pointer">
              <rect
                x={x1 + 0.4}
                y={z1 + 0.4}
                width={x2 - x1 - 0.8}
                height={z2 - z1 - 0.8}
                rx="1"
                fill={z.color}
                fillOpacity={active ? 0.3 : 0.12}
                stroke={z.color}
                strokeOpacity={active ? 0.95 : 0.4}
                strokeWidth={active ? 0.7 : 0.35}
              />
            </g>
          )
        })}
        {yarnRackPlacements.map((p) => (
          <rect key={p.id} x={p.position[0] - 0.55} y={p.position[2] - 4.2} width="1.1" height="8.4" fill="#60a5fa" fillOpacity="0.55" pointerEvents="none" />
        ))}
        {finishedRackPlacements.map((p) => (
          <rect key={p.id} x={p.position[0] - 4.2} y={p.position[2] - 0.9} width="8.4" height="1.8" fill="#fbbf24" fillOpacity="0.55" pointerEvents="none" />
        ))}
        {loomPlacements.map((p) => (
          <rect key={p.id} x={p.position[0] - 1.7} y={p.position[2] - 1.1} width="3.4" height="2.2" rx="0.3" fill={STATUS_STYLES[statusById[p.id] || 'running'].hex} fillOpacity="0.85" pointerEvents="none" />
        ))}
        {/* truck */}
        <rect x={DISPATCH.truck.position[0]} y={DISPATCH.truck.position[2] - 1.25} width="10" height="2.5" rx="0.4" fill="#94a3b8" fillOpacity="0.7" pointerEvents="none" />
        {/* entrance */}
        <rect x="-10" y="29.3" width="7" height="1.4" fill="#e5e7eb" pointerEvents="none" />
        {ZONES.filter((z) => z.id !== 'entrance').map((z) => {
          const [x1, z1, x2, z2] = z.rect
          const small = x2 - x1 < 14
          return (
            <text
              key={'t' + z.id}
              x={(x1 + x2) / 2}
              y={z.id === 'production' ? z2 - 2.5 : (z1 + z2) / 2 + 1}
              textAnchor="middle"
              fontSize={small ? 1.9 : 3}
              fontWeight="700"
              fill="#e2e8f0"
              fillOpacity="0.9"
              pointerEvents="none"
              style={{ letterSpacing: 0.3 }}
              transform={z.id === 'inspection' ? `rotate(-90 ${(x1 + x2) / 2} ${(z1 + z2) / 2 + 1})` : undefined}
            >
              {z.id === 'manager' ? 'MGR' : z.id === 'accounts' ? 'ACCTS' : z.short}
            </text>
          )
        })}
        <g ref={target} pointerEvents="none">
          <circle r="1.2" fill="none" stroke="#fbbf24" strokeWidth="0.35" strokeDasharray="0.8 0.6" />
        </g>
        <g ref={marker} pointerEvents="none">
          <path d="M0 0 L-7 14 A14 14 0 0 0 7 14 Z" fill="url(#mm-cone)" />
          <circle r="2" fill={mode === 'walk' ? '#22d3ee' : '#fbbf24'} stroke="#0f172a" strokeWidth="0.6" />
        </g>
      </svg>
    </div>
  )
}
