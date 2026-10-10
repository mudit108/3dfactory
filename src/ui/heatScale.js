// Colour scales for the floor heatmap + its legend.
export const HEAT_MODES = [
  { id: 'off', label: 'Off' },
  { id: 'efficiency', label: 'Efficiency' },
  { id: 'production', label: 'Production' },
  { id: 'stops', label: 'Stops' },
  { id: 'beam', label: 'Beam finish' },
]

export const LEGENDS = {
  efficiency: [['#ef4444', '< 60%'], ['#f59e0b', '60–75%'], ['#a3e635', '75–85%'], ['#22c55e', '> 85%'], ['#64748b', 'Stopped']],
  production: [['#1e3a8a', 'Low'], ['#2563eb', ''], ['#38bdf8', ''], ['#a5f3fc', 'High (this shift)']],
  stops: [['#22c55e', 'Few'], ['#a3e635', ''], ['#f59e0b', ''], ['#ef4444', 'Most stops']],
  beam: [['#ef4444', 'Due now'], ['#f97316', '< 12 h'], ['#f59e0b', '< 24 h'], ['#facc15', '< 3 days'], ['#22c55e', 'Later'], ['#64748b', 'No data']],
}

const ramp = (cols, k) => cols[Math.max(0, Math.min(cols.length - 1, Math.floor(k * cols.length)))]

export function heatColor(mode, m, all) {
  if (mode === 'efficiency') {
    if (m.status !== 'running') return '#64748b'
    const e = m.efficiency || 0
    return e < 60 ? '#ef4444' : e < 75 ? '#f59e0b' : e < 85 ? '#a3e635' : '#22c55e'
  }
  if (mode === 'production') {
    const max = Math.max(1, ...all.map((x) => x.production || 0))
    return ramp(LEGENDS.production.map((l) => l[0]), (m.production || 0) / max)
  }
  if (mode === 'stops') {
    const s = (x) => (Number.isFinite(x.stopCount) ? x.stopCount : 0)
    const max = Math.max(1, ...all.map(s))
    return ramp(LEGENDS.stops.map((l) => l[0]), s(m) / max)
  }
  if (mode === 'beam') {
    if (Number.isFinite(m.beamMeters) && m.beamMeters <= 0) return '#ef4444'
    const h = m.etaHours
    if (!Number.isFinite(h)) {
      const r = m.warpBeamRemaining
      if (!Number.isFinite(r)) return '#64748b'
      return r < 5 ? '#f97316' : r < 12 ? '#f59e0b' : r < 25 ? '#facc15' : '#22c55e'
    }
    return h <= 0 ? '#ef4444' : h < 12 ? '#f97316' : h < 24 ? '#f59e0b' : h < 72 ? '#facc15' : '#22c55e'
  }
  return '#334155'
}

export function nextHeat(cur) {
  const i = HEAT_MODES.findIndex((m) => m.id === cur)
  return HEAT_MODES[(i + 1) % HEAT_MODES.length].id
}
