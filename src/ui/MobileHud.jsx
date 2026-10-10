// Phone layout: slim header, compact status strip, swipeable view chips and a
// bottom-sheet menu holding every toolbar action with a proper label.
import { useEffect, useState } from 'react'
import {
  Menu, X, Footprints, Plane, Presentation, Eye, EyeOff, Tag, Workflow, Volume2, VolumeX, Gauge, Maximize, Minimize,
  Settings, CircleHelp,
} from 'lucide-react'
import { useFactoryStore } from '../hooks/useFactoryStore'
import { useDataMode } from '../services/factoryApi'
import { Logo, useClock, useSummary, NavMenu, toggleSound } from './Hud'
import MiniMap from './MiniMap'
import { num } from './format'

function MobileHeader({ onMenu }) {
  const now = useClock()
  const mode = useDataMode()
  const name = useFactoryStore((s) => s.settings?.general.factoryName ?? 'SHREE SATIJI TEXTILES')
  const shift = useFactoryStore((s) => s.staffing?.shiftInfo)
  const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  const startTour = () => {
    const st = useFactoryStore.getState()
    st.clearSelection()
    st.setPresentIndex(0)
    st.setPresentPaused(false)
    st.setMode('present')
  }
  return (
    <div className="glass pointer-events-auto flex min-w-0 items-center gap-2.5 rounded-2xl py-2 pl-2.5 pr-1.5">
      <Logo className="h-9 w-9 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-extrabold tracking-[0.1em] text-amber-200">{name}</div>
        <div className="flex items-center gap-1.5 truncate text-[10px] font-semibold text-slate-400">
          <span className={`pulse-dot h-1.5 w-1.5 shrink-0 rounded-full ${mode.ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <span className="truncate">
            {mode.label[0] + mode.label.slice(1).toLowerCase()} · {time}
            {shift && <> · {shift.name}</>}
          </span>
        </div>
      </div>
      <button onClick={startTour} aria-label="Guided tour" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-200 active:bg-white/15">
        <Presentation className="h-5 w-5" />
      </button>
      <button onClick={onMenu} aria-label="Menu" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-slate-900 active:bg-amber-300">
        <Menu className="h-5 w-5" />
      </button>
    </div>
  )
}

function StatusStrip() {
  const s = useSummary()
  const items = [
    ['Looms', `${s.machinesRunning}/${s.machinesTotal}`, 'text-emerald-300'],
    ['Operators', `${s.operatorsPresent}/${s.operatorsRoster}`, s.uncovered ? 'text-rose-300' : 'text-white'],
    ['Prod. m', num(s.production), 'text-sky-300'],
    ['Eff.', `${s.efficiency.toFixed(1)}%`, 'text-amber-300'],
  ]
  return (
    <button
      onClick={() => useFactoryStore.getState().setSettingsOpen(true, 'attendance')}
      className="glass pointer-events-auto grid w-full grid-cols-4 gap-1 rounded-2xl p-1 text-center"
      aria-label="Factory status"
    >
      {items.map(([l, v, c]) => (
        <div key={l} className="min-w-0 rounded-xl bg-white/[0.04] px-1 py-1.5">
          <div className={`truncate text-[13px] font-bold tabular-nums ${c}`}>{v}</div>
          <div className="truncate text-[9px] font-semibold uppercase tracking-wider text-slate-400">{l}</div>
        </div>
      ))}
    </button>
  )
}

function SheetButton({ icon: Icon, label, sub, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex min-h-[64px] flex-col items-start justify-center gap-1 rounded-2xl px-3 py-2.5 text-left ring-1 transition-colors ${
        active ? 'bg-amber-400 text-slate-900 ring-amber-300' : 'bg-white/[0.05] text-slate-200 ring-white/10 active:bg-white/10'
      }`}
    >
      <Icon className="h-5 w-5" />
      <div className="text-[13px] font-bold leading-tight">{label}</div>
      {sub && <div className={`text-[10px] leading-tight ${active ? 'text-slate-800' : 'text-slate-400'}`}>{sub}</div>}
    </button>
  )
}

