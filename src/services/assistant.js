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

export const SUGGESTIONS = ['Factory summary', 'Which looms are stopped?', 'Beams finishing first', 'Production today', 'Lowest efficiency', 'Spare beams']

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
    lines.push(`Beam${m.beamNo ? ` ${m.beamNo}` : ''}: ${nf(m.beamMeters, 0)} m left${m.beamTotal ? ` of ${nf(m.beamTotal)} m` : ''}${Number.isFinite(m.etaHours) ? `, finishes in ${fmtEta(m.etaHours)} (${clockAt(m.etaAt)})` : ''}.`)
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
  if (next) lines.push(`Next beam to finish: ${next.id} in ${fmtEta(next.etaHours)}.`)
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
    rows: list.slice(0, 8).map((m) => ({ ...row(m, fmtEta(m.etaHours), m.beamLow ? 'bad' : undefined), sub: `${nf(m.beamMeters, 0)} m left${m.beamNo ? ` · beam ${m.beamNo}` : ''}` })),
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

function help() {
  return {
    lines: ['I read the live factory numbers and answer from them. Try asking:', '- "Factory summary" or "morning report"', '- "Which looms are stopped?"', '- "Beams finishing first" / "spare beams"', '- "Production today", "lowest efficiency", "most stops"', '- "How is loom 12?" or "WJ-07"', '- "Which looms run MILTON?", "who is on loom 5?", "alerts"'],
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
  if (loom && !has(q, 'operator')) return done(loomReport(loom, ctx))
  if (loom && has(q, 'operator')) {
    const op = ctx.staffing?.machineOperator?.[loom.id]
    return done({ lines: [op ? `${loom.id} is looked after by ${op.name}.` : `No operator is assigned to ${loom.id} today.`], focus: loom.id })
  }

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
