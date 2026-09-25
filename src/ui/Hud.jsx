import { useEffect, useMemo, useRef, useState } from 'react'
import {
  LayoutGrid, Factory, Package, Boxes, Calculator, Briefcase, Truck, Footprints, Presentation, Tag, Workflow,
  Gauge, Maximize, Minimize, CircleHelp, Activity, Users, Zap, ArrowRight, Radio, Layers, Search,
} from 'lucide-react'
import { useFactoryStore, computeSummary } from '../hooks/useFactoryStore'
import { goToView } from '../scene/focus'
import { NAV_VIEWS, CAMERA_VIEWS, WORKFLOW_STEPS } from '../data/layout'
import { USING_MOCK } from '../services/factoryApi'
import { num, STATUS_STYLES } from './format'
import { ProgressBar } from './charts'

export const VIEW_ICONS = {
  overview: LayoutGrid, production: Factory, yarn: Package, finished: Boxes, accounts: Calculator, manager: Briefcase, dispatch: Truck,
}
const VIEW_ZONE = { production: 'production', yarn: 'yarn', finished: 'finished', accounts: 'accounts', manager: 'manager', dispatch: 'dispatch' }

export function useSummary() {
  const machines = useFactoryStore((s) => s.machines)
  const workers = useFactoryStore((s) => s.workers)
  const maintenance = useFactoryStore((s) => s.maintenance)
  return useMemo(() => computeSummary({ machines, workers, maintenance }), [machines, workers, maintenance])
}

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 15)
    return () => clearInterval(t)
  }, [])
  return now
}

function Logo({ className = 'h-10 w-10' }) {
  return (
    <svg viewBox="0 0 40 40" className={className}>
      <defs>
        <linearGradient id="lg-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fcd34d" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="38" height="38" rx="10" fill="#0f172a" stroke="url(#lg-gold)" strokeWidth="1.5" />
      <g transform="rotate(45 20 20)" stroke="url(#lg-gold)" strokeWidth="2.2" fill="none">
        <rect x="11" y="11" width="18" height="18" rx="1.5" />
        <path d="M11 17h18M11 23h18" />
        <path d="M17 11v18M23 11v18" strokeOpacity="0.55" />
      </g>
    </svg>
  )
}

export function Brand() {
  const now = useClock()
  const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  return (
    <div className="glass pointer-events-auto flex items-center gap-3 rounded-2xl px-3.5 py-3 md:px-4">
      <Logo className="h-9 w-9 shrink-0 md:h-11 md:w-11" />
      <div className="min-w-0">
        <div className="truncate text-[13px] font-extrabold tracking-[0.14em] text-amber-200 md:text-[15px]">SHREE SATIJI TEXTILES</div>
        <div className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.28em] text-slate-400 md:text-[11px]">
          3D FACTORY VIEW
          <span className="hidden items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] tracking-wider text-emerald-300 sm:flex">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-emerald-400" /> {USING_MOCK ? 'DEMO' : 'LIVE'} · {time}
          </span>
        </div>
      </div>
    </div>
  )
}

function ToolButton({ icon: Icon, label, active, onClick, kbd }) {
  return (
    <button
      onClick={onClick}
      title={kbd ? `${label} (${kbd})` : label}
      className={`group flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold transition-all ${
        active ? 'bg-amber-400 text-slate-900 shadow-[0_0_18px_rgba(251,191,36,0.35)]' : 'text-slate-300 hover:bg-white/10 hover:text-white'
      }`}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden xl:inline">{label}</span>
    </button>
  )
}

