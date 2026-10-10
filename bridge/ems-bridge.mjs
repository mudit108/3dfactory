// Read-only bridge: Surat EMS (localhost:8080) -> clean JSON for the 3D factory.
// No dependencies. Needs Node 18+.   node ems-bridge.mjs          (run the bridge)
//                                    node ems-bridge.mjs --probe  (save what the EMS sends, for field mapping)
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

// ---- config (bridge/.env) ----------------------------------------------
const env = { ...process.env }
try {
  for (const line of fs.readFileSync(path.join(here, '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)
    if (m && !line.trim().startsWith('#')) env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2').trim()
  }
} catch {}
const EMS_URL = (env.EMS_URL || 'http://localhost:8080').replace(/\/$/, '')
const USER = env.EMS_USER || 'admin'
const PASS = env.EMS_PASSWORD || ''
const PORT = Number(env.PORT || 8787)
const HOST = env.BIND || '0.0.0.0' // 0.0.0.0 = reachable from phones on the same Wi-Fi; use 127.0.0.1 for this PC only
const STREAM_PATH = env.EMS_STREAM_PATH || '/EMS/dashboard/getRealStatus2/1?quality='
const POLL_MS = Number(env.POLL_MS || 4000)

if (!PASS) console.warn('! EMS_PASSWORD is empty - edit bridge/.env')

// ---- session -------------------------------------------------------------
const jar = new Map([
  ['eusername', USER],
  ['epassword', encodeURIComponent(PASS)],
])
const cookieHeader = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ')
function absorb(res) {
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [kv] = c.split(';')
    const i = kv.indexOf('=')
    if (i > 0) jar.set(kv.slice(0, i).trim(), kv.slice(i + 1).trim())
  }
}

/** fetch that keeps cookies and follows redirects by hand (so the chain can be shown). */
async function hop(url, init = {}, max = 8) {
  const chain = []
  let method = init.method || 'GET'
  let body = init.body
  for (let i = 0; i < max; i++) {
    const res = await fetch(url, { method, body, redirect: 'manual', headers: { Cookie: cookieHeader(), ...(init.headers || {}) } })
    absorb(res)
    const loc = res.headers.get('location')
    chain.push({ status: res.status, url, location: loc })
    if (res.status >= 300 && res.status < 400 && loc) {
      url = new URL(loc, url).href
      method = 'GET'
      body = undefined
      await res.arrayBuffer().catch(() => {})
      continue
    }
    return { status: res.status, url, text: await res.text(), chain }
  }
  return { status: 0, url, text: '', chain }
}

function parseForm(html, baseUrl) {
  const f = html.match(/<form\b[^>]*>[\s\S]*?<\/form>/i)
  if (!f) return null
  const attr = (tag, name) => (tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i')) || [])[1]
  const open = f[0].match(/<form\b[^>]*>/i)[0]
  const inputs = [...f[0].matchAll(/<(?:input|button)\b[^>]*>/gi)].map((m) => ({ name: attr(m[0], 'name'), type: (attr(m[0], 'type') || 'text').toLowerCase(), value: attr(m[0], 'value') ?? '' })).filter((i) => i.name)
  return { action: new URL(attr(open, 'action') || '', baseUrl).href, method: (attr(open, 'method') || 'GET').toUpperCase(), inputs }
}

let loginInfo = { tried: false }
async function login() {
  const attempts = []
  loginInfo = { tried: true, userLen: USER.length, passLen: PASS.length, passHasQuoteOrSpace: /['"\s]/.test(PASS), attempts }
  if (!PASS) { loginInfo.result = 'EMS_PASSWORD is empty - edit .env'; return false }
  // a password copied from DevTools cookies is URL-encoded (%40 = @): try it decoded as well
  let decoded = PASS
  try { decoded = decodeURIComponent(PASS) } catch {}
  const passwords = decoded !== PASS ? [decoded, PASS] : [PASS]
  const base = [
    { name: 'plain form', submit: false, hdr: false },
    { name: 'with submit button', submit: true, hdr: false },
    { name: 'with Origin/Referer', submit: true, hdr: true },
  ]
  const variants = passwords.flatMap((pw, i) => base.map((b) => ({ ...b, pw, name: `${b.name}${passwords.length > 1 ? (i === 0 ? ' [decoded password]' : ' [password as typed]') : ''}` })))
  for (const v of variants) {
    jar.delete('JSESSIONID')
    const first = await hop(env.EMS_LOGIN_URL || `${EMS_URL}/EMS/dashboard`)
    const form = parseForm(first.text, first.url)
    loginInfo.landed = first.url
    if (!form || !form.inputs.some((i) => i.type === 'password')) {
      loginInfo.result = first.status === 200 ? 'logged-in' : 'no-login-form-found'
      return first.status === 200
    }
    loginInfo.form = { action: form.action, method: form.method, fields: form.inputs.map((i) => `${i.name}:${i.type}${i.type === 'submit' ? '=' + i.value : ''}`) }
    const params = new URLSearchParams()
    for (const i of form.inputs) {
      if (i.type === 'password') params.set(env.EMS_PASS_FIELD || i.name, v.pw)
      else if (i.type === 'text' || i.type === 'email') params.set(env.EMS_USER_FIELD || i.name, USER)
      else if (i.type === 'submit') { if (v.submit) params.set(i.name, i.value) }
      else if (i.type !== 'button' && i.type !== 'checkbox') params.set(i.name, i.value)
    }
    const headers = { 'Content-Type': 'application/x-www-form-urlencoded' }
    if (v.hdr) { headers.Origin = new URL(first.url).origin; headers.Referer = first.url }
    const sent = await hop(form.action, { method: form.method === 'GET' ? 'GET' : 'POST', body: form.method === 'GET' ? undefined : params, headers })
    const check = await hop(`${EMS_URL}/EMS/dashboard`)
    const ok = check.status === 200 && !/type\s*=\s*["']password["']/i.test(check.text)
    attempts.push({ variant: v.name, postStatus: sent.chain.map((c) => c.status).join('>'), landed: sent.url, ok })
    loginInfo.lastLandingPage = sent.text
    if (ok) { loginInfo.result = 'logged-in'; return true }
  }
  loginInfo.result = 'login-failed (EMS rejected the username/password or needs something else)'
  return false
}
async function ensureSession() {
  if (jar.has('JSESSIONID') && loginInfo.result === 'logged-in') return
  await login()
}

/** Opens an event-stream, returns the first complete event(s) received within `ms`. */
async function readStream(url, { method = 'GET', ms = 12000 } = {}, retried = false) {
  await ensureSession()
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), ms)
  let text = ''
  let status = 0
  let type = ''
  try {
    const res = await fetch(url, {
      method,
      signal: ac.signal,
      redirect: 'manual',
      headers: { Cookie: cookieHeader(), Accept: method === 'GET' ? 'text/event-stream' : '*/*', 'Cache-Control': 'no-cache' },
    })
    absorb(res)
    status = res.status
    type = res.headers.get('content-type') || ''
    if (status >= 300 && status < 400) {
      if (!retried) {
        loginInfo.result = 'expired'
        return readStream(url, { method, ms }, true)
      }
    } else {
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        text += dec.decode(value, { stream: true })
        if (/\r?\n\r?\n/.test(text) && /^data:/m.test(text)) break // first complete event
        if (text.length > 400000) break
      }
    }
    ac.abort()
  } catch (e) {
    if (e.name !== 'AbortError') throw e
  } finally {
    clearTimeout(timer)
  }
  return { status, type, text }
}

/** Joins the `data:` lines of the LAST complete SSE event (or the whole body if it is not SSE). */
function lastEventData(text) {
  const parts = text.split(/\r?\n\r?\n/)
  const events = (parts.length > 1 ? parts.slice(0, -1) : parts).filter((e) => /^data:/m.test(e)) // last piece may be cut off
  if (!events.length) return text.trim()
  const ev = events[events.length - 1]
  return ev
    .split(/\r?\n/)
    .filter((l) => l.startsWith('data:'))
    .map((l) => l.slice(5).replace(/^ /, ''))
    .join('\n')
}

// ---- mapping EMS -> 3D app ---------------------------------------------------
// The EMS field names are confirmed from the --probe output. Until then the finder below
// looks for an array of ~38 objects and matches common names.
const ALIASES = {
  no: ['machineNo', 'machine_no', 'loomNo', 'loom_no', 'mcNo', 'mc', 'machine', 'loom', 'no', 'id', 'name', 'macNo', 'machineName'],
  efficiency: ['efficiency', 'eff', 'effi', 'efficiencyPer', 'effPer', 'percentage'],
  rpm: ['rpm', 'speed', 'avgRpm', 'currentRpm'],
  pick: ['pick', 'picks', 'pickPerCm', 'pickPerInch', 'ppi', 'ppc'],
  stops: ['stops', 'stop', 'stopCount', 'noOfStops', 'stoppage', 'stopage', 'stopages'],
  fabric: ['quality', 'qualityName', 'fabric', 'design', 'article', 'item', 'qlty'],
  production: ['production', 'prod', 'meter', 'meters', 'mtr', 'totalProduction'],
  since: ['duration', 'time', 'runTime', 'stopTime', 'since', 'stateTime', 'elapsed'],
  state: ['status', 'state', 'machineStatus', 'mstatus'],
}
const pick = (o, keys) => {
  const lower = Object.fromEntries(Object.keys(o).map((k) => [k.toLowerCase(), o[k]]))
  for (const k of keys) if (lower[k.toLowerCase()] !== undefined) return lower[k.toLowerCase()]
  return undefined
}
const num = (v) => {
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''))
  return Number.isFinite(n) ? n : undefined
}
function findLoomArray(node, depth = 0) {
  if (depth > 5 || node == null) return null
  if (Array.isArray(node) && node.length >= 10 && node.every((x) => x && typeof x === 'object')) return node
  if (typeof node === 'object') for (const v of Object.values(node)) {
    const r = findLoomArray(v, depth + 1)
    if (r) return r
  }
  return null
}
const BEAM_FULL_M = Number(env.BEAM_FULL_M || 6000) // meters on a full warp beam (EMS only reports meters left)
const TARGET_M = Number(env.TARGET_M || 150) // meters/day a loom makes at 100% efficiency
const hms = (t) => {
  const p = String(t || '').split(':').map(Number)
  return p.length === 3 && p.every(Number.isFinite) ? p[0] * 60 + p[1] + p[2] / 60 : undefined
}


