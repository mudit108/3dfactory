import { useEffect, useMemo, useState } from 'react'
import { BarChart3, X, RefreshCw, Copy, Share2, Download, CalendarDays, Activity, Users, Layers, Clock } from 'lucide-react'
import { useFactoryStore } from '../hooks/useFactoryStore'
import { fetchHistory, HISTORY_MODE } from '../services/historyApi'
import { combineDays } from '../shared/historyMath'
import { beamPlan, operatorStats, fmtEtaShort, fmtClock } from '../services/planning'
import { dailyReportText, loomsCsv } from '../services/reportText'
import { showLoom } from './navigate'
import { BarChart, LineChart } from './charts'

const nf = (n, d = 0) => (Number.isFinite(n) ? n.toLocaleString('en-IN', { maximumFractionDigits: d }) : '-')
const dayLabel = (d) => new Date(`${d}T12:00:00+05:30`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' })

const TABS = [
  { id: 'today', label: 'Today', icon: Clock },
  { id: 'week', label: 'Last 7 days', icon: CalendarDays },
  { id: 'looms', label: 'Loom ranking', icon: Activity },
  { id: 'operators', label: 'Operators', icon: Users },
  { id: 'beams', label: 'Beam plan', icon: Layers },
]

function goLoom(id) {
  useFactoryStore.getState().setReportsOpen(false)
  showLoom(id)
}

function Kpi({ label, value, sub, tone }) {
  return (
    <div className="rounded-xl bg-white/[0.04] p-3 ring-1 ring-white/5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`mt-1 text-xl font-bold tabular-nums ${tone || 'text-white'}`}>{value}</div>
      {sub && <div className="text-[11px] text-slate-500">{sub}</div>}
    </div>
  )
}

/** LineChart sized to the panel (the chart draws in its own pixel units). */
function WideLine(props) {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024
  const w = vw >= 768 ? Math.min(1152, vw - 48) - 300 : vw - 58
  return <LineChart {...props} width={Math.max(260, w)} />
}

function Card({ title, children, right }) {
  return (
    <div className="rounded-2xl bg-white/[0.03] p-3 ring-1 ring-white/5 sm:p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{title}</div>
        {right}
      </div>
      {children}
    </div>
  )
}

function NoHistory({ history, error }) {
  if (HISTORY_MODE === 'none')
    return <p className="text-sm text-slate-400">History is saved only on the online (Vercel) version. Open the website to see trends.</p>
  if (error) return <p className="text-sm text-rose-300">Could not load history: {error}</p>
  if (!history) return <p className="text-sm text-slate-400">Loading history…</p>
  return <p className="text-sm text-slate-400">No history saved yet. A snapshot is saved every 5 minutes while the factory PC bridge is running, so charts fill up during the day.</p>
}

function TodayTab({ machines, summary, history, error }) {
  const t = history?.today
  const runList = machines.filter((m) => m.status === 'running')
  const run = runList.length
  const effNow = summary?.efficiency ?? (run ? runList.reduce((a, m) => a + (m.efficiency || 0), 0) / run : 0)
  const hourly = (t?.hourly || []).filter((h) => h.eff !== null)
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi label="Running now" value={`${run}/${machines.length}`} tone={run / Math.max(1, machines.length) > 0.8 ? 'text-emerald-300' : 'text-amber-300'} />
        <Kpi label="Efficiency now" value={`${nf(effNow, 1)}%`} />
        <Kpi label="This shift" value={`${nf(summary?.production ?? machines.reduce((a, m) => a + (m.production || 0), 0))} m`} sub="as the EMS counts it" />
        <Kpi label="Today since 12 am" value={t?.samples ? `${nf(t.prod)} m` : '-'} sub={t?.samples ? `${nf(t.hoursCovered, 1)} h recorded` : 'needs history'} />
      </div>
      {hourly.length > 1 ? (
        <>
          <Card title="Efficiency by hour (%)">
            <WideLine data={hourly.map((h) => ({ label: `${h.h}`, value: h.eff }))} suffix="%" color="#34d399" />
          </Card>
          <Card title="Production by hour (m)">
            <BarChart data={hourly.map((h) => ({ label: `${h.h}`, value: h.prod }))} format={(v) => `${nf(v)} m`} />
          </Card>
          <Card title="Looms running by hour">
            <BarChart data={hourly.map((h) => ({ label: `${h.h}`, value: h.run }))} color="#a78bfa" format={(v) => `${nf(v, 1)} looms`} />
          </Card>
        </>
      ) : (
        <Card title="Trends">
          <NoHistory history={history} error={error} />
        </Card>
      )}
    </div>
  )
}

