import { beamPlan, operatorStats, fmtEtaShort } from './planning'
import { combineDays } from '../shared/historyMath'
import { dailyReportText } from './reportText'
import { qualityStats, matchQualities, loomBeams, fmtDate, fmtDays } from './qualityHistory'

// Factory assistant: answers questions from the live numbers on screen. No AI service, no cost, no
// internet call - it reads the same data the 3D factory already has and works out the answers in code,
// so it cannot make things up. Understands English plus common Hindi/Gujarati words written in English.

const nf = (n, d = 0) => (Number.isFinite(n) ? n.toLocaleString('en-IN', { maximumFractionDigits: d }) : '-')
const loomNo = (id) => String(id).replace(/^WJ-/, '')
const fmtMin = (min) => {
  if (!Number.isFinite(min)) return '-'
  const h = Math.floor(min / 60)
  const m = Math.floor(min % 60)
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')} m` : `${m} min`
}
const fmtEta = (h) => {
  if (!Number.isFinite(h)) return '-'
  if (h <= 0) return 'due now'
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`
  if (h < 48) return `${Math.floor(h)} h ${String(Math.round((h % 1) * 60)).padStart(2, '0')} m`
  return `${(h / 24).toFixed(1)} days`
}
const clockAt = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { weekday: 'short', hour: 'numeric', minute: '2-digit' }) : '')
const stopsOf = (m) => (Number.isFinite(m.stopCount) ? m.stopCount : m.stops ? (m.stops.warp || 0) + (m.stops.weft || 0) + (m.stops.other || 0) : 0)
const running = (m) => m.status === 'running'
const sum = (a, f) => a.reduce((s, x) => s + (f(x) || 0), 0)
const avg = (a, f) => (a.length ? sum(a, f) / a.length : 0)
const has = (q, ...words) => words.some((w) => q.includes(w))

export const SUGGESTIONS = ['Factory summary', 'Which looms are stopped?', 'Beam plan', 'Production today', 'Yesterday', 'Lowest efficiency', 'Operator ranking', 'WhatsApp report']

/** Pulls a loom number out of the question: "WJ-12", "loom 5", "machine no 7", or just "12". */
function findLoom(q, machines) {
  const m = q.match(/\bwj[\s-]*0?(\d{1,2})\b/) || q.match(/\b(?:loom|machine|mc|m\/c|number|no|nambar|number)\.?\s*#?\s*0?(\d{1,2})\b/) || q.match(/^\s*#?0?(\d{1,2})\s*\??$/)
  if (!m) return null
  const id = `WJ-${String(Number(m[1])).padStart(2, '0')}`
  return machines.find((x) => x.id === id) || { missing: id }
}

function row(m, right, tone) {
  return { id: m.id, left: `${m.id}`, sub: m.fabric ? String(m.fabric).slice(0, 34) : '', right, tone }
}

function loomReport(m, ctx) {
  const lines = []
  const op = ctx.staffing?.machineOperator?.[m.id]
  lines.push(`${m.id} is ${running(m) ? 'running' : m.status === 'maintenance' ? 'in maintenance' : 'stopped'}${Number.isFinite(m.stateMinutes) ? ` (${running(m) ? 'for' : 'for'} ${fmtMin(m.stateMinutes)})` : ''}.`)
  lines.push(`Efficiency ${nf(m.efficiency, 1)}%${m.rpm ? `, ${nf(m.rpm)} RPM` : ''}${m.pick ? `, pick ${nf(m.pick, 0)}` : ''}.`)
  lines.push(`Production today ${nf(m.production, 1)} m${m.targetToday ? ` of about ${nf(m.targetToday)} m possible` : ''}. Stops: ${nf(stopsOf(m))}.`)
  if (m.fabric) lines.push(`Fabric: ${m.fabric}.`)
  if (Number.isFinite(m.beamMeters)) {
    if (m.beamMeters <= 0) lines.push(`Beam${m.beamNo ? ` ${m.beamNo}` : ''} has run ${nf(-m.beamMeters, 0)} m past its planned ${m.beamTotal ? nf(m.beamTotal) + ' m' : 'length'} in the EMS. It can finish any time; check the loom and the beam length entered in the EMS.`)
    else lines.push(`Beam${m.beamNo ? ` ${m.beamNo}` : ''}: ${nf(m.beamMeters, 0)} m left${m.beamTotal ? ` of ${nf(m.beamTotal)} m` : ''}${Number.isFinite(m.etaHours) ? `, finishes in ${fmtEta(m.etaHours)} (${clockAt(m.etaAt)})` : ''}.`)
  }
  if (m.beamLow) lines.push('Beam alert: this beam is almost finished.')
  if (m.alert === 'red') lines.push('EMS alert: Manual stop.')
  if (m.alert === 'blue') lines.push('EMS alert: Filler.')
  if (op) lines.push(`Operator: ${op.name}.`)
  else if (ctx.staffing) lines.push('No operator assigned today.')
  return { lines, focus: m.id, chips: ['Factory summary', 'Beams finishing first'] }
}

function overview(ctx) {
  const { machines, summary: s, staffing } = ctx
  const run = machines.filter(running)
  const stopped = machines.filter((m) => !running(m))
  const eff = s?.efficiency ?? avg(run, (m) => m.efficiency)
  const prod = s?.production ?? sum(machines, (m) => m.production)
  const lines = [`${run.length} of ${machines.length} looms running, ${stopped.length} stopped.`, `Efficiency ${nf(eff, 1)}%${s?.avgRpm ? `, average RPM ${nf(s.avgRpm, 0)}` : ''}.`, `Production so far: ${nf(prod, 1)} m.`]
  const longest = stopped.filter((m) => Number.isFinite(m.stateMinutes)).sort((a, b) => b.stateMinutes - a.stateMinutes)[0]
  if (longest) lines.push(`Longest stop: ${longest.id}, ${fmtMin(longest.stateMinutes)}.`)
  const low = machines.filter((m) => m.beamLow)
  if (low.length) lines.push(`${low.length} looms have a beam almost finished (${low.slice(0, 4).map((m) => loomNo(m.id)).join(', ')}${low.length > 4 ? '…' : ''}).`)
  const next = machines.filter((m) => Number.isFinite(m.etaHours)).sort((a, b) => a.etaHours - b.etaHours)[0]
  if (next) lines.push(next.etaHours <= 0 || next.beamMeters <= 0 ? `Beam due now on ${next.id} (past the length entered in the EMS).` : `Next beam to finish: ${next.id} in ${fmtEta(next.etaHours)}.`)
  const spare = s?.spareBeams
  if (Array.isArray(spare)) lines.push(`Spare beams in store: ${spare.length}${s.spareMeters ? ` (${nf(s.spareMeters)} m)` : ''}.`)
  if (staffing) lines.push(`Operators present: ${staffing.present.length} (need ${staffing.requiredOperators})${staffing.uncovered.length ? `, ${staffing.uncovered.length} looms without an operator` : ''}.`)
  return { lines, chips: ['Which looms are stopped?', 'Beams finishing first', 'Lowest efficiency'] }
}

function stoppedList(ctx) {
  const list = ctx.machines.filter((m) => !running(m)).sort((a, b) => (b.stateMinutes || 0) - (a.stateMinutes || 0))
  if (!list.length) return { lines: ['All looms are running.'], chips: ['Factory summary'] }
  return {
    lines: [`${list.length} looms are not running (longest first):`],
    rows: list.map((m) => row(m, Number.isFinite(m.stateMinutes) ? fmtMin(m.stateMinutes) : m.status, 'bad')),
    chips: ['Factory summary', 'Most stops'],
  }
}

function efficiencyReport(ctx, worst = true) {
  const run = ctx.machines.filter(running)
  const eff = ctx.summary?.efficiency ?? avg(run, (m) => m.efficiency)
  const sorted = [...ctx.machines].sort((a, b) => (worst ? a.efficiency - b.efficiency : b.efficiency - a.efficiency)).slice(0, 8)
  const below = ctx.machines.filter((m) => running(m) && m.efficiency < 75).length
  return {
    lines: [`Average efficiency ${nf(eff, 1)}%. ${below} running looms are below 75%.`, worst ? 'Lowest efficiency:' : 'Highest efficiency:'],
    rows: sorted.map((m) => row(m, `${nf(m.efficiency, 1)}%`, m.efficiency < 75 ? 'bad' : m.efficiency >= 90 ? 'good' : undefined)),
    chips: [worst ? 'Highest efficiency' : 'Lowest efficiency', 'Production today'],
  }
}

function productionReport(ctx) {
  const prod = ctx.summary?.production ?? sum(ctx.machines, (m) => m.production)
  const cap = sum(ctx.machines, (m) => m.targetToday)
  const top = [...ctx.machines].sort((a, b) => (b.production || 0) - (a.production || 0)).slice(0, 5)
  const lines = [`Production so far: ${nf(prod, 1)} m.`]
  if (cap) lines.push(`Full-day capacity of all looms at 100% efficiency is about ${nf(cap)} m.`)
  lines.push('Top looms:')
  return { lines, rows: top.map((m) => row(m, `${nf(m.production, 1)} m`, 'good')), chips: ['Lowest production', 'Factory summary'] }
}

function lowProduction(ctx) {
  const low = [...ctx.machines].sort((a, b) => (a.production || 0) - (b.production || 0)).slice(0, 8)
  return { lines: ['Lowest production today:'], rows: low.map((m) => row(m, `${nf(m.production, 1)} m`, 'bad')), chips: ['Production today', 'Which looms are stopped?'] }
}

function beamReport(ctx) {
  const list = ctx.machines.filter((m) => Number.isFinite(m.etaHours)).sort((a, b) => a.etaHours - b.etaHours)
  const low = ctx.machines.filter((m) => m.beamLow)
  const lines = []
  if (low.length) lines.push(`${low.length} looms are at or below their beam alert level.`)
  if (!list.length) {
    const withMeters = ctx.machines.filter((m) => Number.isFinite(m.beamMeters)).sort((a, b) => a.beamMeters - b.beamMeters).slice(0, 8)
    if (!withMeters.length) return { lines: ['No beam information is available right now.'], chips: ['Factory summary'] }
    return { lines: [...lines, 'Least beam left:'], rows: withMeters.map((m) => row(m, `${nf(m.beamMeters, 0)} m`, m.beamLow ? 'bad' : undefined)), chips: ['Spare beams'] }
  }
  lines.push('Beams finishing first (estimate):')
  return {
    lines,
    rows: list.slice(0, 8).map((m) => ({ ...row(m, fmtEta(m.etaHours), m.beamLow ? 'bad' : undefined), sub: `${m.beamMeters <= 0 ? `${nf(-m.beamMeters, 0)} m past planned length` : `${nf(m.beamMeters, 0)} m left`}${m.beamNo ? ` · beam ${m.beamNo}` : ''}` })),
    chips: ['Spare beams', 'Factory summary'],
  }
}

function spareBeams(ctx) {
  const spare = ctx.summary?.spareBeams
  if (!Array.isArray(spare)) return { lines: ['Spare beam information is not available (it comes from the live EMS).'], chips: ['Beams finishing first'] }
  if (!spare.length) return { lines: ['There are no spare beams in the store.'], chips: ['Beams finishing first'] }
  return {
    lines: [`${spare.length} spare beams in store, ${nf(sum(spare, (b) => b.meters))} m in total:`],
    rows: spare.slice(0, 10).map((b) => ({ left: b.beamNo || b.stockNo, sub: `${b.quality}${b.party ? ' · ' + b.party : ''}`, right: `${nf(b.meters)} m` })),
    chips: ['Beams finishing first'],
  }
}

function stopsReport(ctx) {
  const top = [...ctx.machines].sort((a, b) => stopsOf(b) - stopsOf(a)).slice(0, 8)
  return { lines: [`Total stops today: ${nf(sum(ctx.machines, stopsOf))}. Looms with most stops:`], rows: top.map((m) => row(m, `${stopsOf(m)} stops`, stopsOf(m) >= 8 ? 'bad' : undefined)), chips: ['Which looms are stopped?', 'Lowest efficiency'] }
}

function alertsReport(ctx) {
  const manual = ctx.machines.filter((m) => m.alert === 'red')
  const filler = ctx.machines.filter((m) => m.alert === 'blue')
  const low = ctx.machines.filter((m) => m.beamLow)
  const lines = [`Alerts from the EMS: ${manual.length} Manual, ${filler.length} Filler, ${low.length} beam alert (Unload).`]
  const rows = [...manual.map((m) => row(m, 'Manual', 'bad')), ...filler.map((m) => row(m, 'Filler', 'bad')), ...low.map((m) => row(m, 'Beam', 'bad'))].slice(0, 14)
  return { lines, rows, chips: ['Beams finishing first', 'Which looms are stopped?'] }
}

function fabricReport(ctx, q) {
  const groups = new Map()
  for (const m of ctx.machines) {
    const k = String(m.fabric || 'Unknown').trim()
    groups.set(k, [...(groups.get(k) || []), m])
  }
  const words = q.split(/[^a-z0-9"]+/).filter((w) => w.length >= 4 && !['fabric', 'quality', 'looms', 'which', 'running', 'kapda', 'kaun', 'where', 'show'].includes(w))
  const hit = [...groups.keys()].filter((k) => words.some((w) => k.toLowerCase().includes(w)))
  if (hit.length) {
    const ms = hit.flatMap((k) => groups.get(k))
    return { lines: [`${ms.length} looms are on ${hit.length === 1 ? hit[0] : 'those fabrics'}:`], rows: ms.map((m) => row(m, `${nf(m.efficiency, 0)}%`)), chips: ['What fabrics are running?'] }
  }
  const sorted = [...groups].sort((a, b) => b[1].length - a[1].length)
  return {
    lines: [`${groups.size} fabrics on the floor:`],
    rows: sorted.map(([k, ms]) => ({ left: k, sub: ms.slice(0, 6).map((m) => loomNo(m.id)).join(', ') + (ms.length > 6 ? '…' : ''), right: `${ms.length} looms` })),
    chips: ['Factory summary'],
  }
}

function operatorReport(ctx) {
  const st = ctx.staffing
  if (!st) return { lines: ['Operator information is not available.'], chips: ['Factory summary'] }
  const lines = [`${st.present.length} operators present, ${st.requiredOperators} needed (${st.perOperator} looms each).`]
  if (st.absent.length) lines.push(`Not on the floor: ${st.absent.map((o) => o.name).join(', ')}.`)
  if (st.uncovered.length) lines.push(`Looms with no operator: ${st.uncovered.map((id) => loomNo(id)).join(', ')}.`)
  else lines.push('Every loom has an operator.')
  return { lines, chips: ['Factory summary'] }
}

function runningReport(ctx) {
  const run = ctx.machines.filter(running)
  return { lines: [`${run.length} of ${ctx.machines.length} looms are running (${Math.round((run.length / Math.max(1, ctx.machines.length)) * 100)}%).`], chips: ['Which looms are stopped?', 'Factory summary'] }
}

// ---------- history, planning, reports ----------
const dayName = (d) => new Date(`${d}T12:00:00+05:30`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })

function noHistory(ctx) {
  if (!ctx.history) return { lines: ['History is not loaded. It is saved only on the online version, every 5 minutes while the factory PC bridge runs.'], chips: ['Factory summary'] }
  return { lines: ['No saved history for that day yet. Snapshots are saved every 5 minutes while the factory PC bridge runs.'], chips: ['Factory summary'] }
}

function yesterdayReport(ctx) {
  const y = ctx.history?.days?.[0]
  if (!y) return noHistory(ctx)
  const best = [...y.looms].sort((a, b) => b.prod - a.prod).slice(0, 3)
  const worst = [...y.looms].filter((l) => l.prod >= 0).sort((a, b) => b.downMin - a.downMin).slice(0, 5)
  return {
    lines: [
      `${dayName(y.date)}: ${nf(y.prod)} m made, average efficiency ${nf(y.eff, 1)}%, on average ${nf(y.running, 1)} of ${y.total} looms running.`,
      `Total stops ${nf(y.stops)}, ${nf(y.downHours, 1)} loom-hours stopped.${y.hoursCovered < 20 ? ` (Only ${nf(y.hoursCovered, 1)} h were recorded.)` : ''}`,
      `Best: ${best.map((l) => `${l.id} ${nf(l.prod)} m`).join(', ')}. Stopped longest:`,
    ],
    rows: worst.map((l) => ({ id: l.id, left: l.id, sub: `${nf(l.prod)} m · ${nf(l.eff, 1)}% · ${nf(l.stops)} stops`, right: `${nf(l.downMin / 60, 1)} h down`, tone: l.downMin > 180 ? 'bad' : undefined })),
    chips: ['Last 7 days', 'Production today', 'Open reports'],
  }
}

function weekReport(ctx) {
  const days = ctx.history?.days || []
  if (!days.length) return noHistory(ctx)
  const total = sum(days, (d) => d.prod)
  const best = days.reduce((a, d) => (d.prod > a.prod ? d : a), days[0])
  const lines = [`Last ${days.length === 1 ? 'day' : `${days.length} days`}: ${nf(total)} m in total, about ${nf(total / days.length)} m per day.`, `Best day ${dayName(best.date)} with ${nf(best.prod)} m.`]
  const t = ctx.history?.today
  if (t?.samples) lines.push(`Today so far: ${nf(t.prod)} m at ${nf(t.eff, 1)}% average efficiency.`)
  if (days.length >= 2) {
    const [a, b] = days
    const ch = b.prod ? ((a.prod - b.prod) / b.prod) * 100 : 0
    lines.push(`Yesterday vs the day before: ${ch >= 0 ? 'up' : 'down'} ${nf(Math.abs(ch), 0)}%.`)
  }
  return {
    lines,
    rows: days.map((d) => ({ left: dayName(d.date), sub: `eff ${nf(d.eff, 1)}% · ${nf(d.stops)} stops`, right: `${nf(d.prod)} m` })),
    chips: ['Yesterday', 'Open reports'],
  }
}

function beamPlanReport(ctx) {
  const plan = beamPlan(ctx.machines, ctx.summary)
  if (!plan.items.length) return { lines: ['No beam data yet. It comes from the live EMS through the factory PC bridge.'], chips: ['Factory summary'] }
  const g = plan.groups
  const lines = [`Beam changes: ${g.now.length} due now, ${g.h24.length} in the next 24 h, ${g.h48.length} in 24 to 48 h.`]
  if (plan.spare) lines.push(`Spare beams in store: ${plan.spare.length} (${nf(plan.spareMeters)} m).`)
  lines.push(...plan.warnings)
  if (!plan.warnings.length) lines.push('Nothing to worry about in the next 2 days.')
  return {
    lines,
    rows: [...g.now, ...g.h24, ...g.h48].slice(0, 10).map((i) => ({ id: i.id, left: i.id, sub: `${i.beamNo ? 'beam ' + i.beamNo + ' · ' : ''}${i.spare ? 'spare ' + i.spare : plan.spare ? 'no matching spare' : ''}`, right: i.over ? `${nf(i.over)} m over` : fmtEtaShort(i.eta), tone: i.eta <= 0 ? 'bad' : undefined })),
    chips: ['Spare beams', 'Open reports'],
  }
}

function operatorRanking(ctx) {
  const week = ctx.history?.days?.length ? combineDays(ctx.history.days) : null
  const list = operatorStats(ctx.machines, ctx.staffing, week)
  if (!list.length) return { lines: ['No operators are marked present this shift. Mark attendance in Settings → Attendance.'], chips: ['Factory summary'] }
  return {
    lines: [`Operators this shift, best efficiency first:`],
    rows: list.map((o) => ({ left: o.op.name, sub: `looms ${o.looms.map(loomNo).join(', ')} · ${o.running}/${o.looms.length} running`, right: `${nf(o.eff, 1)}% · ${nf(o.prod)} m`, tone: o.eff < 65 ? 'bad' : o.eff >= 80 ? 'good' : undefined })),
    chips: ['Operators', 'Open reports'],
  }
}

function textReport(ctx) {
  const text = dailyReportText(ctx)
  return { lines: text.split('\n').filter(Boolean).map((l) => l.replace(/\*/g, '')), copy: text, chips: ['Open reports'] }
}

// ---------- quality history (EMS beam list) ----------
function qualityReport(list) {
  const q = list[0]
  const lines = [
    `${q.name}: ${q.count} beam${q.count === 1 ? '' : 's'} on ${q.looms.length} loom${q.looms.length === 1 ? '' : 's'}, ${nf(q.metres)} m of beam, from ${fmtDate(q.first)} to ${q.running.length ? 'now' : fmtDate(q.last)}.`,
  ]
  lines.push(q.running.length ? `Running now on ${q.running.join(', ')}.` : `Not running now. Last ran ${fmtDate(q.last)}.`)
  if (q.avgDays != null) lines.push(`A beam of this quality took about ${fmtDays(q.avgDays)} on average.`)
  lines.push(`Looms: ${q.looms.slice(0, 10).map((l) => `${l.id} (${l.n})`).join(', ')}${q.looms.length > 10 ? '…' : ''}.`)
  if (list.length > 1) lines.push(`Also matching: ${list.slice(1, 4).map((x) => x.name).join(', ')}.`)
  return {
    lines,
    rows: q.beams.slice(0, 8).map((b) => ({ id: b.loom, left: b.loom, sub: `beam ${b.beamNo} · ${fmtDate(b.loadAt)} → ${b.running ? 'now' : fmtDate(b.endAt)}`, right: `${nf(b.metres)} m` })),
    chips: ['Quality history', 'Open qualities'],
  }
}

function qualitiesList(stats) {
  const recent = stats.filter((q) => q.last > Date.now() - 90 * 86400000).sort((a, b) => b.metres - a.metres)
  return {
    lines: [`${recent.length} qualities ran in the last 90 days (${stats.length} on record). Most beam metres first:`],
    rows: recent.slice(0, 12).map((q) => ({ left: q.name, sub: `${q.count} beams · ${q.looms.length} looms · last ${q.running.length ? 'now' : fmtDate(q.last)}`, right: `${nf(q.metres)} m` })),
    chips: ['Open qualities', 'What fabrics are running?'],
  }
}

function loomHistoryReport(m, beams) {
  const list = loomBeams(beams, m.id)
  if (!list.length) return { lines: [`No beam history for ${m.id} yet.`], focus: m.id }
  const runs = []
  for (const b of list) {
    const last = runs[runs.length - 1]
    if (last && last.key === b.key) {
      last.n++
      last.metres += b.metres || 0
      last.from = b.loadAt
    } else runs.push({ key: b.key, quality: b.quality, n: 1, metres: b.metres || 0, from: b.loadAt, to: b.endAt, running: b.running })
  }
  return {
    lines: [`${m.id} has had ${list.length} beams since ${fmtDate(list[list.length - 1].loadAt)}, ${new Set(list.map((b) => b.key)).size} different qualities. Newest first:`],
    rows: runs.slice(0, 10).map((r) => ({ left: r.quality, sub: `${r.n} beam${r.n === 1 ? '' : 's'} · ${fmtDate(r.from)} → ${r.running ? 'now' : fmtDate(r.to)}`, right: `${nf(r.metres)} m` })),
    focus: m.id,
    chips: ['Quality history', 'Open qualities'],
  }
}

function help() {
  return {
    lines: ['I read the live factory numbers and answer from them. Try asking:', '- "Factory summary" or "morning report"', '- "Which looms are stopped?"', '- "Beams finishing first" / "spare beams"', '- "Production today", "lowest efficiency", "most stops"', '- "How is loom 12?" or "WJ-07"', '- "Which looms run MILTON?", "who is on loom 5?", "alerts"', '- "Yesterday", "last 7 days", "beam plan", "operator ranking"', '- "WhatsApp report", "open reports", "heatmap efficiency"', '- "Where did MILTON run?", "loom 6 history", "quality history"'],
    chips: SUGGESTIONS.slice(0, 4),
  }
}

/** ctx = { machines, summary (EMS header + beams), staffing } */
export function answer(question, ctx) {
  const raw = String(question || '').trim()
  const q = raw.toLowerCase().replace(/[?!.,;]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (!ctx.machines?.length) return { lines: ['The factory data is still loading. Try again in a moment.'] }
  const demo = !ctx.machines.some((m) => m.live)
  const done = (r) => ({ ...r, note: demo ? 'Showing demo data (not connected to the EMS).' : undefined })

  if (!q || has(q, 'help', 'what can you', 'kya kar', 'options') || /^(hi|hello|hey|namaste|namaskar|kem cho)\b/.test(q)) return done(help())

  const loom = findLoom(q, ctx.machines)
  if (loom?.missing) return done({ lines: [`I can't find ${loom.missing}. Looms are numbered 01 to ${String(ctx.machines.length).padStart(2, '0')}.`] })
  const beamsHist = ctx.beamHistory?.beams?.length ? ctx.beamHistory.beams : null
  const pastWords = has(q, 'history', 'past', 'pehle', 'before', 'previous', 'earlier', 'used', 'ran ', 'did ', 'kab', 'kahan', 'last time', 'itihas', 'purana', 'old ')
  if (loom && beamsHist && (pastWords || has(q, 'qualities'))) return done(loomHistoryReport(loom, beamsHist))
  if (loom && !has(q, 'operator')) return done(loomReport(loom, ctx))
  if (loom && has(q, 'operator')) {
    const op = ctx.staffing?.machineOperator?.[loom.id]
    return done({ lines: [op ? `${loom.id} is looked after by ${op.name}.` : `No operator is assigned to ${loom.id} today.`], focus: loom.id })
  }

  if (has(q, 'open qualit')) return done({ lines: ['Opening Reports → Qualities.'], action: { type: 'reports', tab: 'qualities' } })
  if (beamsHist && (pastWords || has(q, 'qualities', 'quality history', 'all quality', 'quality list'))) {
    const stats = qualityStats(beamsHist)
    const hit = matchQualities(stats, q)
    if (hit.length) return done(qualityReport(hit))
    if (has(q, 'qualit')) return done(qualitiesList(stats))
  }
  if (has(q, 'open report', 'reports', 'chart', 'graph')) return done({ lines: ['Opening Reports.'], action: { type: 'reports' } })
  if (has(q, 'heatmap', 'heat map', 'colour by', 'color by', 'colour', 'color')) {
    const id = has(q, 'off', 'hide', 'band') ? 'off' : has(q, 'prod', 'meter') ? 'production' : has(q, 'stop') ? 'stops' : has(q, 'beam') ? 'beam' : 'efficiency'
    return done({ lines: [id === 'off' ? 'Heatmap turned off.' : `Floor coloured by ${id}. The legend is at the top of the screen.`], action: { type: 'heatmap', id } })
  }
  if (has(q, 'whatsapp', 'text report', 'daily report', 'copy report', 'share report', 'report bhej')) return done(textReport(ctx))
  if (has(q, 'yesterday', 'kal ka', 'kal ', 'last day', 'previous day')) return done(yesterdayReport(ctx))
  if (has(q, 'week', '7 day', 'seven day', 'hafta', 'trend', 'last days', 'history', 'pichle')) return done(weekReport(ctx))
  if (has(q, 'beam plan', 'plan', 'enough beam', 'need beam', 'beams needed', 'beam change', 'prepare')) return done(beamPlanReport(ctx))
  if (has(q, 'operator rank', 'best operator', 'operator performance', 'operator report', 'operators rank', 'top operator', 'worst operator', 'ranking')) return done(operatorRanking(ctx))
  if (has(q, 'spare', 'store', 'godown', 'stock beam', 'beam stock', 'beams in stock', 'new beam')) return done(spareBeams(ctx))
  if (has(q, 'beam', 'warp', 'tar ', 'unload', 'finish', 'khatam', 'complete', 'eta')) return done(beamReport(ctx))
  if (has(q, 'alert', 'manual', 'filler', 'red ', 'blue ')) return done(alertsReport(ctx))
  if (has(q, 'operator', 'staff', 'attendance', 'worker', 'karigar', 'present')) return done(operatorReport(ctx))
  if (has(q, 'stopped', 'stop looms', 'not running', 'idle', 'band', 'ruk', 'down', 'off looms', 'closed')) return done(stoppedList(ctx))
  if (has(q, 'most stops', 'stoppage', 'stops', 'breakdown', 'problem')) return done(stopsReport(ctx))
  if (has(q, 'lowest production', 'least production', 'low production', 'kam production')) return done(lowProduction(ctx))
  if (has(q, 'production', 'meter', 'metre', 'mtr', 'output', 'utpadan', 'kitna bana', 'made')) return done(productionReport(ctx))
  if (has(q, 'highest eff', 'best eff', 'top eff', 'best', 'top loom', 'top 5')) return done(efficiencyReport(ctx, false))
  if (has(q, 'efficiency', 'eff ', 'lowest', 'worst', 'weak', 'slow', 'performance', 'kamzor') || q.endsWith(' eff')) return done(efficiencyReport(ctx, true))
  if (has(q, 'fabric', 'quality', 'kapda', 'design', 'running on', 'milton', 'taffeta', 'twill', 'matty', 'rib', 'chain', 'jacket')) return done(fabricReport(ctx, q))
  if (has(q, 'running', 'chal', 'chalu', 'active', 'working')) return done(runningReport(ctx))
  if (has(q, 'summary', 'overview', 'status', 'report', 'today', 'how is', 'how are', 'kaisa', 'factory', 'morning', 'update', 'sab', 'all')) return done(overview(ctx))

  return done({ lines: [`Sorry, I did not understand "${raw}". I can answer about looms, stops, efficiency, production, beams, fabrics, alerts and operators.`], chips: SUGGESTIONS.slice(0, 5) })
}
