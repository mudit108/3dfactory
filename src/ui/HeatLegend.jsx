import { Flame, X } from 'lucide-react'
import { useFactoryStore } from '../hooks/useFactoryStore'
import { HEAT_MODES, LEGENDS } from './heatScale'

/** Small legend + mode chips while the floor heatmap is on. */
export default function HeatLegend({ mobile }) {
  const colorBy = useFactoryStore((s) => s.colorBy)
  const mode = useFactoryStore((s) => s.mode)
  if (colorBy === 'off' || mode === 'walk' || mode === 'fly') return null
  const set = (id) => useFactoryStore.getState().setColorBy(id)
  return (
    <div className={`glass pointer-events-auto fixed z-30 rounded-2xl px-3 py-2 ${mobile ? 'left-2 right-2 top-[118px]' : 'left-1/2 top-24 -translate-x-1/2'}`}>
      <div className="flex items-center gap-2">
        <Flame className="h-4 w-4 shrink-0 text-amber-300" />
        <div className="no-scrollbar flex gap-1 overflow-x-auto">
          {HEAT_MODES.filter((h) => h.id !== 'off').map((h) => (
            <button key={h.id} onClick={() => set(h.id)} className={`shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold ${colorBy === h.id ? 'bg-amber-400 text-slate-900' : 'text-slate-300 hover:bg-white/10'}`}>{h.label}</button>
          ))}
        </div>
        <button onClick={() => set('off')} aria-label="Turn heatmap off" className="ml-auto rounded-lg p-1 text-slate-400 hover:bg-white/10"><X className="h-4 w-4" /></button>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        {LEGENDS[colorBy].map(([c, l], i) => (
          <span key={i} className="flex items-center gap-1 text-[10.5px] text-slate-300">
            <span className="h-2.5 w-4 rounded-sm" style={{ background: c }} />
            {l}
          </span>
        ))}
      </div>
    </div>
  )
}