function MobileMenu({ open, onClose }) {
  const { mode, setMode, showLabels, toggleLabels, showFlow, toggleFlow, openView, toggleOpenView, quality, setQuality, soundOn } = useFactoryStore()
  const [fs, setFs] = useState(false)
  const canFs = typeof document !== 'undefined' && !!document.documentElement.requestFullscreen
  useEffect(() => {
    const on = () => setFs(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', on)
    return () => document.removeEventListener('fullscreenchange', on)
  }, [])
  if (!open) return null
  const nextQ = { high: 'balanced', balanced: 'performance', performance: 'high' }
  const run = (fn, close = true) => () => {
    fn()
    if (close) onClose()
  }
  const st = () => useFactoryStore.getState()
  return (
    <div className="pointer-events-auto fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/55 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="glass slide-up safe-bottom max-h-[88dvh] overflow-y-auto rounded-t-3xl px-3 pt-2 scrollbar-thin"
        style={{ background: 'linear-gradient(180deg, rgba(17,24,38,0.97), rgba(10,15,24,0.99))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-white/20" />
        <div className="mb-2 flex items-center justify-between px-1">
          <div className="text-base font-extrabold text-white">Menu</div>
          <button onClick={onClose} aria-label="Close menu" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-300 active:bg-white/10"><X className="h-5 w-5" /></button>
        </div>
        <div className="mb-3 flex justify-center">
          <MiniMap size="full" onNavigate={onClose} />
        </div>
        <div className="mb-1 px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Explore</div>
        <div className="grid grid-cols-3 gap-2 [@media(orientation:landscape)]:grid-cols-6">
          <SheetButton icon={Footprints} label="Walk" sub="On foot, with walls" active={mode === 'walk'} onClick={run(() => { st().clearSelection(); setMode('walk') })} />
          <SheetButton icon={Plane} label="Free fly" sub="Go anywhere" active={mode === 'fly'} onClick={run(() => { st().clearSelection(); setMode('fly') })} />
          <SheetButton
            icon={Presentation}
            label="Guided tour"
            sub="Auto presentation"
            active={mode === 'present'}
            onClick={run(() => { st().clearSelection(); st().setPresentIndex(0); st().setPresentPaused(false); setMode('present') })}
          />
        </div>
        <div className="mb-1 mt-3 px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">View</div>
        <div className="grid grid-cols-3 gap-2 [@media(orientation:landscape)]:grid-cols-6">
          <SheetButton icon={openView ? Eye : EyeOff} label="Open view" sub={openView ? 'Roof hidden' : 'Roof on'} active={openView} onClick={run(toggleOpenView, false)} />
          <SheetButton icon={Tag} label="Labels" sub={showLabels ? 'Shown' : 'Hidden'} active={showLabels} onClick={run(toggleLabels, false)} />
          <SheetButton icon={Workflow} label="Flow" sub={showFlow ? 'Shown' : 'Hidden'} active={showFlow} onClick={run(toggleFlow, false)} />
          <SheetButton icon={soundOn ? Volume2 : VolumeX} label="Sound" sub={soundOn ? 'On' : 'Off'} active={soundOn} onClick={run(toggleSound, false)} />
          <SheetButton icon={Gauge} label="Quality" sub={quality[0].toUpperCase() + quality.slice(1)} onClick={run(() => setQuality(nextQ[quality]), false)} />
          {canFs && (
            <SheetButton
              icon={fs ? Minimize : Maximize}
              label="Full screen"
              sub={fs ? 'On' : 'Off'}
              active={fs}
              onClick={run(() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.()), false)}
            />
          )}
        </div>
        <div className="mb-3 mt-3 grid grid-cols-2 gap-2 [@media(orientation:landscape)]:grid-cols-4">
          <SheetButton icon={Settings} label="Settings" sub="Operators, attendance, looms" onClick={run(() => st().setSettingsOpen(true))} />
          <SheetButton icon={CircleHelp} label="Help" sub="Touch controls" onClick={run(() => st().setHelpOpen(true))} />
        </div>
      </div>
    </div>
  )
}

/** Header + status + view chips for phones (portrait and landscape). */
export default function MobileHud({ landscape }) {
  const mode = useFactoryStore((s) => s.mode)
  const selected = useFactoryStore((s) => s.selected)
  const [menu, setMenu] = useState(false)
  const orbit = mode === 'orbit'
  // close the menu whenever the mode changes (e.g. starting the tour)
  useEffect(() => setMenu(false), [mode])
  if (!orbit) return null
  return (
    <>
      <div className={`safe-top safe-x absolute inset-x-0 top-0 flex gap-2 p-2 ${landscape ? 'items-start' : 'flex-col'}`}>
        <div className={landscape ? 'w-[min(340px,46vw)]' : ''}>
          <MobileHeader onMenu={() => setMenu(true)} />
        </div>
        {!(landscape && selected) && (
          <div className={landscape ? 'w-[min(360px,44vw)]' : ''}>
            <StatusStrip />
          </div>
        )}
      </div>
      {!selected && (
        <div className={`safe-bottom safe-x absolute bottom-0 p-2 ${landscape ? 'left-0 right-0 flex justify-center' : 'inset-x-0'}`}>
          <div className={landscape ? 'max-w-full' : ''}>
            <NavMenu horizontal />
          </div>
        </div>
      )}
      <MobileMenu open={menu} onClose={() => setMenu(false)} />
    </>
  )
}
