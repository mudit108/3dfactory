// Called by the bridge on the factory PC (outbound only). POST { at, summary, machines } with
// header  Authorization: Bearer <PUSH_TOKEN>
import { redis, sameSecret, KEY } from './_store.js'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!sameSecret(token, process.env.PUSH_TOKEN)) {
    await new Promise((r) => setTimeout(r, 400))
    return res.status(401).json({ error: 'bad token' })
  }
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  if (!body || !Array.isArray(body.machines) || body.machines.length < 1 || body.machines.length > 200) {
    return res.status(400).json({ error: 'expected { machines: [...] }' })
  }
  const snapshot = { at: body.at || new Date().toISOString(), receivedAt: new Date().toISOString(), summary: body.summary || null, machines: body.machines }
  try {
    await redis('SET', KEY, JSON.stringify(snapshot), 'EX', 600)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
  res.status(200).json({ ok: true, looms: body.machines.length })
}
