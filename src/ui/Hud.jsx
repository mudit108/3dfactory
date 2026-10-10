import { useEffect, useMemo, useRef, useState } from 'react'
import {
  LayoutGrid, Factory, Package, Boxes, Calculator, Briefcase, Truck, Footprints, Presentation, Tag, Workflow,
  Gauge, Maximize, Minimize, CircleHelp, Activity, Users, Zap, ArrowRight, Radio, Layers, Search, Plane, Eye, EyeOff, Scan, Cog, Settings, Volume2, VolumeX, BarChart3, Flame, Share2, Download,
} from 'lucide-react'
import { useCanInstall, promptInstall, shareSite } from '../services/pwa'
import { HEAT_MODES, nextHeat } from './heatScale'
import { factorySound } from '../services/factorySound'
import { useFactoryStore, computeSummary } from '../hooks/useFactoryStore'
import { goToView } from '../scene/focus'
import { NAV_VIEWS, CAMERA_VIEWS, WORKFLOW_STEPS } from '../data/layout'
import { useDataMode } from '../services/factoryApi'
import { num, STATUS_STYLES } from './format'
import { ProgressBar } from './charts'

export const VIEW_ICONS = {
  overview: LayoutGrid, top: Scan, production: Factory, looms: Cog, yarn: Package, finished: Boxes, accounts: Calculator, manager: Briefcase, dispatch: Truck,
}
const VIEW_ZONE = { production: 'production', yarn: 'yarn', finished: 'finished' }

export function useSummary() {
  const machines = useFactoryStore((s) => s.machines)
  const workers = useFactoryStore((s) => s.workers)
  const maintenance = useFactoryStore((s) => s.maintenance)
  const staffing = useFactoryStore((s) => s.staffing)
  const emsSummary = useFactoryStore((s) => s.emsSummary)
  return useMemo(() => computeSummary({ machines, workers, maintenance, staffing, emsSummary }), [machines, workers, maintenance, staffing, emsSummary])
}

export function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 15)
    return () => clearInterval(t)
  }, [])
  return now
}

