// Phone layout: a normal app with bottom tabs — Home, Looms, 3D, Reports, Ask.
// Numbers and lists are plain scrollable pages with big touch targets; the 3D factory is
// one tab you open when you want it (it is unmounted on the other tabs to save battery).
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Home, LayoutGrid, Box, BarChart3, MessageCircle, Settings, Search, X, ChevronLeft, ChevronRight, Copy, Share2, Download,
  TriangleAlert, Layers, Users, CircleHelp, Check, ArrowUpDown,
} from 'lucide-react'
import FactoryScene from '../scene/FactoryScene'
import { useFactoryStore } from '../hooks/useFactoryStore'
import { useDataMode } from '../services/factoryApi'
import { useClock, useSummary, Logo } from './Hud'
import MobileHud from './MobileHud'
import DetailPanel, { MachinePanel } from './DetailPanel'
import { LoadingScreen } from './Overlays'
import HeatLegend from './HeatLegend'
import { ReportsPage } from './ReportsModal'
import { ChatBody, askAssistant } from './Assistant'
import { Sparkline } from './charts'
import { beamPlan, fmtEtaShort } from '../services/planning'
import { dailyReportText } from '../services/reportText'
import { useCanInstall, promptInstall, shareSite, isIOS } from '../services/pwa'
import { showLoom, showLoomIn3D, openReports } from './navigate'
import { focusOnKey } from '../scene/focus'
import { useViewport } from '../hooks/useViewport'

const nf = (n, d = 0) => (Number.isFinite(n) ? n.toLocaleString('en-IN', { maximumFractionDigits: d }) : '-')
const isRun = (m) => m.status === 'running'
const stopsOf = (m) => (Number.isFinite(m.stopCount) ? m.stopCount : m.stops ? (m.stops.warp || 0) + (m.stops.weft || 0) + (m.stops.other || 0) : 0)
const effTone = (m) => (!isRun(m) ? 'text-slate-500' : m.efficiency < 60 ? 'text-rose-300' : m.efficiency < 75 ? 'text-amber-300' : 'text-emerald-300')
const fmtDur = (min) => {
  if (!Number.isFinite(min)) return ''
  if (min < 60) return `${Math.round(min)} min`
  if (min < 48 * 60) return `${Math.floor(min / 60)} h ${String(Math.round(min % 60)).padStart(2, '0')} m`
  return `${(min / 1440).toFixed(1)} days`
}
const statusInfo = (m) => {
  if (isRun(m)) return { label: 'Running', dot: 'bg-emerald-400', text: 'text-emerald-300', bar: '#34d399' }
  if (m.status === 'maintenance') return { label: 'Maintenance', dot: 'bg-rose-400', text: 'text-rose-300', bar: '#fb7185' }
  const why = m.alert === 'red' ? 'Manual stop' : m.alert === 'blue' ? 'Filler' : 'Stopped'
  return { label: why, dot: 'bg-amber-400', text: 'text-amber-300', bar: '#fbbf24' }
}
const operatorOf = (m, staffing) => staffing?.machineOperator?.[m.id]?.name || m.operator || null
const beamText = (m) => {
  if (Number.isFinite(m.beamMeters)) {
    if (m.beamMeters <= 0) return { text: `Beam ${nf(-m.beamMeters)} m past planned length`, pct: 0, tone: 'text-rose-300' }
    const pct = m.beamTotal ? (m.beamMeters / m.beamTotal) * 100 : m.warpBeamRemaining
    return { text: `Beam ${nf(m.beamMeters)} m left${Number.isFinite(m.etaHours) ? ` · ${fmtEtaShort(m.etaHours)}` : ''}`, pct, tone: m.beamLow ? 'text-amber-300' : 'text-slate-400' }
  }
  if (Number.isFinite(m.warpBeamRemaining)) return { text: `Beam ${m.warpBeamRemaining}% left`, pct: m.warpBeamRemaining, tone: m.warpBeamRemaining < 15 ? 'text-amber-300' : 'text-slate-400' }
  return null
}

// ---------------------------------------------------------------- shared bits
function PageHeader({ title, sub, right }) {
  return (
    <div className="safe-top sticky top-0 z-10 border-b border-white/[0.07] bg-[#0b1017]/95 px-4 pb-2.5 backdrop-blur">
      <div className="flex items-center gap-2 pt-1.5">
        <div className="min-w-0 flex-1">
          <div className="truncate text-xl font-extrabold text-white">{title}</div>
          {sub && <div className="truncate text-[13px] text-slate-400">{sub}</div>}
        </div>
        {right}
      </div>
    </div>
  )
}

