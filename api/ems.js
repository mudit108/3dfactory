// Read by the 3D app. Public: shows the latest data pushed by the factory PC.
import { redis, KEY, STALE_SECONDS } from './_store.js'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  // Vercel's edge keeps one copy for 15 s, so many open screens cost one Redis read per 15 s
  res.setHeader('Vercel-CDN-Cache-Control', 'max-age=15')
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })
  let raw
  try {
    raw = await redis('GET', KEY)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
  if (!raw) return res.status(503).json({ ok: false, reason: 'No data received from the factory PC yet' })
  const snap = JSON.parse(raw)
  const age = (Date.now() - new Date(snap.receivedAt).getTime()) / 1000
  if (age > STALE_SECONDS) return res.status(503).json({ ok: false, reason: `Factory PC offline (last data ${Math.round(age)} s ago)`, at: snap.at })
  res.status(200).json({ at: snap.at, summary: snap.summary, machines: snap.machines })
}
