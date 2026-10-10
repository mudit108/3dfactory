// Quality history from the EMS beam list: every beam loaded, on which loom, which quality, when.
// Log rows (from the bridge): [loomNo, loadedMs, endedMs|0, beamNo, quality, pick, metres]
import { CLOUD_ACTIVE, USING_MOCK } from './factoryApi'

const API_BASE = import.meta.env.VITE_EMS_API_URL || ''
const DAY = 86400000

export async function fetchBeamLog() {
  if (USING_MOCK) return { at: new Date().toISOString(), log: demoLog(), demo: true }
  const url = CLOUD_ACTIVE ? '/api/beams' : `${API_BASE.replace(/\/$/, '')}/api/beams`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Beam list HTTP ${res.status}`)
  const json = await res.json()
  return { at: json.at, log: json.log || [] }
}

export const qualityKey = (q) => String(q || '').toLowerCase().replace(/["'`]/g, '').replace(/\s+/g, ' ').trim()

/** Rows → beam objects (newest first). */
export function toBeams(log, now = Date.now()) {
  return (log || [])
    .map(([n, load, end, beamNo, quality, pick, metres]) => {
      const running = !end
      const until = end || now
      return {
        loom: `WJ-${String(n).padStart(2, '0')}`,
        loadAt: load,
        endAt: end || null,
        running,
        days: Math.max(0, (until - load) / DAY),
        beamNo,
        quality: quality || 'Unknown',
        key: qualityKey(quality) || 'unknown',
        pick,
        metres,
      }
    })
    .sort((a, b) => b.loadAt - a.loadAt)
}

/** Per-quality summary. sinceMs limits to beams that ran after that time. */
export function qualityStats(beams, sinceMs = 0) {
  const map = new Map()
  for (const b of beams) {
    if ((b.endAt || Date.now()) < sinceMs) continue
    let q = map.get(b.key)
    if (!q) map.set(b.key, (q = { key: b.key, names: new Map(), beams: [], looms: new Map(), metres: 0, done: [], running: [] }))
    q.names.set(b.quality, (q.names.get(b.quality) || 0) + 1)
    q.beams.push(b)
    q.looms.set(b.loom, (q.looms.get(b.loom) || 0) + 1)
    q.metres += b.metres || 0
    if (b.running) q.running.push(b.loom)
    else q.done.push(b)
  }
  return [...map.values()]
    .map((q) => {
      const name = [...q.names].sort((a, b) => b[1] - a[1])[0][0]
      const avgDays = q.done.length ? q.done.reduce((a, b) => a + b.days, 0) / q.done.length : null
      const mPerDay = q.done.length ? q.done.reduce((a, b) => a + (b.metres || 0), 0) / Math.max(0.1, q.done.reduce((a, b) => a + b.days, 0)) : null
      return {
        key: q.key,
        name,
        beams: q.beams, // newest first
        count: q.beams.length,
        metres: Math.round(q.metres),
        looms: [...q.looms].sort((a, b) => b[1] - a[1]).map(([id, n]) => ({ id, n })),
        running: [...new Set(q.running)].sort(),
        first: Math.min(...q.beams.map((b) => b.loadAt)),
        last: Math.max(...q.beams.map((b) => b.endAt || Date.now())),
        avgDays,
        mPerDay,
        pick: q.beams[0].pick,
      }
    })
    .sort((a, b) => b.last - a.last || b.metres - a.metres)
}

export function loomBeams(beams, loomId) {
  return beams.filter((b) => b.loom === loomId)
}

/** Find qualities a free-text question is about (word overlap with quality names). */
export function matchQualities(stats, text) {
  const t = qualityKey(text)
  const words = t.split(/[^a-z0-9/]+/).filter((w) => w.length >= 3 && !STOP.has(w))
  if (!words.length) return []
  const scored = stats
    .map((q) => ({ q, score: words.filter((w) => q.key.includes(w)).length + (t.includes(q.key) ? 5 : 0) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.q.metres - a.q.metres)
  if (!scored.length) return []
  const top = scored[0].score
  return scored.filter((x) => x.score === top).map((x) => x.q)
}
const STOP = new Set(['where', 'when', 'which', 'what', 'did', 'run', 'ran', 'running', 'quality', 'qualities', 'loom', 'looms', 'history', 'past', 'used', 'made', 'kab', 'kahan', 'chala', 'chali', 'pehle', 'the', 'and', 'for', 'how', 'many', 'beam', 'beams', 'show', 'about', 'last', 'time', 'kitna', 'kapda', 'fabric'])

export const fmtDate = (ms) => (ms ? new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '-')
export const fmtDays = (d) => (d == null ? '-' : d < 1 ? `${Math.round(d * 24)} h` : `${d.toFixed(1)} days`)

// ---------- demo ----------
function demoLog() {
  const Q = [['MILTON', 48, 6000], ['RIB STOP JACKET CLOTH', 56, 4000], ['300 FDY MATTY 68"', 36, 6500], ['LOREAL TWILL FDY 64"', 58, 3500], ['fdy chain dn.', 40, 3600], ['twill rotto 66', 58, 2700], ['DTY RIB 65"', 52, 4200], ['BOLT FDY 150 BY 300 NEW', 50, 5050]]
  let seed = 7
  const r = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
  const out = []
  const now = Date.now()
  for (let n = 1; n <= 38; n++) {
    let t = now - (120 + r() * 60) * DAY
    let qi = Math.floor(r() * Q.length)
    let k = 0
    while (t < now) {
      if (r() < 0.3) qi = Math.floor(r() * Q.length)
      const [q, pick, m] = Q[qi]
      const days = (m / (380 * (48 / pick))) * (0.75 + r() * 0.3)
      const end = t + days * DAY
      out.push([n, Math.round(t), end < now ? Math.round(end) : 0, `D${n}${k++}`, q, pick, m])
      t = end + r() * 0.3 * DAY
    }
  }
  return out
}