export function Toolbar() {
  const { mode, setMode, showLabels, toggleLabels, showFlow, toggleFlow, quality, setQuality, setHelpOpen, setPresentIndex, setPresentPaused } = useFactoryStore()
  const [fs, setFs] = useState(false)
  useEffect(() => {
    const on = () => setFs(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', on)
    return () => document.removeEventListener('fullscreenchange', on)
  }, [])
  const nextQ = { high: 'balanced', balanced: 'performance', performance: 'high' }
  return (
    <div className="glass pointer-events-auto flex flex-wrap items-center gap-0.5 rounded-2xl p-1">
      <ToolButton
        icon={Footprints}
        label="Walkthrough"
        kbd="G"
        active={mode === 'walk'}
        onClick={() => setMode(mode === 'walk' ? 'orbit' : 'walk')}
      />
      <ToolButton
        icon={Presentation}
        label="Present"
        kbd="P"
        active={mode === 'present'}
        onClick={() => {
          if (mode === 'present') {
            setMode('orbit')
          } else {
            setPresentIndex(0)
            setPresentPaused(false)
            setMode('present')
          }
        }}
      />
      <div className="mx-1 h-6 w-px bg-white/10" />
      <ToolButton icon={Tag} label="Labels" active={showLabels} onClick={toggleLabels} kbd="L" />
      <ToolButton icon={Workflow} label="Flow" active={showFlow} onClick={toggleFlow} kbd="F" />
      <button
        onClick={() => setQuality(nextQ[quality])}
        title="Render quality"
        className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white"
      >
        <Gauge className="h-4 w-4" />
        <span className="hidden capitalize sm:inline">{quality}</span>
      </button>
      <ToolButton
        icon={fs ? Minimize : Maximize}
        label="Fullscreen"
        onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.())}
      />
      <ToolButton icon={CircleHelp} label="Help" onClick={() => setHelpOpen(true)} kbd="H" />
    </div>
  )
}

function Metric({ icon: Icon, label, value, sub, color = 'text-white', children }) {
  return (
    <div className="rounded-xl bg-white/[0.04] p-2.5 ring-1 ring-white/5">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className={`mt-1 text-lg font-bold tabular-nums leading-tight ${color}`}>
        {value}
        {sub && <span className="ml-1 text-xs font-medium text-slate-400">{sub}</span>}
      </div>
      {children}
    </div>
  )
}