export function Logo({ className = 'h-10 w-10' }) {
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
  const mode = useDataMode()
  const name = useFactoryStore((s) => s.settings?.general.factoryName ?? 'SHREE SATIJI TEXTILES')
  const shift = useFactoryStore((s) => s.staffing?.shiftInfo)
  const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  return (
    <div className="glass pointer-events-auto flex items-center gap-3 rounded-2xl px-3.5 py-3 md:px-4">
      <Logo className="h-9 w-9 shrink-0 md:h-11 md:w-11" />
      <div className="min-w-0">
        <div className="truncate text-[13px] font-extrabold tracking-[0.14em] text-amber-200 md:text-[15px]">{name}</div>
        <div className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.28em] text-slate-400 md:text-[11px]">
          3D FACTORY VIEW
          <span className={`hidden items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] tracking-wider sm:flex ${mode.ok ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
            <span className={`pulse-dot h-1.5 w-1.5 rounded-full ${mode.ok ? 'bg-emerald-400' : 'bg-red-400'}`} /> {mode.label} · {time}
            {shift && <> · {shift.name}</>}
          </span>
        </div>
      </div>
    </div>
  )
}

function ToolButton({ icon: Icon, label, active, onClick, kbd, iconOnly = false }) {
  return (
    <button
      onClick={onClick}
      title={kbd ? `${label} (${kbd})` : label}
      className={`group flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold transition-all ${
        active ? 'bg-amber-400 text-slate-900 shadow-[0_0_18px_rgba(251,191,36,0.35)]' : 'text-slate-300 hover:bg-white/10 hover:text-white'
      }`}
    >
      <Icon className="h-4 w-4" />
      <span className={iconOnly ? 'sr-only' : 'hidden xl:inline'}>{label}</span>
    </button>
  )
}

/** Toggle the procedural factory sound (must run inside a user gesture). */
export async function toggleSound() {
  const st = useFactoryStore.getState()
  if (st.soundOn) {
    factorySound.disable()
    st.setSoundOn(false)
  } else if (await factorySound.enable()) st.setSoundOn(true)
}

export function Toolbar() {
  const { mode, setMode, showLabels, toggleLabels, showFlow, toggleFlow, openView, toggleOpenView, quality, setQuality, setHelpOpen, setPresentIndex, setPresentPaused } = useFactoryStore()
  const [fs, setFs] = useState(false)
  useEffect(() => {
    const on = () => setFs(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', on)
    return () => document.removeEventListener('fullscreenchange', on)
  }, [])
  const nextQ = { high: 'balanced', balanced: 'performance', performance: 'high' }
  const soundOn = useFactoryStore((s) => s.soundOn)
  const colorBy = useFactoryStore((s) => s.colorBy)
  const installable = useCanInstall()
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
        icon={Plane}
        label="Free Fly"
        kbd="V"
        active={mode === 'fly'}
        onClick={() => setMode(mode === 'fly' ? 'orbit' : 'fly')}
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
      <ToolButton icon={openView ? Eye : EyeOff} label={openView ? 'Open view' : 'Roof on'} active={openView} onClick={toggleOpenView} kbd="O" />
      <ToolButton icon={Tag} label="Labels" active={showLabels} onClick={toggleLabels} kbd="L" />
      <ToolButton icon={Workflow} label="Flow" active={showFlow} onClick={toggleFlow} kbd="F" />
      <ToolButton icon={soundOn ? Volume2 : VolumeX} label="Sound" active={soundOn} onClick={toggleSound} kbd="M" />
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
        iconOnly
        onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.())}
      />
      <div className="mx-1 h-6 w-px bg-white/10" />
      <ToolButton icon={BarChart3} label="Reports" kbd="R" onClick={() => useFactoryStore.getState().setReportsOpen(true)} />
      <ToolButton
        icon={Flame}
        label={colorBy === 'off' ? 'Heatmap' : HEAT_MODES.find((h) => h.id === colorBy)?.label}
        kbd="C"
        active={colorBy !== 'off'}
        onClick={() => useFactoryStore.getState().setColorBy(nextHeat(colorBy))}
      />
      <ToolButton icon={Settings} label="Settings" onClick={() => useFactoryStore.getState().setSettingsOpen(true)} kbd="," />
      <ToolButton icon={Share2} label="Share link" onClick={shareSite} iconOnly />
      {installable && <ToolButton icon={Download} label="Install app" onClick={promptInstall} iconOnly />}
      <ToolButton icon={CircleHelp} label="Help" onClick={() => setHelpOpen(true)} kbd="H" iconOnly />
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

const EMS_CHIPS = [
  ['b90', '90-100', '#ABDB19'],
  ['b80', '80-90', '#FFB500'],
  ['b75', '75-80', '#FF84F1'],
  ['b0', '<75', '#C738EB'],
  ['manual', 'Manual', '#E60016'],
  ['filler', 'Filler', '#6C82FC'],
  ['unload', 'Unload', '#B4572C'],
]

export function StatusPanel({ compact = false }) {
  const s = useSummary()
  const machines = useFactoryStore((st) => st.machines)
  if (compact) {
    return (
      <div className="glass pointer-events-auto grid grid-cols-4 gap-1 rounded-2xl p-1.5 text-center">
        {[
          ['Machines', `${s.machinesRunning}/${s.machinesTotal}`],
          ['Operators', `${s.operatorsPresent}/${s.operatorsRoster}`],
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
        <button
          className="text-left"
          title="Open attendance"
          onClick={() => useFactoryStore.getState().setSettingsOpen(true, 'attendance')}
        >
          <Metric icon={Users} label="Operators" value={`${s.operatorsPresent}/${s.operatorsRoster}`} sub="present" color={s.uncovered ? 'text-rose-300' : 'text-white'}>
            <div className="mt-1 text-[10px] text-slate-400">
              1 per {s.perOperator} looms · {s.workersPresent} staff
            </div>
          </Metric>
        </button>
        <Metric icon={Layers} label="Today's Prod." value={num(s.production)} sub="m" color="text-sky-300" />
        <Metric icon={Gauge} label="Efficiency" value={`${s.efficiency.toFixed(1)}%`} color="text-amber-300">
          <div className="mt-1.5">
            <ProgressBar value={s.efficiency} color="#fbbf24" height={4} />
          </div>
        </Metric>
      </div>
      {s.ems ? (
        <>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-white/[0.04] px-2.5 py-1.5">
              <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Avg. RPM</div>
              <div className="text-sm font-bold tabular-nums text-sky-300">{s.ems.avgRpm?.toFixed(2)}</div>
            </div>
            <div className="rounded-xl bg-white/[0.04] px-2.5 py-1.5">
              <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Avg. Pick</div>
              <div className="text-sm font-bold tabular-nums text-violet-300">{s.ems.avgPick?.toFixed(2)}</div>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {EMS_CHIPS.map(([key, label, color]) => (
              <span key={key} title={`${label}: ${s.ems[key]} looms (as in EMS)`} className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-slate-900" style={{ background: color }}>
                {s.ems[key]} <span className="font-semibold opacity-80">{label}</span>
              </span>
            ))}
          </div>
          {(s.ems.beamsSoon?.length > 0 || s.ems.spareBeams?.length > 0) && (
            <div className="mt-2 rounded-xl bg-white/[0.04] px-2.5 py-2">
              <div className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-slate-400">Beams finishing first</div>
              {(s.ems.beamsSoon || []).slice(0, 4).map((b) => (
                <div key={b.id} className="flex items-center justify-between text-[11px] text-slate-300">
                  <span className="font-semibold">{b.id}</span>
                  <span className="tabular-nums text-sky-300">{b.etaHours <= 0 ? 'due now' : b.etaHours < 48 ? `${Math.floor(b.etaHours)} h ${Math.round((b.etaHours % 1) * 60)} m` : `${(b.etaHours / 24).toFixed(1)} days`}</span>
                  <span className="tabular-nums text-slate-500">{b.beamMeters <= 0 ? `+${Math.round(-b.beamMeters)} m over` : `${Math.round(b.beamMeters)} m`}</span>
                </div>
              ))}
              <div className="mt-1.5 border-t border-white/5 pt-1.5 text-[10px] text-slate-400">
                Spare beams in store: <span className="font-semibold text-slate-200">{s.ems.spareBeams?.length ?? 0}</span>
                {s.ems.spareMeters ? <> · {s.ems.spareMeters.toLocaleString('en-IN')} m</> : null}
              </div>
            </div>
          )}
          <div className="mt-1.5 text-[10px] text-slate-500">Numbers exactly as in your EMS · {s.machinesRunning} running, {s.machinesIdle} stopped</div>
        </>
      ) : (
        <div className="mt-2 flex items-center justify-between rounded-xl bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-yellow-300" /> Load {s.power.toFixed(1)} kW</span>
          <span>
            <span className="text-amber-300">{s.machinesIdle} idle</span> · <span className="text-rose-300">{s.machinesMaintenance} maint.</span>
          </span>
        </div>
      )}
      {s.uncovered > 0 && (
        <button
          onClick={() => useFactoryStore.getState().setSettingsOpen(true, 'staffing')}
          className="mt-2 w-full rounded-xl bg-rose-500/12 px-2.5 py-1.5 text-left text-[11px] font-semibold text-rose-200 ring-1 ring-rose-400/30 hover:bg-rose-500/20"
        >
          {s.uncovered} looms have no operator — need {s.operatorsRequired} operators present
        </button>
      )}
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
        const active = !(mode === 'walk' || mode === 'fly') && (activeView === v || (!activeView && VIEW_ZONE[v] && VIEW_ZONE[v] === currentZone))
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
    <div ref={ref} className="hover-tooltip pointer-events-none fixed left-0 top-0 z-50" style={{ opacity: show ? 1 : 0, transition: 'opacity .12s' }}>
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
