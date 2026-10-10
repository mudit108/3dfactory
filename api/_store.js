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

/** Several Redis commands in one HTTP request (Upstash /pipeline). Returns the results in order. */
export async function redisPipeline(commands) {
  if (!URL_() || !TOKEN()) throw new Error('Redis is not connected to this Vercel project (Storage > Upstash Redis)')
  const res = await fetch(`${URL_().replace(/\/$/, '')}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  })
  if (!res.ok) throw new Error(`Redis HTTP ${res.status}`)
  const json = await res.json()
  return json.map((r) => {
    if (r.error) throw new Error(r.error)
    return r.result
  })
}

export const HIST_PREFIX = 'ems:hist:' // + YYYY-MM-DD (India) → hash { bucket: sample JSON }
export const DAY_PREFIX = 'ems:day:' // + YYYY-MM-DD → cached totals for a finished day
export const KEEP_SECONDS = 60 * 60 * 24 * 45 // keep 45 days