export function StatusPanel({ compact = false }) {
  const s = useSummary()
  const machines = useFactoryStore((st) => st.machines)
  if (compact) {
    return (
      <div className="glass pointer-events-auto grid grid-cols-4 gap-1 rounded-2xl p-1.5 text-center">
        {[
          ['Machines', `${s.machinesRunning}/${s.machinesTotal}`],
          ['Workers', s.workersPresent],
          ['Prod. m', num(s.production)],
          ['Eff.', `${s.efficiency.toFixed(1)}%`],
        ].map(([l, v]) => (
          <div key={l} className="rounded-lg bg-white/[0.04] px-1 py-1.5">
            <div className="text-[13px] font-bold tabular-nums text-white">{v}</div>
            <div className="text-[9px] uppercase tracking-wider text-slate-400">{l}</div>
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="glass pointer-events-auto w-[290px] rounded-2xl p-3.5">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-200">
          <Activity className="h-4 w-4 text-emerald-400" /> Factory Status
        </div>
        <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-300">
          <Radio className="h-3 w-3" /> EMS
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Metric icon={Factory} label="Machines" value={`${s.machinesRunning}/${s.machinesTotal}`} sub="run" color="text-emerald-300">
          <div className="mt-1.5 flex gap-[2px]">
            {machines.map((m) => (
              <span key={m.id} title={`${m.id} · ${m.status}`} className={`h-1.5 flex-1 rounded-sm ${STATUS_STYLES[m.status].dot}`} />
            ))}
          </div>
        </Metric>
        <Metric icon={Users} label="Workers" value={s.workersPresent} sub="on shift" />
        <Metric icon={Layers} label="Today's Prod." value={num(s.production)} sub="m" color="text-sky-300" />
        <Metric icon={Gauge} label="Efficiency" value={`${s.efficiency.toFixed(1)}%`} color="text-amber-300">
          <div className="mt-1.5">
            <ProgressBar value={s.efficiency} color="#fbbf24" height={4} />
          </div>
        </Metric>
      </div>
      <div className="mt-2 flex items-center justify-between rounded-xl bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-yellow-300" /> Load {s.power.toFixed(1)} kW</span>
        <span>
          <span className="text-amber-300">{s.machinesIdle} idle</span> · <span className="text-rose-300">{s.machinesMaintenance} maint.</span>
        </span>
      </div>
    </div>
  )
}

export function NavMenu({ horizontal = false }) {
  const activeView = useFactoryStore((s) => s.activeView)
  const currentZone = useFactoryStore((s) => s.currentZone)
  const mode = useFactoryStore((s) => s.mode)
  const go = (v) => {
    const st = useFactoryStore.getState()
    if (st.mode !== 'orbit') st.setMode('orbit')
    st.clearSelection()
    setTimeout(() => goToView(v), 0)
  }
  return (
    <div
      className={`glass pointer-events-auto rounded-2xl p-1.5 ${horizontal ? 'no-scrollbar flex gap-1 overflow-x-auto' : 'flex w-[178px] flex-col gap-0.5'}`}
    >
      {!horizontal && <div className="px-2.5 pb-1 pt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Navigate</div>}
      {NAV_VIEWS.map((v, i) => {
        const Icon = VIEW_ICONS[v]
        const active = mode !== 'walk' && (activeView === v || (!activeView && VIEW_ZONE[v] && VIEW_ZONE[v] === currentZone))
        return (
          <button
            key={v}
            onClick={() => go(v)}
            className={`flex shrink-0 items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] font-semibold transition-all ${
              active ? 'bg-gradient-to-r from-amber-400/25 to-amber-400/5 text-amber-100 ring-1 ring-amber-300/40' : 'text-slate-300 hover:bg-white/8 hover:text-white'
            }`}
            style={!active ? {} : {}}
          >
            <Icon className={`h-4 w-4 ${active ? 'text-amber-300' : 'text-slate-400'}`} />
            <span className="whitespace-nowrap">{CAMERA_VIEWS[v].label}</span>
            {!horizontal && <span className="ml-auto text-[10px] font-medium text-slate-600">{i + 1}</span>}
          </button>
        )
      })}
    </div>
  )
}

const STEP_COLORS = { yarn: '#60a5fa', production: '#34d399', inspection: '#a78bfa', finished: '#fbbf24', accounts: '#f472b6', dispatch: '#fb923c' }

export function WorkflowBar() {
  const currentZone = useFactoryStore((s) => s.currentZone)
  const mode = useFactoryStore((s) => s.mode)
  const go = (v) => {
    const st = useFactoryStore.getState()
    if (st.mode === 'walk') return
    if (st.mode === 'present') st.setMode('orbit')
    setTimeout(() => goToView(v), 0)
  }
  return (
    <div className="glass pointer-events-auto flex items-center gap-1 rounded-2xl px-2 py-1.5">
      <div className="mr-1 hidden flex-col pl-1 pr-2 2xl:flex">
        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Connected flow</span>
        <span className="text-[11px] font-semibold text-slate-300">Yarn → Dispatch</span>
      </div>
      {WORKFLOW_STEPS.map((s, i) => {
        const active = currentZone === s.id || (s.id === 'inspection' && currentZone === 'inspection')
        const c = STEP_COLORS[s.id]
        return (
          <div key={s.id} className="flex items-center">
            <button
              onClick={() => go(s.view)}
              disabled={mode === 'walk'}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1.5 text-[12px] font-semibold transition-all hover:bg-white/10"
              style={active ? { background: `${c}26`, boxShadow: `inset 0 0 0 1px ${c}88`, color: '#fff' } : { color: '#cbd5e1' }}
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-slate-900" style={{ background: c }}>
                {i + 1}
              </span>
              {s.label}
            </button>
            {i < WORKFLOW_STEPS.length - 1 && <ArrowRight className="mx-0.5 h-3.5 w-3.5 text-slate-600" />}
          </div>
        )
      })}
    </div>
  )
}

export function Tooltip() {
  const hovered = useFactoryStore((s) => s.hovered)
  const mode = useFactoryStore((s) => s.mode)
  const ref = useRef()
  useEffect(() => {
    const move = (e) => {
      if (ref.current) ref.current.style.transform = `translate(${e.clientX + 16}px, ${e.clientY + 14}px)`
    }
    window.addEventListener('pointermove', move)
    return () => window.removeEventListener('pointermove', move)
  }, [])
  const show = hovered && mode === 'orbit'
  const st = hovered?.status && STATUS_STYLES[hovered.status]
  return (
    <div ref={ref} className="pointer-events-none fixed left-0 top-0 z-50" style={{ opacity: show ? 1 : 0, transition: 'opacity .12s' }}>
      {show && (
        <div className="glass max-w-[260px] rounded-xl px-3 py-2">
          <div className="flex items-center gap-2 text-[13px] font-bold text-white">
            {st && <span className={`h-2 w-2 rounded-full ${st.dot}`} />}
            {hovered.label}
          </div>
          {hovered.sub && <div className="mt-0.5 text-[11px] text-slate-400">{hovered.sub}</div>}
          <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-amber-300/80">
            <Search className="h-3 w-3" /> Click for details
          </div>
        </div>
      )}
    </div>
  )
}
