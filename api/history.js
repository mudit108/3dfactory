// Read by the 3D app's Reports panel. Public, read-only.
//   GET /api/history?days=7   → { today: { ...totals, samples: [...] }, days: [ totals for each earlier day ] }
import { redisPipeline, HIST_PREFIX, DAY_PREFIX, KEEP_SECONDS } from './_store.js'
import { aggregateDay, istDate } from '../src/shared/historyMath.js'

const parseHash = (flat) => {
  const out = []
  if (Array.isArray(flat)) for (let i = 1; i < flat.length; i += 2) out.push(JSON.parse(flat[i]))
  else if (flat && typeof flat === 'object') for (const v of Object.values(flat)) out.push(JSON.parse(v))
  return out
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Vercel-CDN-Cache-Control', 'max-age=120')
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })
  const n = Math.min(31, Math.max(1, parseInt(req.query?.days, 10) || 7))
  const today = istDate()
  const dates = Array.from({ length: n }, (_, i) => istDate(Date.now() - (i + 1) * 86400000)) // yesterday back
  try {
    const [todayRaw, ...cached] = await redisPipeline([['HGETALL', HIST_PREFIX + today], ...dates.map((d) => ['GET', DAY_PREFIX + d])])
    const samples = parseHash(todayRaw)
    const days = []
    const missing = []
    dates.forEach((d, i) => (cached[i] ? days.push(JSON.parse(cached[i])) : missing.push(d)))
    if (missing.length) {
      const raws = await redisPipeline(missing.map((d) => ['HGETALL', HIST_PREFIX + d]))
      const writes = []
      missing.forEach((d, i) => {
        const s = parseHash(raws[i])
        if (!s.length) return
        const agg = aggregateDay(s, d)
        days.push(agg)
        writes.push(['SET', DAY_PREFIX + d, JSON.stringify(agg), 'EX', KEEP_SECONDS])
      })
      if (writes.length) await redisPipeline(writes).catch(() => {})
    }
    days.sort((a, b) => (a.date < b.date ? 1 : -1))
    const todayAgg = aggregateDay(samples, today)
    // trimmed series for the "today" charts: factory numbers only
    todayAgg.series = samples
      .sort((a, b) => (a.t < b.t ? -1 : 1))
      .map((s) => ({ t: s.t, e: s.e, r: s.r }))
    res.status(200).json({ ok: true, today: todayAgg, days })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
}
