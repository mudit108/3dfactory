// Tiny Redis (Upstash REST) helper. Vercel -> Storage -> "Upstash Redis" -> Connect to this project
// adds these variables automatically (KV_REST_API_URL / KV_REST_API_TOKEN, or UPSTASH_REDIS_REST_*).
import { timingSafeEqual } from 'node:crypto'

const URL_ = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
const TOKEN = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

export async function redis(...command) {
  if (!URL_() || !TOKEN()) throw new Error('Redis is not connected to this Vercel project (Storage > Upstash Redis)')
  const res = await fetch(URL_(), {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  })
  if (!res.ok) throw new Error(`Redis HTTP ${res.status}`)
  const json = await res.json()
  if (json.error) throw new Error(json.error)
  return json.result
}

export function sameSecret(given, expected) {
  if (!given || !expected) return false
  const a = Buffer.from(String(given))
  const b = Buffer.from(String(expected))
  return a.length === b.length && timingSafeEqual(a, b)
}

export const KEY = 'ems:latest'
export const STALE_SECONDS = 90 // factory PC sends every ~4 s; after this the app shows EMS OFFLINE