function WeekTab({ history, error }) {
  const days = [...(history?.days || [])].reverse()
  const t = history?.today
  if (!days.length) return <Card title="Last 7 days"><NoHistory history={history} error={error} /></Card>
  const best = days.reduce((a, d) => (d.prod > a.prod ? d : a), days[0])
  const total = days.reduce((a, d) => a + d.prod, 0)
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi label={`${days.length}-day production`} value={`${nf(total)} m`} />
        <Kpi label="Average per day" value={`${nf(total / days.length)} m`} />
        <Kpi label="Best day" value={dayLabel(best.date)} sub={`${nf(best.prod)} m`} tone="text-emerald-300" />
        <Kpi label="Today so far" value={t?.samples ? `${nf(t.prod)} m` : '-'} />
      </div>
      <Card title="Production per day (m)">
        <BarChart data={days.map((d) => ({ label: dayLabel(d.date), value: d.prod }))} format={(v) => `${nf(v)} m`} highlightLast={false} />
      </Card>
      {days.length > 1 && (
        <Card title="Average efficiency per day (%)">
          <WideLine data={days.map((d) => ({ label: dayLabel(d.date).split(' ')[1], value: d.eff }))} suffix="%" color="#38bdf8" />
        </Card>
      )}
      <Card title="Day by day">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] whitespace-nowrap text-left text-[12px]">
            <thead className="text-slate-500">
              <tr><th className="py-1">Day</th><th>Production</th><th>Avg eff.</th><th>Avg running</th><th>Stops</th><th>Loom-hours stopped</th><th>Recorded</th></tr>
            </thead>
            <tbody className="tabular-nums text-slate-200">
              {[...days].reverse().map((d) => (
                <tr key={d.date} className="border-t border-white/5">
                  <td className="py-1.5 font-semibold">{dayLabel(d.date)}</td>
                  <td>{nf(d.prod)} m</td>
                  <td>{nf(d.eff, 1)}%</td>
                  <td>{nf(d.running, 1)}/{d.total}</td>
                  <td>{nf(d.stops)}</td>
                  <td>{nf(d.downHours, 1)}</td>
                  <td className={d.hoursCovered < 20 ? 'text-amber-300' : 'text-slate-500'}>{nf(d.hoursCovered, 1)} h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">Days with fewer recorded hours (amber) had the factory PC or bridge off for part of the day.</p>
      </Card>
    </div>
  )
}

function LoomsTab({ machines, history, error }) {
  const [period, setPeriod] = useState('today')
  const [sort, setSort] = useState('prod')
  const rows = useMemo(() => {
    if (period === 'live')
      return machines.map((m) => ({ id: m.id, prod: Math.round(m.production || 0), eff: m.efficiency || 0, stops: m.stopCount ?? 0, downMin: m.status === 'running' ? 0 : Math.round(m.stateMinutes || 0) }))
    if (period === 'today') return history?.today?.looms || []
    return combineDays([...(history?.days || []), ...(history?.today ? [history.today] : [])])
  }, [period, machines, history])
  const sorted = [...rows].sort((a, b) => (sort === 'id' ? a.id.localeCompare(b.id) : sort === 'stops' || sort === 'downMin' ? b[sort] - a[sort] : b[sort] - a[sort]))
  const max = Math.max(1, ...rows.map((r) => r.prod))
  const download = () => {
    const blob = new Blob([loomsCsv(sorted)], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `looms-${period}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const Th = ({ k, children }) => (
    <th className={`cursor-pointer select-none py-1 ${sort === k ? 'text-cyan-300' : ''}`} onClick={() => setSort(k)}>{children}</th>
  )
  return (
    <Card
      title="Loom ranking"
      right={
        <div className="flex items-center gap-1">
          {[['live', 'This shift'], ['today', 'Today'], ['week', '7 days']].map(([k, l]) => (
            <button key={k} onClick={() => setPeriod(k)} className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${period === k ? 'bg-cyan-400/15 text-cyan-200' : 'text-slate-400 hover:bg-white/5'}`}>{l}</button>
          ))}
          <button onClick={download} title="Download CSV" className="ml-1 rounded-lg p-1.5 text-slate-400 hover:bg-white/5"><Download className="h-3.5 w-3.5" /></button>
        </div>
      }
    >
      {!rows.length ? (
        <NoHistory history={history} error={error} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead className="text-slate-500">
              <tr><Th k="id">Loom</Th><Th k="prod">Production</Th><Th k="eff">Avg eff.</Th><Th k="stops">Stops</Th><Th k="downMin">Stopped</Th></tr>
            </thead>
            <tbody className="tabular-nums text-slate-200">
              {sorted.map((r) => (
                <tr key={r.id} className="cursor-pointer border-t border-white/5 hover:bg-white/[0.04]" onClick={() => goLoom(r.id)}>
                  <td className="py-1.5 font-semibold">{r.id}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded bg-white/5 sm:w-28"><div className="h-full bg-sky-400/70" style={{ width: `${(r.prod / max) * 100}%` }} /></div>
                      {nf(r.prod)} m
                    </div>
                  </td>
                  <td className={r.eff < 65 ? 'text-rose-300' : r.eff >= 80 ? 'text-emerald-300' : ''}>{nf(r.eff, 1)}%</td>
                  <td>{nf(r.stops)}</td>
                  <td>{r.downMin >= 60 ? `${nf(r.downMin / 60, 1)} h` : `${nf(r.downMin)} min`}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[11px] text-slate-500">Tap a loom to fly to it. Click a column to sort.</p>
        </div>
      )}
    </Card>
  )
}

function OperatorsTab({ machines, staffing, history }) {
  const week = useMemo(() => (history?.days?.length ? combineDays(history.days) : null), [history])
  const list = operatorStats(machines, staffing, week)
  if (!list.length)
    return (
      <Card title="Operators">
        <p className="text-sm text-slate-400">No operators are marked present for this shift. Mark attendance in Settings → Attendance.</p>
        <button onClick={() => useFactoryStore.getState().setSettingsOpen(true, 'attendance')} className="mt-2 rounded-lg bg-amber-400/15 px-3 py-1.5 text-xs font-semibold text-amber-100">Open attendance</button>
      </Card>
    )
  return (
    <Card title={`Operators this shift (${list.length})`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] whitespace-nowrap text-left text-[12px]">
          <thead className="text-slate-500">
            <tr><th className="py-1">#</th><th>Operator</th><th>Looms</th><th>Running</th><th>Avg eff.</th><th>Shift prod.</th><th>Stops</th>{week && <th>7-day prod.</th>}</tr>
          </thead>
          <tbody className="tabular-nums text-slate-200">
            {list.map((o, i) => (
              <tr key={o.op.id} className="border-t border-white/5">
                <td className="py-1.5 text-slate-500">{i + 1}</td>
                <td className="font-semibold">{o.op.name}</td>
                <td className="max-w-[200px] truncate text-slate-400">{o.looms.map((id) => id.replace('WJ-', '')).join(', ')}</td>
                <td>{o.running}/{o.looms.length}</td>
                <td className={o.eff < 65 ? 'text-rose-300' : o.eff >= 80 ? 'text-emerald-300' : ''}>{nf(o.eff, 1)}%</td>
                <td>{nf(o.prod)} m</td>
                <td>{nf(o.stops)}</td>
                {week && <td>{nf(o.weekProd)} m</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">Uses today’s loom assignments from Settings. The 7-day column assumes the same looms all week.</p>
    </Card>
  )
}

function BeamsTab({ machines, summary }) {
  const plan = beamPlan(machines, summary)
  const Group = ({ title, items, tone }) =>
    items.length ? (
      <div>
        <div className={`mb-1 text-[11px] font-bold uppercase tracking-wider ${tone}`}>{title} · {items.length}</div>
        <div className="divide-y divide-white/5 overflow-hidden rounded-xl ring-1 ring-white/5">
          {items.map((i) => (
            <button key={i.id} onClick={() => goLoom(i.id)} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-white/[0.04]">
              <span className="min-w-0">
                <span className="text-[13px] font-semibold text-white">{i.id}</span>
                <span className="ml-2 text-[11px] text-slate-400">{i.beamNo ? `beam ${i.beamNo} · ` : ''}{String(i.quality).slice(0, 30)}</span>
                {plan.spare && <span className={`block text-[11px] ${i.spare ? 'text-emerald-300' : 'text-slate-500'}`}>{i.spare ? `Spare ready: ${i.spare}` : 'No matching spare beam'}</span>}
              </span>
              <span className="shrink-0 text-right text-[12px] tabular-nums">
                <span className="block font-semibold text-sky-300">{i.over ? `${nf(i.over)} m over` : fmtEtaShort(i.eta)}</span>
                <span className="text-slate-500">{i.over ? 'check beam' : fmtClock(i.etaAt)}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    ) : null
  if (!plan.items.length) return <Card title="Beam plan"><p className="text-sm text-slate-400">No beam data yet. It comes from the live EMS through the factory PC bridge.</p></Card>
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi label="Due now" value={plan.groups.now.length} tone={plan.groups.now.length ? 'text-rose-300' : undefined} />
        <Kpi label="Next 24 h" value={plan.groups.h24.length} tone="text-amber-300" />
        <Kpi label="24–48 h" value={plan.groups.h48.length} />
        <Kpi label="Spare beams" value={plan.spare ? plan.spare.length : '-'} sub={plan.spare ? `${nf(plan.spareMeters)} m` : 'not in data'} />
      </div>
      {plan.warnings.length > 0 && (
        <div className="space-y-1.5 rounded-2xl bg-amber-400/10 p-3 ring-1 ring-amber-300/20">
          {plan.warnings.map((w, i) => <p key={i} className="text-[12.5px] text-amber-100">⚠ {w}</p>)}
        </div>
      )}
      <Group title="Past planned length" items={plan.groups.now} tone="text-rose-300" />
      <Group title="Within 24 hours" items={plan.groups.h24} tone="text-amber-300" />
      <Group title="24 to 48 hours" items={plan.groups.h48} tone="text-sky-300" />
      <Group title="This week" items={plan.groups.week} tone="text-slate-400" />
      {plan.unusedSpare.length > 0 && (
        <Card title="Spare beams not matched this week">
          {plan.unusedSpare.map((b) => (
            <div key={b.k} className="flex justify-between border-t border-white/5 py-1.5 text-[12px] first:border-0">
              <span className="text-slate-200">{b.beamNo || b.stockNo} · {b.quality}{b.party ? ` · ${b.party}` : ''}</span>
              <span className="tabular-nums text-slate-400">{nf(b.meters)} m</span>
            </div>
          ))}
        </Card>
      )}
      <p className="text-[11px] text-slate-500">Finish times are estimates from beam meters left and the loom’s speed. A spare beam is matched when its quality name is the same as the loom’s.</p>
    </div>
  )
}

const TAB_VIEWS = { today: TodayTab, week: WeekTab, looms: LoomsTab, operators: OperatorsTab, beams: BeamsTab }

function useReportData() {
  const machines = useFactoryStore((s) => s.machines)
  const summary = useFactoryStore((s) => s.emsSummary)
  const staffing = useFactoryStore((s) => s.staffing)
  const history = useFactoryStore((s) => s.history)
  const error = useFactoryStore((s) => s.historyError)
  const factoryName = useFactoryStore((s) => s.settings?.general.factoryName)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const refresh = async () => {
    if (HISTORY_MODE === 'none') return
    setBusy(true)
    try {
      useFactoryStore.getState().setHistory(await fetchHistory(7))
    } catch (e) {
      useFactoryStore.getState().setHistoryError(e.message)
    }
    setBusy(false)
  }
  const reportText = () => dailyReportText({ machines, summary, history, staffing, factoryName: factoryName || undefined })
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(reportText())
      setNote('Report copied — paste it in WhatsApp')
    } catch {
      setNote('Could not copy on this browser')
    }
    setTimeout(() => setNote(''), 3000)
  }
  const share = async () => {
    try {
      await navigator.share({ title: 'Factory report', text: reportText() })
    } catch {
      /* cancelled */
    }
  }
  return { props: { machines, summary, staffing, history, error }, history, busy, note, refresh, copy, share }
}

/** Phone page version (no modal): sticky header + swipeable tab chips. */
export function ReportsPage() {
  const tab = useFactoryStore((s) => s.reportsTab)
  const { props, history, busy, note, refresh, copy, share } = useReportData()
  const setTab = (t) => useFactoryStore.setState({ reportsTab: t })
  const T = TAB_VIEWS[tab] || TodayTab
  return (
    <div className="min-h-full">
      <div className="safe-top sticky top-0 z-10 border-b border-white/[0.07] bg-[#0b1017]/95 backdrop-blur">
        <div className="flex items-center gap-2 px-4 pb-1 pt-2">
          <div className="text-xl font-extrabold text-white">Reports</div>
          {history?.mode === 'demo' && <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-200">Demo</span>}
          <div className="ml-auto flex items-center">
            <button onClick={copy} aria-label="Copy report for WhatsApp" className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-200 active:bg-white/10"><Copy className="h-5 w-5" /></button>
            {typeof navigator !== 'undefined' && navigator.share && (
              <button onClick={share} aria-label="Share report" className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-200 active:bg-white/10"><Share2 className="h-5 w-5" /></button>
            )}
            {HISTORY_MODE !== 'none' && (
              <button onClick={refresh} aria-label="Reload" className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-300 active:bg-white/10"><RefreshCw className={`h-5 w-5 ${busy ? 'animate-spin' : ''}`} /></button>
            )}
          </div>
        </div>
        {note && <div className="px-4 pb-1 text-[13px] text-emerald-300">{note}</div>}
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-3 pb-2.5 pt-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-[14px] font-semibold ${tab === t.id ? 'bg-cyan-400 text-slate-950' : 'bg-white/[0.06] text-slate-300'}`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="p-3 [&_.text-\[10px\]]:text-[12px] [&_.text-\[11px\]]:text-[13px] [&_.text-\[12px\]]:text-[14px] [&_.text-\[12\.5px\]]:text-[14px] [&_.text-\[13px\]]:text-[15px] [&_.text-xl]:text-2xl">
        <T {...props} />
      </div>
    </div>
  )
}

export default function ReportsModal() {
  const open = useFactoryStore((s) => s.reportsOpen)
  const tab = useFactoryStore((s) => s.reportsTab)
  const { props, history, busy, note, refresh, copy, share } = useReportData()

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && useFactoryStore.getState().setReportsOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null
  const close = () => useFactoryStore.getState().setReportsOpen(false)
  const setTab = (t) => useFactoryStore.setState({ reportsTab: t })
  const T = TAB_VIEWS[tab] || TodayTab

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm md:p-6" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="glass fade-in flex h-full max-h-[900px] w-full max-w-6xl flex-col overflow-hidden rounded-none md:rounded-3xl" style={{ background: 'linear-gradient(180deg, rgba(17,24,38,0.98), rgba(10,15,24,0.99))' }}>
        <div className="safe-top flex items-center gap-2 border-b border-white/[0.07] px-4 py-3 md:px-5">
          <BarChart3 className="h-5 w-5 text-cyan-300" />
          <div className="text-lg font-extrabold text-white">Reports</div>
          {history?.mode === 'demo' && <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-200">Demo history</span>}
          {note && <span className="hidden text-[12px] text-emerald-300 sm:inline">{note}</span>}
          <div className="ml-auto flex items-center gap-1">
            <button onClick={copy} title="Copy a text report for WhatsApp" className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10"><Copy className="h-4 w-4" /><span className="hidden sm:inline">Copy report</span></button>
            {typeof navigator !== 'undefined' && navigator.share && (
              <button onClick={share} title="Share report" className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10"><Share2 className="h-4 w-4" /><span className="hidden sm:inline">Share</span></button>
            )}
            {HISTORY_MODE !== 'none' && (
              <button onClick={refresh} title="Reload history" className="rounded-lg p-2 text-slate-400 hover:bg-white/10"><RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} /></button>
            )}
            <button onClick={close} aria-label="Close reports" className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>
          </div>
        </div>
        {note && <div className="px-4 pt-2 text-[12px] text-emerald-300 sm:hidden">{note}</div>}
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <div className="no-scrollbar flex shrink-0 gap-1 overflow-x-auto border-b border-white/[0.07] p-2 md:w-52 md:flex-col md:border-b-0 md:border-r">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] font-semibold ${tab === t.id ? 'bg-cyan-400/15 text-cyan-100 ring-1 ring-cyan-300/40' : 'text-slate-300 hover:bg-white/[0.06]'}`}
              >
                <t.icon className={`h-4 w-4 ${tab === t.id ? 'text-cyan-300' : 'text-slate-500'}`} />
                {t.label}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 scrollbar-thin sm:p-4 md:p-5">
            <T {...props} />
          </div>
        </div>
      </div>
    </div>
  )
}