// ---- beam & machine info from the EMS list pages (read-only) --------------------------------
const INCH = 39.3701
const beams = { at: 0, byNo: new Map(), spare: [], err: null }
const rated = { at: 0, byNo: new Map() }
const samples = new Map() // loom number -> [{ t, m }] recent beam-meters readings (to measure the real speed)
const parseEmsDate = (t) => {
  const m = String(t || '').match(/(\d\d)\/(\d\d)\/(\d\d)(?:\s+(\d\d):(\d\d))?/)
  return m ? new Date(2000 + +m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0)).getTime() : 0
}
async function getJson(pth) {
  await ensureSession()
  const get = () => hop(`${EMS_URL}/EMS/${pth}`, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
  let r = await get()
  if (/^\s*</.test(r.text)) { loginInfo.result = ''; await ensureSession(); r = await get() } // session expired -> log in again
  return JSON.parse(r.text)
}
async function refreshBeams() {
  await refreshBeamsInner()
  if (lastRaw && good) { const r = normalize(lastRaw); if (r.ok) { good.machines = r.machines; good.summary = r.summary } } // no timestamp change: data is not newer, just richer
}
async function refreshBeamsInner() {
  try {
    // Beam Detail list. Columns: 8 loadDate, 9 endDate, 10 machine, 11 beamNo, 12 pbno, 14 size, 15 quality, 17 pick, 18 mtrs, 19 alertMtrs, 21 tar, 22 reed, 23 panno
    const rows = await getJson('beam/grid/r/true?fdate=&ftodate=&fbeamnumber=&searchType=&fmachineid=&fqualityid=')
    const by = new Map()
    for (const r of rows) {
      if (!Array.isArray(r) || r[9]) continue // finished beam
      const n = parseInt(r[10], 10)
      const t = parseEmsDate(r[8])
      if (!n) continue
      const prev = by.get(n)
      if (prev && prev.loadedMs >= t) continue
      by.set(n, { beamNo: String(r[11] ?? ''), pbno: String(r[12] ?? ''), quality: String(r[15] ?? '').trim(), pick: num(r[17]), totalM: num(r[18]), alertM: num(r[19]), tar: num(r[21]), reed: num(r[22]), panno: num(r[23]), loadedMs: t, loadedAt: t ? new Date(t).toISOString() : undefined })
    }
    beams.byNo = by
    beams.at = Date.now()
    beams.err = null
  } catch (e) { beams.err = e.message }
  try {
    // Beam Stock (beams waiting in the store). Columns: 5 date, 8 beamNo, 9 stockNo, 10 quality, 11 party, 13 mtrs, 14 alert, 15 pick
    const rows = await getJson('beamstock/grid/1/false/false/false')
    beams.spare = rows.filter(Array.isArray).map((r) => ({ beamNo: String(r[8] ?? ''), stockNo: String(r[9] ?? ''), quality: String(r[10] ?? '').trim(), party: String(r[11] ?? '').trim(), meters: num(r[13]), pick: num(r[15]), date: r[5] })).slice(0, 40)
  } catch (e) { beams.err = beams.err || e.message }
  try {
    if (Date.now() - rated.at > 600000) {
      // Machine list. Columns: 5 loom number, 8 PICK, 9 RPM, 10 size
      const rows = await getJson('machine/grid')
      const by = new Map()
      for (const r of rows) if (Array.isArray(r)) { const n = parseInt(r[5], 10); if (n) by.set(n, { pick: num(r[8]), rpm: num(r[9]) }) }
      if (by.size) { rated.byNo = by; rated.at = Date.now() }
    }
  } catch {}
}
function trackBeam(n, meters) {
  if (meters === undefined) return undefined
  const now = Date.now()
  let arr = samples.get(n) || []
  const last = arr[arr.length - 1]
  if (last && meters > last.m + 20) arr = [] // beam was changed: start over
  if (!arr.length || now - arr[arr.length - 1].t > 60000) arr.push({ t: now, m: meters })
  arr = arr.filter((x) => now - x.t < 90 * 60000)
  samples.set(n, arr)
  const first = arr[0]
  const span = (now - first.t) / 3600000
  if (span >= 0.33 && first.m - meters > 0.5) return (first.m - meters) / span // metres per hour really made in the last 20-90 min
  return undefined
}

/** The real Surat EMS payload: { Data: [ { group, data: [ { machineno, eff, rpm, pick, stop, quality, ... } ] } ] } */
function normalizeEms(data) {
  const rows = data.Data.flatMap((g) => (Array.isArray(g.data) ? g.data : []))
  if (!rows.length) return null
  return rows.map((o) => {
    const n = parseInt(o.machineno, 10)
    const rpm = num(o.rpm) ?? 0
    const beamMeters = num(o.beammtr)
    const pickInch = num(o.pick)
    const eff = num(o.eff) ?? 0
    const b = beams.byNo.get(n)
    const rt = rated.byNo.get(n)
    const totalM = b?.totalM || BEAM_FULL_M
    // speed: rated RPM from the EMS machine list (ignored if it looks mistyped), else the live RPM
    const rpmBasis = rt?.rpm >= 100 ? rt.rpm : rpm >= 100 ? rpm : undefined
    const pk = pickInch || rt?.pick
    const fullMph = rpmBasis && pk ? (rpmBasis * 60) / (pk * INCH) : undefined // metres per hour at 100% efficiency
    const observed = trackBeam(n, beamMeters)
    const rateMph = observed ?? (fullMph && eff > 0 ? (fullMph * eff) / 100 : undefined)
    const etaHours = beamMeters !== undefined && rateMph > 0.05 ? beamMeters / rateMph : undefined
    return {
      id: `WJ-${String(n).padStart(2, '0')}`,
      status: rpm > 0 ? 'running' : 'idle',
      efficiency: eff,
      rpm,
      picksPerInch: pickInch,
      picksPerCm: pickInch ? Math.round((pickInch / 2.54) * 10) / 10 : undefined,
      stopCount: num(o.stop),
      fabric: o.quality ? String(o.quality).trim() : b?.quality,
      production: num(o.CSBPROD),
      targetToday: fullMph ? Math.round(fullMph * 24) : TARGET_M,
      reedWidthCm: num(o.size),
      beamMeters,
      beamTotal: b?.totalM,
      beamNo: b?.beamNo,
      beamLoadedAt: b?.loadedAt,
      beamAlertM: b?.alertM,
      beamQuality: b?.quality,
      warpBeamRemaining: beamMeters === undefined ? undefined : Math.max(0, Math.min(100, Math.round((beamMeters / totalM) * 100))),
      rateMph: rateMph ? Math.round(rateMph * 100) / 100 : undefined,
      rateSource: observed ? 'observed' : rateMph ? 'rated' : undefined,
      etaHours: etaHours !== undefined ? Math.round(etaHours * 10) / 10 : undefined,
      etaAt: etaHours !== undefined ? new Date(Date.now() + etaHours * 3600000).toISOString() : undefined,
      stateMinutes: hms(o.stoptime),
      alert: o.stimg === 'redalert' ? 'red' : o.stimg === 'bluealert' ? 'blue' : null,
      beamLow: o.balert === '2' || o.balert === 2 || (b?.alertM != null && beamMeters !== undefined && beamMeters <= b.alertM),
      lastUpdate: o.time,
      emsColor: o.color, // the card colour the EMS shows for this loom
      rounds: num(o.rounds),
      shortPick: o.SHORTPICK === '1' || o.SHORTPICK === 1,
    }
  })
}

const BANDS = { '#ABDB19': 'b90', '#FFB500': 'b80', '#FF84F1': 'b75', '#C738EB': 'b0' }
/** Header numbers + the filter-button counts of the EMS dashboard. */
function summarize(data, machines) {
  const head = String(data.Head || '').split(':')
  const sum = { total: machines.length, b90: 0, b80: 0, b75: 0, b0: 0, manual: 0, filler: 0, unload: 0 }
  for (const m of machines) {
    if (BANDS[m.emsColor]) sum[BANDS[m.emsColor]]++
    if (m.alert === 'red') sum.manual++
    if (m.alert === 'blue') sum.filler++
    if (m.beamLow) sum.unload++
  }
  const running = machines.filter((m) => m.status === 'running').length
  return {
    efficiency: num(head[1]), // "ALL:82.94%:521.61:51.16:..." as sent by the EMS
    avgRpm: num(head[2]),
    avgPick: num(head[3]),
    production: Math.round(machines.reduce((a, m) => a + (m.production || 0), 0) * 100) / 100,
    running,
    ...sum,
    beamsSoon: machines.filter((m) => m.etaHours !== undefined).sort((a, b) => a.etaHours - b.etaHours).slice(0, 8).map((m) => ({ id: m.id, etaHours: m.etaHours, etaAt: m.etaAt, beamMeters: m.beamMeters, beamNo: m.beamNo, quality: m.fabric })),
    spareBeams: beams.spare,
    spareMeters: beams.spare.reduce((a, x) => a + (x.meters || 0), 0),
    headRaw: data.Head,
  }
}

function normalize(raw) {
  let data
  try { data = JSON.parse(raw) } catch { return { ok: false, reason: 'not-json' } }
  if (data && Array.isArray(data.Data)) {
    const m = normalizeEms(data)
    if (m) return { ok: true, machines: m, summary: summarize(data, m) }
  }
  const arr = findLoomArray(data)
  if (!arr) return { ok: false, reason: 'no-loom-array' }
  const machines = []
  arr.forEach((o, i) => {
    const noRaw = pick(o, ALIASES.no)
    const n = num(noRaw) ?? i + 1
    const id = `WJ-${String(Math.round(n)).padStart(2, '0')}`
    const rpm = num(pick(o, ALIASES.rpm)) ?? 0
    const stateRaw = String(pick(o, ALIASES.state) ?? '').toLowerCase()
    const status = /maint|service/.test(stateRaw) ? 'maintenance' : rpm > 0 && !/stop|off|idle/.test(stateRaw) ? 'running' : 'idle'
    const stops = pick(o, ALIASES.stops)
    machines.push({
      id,
      status,
      efficiency: num(pick(o, ALIASES.efficiency)) ?? 0,
      rpm,
      picksPerCm: num(pick(o, ALIASES.pick)),
      stopCount: num(stops),
      fabric: pick(o, ALIASES.fabric) ? String(pick(o, ALIASES.fabric)).trim() : undefined,
      production: num(pick(o, ALIASES.production)),
      stateSince: pick(o, ALIASES.since),
    })
  })
  return { ok: true, machines }
}

// ---- live stream (one long connection, like the EMS dashboard itself) -------------
// Last good data is kept; a dropped/empty stream never wipes it. It only counts as stale after STALE_MS without fresh data.
const STALE_MS = Number(env.STALE_MS || 120000)
let good = null // { at: ms, machines }
let problem = 'starting'
function status() {
  const fresh = good && Date.now() - good.at < STALE_MS
  if (fresh) return { ok: true, at: new Date(good.at).toISOString(), machines: good.machines, summary: good.summary, reason: problem && problem !== 'starting' ? `ok (last note: ${problem})` : 'ok' }
  return { ok: false, reason: good ? `no fresh data for ${Math.round((Date.now() - good.at) / 1000)} s (${problem})` : problem, at: null, machines: [] }
}
let lastRaw = '' // last full EMS message, kept so beam info can be re-applied when it arrives later
let diag = { events: 0, lastBytes: 0, sample: '' }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function handleEvent(block) {
  const data = block
    .split(/\r?\n/)
    .filter((l) => l.startsWith('data:'))
    .map((l) => l.slice(5).replace(/^ /, ''))
    .join('\n')
  if (!data) return
  diag.events++
  diag.lastBytes = data.length
  if (/^\s*empty\s*$/i.test(data)) { diag.empties = (diag.empties || 0) + 1; if (good) good.at = Date.now(); return } // EMS says nothing changed: last data is still current
  lastRaw = data
  const r = normalize(data)
  if (r.ok) { good = { at: Date.now(), machines: r.machines, summary: r.summary }; problem = '' }
  else {
    diag.sample = data.slice(0, 300)
    problem = r.reason
  }
}

async function runStream() {
  for (;;) {
    try {
      await ensureSession()
      const ac = new AbortController()
      let watchdog = setTimeout(() => ac.abort(), 45000) // EMS pushes every few seconds; silence = dead connection
      const res = await fetch(`${EMS_URL}${STREAM_PATH}`, {
        signal: ac.signal,
        redirect: 'manual',
        headers: { Cookie: cookieHeader(), Accept: 'text/event-stream', 'Cache-Control': 'no-cache' },
      })
      absorb(res)
      if (res.status >= 300 && res.status < 400) {
        loginInfo.result = 'expired'
        problem = `session expired (HTTP ${res.status}), logging in again`
        clearTimeout(watchdog)
        await sleep(1000)
        continue
      }
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        clearTimeout(watchdog)
        watchdog = setTimeout(() => ac.abort(), 45000)
        buf += dec.decode(value, { stream: true })
        let m
        while ((m = buf.match(/\r?\n\r?\n/))) {
          handleEvent(buf.slice(0, m.index))
          buf = buf.slice(m.index + m[0].length)
        }
        if (buf.length > 2_000_000) buf = ''
      }
      clearTimeout(watchdog)
      if (buf.trim()) handleEvent(buf) // server closed without a final blank line
      problem = 'EMS closed the stream, reconnected'
    } catch (e) {
      problem = `ems-unreachable: ${e.name === 'AbortError' ? 'no data for 45 s' : e.message}`
    }
    await sleep(2000)
  }
}

