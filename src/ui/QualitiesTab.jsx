// Reports → Qualities: every quality that has run, from the EMS beam list. Also the per-loom
// "Quality history" list used on the loom page.
import { useMemo, useState } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'
import { useFactoryStore } from '../hooks/useFactoryStore'
import { qualityStats, loomBeams, fmtDate, fmtDays } from '../services/qualityHistory'
import { showLoom } from './navigate'

const nf = (n, d = 0) => (Number.isFinite(n) ? n.toLocaleString('en-IN', { maximumFractionDigits: d }) : '-')
const DAY = 86400000
const PERIODS = [
  ['30', 'Last 30 days', 30],
  ['90', 'Last 90 days', 90],
  ['all', 'All', 0],
]

function goLoom(id) {
  useFactoryStore.getState().setReportsOpen(false)
  showLoom(id)
}

function NoData() {
  const bh = useFactoryStore((s) => s.beamHistory)
  return (
    <p className="text-sm text-slate-400">
      {bh ? 'No beam history received yet. It comes from the EMS beam list through the factory PC bridge (update the bridge to the latest version).' : 'Loading beam history…'}
    </p>
  )
}

function BeamTable({ beams, showLoomCol = true, showQuality = false, limit = 40 }) {
  const [all, setAll] = useState(false)
  const rows = all ? beams : beams.slice(0, limit)
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] whitespace-nowrap text-left text-[12px]">
        <thead className="text-slate-500">
          <tr>
            {showLoomCol && <th className="py-1">Loom</th>}
            {showQuality && <th className="py-1">Quality</th>}
            <th>Beam</th>
            <th>Loaded</th>
            <th>Finished</th>
            <th>Took</th>
            <th>Beam m</th>
          </tr>
        </thead>
        <tbody className="tabular-nums text-slate-200">
          {rows.map((b, i) => (
            <tr key={i} className={`border-t border-white/5 ${showLoomCol ? 'cursor-pointer hover:bg-white/[0.04]' : ''}`} onClick={showLoomCol ? () => goLoom(b.loom) : undefined}>
              {showLoomCol && <td className="py-1.5 font-semibold">{b.loom}</td>}
              {showQuality && <td className="max-w-[200px] truncate py-1.5 font-semibold">{b.quality}</td>}
              <td className="text-slate-400">{b.beamNo}</td>
              <td>{fmtDate(b.loadAt)}</td>
              <td className={b.running ? 'font-semibold text-emerald-300' : ''}>{b.running ? 'running now' : fmtDate(b.endAt)}</td>
              <td>{fmtDays(b.days)}</td>
              <td>{nf(b.metres)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {beams.length > limit && (
        <button onClick={() => setAll((v) => !v)} className="mt-2 text-[12px] font-semibold text-cyan-300">
          {all ? 'Show fewer' : `Show all ${beams.length}`}
        </button>
      )}
    </div>
  )
}

function QualityCard({ q, open, onToggle }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white/[0.03] ring-1 ring-white/5">
      <button onClick={onToggle} className="flex w-full items-start gap-3 p-3 text-left hover:bg-white/[0.03]">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-bold text-white">{q.name}</div>
          <div className="mt-0.5 text-[12px] text-slate-400">
            {q.count} beam{q.count === 1 ? '' : 's'} · {nf(q.metres)} m · {q.looms.length} loom{q.looms.length === 1 ? '' : 's'}
            {q.pick ? ` · pick ${q.pick}` : ''}
          </div>
          <div className="mt-0.5 text-[12px] text-slate-500">
            {fmtDate(q.first)} → {q.running.length ? 'now' : fmtDate(q.last)}
            {q.avgDays != null && ` · about ${fmtDays(q.avgDays)} per beam`}
          </div>
          {q.running.length > 0 && <div className="mt-1 text-[12px] font-semibold text-emerald-300">Running now on {q.running.join(', ')}</div>}
        </div>
        <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-white/5 p-3">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {q.looms.map((l) => (
              <button key={l.id} onClick={() => goLoom(l.id)} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[12px] font-semibold text-slate-200 hover:bg-white/10">
                {l.id} <span className="font-normal text-slate-400">×{l.n}</span>
              </button>
            ))}
          </div>
          {q.mPerDay != null && <p className="mb-2 text-[12px] text-slate-400">Finished beams averaged {nf(q.mPerDay)} m of beam per day per loom.</p>}
          <BeamTable beams={q.beams} />
        </div>
      )}
    </div>
  )
}

