// Read by the app: every beam the EMS has on record (quality history). Public, read-only.
import { redis, BEAMLOG_KEY } from './_store.js'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Vercel-CDN-Cache-Control', 'max-age=300')
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })
  try {
    const raw = await redis('GET', BEAMLOG_KEY)
    if (!raw) return res.status(200).json({ ok: true, at: null, log: [] })
    const { at, log } = JSON.parse(raw)
    res.status(200).json({ ok: true, at, log })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
}
