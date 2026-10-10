// Planning helpers worked out from the live floor: beam changes coming up vs spare beams,
// and how each operator's looms are doing. Pure functions — used by Reports and the assistant.

const norm = (q) => String(q || '').toLowerCase().replace(/[^a-z0-9]/g, '')

/** Beam changes coming up, grouped by when, plus whether the store has enough spare beams. */
export function beamPlan(machines, summary) {
  const withEta = machines.filter((m) => Number.isFinite(m.etaHours) || (Number.isFinite(m.beamMeters) && m.beamMeters <= 0))
  const eta = (m) => (Number.isFinite(m.beamMeters) && m.beamMeters <= 0 ? 0 : m.etaHours)
  const items = withEta
    .map((m) => ({
      id: m.id,
      eta: eta(m),
      etaAt: m.beamMeters <= 0 ? null : m.etaAt,
      over: Number.isFinite(m.beamMeters) && m.beamMeters <= 0 ? -m.beamMeters : 0,
      left: m.beamMeters,
      beamNo: m.beamNo,
      quality: m.beamQuality || m.fabric || '',
      running: m.status === 'running',
    }))
    .sort((a, b) => a.eta - b.eta)
  const spare = Array.isArray(summary?.spareBeams) ? summary.spareBeams : null
  const groups = {
    now: items.filter((i) => i.eta <= 0),
    h24: items.filter((i) => i.eta > 0 && i.eta <= 24),
    h48: items.filter((i) => i.eta > 24 && i.eta <= 48),
    week: items.filter((i) => i.eta > 48 && i.eta <= 168),
  }
  // match a spare beam of the same quality to each upcoming change (first come, first served)
  const pool = spare ? spare.map((b, k) => ({ ...b, k, used: false })) : []
  for (const i of [...groups.now, ...groups.h24, ...groups.h48, ...groups.week]) {
    const hit = pool.find((b) => !b.used && norm(b.quality) && norm(b.quality) === norm(i.quality))
    if (hit) {
      hit.used = true
      i.spare = hit.beamNo || hit.stockNo
    }
  }
  const due48 = groups.now.length + groups.h24.length + groups.h48.length
  const warnings = []
  if (spare) {
    if (due48 > spare.length) warnings.push(`${due48} beams finish in the next 2 days but only ${spare.length} spare beams are in store. Prepare ${due48 - spare.length} more.`)
    const noMatch = [...groups.now, ...groups.h24].filter((i) => !i.spare)
    if (noMatch.length) warnings.push(`No spare beam of the same quality for ${noMatch.slice(0, 6).map((i) => i.id).join(', ')}${noMatch.length > 6 ? ` and ${noMatch.length - 6} more` : ''} (due within 24 h).`)
  }
  if (groups.now.length) warnings.push(`${groups.now.map((i) => i.id).join(', ')} ran past the beam length entered in the EMS. Check these looms or correct the beam meters.`)
  // several changes in the same 2 hours need extra hands
  const soon = [...groups.h24].sort((a, b) => a.eta - b.eta)
  for (let k = 0; k + 2 < soon.length; k++) {
    if (soon[k + 2].eta - soon[k].eta <= 2) {
      warnings.push(`3 beam changes within 2 hours around ${fmtClock(soon[k].etaAt)} (${soon.slice(k, k + 3).map((i) => i.id).join(', ')}). Plan helpers.`)
      break
    }
  }
  return { items, groups, spare, spareMeters: spare ? spare.reduce((a, b) => a + (b.meters || 0), 0) : null, unusedSpare: pool.filter((b) => !b.used), warnings }
}

/** Per-operator numbers for the current shift's loom assignments. weekLooms: per-loom totals from history. */
export function operatorStats(machines, staffing, weekLooms) {
  if (!staffing?.assignments?.length) return []
  const byId = Object.fromEntries(machines.map((m) => [m.id, m]))
  const week = weekLooms ? Object.fromEntries(weekLooms.map((l) => [l.id, l])) : null
  return staffing.assignments
    .map(({ op, machines: ids }) => {
      const ms = ids.map((id) => byId[id]).filter(Boolean)
      const run = ms.filter((m) => m.status === 'running')
      return {
        op,
        looms: ids,
        running: run.length,
        prod: Math.round(ms.reduce((a, m) => a + (m.production || 0), 0)),
        eff: run.length ? Math.round((run.reduce((a, m) => a + (m.efficiency || 0), 0) / run.length) * 10) / 10 : 0,
        stops: ms.reduce((a, m) => a + (Number.isFinite(m.stopCount) ? m.stopCount : m.stops ? (m.stops.warp || 0) + (m.stops.weft || 0) + (m.stops.other || 0) : 0), 0),
        weekProd: week ? Math.round(ids.reduce((a, id) => a + (week[id]?.prod || 0), 0)) : null,
      }
    })
    .sort((a, b) => b.eff - a.eff)
}

export function fmtClock(iso) {
  return iso ? new Date(iso).toLocaleString('en-IN', { weekday: 'short', hour: 'numeric', minute: '2-digit' }) : 'now'
}
export function fmtEtaShort(h) {
  if (!Number.isFinite(h)) return '-'
  if (h <= 0) return 'due now'
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`
  if (h < 48) return `${Math.floor(h)} h ${String(Math.round((h % 1) * 60)).padStart(2, '0')} m`
  return `${(h / 24).toFixed(1)} days`
}