function IconBtn({ icon: Icon, label, onClick, tone = 'text-slate-200' }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl active:bg-white/10 ${tone}`}>
      <Icon className="h-5 w-5" />
    </button>
  )
}

function SectionTitle({ children, right }) {
  return (
    <div className="mb-2 mt-5 flex items-center justify-between px-1">
      <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-slate-400">{children}</div>
      {right}
    </div>
  )
}

function Stat({ label, value, sub, tone = 'text-white', onClick }) {
  const C = onClick ? 'button' : 'div'
  return (
    <C onClick={onClick} className="rounded-2xl bg-white/[0.05] p-3.5 text-left ring-1 ring-white/[0.06] active:bg-white/[0.08]">
      <div className="text-[12px] font-semibold text-slate-400">{label}</div>
      <div className={`mt-0.5 text-[24px] font-extrabold leading-tight tabular-nums ${tone}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[12px] text-slate-500">{sub}</div>}
    </C>
  )
}

// ---------------------------------------------------------------- HOME
function AttentionRow({ id, title, sub, right, tone }) {
  return (
    <button onClick={() => showLoom(id)} className="flex w-full items-center gap-3 px-3.5 py-3 text-left active:bg-white/[0.06]">
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-bold text-white">{title}</div>
        {sub && <div className="truncate text-[13px] text-slate-400">{sub}</div>}
      </div>
      <div className={`shrink-0 text-right text-[14px] font-semibold tabular-nums ${tone || 'text-slate-200'}`}>{right}</div>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-600" />
    </button>
  )
}

