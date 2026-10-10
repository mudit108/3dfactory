// Loads saved history (cloud mode) for the Reports panel and the assistant.
// Demo mode makes up a believable week so the screens can be tried out.
import { CLOUD_ACTIVE, USING_MOCK } from './factoryApi'
import { aggregateDay, istDate, makeSample } from '../shared/historyMath'

export const HISTORY_MODE = CLOUD_ACTIVE ? 'cloud' : USING_MOCK ? 'demo' : 'none'

export async function fetchHistory(days = 7) {
  if (HISTORY_MODE === 'cloud') {
    const res = await fetch(`/api/history?days=${days}`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`History HTTP ${res.status}`)
    const json = await res.json()
    if (!json.ok) throw new Error(json.error || 'History unavailable')
    return { mode: 'cloud', today: json.today, days: json.days, at: Date.now() }
  }
  if (HISTORY_MODE === 'demo') return demoHistory(days)
  return { mode: 'none', today: null, days: [], at: Date.now() }
}

// ---------- demo data ----------
function rng(seed) {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}

function demoDay(date, hoursUpTo, seed) {
  const r = rng(seed)
  const ids = Array.from({ length: 38 }, (_, i) => `WJ-${String(i + 1).padStart(2, '0')}`)
  const base = ids.map(() => 62 + r() * 26)
  const state = ids.map(() => ({ prod: 0, stops: 0, run: true }))
  const out = []
  const start = new Date(`${date}T00:00:00+05:30`).getTime()
  for (let k = 0; k < hoursUpTo * 12; k++) {
    const t = start + k * 300000
    if (k % 144 === 96) state.forEach((s) => ((s.prod = 0), (s.stops = 0))) // 8 am shift change
    const machines = ids.map((id, i) => {
      const s = state[i]
      if (s.run && r() < 0.04) s.run = false
      else if (!s.run && r() < 0.35) s.run = true
      const eff = Math.max(30, Math.min(96, base[i] + (r() - 0.5) * 10))
      if (s.run) s.prod += (eff / 100) * 1.33
      if (!s.run || r() < 0.08) s.stops += 1
      return { id, status: s.run ? 'running' : 'stopped', efficiency: eff, production: s.prod, stopCount: s.stops }
    })
    out.push(makeSample({ at: new Date(t).toISOString(), machines }))
  }
  return out
}

function demoHistory(n) {
  const now = Date.now()
  const today = istDate(now)
  const ist = new Date(now + 330 * 60000)
  const hoursNow = ist.getUTCHours() + ist.getUTCMinutes() / 60
  const todaySamples = demoDay(today, Math.max(0.5, hoursNow), 99)
  const t = aggregateDay(todaySamples, today)
  t.series = todaySamples.map((s) => ({ t: s.t, e: s.e, r: s.r }))
  const days = []
  for (let i = 1; i <= n; i++) {
    const d = istDate(now - i * 86400000)
    days.push(aggregateDay(demoDay(d, 24, i * 31), d))
  }
  return { mode: 'demo', today: t, days, at: now }
}