export default function QualitiesTab() {
  const bh = useFactoryStore((s) => s.beamHistory)
  const history = useFactoryStore((s) => s.history)
  const [period, setPeriod] = useState('90')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(null)
  const since = PERIODS.find((p) => p[0] === period)[2]
  const stats = useMemo(() => (bh?.beams?.length ? qualityStats(bh.beams, since ? Date.now() - since * DAY : 0) : []), [bh, since])
  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return t ? stats.filter((s) => s.key.includes(t) || s.looms.some((l) => l.id.toLowerCase().includes(t))) : stats
  }, [stats, q])
  const todayQ = history?.today?.qualities || []

  if (!bh?.beams?.length) return <NoData />
  const beamsN = stats.reduce((a, s) => a + s.count, 0)
  const oldest = Math.min(...bh.beams.map((b) => b.loadAt))
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {PERIODS.map(([id, label]) => (
          <button key={id} onClick={() => setPeriod(id)} className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${period === id ? 'bg-cyan-400 text-slate-950' : 'bg-white/[0.06] text-slate-300'}`}>
            {label}
          </button>
        ))}
        <div className="relative ml-auto min-w-[180px] flex-1 sm:max-w-[260px] sm:flex-none">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search quality or loom" className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.05] pl-8 pr-8 text-[16px] text-white outline-none placeholder:text-slate-500 focus:border-cyan-400 sm:text-[13px]" />
          {q && <button onClick={() => setQ('')} aria-label="Clear" className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-slate-400"><X className="h-4 w-4" /></button>}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[['Qualities', stats.length], ['Beams', beamsN], ['Beam metres', nf(stats.reduce((a, s) => a + s.metres, 0))]].map(([l, v]) => (
          <div key={l} className="rounded-xl bg-white/[0.04] p-3 ring-1 ring-white/5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{l}</div>
            <div className="mt-1 truncate text-lg font-bold tabular-nums text-white">{v}</div>
          </div>
        ))}
      </div>
      {todayQ.length > 0 && (
        <div className="rounded-2xl bg-white/[0.03] p-3 ring-1 ring-white/5">
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Fabric made today by quality (exact)</div>
          {todayQ.slice(0, 8).map((x) => (
            <div key={x.quality} className="flex justify-between border-t border-white/5 py-1.5 text-[12px] first:border-0">
              <span className="truncate text-slate-200">{x.quality} <span className="text-slate-500">· {x.looms.length} looms</span></span>
              <span className="shrink-0 tabular-nums text-sky-300">{nf(x.prod)} m</span>
            </div>
          ))}
        </div>
      )}
      <div className="space-y-2">
        {list.map((s) => (
          <QualityCard key={s.key} q={s} open={open === s.key} onToggle={() => setOpen(open === s.key ? null : s.key)} />
        ))}
        {!list.length && <p className="py-6 text-center text-sm text-slate-400">No quality matches.</p>}
      </div>
      <p className="text-[11px] text-slate-500">
        From the EMS beam list ({bh.beams.length} beams since {fmtDate(oldest)}). A beam counts as finished when the next beam is loaded on that loom. “Beam m” is the warp length entered for the beam, not exact fabric made — exact metres per quality are counted from now on (the “today” box above).
        {bh.demo ? ' Demo data.' : ''}
      </p>
    </div>
  )
}

/** Past beams and qualities of one loom (loom page). */
export function LoomQualityHistory({ id }) {
  const bh = useFactoryStore((s) => s.beamHistory)
  const beams = useMemo(() => (bh?.beams ? loomBeams(bh.beams, id) : []), [bh, id])
  if (!beams.length) return null
  // collapse runs of the same quality
  const runs = []
  for (const b of beams) {
    const last = runs[runs.length - 1]
    if (last && last.key === b.key) {
      last.beams.push(b)
      last.from = b.loadAt
    } else runs.push({ key: b.key, quality: b.quality, beams: [b], from: b.loadAt, to: b.endAt, running: b.running })
  }
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Quality history</div>
        <div className="text-[10px] text-slate-500">{beams.length} beams since {fmtDate(beams[beams.length - 1].loadAt)}</div>
      </div>
      <div className="divide-y divide-white/5 overflow-hidden rounded-xl bg-white/[0.03] ring-1 ring-white/5">
        {runs.slice(0, 12).map((r, i) => (
          <div key={i} className="flex items-start justify-between gap-3 px-3 py-2">
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold text-white">{r.quality}</div>
              <div className="text-[11px] text-slate-400">
                {r.beams.length} beam{r.beams.length === 1 ? '' : 's'} · {nf(r.beams.reduce((a, b) => a + (b.metres || 0), 0))} m · {r.beams.map((b) => b.beamNo).slice(0, 4).join(', ')}
                {r.beams.length > 4 ? '…' : ''}
              </div>
            </div>
            <div className="shrink-0 text-right text-[11px] tabular-nums text-slate-400">
              <div>{fmtDate(r.from)}</div>
              <div className={r.running ? 'font-semibold text-emerald-300' : ''}>{r.running ? 'now' : fmtDate(r.to)}</div>
            </div>
          </div>
        ))}
      </div>
      {runs.length > 12 && <div className="mt-1 text-[11px] text-slate-500">+{runs.length - 12} older — see Reports → Qualities</div>}
    </div>
  )
}