function HomeTab() {
  const machines = useFactoryStore((s) => s.machines)
  const summary = useFactoryStore((s) => s.emsSummary)
  const staffing = useFactoryStore((s) => s.staffing)
  const history = useFactoryStore((s) => s.history)
  const loaded = useFactoryStore((s) => s.loaded)
  const name = useFactoryStore((s) => s.settings?.general.factoryName ?? 'Shree Satiji Textiles')
  const s = useSummary()
  const mode = useDataMode()
  const now = useClock()
  const installable = useCanInstall()
  const [copied, setCopied] = useState(false)

  const run = machines.filter(isRun)
  const stopped = machines.filter((m) => !isRun(m)).sort((a, b) => (b.stateMinutes || 0) - (a.stateMinutes || 0))
  const lowEff = run.filter((m) => m.efficiency > 0 && m.efficiency < 65).sort((a, b) => a.efficiency - b.efficiency)
  const plan = useMemo(() => beamPlan(machines, summary), [machines, summary])
  const due24 = plan.groups.now.length + plan.groups.h24.length
  // one row per loom, most urgent reason first
  const { attention, attentionMore } = useMemo(() => {
    const out = []
    const seen = new Set()
    const add = (r) => !seen.has(r.id) && (seen.add(r.id), out.push(r))
    plan.groups.now.forEach((i) => add({ id: i.id, title: i.id, sub: `Beam past planned length${i.beamNo ? ` · ${i.beamNo}` : ''}`, right: 'Check beam', tone: 'text-rose-300' }))
    stopped.forEach((m) => add({ id: m.id, title: m.id, sub: `${statusInfo(m).label}${m.fabric ? ` · ${m.fabric}` : ''}`, right: m.stateMinutes ? fmtDur(m.stateMinutes) : 'Stopped', tone: 'text-amber-300' }))
    plan.groups.h24.forEach((i) => add({ id: i.id, title: i.id, sub: `Beam change${i.beamNo ? ` · ${i.beamNo}` : ''}`, right: fmtEtaShort(i.eta), tone: 'text-sky-300' }))
    lowEff.forEach((m) => add({ id: m.id, title: m.id, sub: `Low efficiency${m.fabric ? ` · ${m.fabric}` : ''}`, right: `${nf(m.efficiency, 1)}%`, tone: 'text-rose-300' }))
    return { attention: out.slice(0, 8), attentionMore: Math.max(0, out.length - 8) }
  }, [plan, stopped, lowEff])
  const today = history?.today
  const hourly = (today?.hourly || []).filter((h) => h.eff !== null)

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(dailyReportText({ machines, summary, history, staffing, factoryName: name }))
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      /* ignore */
    }
  }

  if (!loaded)
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
        <Logo className="h-14 w-14 animate-pulse" />
        <div className="text-[15px]">Connecting to the factory…</div>
      </div>
    )

  return (
    <div className="pb-6">
      <div className="safe-top px-4 pb-1 pt-2">
        <div className="flex items-center gap-3">
          <Logo className="h-10 w-10 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[17px] font-extrabold text-white">{name}</div>
            <div className="flex items-center gap-1.5 text-[13px] text-slate-400">
              <span className={`pulse-dot h-2 w-2 rounded-full ${mode.ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
              <span className={mode.ok ? 'font-semibold text-emerald-300' : 'font-semibold text-rose-300'}>{mode.label === 'LIVE' ? 'Live' : mode.label === 'DEMO' ? 'Demo data' : 'EMS offline'}</span>
              <span>· {now.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</span>
              {staffing?.shiftInfo && <span className="truncate">· {staffing.shiftInfo.name}</span>}
            </div>
          </div>
          <IconBtn icon={Settings} label="Settings" onClick={() => useFactoryStore.getState().setSettingsOpen(true)} />
        </div>
      </div>

      <div className="px-3">
        {/* hero */}
        <button onClick={() => useFactoryStore.getState().setPhoneTab('looms')} className="mt-3 block w-full rounded-3xl bg-gradient-to-br from-emerald-500/15 to-cyan-500/5 p-4 text-left ring-1 ring-emerald-400/20 active:opacity-90">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-[13px] font-semibold text-slate-300">Looms running</div>
              <div className="text-[44px] font-extrabold leading-none tabular-nums text-white">
                {run.length}
                <span className="text-[22px] text-slate-400">/{machines.length}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[13px] font-semibold text-slate-300">Efficiency</div>
              <div className="text-[34px] font-extrabold leading-none tabular-nums text-emerald-300">{nf(s.efficiency, 1)}%</div>
            </div>
          </div>
          <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-white/10">
            <div className="bg-emerald-400" style={{ width: `${(run.length / Math.max(1, machines.length)) * 100}%` }} />
            <div className="bg-amber-400" style={{ width: `${(stopped.length / Math.max(1, machines.length)) * 100}%` }} />
          </div>
          <div className="mt-1.5 flex justify-between text-[12px] text-slate-400">
            <span>{stopped.length} stopped</span>
            <span>See all looms →</span>
          </div>
        </button>

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <Stat label="This shift" value={`${nf(s.production)} m`} sub="as counted by the EMS" tone="text-sky-300" />
          <Stat label="Today since 12 am" value={today?.samples ? `${nf(today.prod)} m` : '-'} sub={today?.samples ? `${nf(today.hoursCovered, 1)} h recorded` : 'starts after deploy'} onClick={() => openReports('today')} />
          <Stat label="Stopped looms" value={stopped.length} tone={stopped.length ? 'text-amber-300' : 'text-emerald-300'} sub={stopped[0] ? `longest ${stopped[0].id}` : 'all running'} onClick={() => useFactoryStore.getState().setPhoneTab('looms')} />
          <Stat label="Beams due in 24 h" value={due24} tone={plan.groups.now.length ? 'text-rose-300' : due24 ? 'text-amber-300' : 'text-white'} sub={plan.spare ? `${plan.spare.length} spare in store` : 'beam plan'} onClick={() => openReports('beams')} />
        </div>

        {hourly.length > 1 && (
          <button onClick={() => openReports('today')} className="mt-2.5 flex w-full items-center justify-between gap-3 rounded-2xl bg-white/[0.05] p-3.5 text-left ring-1 ring-white/[0.06]">
            <div>
              <div className="text-[12px] font-semibold text-slate-400">Efficiency today by hour</div>
              <div className="text-[13px] text-slate-300">avg {nf(today.eff, 1)}%</div>
            </div>
            <Sparkline values={hourly.map((h) => h.eff)} width={150} height={40} />
          </button>
        )}

        {/* needs attention */}
        <SectionTitle>Needs attention</SectionTitle>
        <div className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.06]">
          {attention.map((a) => <AttentionRow key={a.id} {...a} />)}
          {attentionMore > 0 && (
            <button onClick={() => useFactoryStore.getState().setPhoneTab('looms')} className="w-full px-4 py-3 text-left text-[14px] font-semibold text-cyan-300 active:bg-white/[0.06]">
              {attentionMore} more → see Looms
            </button>
          )}
          {!stopped.length && !due24 && !lowEff.length && <div className="flex items-center gap-2 px-4 py-4 text-[15px] text-emerald-300"><Check className="h-5 w-5" /> Everything is running fine.</div>}
        </div>

        {/* staff */}
        {staffing && (
          <>
            <SectionTitle>Operators</SectionTitle>
            <button onClick={() => useFactoryStore.getState().setSettingsOpen(true, 'attendance')} className="flex w-full items-center gap-3 rounded-2xl bg-white/[0.04] p-3.5 text-left ring-1 ring-white/[0.06] active:bg-white/[0.07]">
              <Users className="h-6 w-6 shrink-0 text-amber-300" />
              <div className="min-w-0 flex-1">
                <div className="text-[16px] font-bold text-white">{staffing.present.length} present of {staffing.requiredOperators} needed</div>
                <div className={`truncate text-[13px] ${staffing.uncovered.length ? 'text-rose-300' : 'text-slate-400'}`}>
                  {staffing.uncovered.length ? `${staffing.uncovered.length} looms without operator` : `Every loom covered · ${staffing.perOperator} looms each`}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-500" />
            </button>
          </>
        )}

        {/* actions */}
        <SectionTitle>Quick actions</SectionTitle>
        <div className="grid grid-cols-2 gap-2.5">
          <QuickAction icon={copied ? Check : Copy} label={copied ? 'Copied!' : 'WhatsApp report'} sub="Copy today’s summary" onClick={copyReport} />
          <QuickAction icon={Layers} label="Beam plan" sub="Changes & spares" onClick={() => openReports('beams')} />
          <QuickAction icon={Share2} label="Share link" sub="Send this site" onClick={shareSite} />
          {(installable || isIOS()) ? (
            <QuickAction icon={Download} label="Install app" sub="Add to home screen" onClick={promptInstall} />
          ) : (
            <QuickAction icon={CircleHelp} label="Help" sub="How to use" onClick={() => useFactoryStore.getState().setHelpOpen(true)} />
          )}
        </div>
      </div>
    </div>
  )
}

function QuickAction({ icon: Icon, label, sub, onClick }) {
  return (
    <button onClick={onClick} className="flex min-h-[72px] items-center gap-3 rounded-2xl bg-white/[0.05] p-3 text-left ring-1 ring-white/[0.06] active:bg-white/[0.09]">
      <Icon className="h-6 w-6 shrink-0 text-cyan-300" />
      <div className="min-w-0">
        <div className="text-[15px] font-bold leading-tight text-white">{label}</div>
        <div className="truncate text-[12px] text-slate-400">{sub}</div>
      </div>
    </button>
  )
}

// ---------------------------------------------------------------- LOOMS
const FILTERS = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'running', label: 'Running', test: isRun },
  { id: 'stopped', label: 'Stopped', test: (m) => !isRun(m) },
  { id: 'beam', label: 'Beam due', test: (m) => (Number.isFinite(m.beamMeters) && m.beamMeters <= 0) || (Number.isFinite(m.etaHours) && m.etaHours <= 24) || m.beamLow || (!Number.isFinite(m.etaHours) && m.warpBeamRemaining < 15) },
  { id: 'low', label: 'Low eff.', test: (m) => isRun(m) && m.efficiency < 65 },
]
const SORTS = [
  { id: 'no', label: 'Loom number', fn: (a, b) => a.id.localeCompare(b.id) },
  { id: 'eff', label: 'Lowest efficiency', fn: (a, b) => (isRun(b) - isRun(a)) || a.efficiency - b.efficiency },
  { id: 'prod', label: 'Most production', fn: (a, b) => (b.production || 0) - (a.production || 0) },
  { id: 'beam', label: 'Beam finishing first', fn: (a, b) => beamKey(a) - beamKey(b) },
  { id: 'stop', label: 'Stopped longest', fn: (a, b) => (isRun(a) - isRun(b)) || (b.stateMinutes || 0) - (a.stateMinutes || 0) },
]
function beamKey(m) {
  if (Number.isFinite(m.beamMeters) && m.beamMeters <= 0) return -1
  if (Number.isFinite(m.etaHours)) return m.etaHours
  return Number.isFinite(m.warpBeamRemaining) ? 1000 + m.warpBeamRemaining : 1e9
}

function LoomCard({ m, staffing }) {
  const st = statusInfo(m)
  const beam = beamText(m)
  const op = operatorOf(m, staffing)
  const target = m.targetToday || 0
  return (
    <button onClick={() => showLoom(m.id)} className="relative block w-full overflow-hidden rounded-2xl bg-white/[0.045] p-3.5 pl-4 text-left ring-1 ring-white/[0.06] active:bg-white/[0.08]">
      <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: st.bar }} />
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[19px] font-extrabold text-white">{m.id}</span>
            <span className={`flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2 py-0.5 text-[12px] font-semibold ${st.text}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
              {st.label}
              {Number.isFinite(m.stateMinutes) && <span className="font-normal text-slate-400">{fmtDur(m.stateMinutes)}</span>}
            </span>
          </div>
          {m.fabric && <div className="mt-0.5 truncate text-[13px] text-slate-400">{m.fabric}</div>}
        </div>
        <div className="text-right">
          <div className={`text-[24px] font-extrabold leading-none tabular-nums ${effTone(m)}`}>{nf(m.efficiency, 0)}%</div>
          <div className="mt-0.5 text-[11px] text-slate-500">efficiency</div>
        </div>
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[13px]">
        <div>
          <div className="text-slate-300">
            <span className="font-semibold tabular-nums text-white">{nf(m.production, 0)} m</span> made
          </div>
          {target > 0 && (
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-sky-400" style={{ width: `${Math.min(100, (m.production / target) * 100)}%` }} />
            </div>
          )}
        </div>
        <div className="min-w-0">
          {beam && (
            <>
              <div className={`truncate ${beam.tone}`}>{beam.text}</div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full" style={{ width: `${Math.max(2, Math.min(100, beam.pct || 0))}%`, background: beam.pct < 15 ? '#fb923c' : '#60a5fa' }} />
              </div>
            </>
          )}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-[12px] text-slate-500">
        <span className="truncate">{op ? `Operator: ${op}` : staffing ? 'No operator' : ''}</span>
        <span className="shrink-0">{stopsOf(m)} stops{m.rpm ? ` · ${m.rpm} rpm` : ''}</span>
      </div>
    </button>
  )
}

