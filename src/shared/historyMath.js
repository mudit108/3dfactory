// Shared by the Vercel API (api/history.js, api/ems-push.js) and the browser.
// A "sample" is a compact copy of the live floor taken every 5 minutes:
//   { t: ISO time, e: factory eff %, r: running looms, n: total looms, m: { 'WJ-01': [running 1/0, eff, production m, stops] } }
// Production and stop counters in the EMS reset at shift change, so totals are built
// from the positive steps between samples (a drop = counter reset → count the new value).

export const SAMPLE_MINUTES = 5
const IST_MS = 330 * 60 * 1000

/** Calendar day in India (YYYY-MM-DD) for a time. */
export function istDate(t = Date.now()) {
  return new Date(new Date(t).getTime() + IST_MS).toISOString().slice(0, 10)
}
/** Hour of day in India (0–23). */
export function istHour(t) {
  return new Date(new Date(t).getTime() + IST_MS).getUTCHours()
}

export function makeSample(snapshot) {
  const m = {}
  for (const x of snapshot.machines || []) {
    if (!x?.id) continue
    m[x.id] = [x.status === 'running' ? 1 : 0, round1(x.efficiency), round1(x.production), Math.round(x.stopCount ?? 0)]
  }
  const s = snapshot.summary || {}
  const list = Object.values(m)
  return {
    t: snapshot.at || new Date().toISOString(),
    e: round1(s.efficiency ?? avg(list.filter((v) => v[0]).map((v) => v[1]))),
    r: s.running ?? list.filter((v) => v[0]).length,
    n: s.total ?? list.length,
    m,
  }
}

function step(prev, cur) {
  if (prev == null || cur == null) return 0
  return cur >= prev ? cur - prev : cur // counter reset → the new value is fresh output
}

/** Totals for one day of samples (sorted or not). */
export function aggregateDay(samples, date) {
  const list = [...samples].filter(Boolean).sort((a, b) => (a.t < b.t ? -1 : 1))
  const looms = {}
  const hours = Array.from({ length: 24 }, (_, h) => ({ h, prod: 0, eff: [], run: [] }))
  for (let i = 0; i < list.length; i++) {
    const s = list[i]
    const prev = list[i - 1]
    const gapMin = prev ? Math.min(15, (new Date(s.t) - new Date(prev.t)) / 60000) : SAMPLE_MINUTES
    const hr = hours[istHour(s.t)]
    hr.eff.push(s.e)
    hr.run.push(s.r)
    for (const [id, v] of Object.entries(s.m || {})) {
      const L = (looms[id] ||= { id, prod: 0, stops: 0, downMin: 0, effSum: 0, effN: 0 })
      const pv = prev?.m?.[id]
      if (pv) {
        const p = step(pv[2], v[2])
        L.prod += p
        hr.prod += p
        L.stops += step(pv[3], v[3])
        if (!v[0]) L.downMin += gapMin
      }
      if (v[0]) {
        L.effSum += v[1]
        L.effN++
      }
    }
  }
  const loomList = Object.values(looms).map((L) => ({
    id: L.id,
    prod: Math.round(L.prod),
    stops: L.stops,
    downMin: Math.round(L.downMin),
    eff: L.effN ? round1(L.effSum / L.effN) : 0,
  }))
  loomList.sort((a, b) => a.id.localeCompare(b.id))
  return {
    date,
    samples: list.length,
    first: list[0]?.t ?? null,
    last: list[list.length - 1]?.t ?? null,
    hoursCovered: round1((list.length * SAMPLE_MINUTES) / 60),
    prod: Math.round(loomList.reduce((a, l) => a + l.prod, 0)),
    eff: round1(avg(list.map((s) => s.e))),
    running: round1(avg(list.map((s) => s.r))),
    total: list[list.length - 1]?.n ?? loomList.length,
    stops: loomList.reduce((a, l) => a + l.stops, 0),
    downHours: round1(loomList.reduce((a, l) => a + l.downMin, 0) / 60),
    hourly: hours.map((h) => ({ h: h.h, prod: Math.round(h.prod), eff: h.eff.length ? round1(avg(h.eff)) : null, run: h.run.length ? round1(avg(h.run)) : null })),
    looms: loomList,
  }
}

/** Sum several day aggregates into one per-loom table. */
export function combineDays(days) {
  const looms = {}
  for (const d of days) {
    for (const l of d.looms || []) {
      const L = (looms[l.id] ||= { id: l.id, prod: 0, stops: 0, downMin: 0, effW: 0, w: 0 })
      L.prod += l.prod
      L.stops += l.stops
      L.downMin += l.downMin
      if (l.eff) {
        L.effW += l.eff
        L.w++
      }
    }
  }
  return Object.values(looms)
    .map((L) => ({ id: L.id, prod: L.prod, stops: L.stops, downMin: L.downMin, eff: L.w ? round1(L.effW / L.w) : 0 }))
    .sort((a, b) => a.id.localeCompare(b.id))
}

function avg(a) {
  return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0
}
function round1(v) {
  return Math.round((Number(v) || 0) * 10) / 10
}
