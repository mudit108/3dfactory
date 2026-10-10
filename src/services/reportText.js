// Plain-text daily report — copy to WhatsApp or share from the phone.
import { beamPlan, fmtEtaShort } from './planning'

const nf = (n, d = 0) => (Number.isFinite(n) ? n.toLocaleString('en-IN', { maximumFractionDigits: d }) : '-')

export function dailyReportText({ machines, summary, history, staffing, factoryName = 'Shree Satiji Textiles' }) {
  const now = new Date()
  const run = machines.filter((m) => m.status === 'running')
  const stopped = machines.filter((m) => m.status !== 'running')
  const eff = summary?.efficiency ?? (run.length ? run.reduce((a, m) => a + m.efficiency, 0) / run.length : 0)
  const prodShift = summary?.production ?? machines.reduce((a, m) => a + (m.production || 0), 0)
  const t = history?.today
  const y = history?.days?.[0]
  const L = []
  L.push(`*${factoryName} — ${now.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}*`)
  L.push(`Looms running: ${run.length}/${machines.length}`)
  L.push(`Efficiency now: ${nf(eff, 1)}%`)
  L.push(`Production this shift: ${nf(prodShift)} m`)
  if (t?.samples) L.push(`Production today (since 12 am): ${nf(t.prod)} m · avg eff ${nf(t.eff, 1)}%`)
  if (y) L.push(`Yesterday: ${nf(y.prod)} m · avg eff ${nf(y.eff, 1)}% · ${nf(y.downHours, 1)} loom-hours stopped`)
  if (stopped.length) {
    L.push('')
    L.push(`*Stopped (${stopped.length})*: ${stopped
      .sort((a, b) => (b.stateMinutes || 0) - (a.stateMinutes || 0))
      .slice(0, 10)
      .map((m) => `${m.id}${Number.isFinite(m.stateMinutes) ? ` ${Math.round(m.stateMinutes)}m` : ''}`)
      .join(', ')}`)
  }
  const low = run.filter((m) => m.efficiency > 0).sort((a, b) => a.efficiency - b.efficiency).slice(0, 5)
  if (low.length) L.push(`*Lowest efficiency*: ${low.map((m) => `${m.id} ${nf(m.efficiency)}%`).join(', ')}`)
  const plan = beamPlan(machines, summary)
  const next = plan.items.slice(0, 6)
  if (next.length) {
    L.push('')
    L.push('*Beams finishing first*')
    for (const i of next) L.push(`${i.id}: ${i.over ? `over by ${nf(i.over)} m` : fmtEtaShort(i.eta)}${i.beamNo ? ` (beam ${i.beamNo})` : ''}`)
  }
  if (plan.spare) L.push(`Spare beams: ${plan.spare.length} (${nf(plan.spareMeters)} m)`)
  for (const w of plan.warnings.slice(0, 3)) L.push(`⚠ ${w}`)
  if (staffing) {
    L.push('')
    L.push(`Operators present: ${staffing.present.length}/${staffing.requiredOperators} needed${staffing.uncovered.length ? ` · ${staffing.uncovered.length} looms without operator` : ''}`)
  }
  return L.join('\n')
}

export function loomsCsv(rows) {
  const head = ['Loom', 'Production m', 'Avg efficiency %', 'Stops', 'Stopped minutes']
  const body = rows.map((r) => [r.id, r.prod, r.eff, r.stops, r.downMin].join(','))
  return [head.join(','), ...body].join('\n')
}