// ---- optional: push to your Vercel site (outbound only, nothing opens on this PC) -------------
const PUSH_URL = (env.PUSH_URL || '').replace(/\/$/, '')
const PUSH_TOKEN = env.PUSH_TOKEN || ''
const PUSH_BYPASS = env.PUSH_BYPASS || '' // Vercel 'Protection Bypass for Automation' secret, only needed if Vercel Authentication is on
const PUSH_MS = Number(env.PUSH_MS || 4000)
let pushState = { enabled: !!(PUSH_URL && PUSH_TOKEN), lastOk: null, lastError: null, count: 0 }
let lastPushedAt = 0
let lastPushTry = 0
async function pushOnce() {
  const st = status()
  if (!st.ok || !good) return
  if (good.at === lastPushedAt && Date.now() - lastPushTry < 25000) return // unchanged: still re-send every ~25 s so the site knows we are alive
  lastPushTry = Date.now()
  const sent = good.at
  try {
    const res = await fetch(PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${PUSH_TOKEN}`, ...(PUSH_BYPASS ? { 'x-vercel-protection-bypass': PUSH_BYPASS } : {}) },
      body: JSON.stringify({ at: st.at, summary: st.summary, machines: st.machines }),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) throw new Error(`Vercel answered HTTP ${res.status}${res.status === 401 ? ' (PUSH_TOKEN does not match, or Vercel Authentication is blocking: set PUSH_BYPASS)' : ''}`)
    lastPushedAt = sent
    pushState = { ...pushState, lastOk: new Date().toISOString(), lastError: null, count: pushState.count + 1 }
  } catch (e) {
    if (pushState.lastError !== e.message) console.warn(`! push to Vercel failed: ${e.message}`)
    pushState = { ...pushState, lastError: e.message }
  }
}

// ---- probe mode ---------------------------------------------------------------
async function probe() {
  const redact = (s) => s.split(PASS || '\u0000').join('***').replaceAll(encodeURIComponent(PASS || '\u0000'), '***')
  let out = `EMS probe ${new Date().toISOString()}\nEMS_URL=${EMS_URL}\n\n`
  try { await ensureSession() } catch (e) { out += `login error: ${e.message}\n` }
  const { lastLandingPage, ...li } = loginInfo
  out += `=== LOGIN\n${redact(JSON.stringify(li, null, 1))}\n\n`
  if (lastLandingPage) out += `=== page shown after the login POST (error text may be in here)\n${redact(lastLandingPage.slice(0, 7000))}\n\n`
  try {
    const page = await hop(`${EMS_URL}/EMS/dashboard`)
    out += `=== dashboard page after login: HTTP ${page.status} ${page.url}, ${page.text.length} chars\n${redact(page.text.slice(0, 7000))}\n\n`
  } catch {}
  for (const [label, url, method] of [
    ['GET stream  getRealStatus2/1', `${EMS_URL}${STREAM_PATH}`, 'GET'],
    ['POST        getRealStatus/1', `${EMS_URL}/EMS/dashboard/getRealStatus/1`, 'POST'],
  ]) {
    try {
      const r = await readStream(url, { method, ms: 5000 })
      out += `=== ${label}\nHTTP ${r.status}  ${r.type}\nlength ${r.text.length}\n--- first 9000 chars:\n${redact(r.text.slice(0, 9000))}\n\n`
    } catch (e) {
      out += `=== ${label}\nFAILED: ${e.message}\n\n`
    }
  }
  const file = path.join(here, 'probe-output.txt')
  fs.writeFileSync(file, out)
  console.log(`\nSaved ${file}\nSend that file back (the password has been removed from it).`)
}

// ---- discover mode: list the EMS menu pages and the data addresses their scripts use ------
async function discover() {
  const redact = (t) => t.split(PASS || '\u0000').join('***').replaceAll(encodeURIComponent(PASS || '\u0000'), '***')
  await ensureSession()
  let out = `EMS discover ${new Date().toISOString()}  login=${loginInfo.result}\n\n`
  const home = await hop(`${EMS_URL}/EMS/dashboard`)
  const abs = (h, base) => { try { return new URL(h, base).href } catch { return null } }
  const links = new Map()
  for (const m of home.text.matchAll(/<a\b[^>]*href\s*=\s*["']([^"'#][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const url = abs(m[1], home.url)
    const label = m[2].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    if (url && url.startsWith(EMS_URL) && !/^javascript|logout|\.(css|js|png|jpg|ico)(\?|$)/i.test(m[1]) && !links.has(url)) links.set(url, label)
  }
  out += `=== MENU LINKS (${links.size})\n` + [...links].map(([u, l]) => `${l || '(no text)'}  ->  ${u}`).join('\n') + '\n\n'
  const endpointRe = /["'`]((?:\/?EMS)?\/?[A-Za-z0-9_\-]+(?:\/[A-Za-z0-9_\-.]+){0,5}(?:\?[^"'`\s]{0,60})?)["'`]/g
  const interesting = (t) => [...new Set([
    ...[...t.matchAll(/(?:url|href|action)\s*[:=]\s*["'`]([^"'`]{3,120})["'`]/g)].map((m) => m[1]),
    ...[...t.matchAll(/(?:\$\.(?:post|get|getJSON|ajax)|fetch|EventSource|open)\(\s*["'`]([^"'`]{3,120})["'`]/g)].map((m) => m[1]),
  ])].filter((u) => !/^(#|javascript|data:|mailto|https?:\/\/(?!localhost))/i.test(u) && !/\.(css|png|jpg|gif|svg|ico|woff2?|ttf)(\?|$)/i.test(u))
  const seenScripts = new Set()
  let n = 0
  for (const [url, label] of links) {
    if (n++ >= 45) break
    try {
      const p = await hop(url)
      const text = p.text.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
      out += `=== PAGE ${label || url}\nURL ${p.url}  HTTP ${p.status}  ${p.text.length} chars\nTEXT: ${redact(text.slice(0, 700))}\nDATA ADDRESSES IN PAGE: ${JSON.stringify(interesting(p.text))}\n`
      const tables = [...p.text.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map((m) => m[1].replace(/<[^>]*>/g, '').trim()).filter(Boolean).slice(0, 40)
      if (tables.length) out += `TABLE HEADINGS: ${JSON.stringify(tables)}\n`
      for (const m of p.text.matchAll(/<script[^>]*\ssrc\s*=\s*["']([^"']+)["']/gi)) {
        const su = abs(m[1], p.url)
        if (!su || seenScripts.has(su) || !su.startsWith(EMS_URL) || /jquery|bootstrap|lodash|chart|d3\.|toastr|dhtmlx|sweetalert|moment|datatables|plugins\/|libs\/|html5shiv|cookie/i.test(su)) continue
        seenScripts.add(su)
        const sc = await hop(su)
        const found = interesting(sc.text)
        if (found.length) out += `SCRIPT ${su}  addresses: ${JSON.stringify(found.slice(0, 40))}\n`
      }
      out += '\n'
    } catch (e) {
      out += `=== PAGE ${label || url}\nFAILED ${e.message}\n\n`
    }
  }
  const file = path.join(here, 'discover-output.txt')
  fs.writeFileSync(file, redact(out))
  console.log(`\nSaved ${file}\nSend that file back (passwords are removed).`)
}


// ---- grids mode: read-only look at the list endpoints behind the Beam / Yarn pages -------------
async function grids() {
  const redact = (t) => t.split(PASS || '\u0000').join('***').replaceAll(encodeURIComponent(PASS || '\u0000'), '***')
  await ensureSession()
  let out = `EMS grids ${new Date().toISOString()}  login=${loginInfo.result}\n\n`
  const B = `${EMS_URL}/EMS/`
  // 1) full column lists of the Beam page
  try {
    const r = await hop(`${B}js/master/beam.js?v=1.0`)
    const cols = r.text.split(/\r?\n/).filter((l) => /BEAM_GRID_COLUMN|COLWITHPROD|BEAMNPRO|cmbBType|isproduction/.test(l)).map((l) => l.trim().slice(0, 900)).slice(0, 14)
    out += `=== beam.js column lines\n${cols.join('\n')}\n\n`
    const pg = await hop(`${B}beam`)
    const sel = pg.text.match(/<select[^>]*id=["']cmbBType["'][\s\S]*?<\/select>/i)
    out += `=== cmbBType\n${sel ? sel[0].replace(/\s+/g, ' ').slice(0, 600) : 'not found'}\n\n`
  } catch (e) { out += `=== beam.js FAILED ${e.message}\n\n` }
  // 2) the running-beam list (read-only GET), a few type values
  const q = '?fdate=&ftodate=&fbeamnumber=&searchType=&fmachineid=&fqualityid='
  for (const t of ['1', '2', '0', 'a']) {
    for (const prod of ['true', 'false']) {
      const pth = `beam/grid/${t}/${prod}${q}`
      try {
        const r = await hop(B + pth, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
        out += `=== GET ${pth}  HTTP ${r.status}  ${r.text.length} chars\n${redact(r.text.replace(/\s+/g, ' ').slice(0, 1800))}\n\n`
      } catch (e) { out += `=== GET ${pth} FAILED ${e.message}\n\n` }
    }
  }
  const file = path.join(here, 'grids-output.txt')
  fs.writeFileSync(file, redact(out))
  console.log(`\nSaved ${file}\nSend that file back (passwords are removed).`)
}

// ---- http server ---------------------------------------------------------------------
async function main() {
  if (process.argv.includes('--probe')) return probe()
  if (process.argv.includes('--discover')) return discover()
  if (process.argv.includes('--grids')) return grids()
  runStream()
  refreshBeams()
  setInterval(refreshBeams, Number(env.BEAMS_MS || 60000))
  if (pushState.enabled) {
    console.log(`Pushing live data to ${PUSH_URL} every ${PUSH_MS / 1000} s`)
    setInterval(pushOnce, PUSH_MS)
  }
  http
    .createServer((req, res) => {
      const cors = { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store', 'Content-Type': 'application/json' }
      if (req.method === 'OPTIONS') { res.writeHead(204, { ...cors, 'Access-Control-Allow-Methods': 'GET' }); return res.end() }
      if (req.method !== 'GET') { res.writeHead(405, cors); return res.end('{"error":"read-only"}') }
      const url = req.url.split('?')[0]
      const st = status()
      if (url === '/api/machines') {
        if (!st.ok) { res.writeHead(503, cors); return res.end(JSON.stringify(st)) }
        res.writeHead(200, cors); return res.end(JSON.stringify(st.machines))
      }
      if (url === '/api/ems') {
        if (!st.ok) { res.writeHead(503, cors); return res.end(JSON.stringify(st)) }
        res.writeHead(200, cors); return res.end(JSON.stringify({ at: st.at, summary: st.summary, machines: st.machines }))
      }
      if (url === '/api/health') { res.writeHead(200, cors); return res.end(JSON.stringify({ ok: st.ok, reason: st.reason, at: st.at, looms: st.machines.length, login: loginInfo.result, push: pushState, beams: { at: beams.at ? new Date(beams.at).toISOString() : null, running: beams.byNo.size, spare: beams.spare.length, rated: rated.byNo.size, error: beams.err }, ...diag })) }
      res.writeHead(404, cors); res.end('{"error":"not found"}')
    })
    .listen(PORT, HOST, () => console.log(`EMS bridge on http://${HOST}:${PORT}  ->  ${EMS_URL}   (read-only)`))
}
main()