function LoomsTab() {
  const machines = useFactoryStore((s) => s.machines)
  const staffing = useFactoryStore((s) => s.staffing)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('no')
  const [sortOpen, setSortOpen] = useState(false)
  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.id, machines.filter(f.test).length])), [machines])
  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    const num = t.replace(/^wj[\s-]*/, '')
    const f = FILTERS.find((x) => x.id === filter)
    return machines
      .filter(f.test)
      .filter((m) => {
        if (!t) return true
        if (/^\d{1,2}$/.test(num)) return Number(m.id.replace('WJ-', '')) === Number(num)
        return [m.id, m.fabric, operatorOf(m, staffing), m.beamNo].some((v) => String(v || '').toLowerCase().includes(t))
      })
      .sort(SORTS.find((x) => x.id === sort).fn)
  }, [machines, staffing, q, filter, sort])
  const run = machines.filter(isRun).length

  return (
    <div className="pb-6">
      <div className="safe-top sticky top-0 z-10 border-b border-white/[0.07] bg-[#0b1017]/95 backdrop-blur">
        <div className="flex items-center gap-2 px-4 pt-1.5">
          <div className="min-w-0 flex-1">
            <div className="text-xl font-extrabold text-white">Looms</div>
            <div className="text-[13px] text-slate-400">{run} of {machines.length} running</div>
          </div>
          <button onClick={() => setSortOpen((v) => !v)} className={`flex h-11 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold ${sortOpen ? 'bg-white/15 text-white' : 'bg-white/[0.06] text-slate-200'}`}>
            <ArrowUpDown className="h-4 w-4" /> Sort
          </button>
        </div>
        <div className="relative mx-3 mt-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Loom no., fabric, operator, beam"
            inputMode="search"
            className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.06] pl-10 pr-10 text-[16px] text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
          />
          {q && (
            <button onClick={() => setQ('')} aria-label="Clear search" className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-slate-400"><X className="h-5 w-5" /></button>
          )}
        </div>
        {sortOpen && (
          <div className="mx-3 mt-2 overflow-hidden rounded-xl bg-white/[0.05] ring-1 ring-white/10">
            {SORTS.map((s) => (
              <button key={s.id} onClick={() => { setSort(s.id); setSortOpen(false) }} className="flex w-full items-center justify-between px-4 py-3 text-left text-[15px] text-slate-200 active:bg-white/10">
                {s.label}
                {sort === s.id && <Check className="h-5 w-5 text-cyan-300" />}
              </button>
            ))}
          </div>
        )}
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-3 pb-2.5 pt-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[14px] font-semibold ${filter === f.id ? 'bg-amber-400 text-slate-900' : 'bg-white/[0.06] text-slate-300'}`}
            >
              {f.label}
              <span className={`rounded-full px-1.5 text-[12px] ${filter === f.id ? 'bg-slate-900/15' : 'bg-white/10'}`}>{counts[f.id]}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2.5 p-3">
        {list.map((m) => <LoomCard key={m.id} m={m} staffing={staffing} />)}
        {!list.length && <div className="py-12 text-center text-[15px] text-slate-400">No looms match.</div>}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- LOOM DETAIL (full-screen page)
function LoomDetailPage({ id }) {
  const machines = useFactoryStore((s) => s.machines)
  const ids = machines.map((m) => m.id).sort()
  const idx = ids.indexOf(id)
  const go = (d) => useFactoryStore.getState().setPhoneLoom(ids[(idx + d + ids.length) % ids.length])
  const close = () => useFactoryStore.getState().setPhoneLoom(null)
  useEffect(() => {
    // Android back button closes the page instead of leaving the site
    window.history.pushState({ loom: id }, '')
    const onPop = () => close()
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const back = () => (window.history.state?.loom ? window.history.back() : close())
  const scroller = useRef(null)
  useEffect(() => scroller.current?.scrollTo({ top: 0 }), [id])
  return (
    <div className="slide-up fixed inset-0 z-[45] flex flex-col bg-[#0b1017]">
      <div className="safe-top flex shrink-0 items-center gap-1 border-b border-white/[0.07] px-2 pb-2">
        <button onClick={back} className="flex h-11 items-center gap-1 rounded-xl px-2 text-[15px] font-semibold text-cyan-300 active:bg-white/10">
          <ChevronLeft className="h-6 w-6" /> Back
        </button>
        <div className="flex-1 text-center text-[17px] font-extrabold text-white">{id}</div>
        <IconBtn icon={ChevronLeft} label="Previous loom" onClick={() => go(-1)} />
        <IconBtn icon={ChevronRight} label="Next loom" onClick={() => go(1)} />
      </div>
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-3 text-[15px] [&_.text-\[10px\]]:text-[12px] [&_.text-\[11px\]]:text-[13px] [&_.text-\[12px\]]:text-[14px]">
        <MachinePanel id={id} />
      </div>
      <div className="safe-bottom flex shrink-0 gap-2 border-t border-white/[0.07] px-3 pt-2">
        <button onClick={() => showLoomIn3D(id)} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-white/[0.08] text-[15px] font-semibold text-white active:bg-white/15">
          <Box className="h-5 w-5" /> Show in 3D
        </button>
        <button
          onClick={() => {
            const st = useFactoryStore.getState()
            st.setPhoneLoom(null)
            st.setPhoneTab('ask')
            askAssistant(id)
          }}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-500 text-[15px] font-semibold text-slate-950 active:bg-cyan-400"
        >
          <MessageCircle className="h-5 w-5" /> Ask about it
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- 3D
function Phone3D() {
  const mode = useFactoryStore((s) => s.mode)
  const selected = useFactoryStore((s) => s.selected)
  const { landscape } = useViewport()
  const ready = useFactoryStore((s) => s.sceneReady)
  useEffect(() => {
    // camera to the selected loom once the scene has built (objects register a moment after mount)
    const sel = useFactoryStore.getState().selected
    if (sel && ready) {
      const t = setTimeout(() => focusOnKey(sel.key), 800)
      return () => clearTimeout(t)
    }
  }, [ready])
  return (
    // transform makes this box the frame for the 3D overlays' fixed positioning, so they stay above the tab bar
    <div className="absolute inset-0 overflow-hidden" style={{ transform: 'translateZ(0)' }}>
      <div className="absolute inset-0">
        <FactoryScene />
      </div>
      <div className="pointer-events-none absolute inset-0 z-20">
        <MobileHud landscape={landscape} compact />
        {mode === 'orbit' && selected && <DetailPanel mobile landscape={landscape} startCollapsed />}
      </div>
      <HeatLegend mobile />
      <LoadingScreen />
    </div>
  )
}

// ---------------------------------------------------------------- ASK
function AskTab() {
  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Ask the factory"
        sub="Answers from the live numbers — free, no internet AI"
        right={<IconBtn icon={X} label="Clear chat" onClick={() => useFactoryStore.getState().setChat([])} tone="text-slate-400" />}
      />
      <div className="flex min-h-0 flex-1 flex-col">
        <ChatBody big />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- shell
const TABS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'looms', label: 'Looms', icon: LayoutGrid },
  { id: '3d', label: '3D view', icon: Box },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'ask', label: 'Ask', icon: MessageCircle },
]

function TabBar({ tab, stopped }) {
  const st = useFactoryStore.getState()
  return (
    <nav className="safe-bottom relative z-30 shrink-0 border-t border-white/[0.08] bg-[#0d131c]/98 px-1 pt-1 backdrop-blur" style={{ paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom))' }}>
      <div className="mx-auto flex max-w-xl">
        {TABS.map((t) => {
          const on = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => {
                if (t.id !== '3d' && st.mode !== 'orbit') st.setMode('orbit')
                if (on && t.id === 'home') document.getElementById('phone-scroll')?.scrollTo({ top: 0, behavior: 'smooth' })
                st.setPhoneLoom(null)
                st.setPhoneTab(t.id)
              }}
              className={`relative flex h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-[11.5px] font-semibold ${on ? 'text-amber-300' : 'text-slate-400 active:bg-white/5'}`}
              aria-label={t.label}
              aria-current={on ? 'page' : undefined}
            >
              <t.icon className={`h-6 w-6 ${on ? 'stroke-[2.4]' : ''}`} />
              {t.label}
              {t.id === 'looms' && stopped > 0 && (
                <span className="absolute right-[calc(50%-20px)] top-1 min-w-[18px] rounded-full bg-amber-400 px-1 text-[10.5px] font-bold leading-[18px] text-slate-900">{stopped}</span>
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default function PhoneApp() {
  const tab = useFactoryStore((s) => s.phoneTab)
  const loom = useFactoryStore((s) => s.phoneLoom)
  const reportsOpen = useFactoryStore((s) => s.reportsOpen)
  const stopped = useFactoryStore((s) => s.machines.filter((m) => !isRun(m)).length)

  useEffect(() => {
    const st = useFactoryStore.getState()
    st.setPhoneMode(true)
    return () => st.setPhoneMode(false)
  }, [])
  // anything that asks for the Reports window (keys, assistant) opens the Reports tab instead
  useEffect(() => {
    if (reportsOpen) {
      const st = useFactoryStore.getState()
      st.setReportsOpen(false)
      st.setPhoneTab('reports')
    }
  }, [reportsOpen])
  // leaving the 3D tab: drop the 3D selection and modes so the scene starts clean next time
  useEffect(() => {
    if (tab !== '3d') {
      const st = useFactoryStore.getState()
      if (st.mode !== 'orbit') st.setMode('orbit')
    }
  }, [tab])

  return (
    <div className="fixed inset-0 flex flex-col bg-[#0b1017] text-slate-100">
      <main className="relative min-h-0 flex-1">
        {tab === '3d' ? (
          <Phone3D />
        ) : (
          <div id="phone-scroll" key={tab} className={`absolute inset-0 overscroll-contain ${tab === 'ask' ? 'flex flex-col' : 'overflow-y-auto'}`}>
            {tab === 'home' && <HomeTab />}
            {tab === 'looms' && <LoomsTab />}
            {tab === 'reports' && <ReportsPage />}
            {tab === 'ask' && <AskTab />}
          </div>
        )}
      </main>
      <TabBar tab={tab} stopped={stopped} />
      {loom && <LoomDetailPage id={loom} />}
    </div>
  )
}
