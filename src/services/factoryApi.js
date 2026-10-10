// ---------------------------------------------------------------------------
// factoryApi — the single integration point between the 3D demo and your EMS.
//
// Today it serves mock data from src/data. To go live, set VITE_EMS_API_URL
// in a `.env` file (e.g. VITE_EMS_API_URL=https://ems.example.com) and make
// your backend expose the endpoints listed in ENDPOINTS below, returning the
// same JSON shapes as the files in src/data.
// ---------------------------------------------------------------------------
import { useEffect, useState } from 'react'
import { machines } from '../data/machines'
import { yarnInventory } from '../data/yarnInventory'
import { finishedStock } from '../data/finishedStock'
import { workers } from '../data/workers'
import { accountsData } from '../data/accountsData'
import { dispatchData, qualityData, maintenanceTasks, companyInfo } from '../data/operationsData'

// Three ways to run:
//  1. bridge  - VITE_EMS_API_URL=http://<factory-pc>:8787   (on the factory PC / its Wi-Fi)
//  2. cloud   - VITE_EMS_CLOUD=1 on Vercel: the factory PC pushes data to /api/ems and everyone sees it live
//  3. demo    - nothing set: built-in demo data
const CLOUD_ENABLED = ['1', 'true'].includes(String(import.meta.env.VITE_EMS_CLOUD)) // cloud mode wins over a leftover bridge address
const API_BASE = CLOUD_ENABLED ? '' : import.meta.env.VITE_EMS_API_URL || ''
const CLOUD_ACTIVE = CLOUD_ENABLED
export const USING_MOCK = !API_BASE && !CLOUD_ACTIVE

export const ENDPOINTS = {
  machines: '/api/ems', // bridge: { at, summary, machines[] }
  yarnInventory: '/api/inventory/yarn',
  finishedStock: '/api/inventory/finished',
  workers: '/api/workers',
  accounts: '/api/accounts/summary',
  dispatch: '/api/dispatch',
  quality: '/api/quality',
  maintenance: '/api/maintenance',
  company: '/api/company',
}

const clone = (v) => JSON.parse(JSON.stringify(v))
const delay = (ms) => new Promise((r) => setTimeout(r, ms))

// Only the loom data comes from the EMS bridge for now; everything else stays demo data
// until the matching EMS pages are connected.
const LIVE_KEYS = new Set(['machines'])
let lastLive = false
export const emsStatus = { online: null }
function setEmsOnline(v) {
  if (emsStatus.online === v) return
  emsStatus.online = v
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('ems-status', { detail: v }))
}
const demoMachines = new Map(machines.map((m) => [m.id, m]))

/** Real EMS values replace the demo ones. Items the EMS does not track keep a demo placeholder but live=true tells the UI to show "Not tracked". */
function mergeLiveMachine(live) {
  const base = demoMachines.get(live.id)
  if (!base) return null
  const out = { ...base, live: true, ems: true }
  for (const k of ['status', 'efficiency', 'rpm', 'fabric', 'production', 'reedWidthCm', 'warpBeamRemaining', 'beamMeters', 'beamLow', 'alert', 'stateMinutes', 'lastUpdate', 'emsColor', 'stopCount', 'rounds', 'shortPick', 'beamTotal', 'beamNo', 'beamLoadedAt', 'beamAlertM', 'beamQuality', 'rateMph', 'rateSource', 'etaHours', 'etaAt']) {
    if (live[k] !== undefined && live[k] !== null && live[k] !== '') out[k] = live[k]
  }
  out.pick = live.picksPerInch
  out.picksPerCm = live.picksPerCm ?? base.picksPerCm
  out.targetToday = live.targetToday ?? base.targetToday
  out.stops = { warp: 0, weft: 0, other: live.stopCount ?? 0 }
  if (live.reedWidthCm) out.model = `Waterjet / ${live.reedWidthCm} cm`
  if (live.status !== 'running') {
    out.waterPressure = 0
    out.power = live.status === 'idle' ? 1.2 : 0.4
  }
  return out
}

async function request(key, mock) {
  if (USING_MOCK || !LIVE_KEYS.has(key)) {
    await delay(60)
    return clone(mock)
  }
  let data
  try {
    const res = await fetch(`${API_BASE}${ENDPOINTS[key]}`, { headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error(`EMS ${key} request failed: ${res.status}`)
    data = await res.json()
    setEmsOnline(true)
  } catch (e) {
    setEmsOnline(false)
    // first load with the bridge off: show demo looms instead of a blank screen; live polling keeps retrying
    if (key === 'machines' && !lastLive) return clone(mock)
    throw e
  }
  if (key === 'machines') {
    lastLive = true
    if (data.summary && typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('ems-summary', { detail: { ...data.summary, at: data.at } }))
    const list = Array.isArray(data) ? data : data.machines
    const byId = new Map(list.map((m) => [m.id, mergeLiveMachine(m)]))
    // any loom the EMS did not report stays as idle demo data
    return machines.map((m) => byId.get(m.id) || { ...clone(m), status: 'idle', rpm: 0 })
  }
  return data
}

export const getMachines = () => request('machines', machines)
export const getYarnInventory = () => request('yarnInventory', yarnInventory)
export const getFinishedStock = () => request('finishedStock', finishedStock)
export const getWorkers = () => request('workers', workers)
export const getAccounts = () => request('accounts', accountsData)
export const getDispatch = () => request('dispatch', dispatchData)
export const getQuality = () => request('quality', qualityData)
export const getMaintenance = () => request('maintenance', maintenanceTasks)
export const getCompany = () => request('company', companyInfo)

/** Loads everything the scene needs in one go. */
export async function getFactorySnapshot() {
  const [m, y, f, w, a, d, q, mt, c] = await Promise.all([
    getMachines(), getYarnInventory(), getFinishedStock(), getWorkers(), getAccounts(),
    getDispatch(), getQuality(), getMaintenance(), getCompany(),
  ])
  return { machines: m, yarnInventory: y, finishedStock: f, workers: w, accounts: a, dispatch: d, qualityData: q, maintenance: mt, company: c }
}

/**
 * Live updates. With a real EMS this polls the machines endpoint (swap for a
 * WebSocket/SSE if your EMS supports it). In mock mode it simulates small
 * fluctuations so the dashboards feel alive.
 */
export function subscribeToLiveUpdates(onMachines, intervalMs = 4000) {
  let timer
  if (!USING_MOCK) {
    timer = setInterval(async () => {
      try { onMachines(await getMachines()) } catch (e) { console.warn(e) }
    }, intervalMs)
    return () => clearInterval(timer)
  }
  let state = null
  timer = setInterval(() => {
    onMachines((prev) => {
      state = (prev || state || []).map((m) => {
        if (m.status !== 'running') return m
        const rpm = Math.round(m.rpm + (Math.random() - 0.5) * 8)
        return {
          ...m,
          rpm: Math.min(700, Math.max(610, rpm)),
          waterPressure: Math.round(Math.min(126, Math.max(114, m.waterPressure + (Math.random() - 0.5) * 2))),
          power: Math.round((m.power + (Math.random() - 0.5) * 0.3) * 10) / 10,
          production: m.production + (Math.random() < 0.55 ? 1 : 0),
          runtimeMinutes: m.runtimeMinutes + intervalMs / 60000,
        }
      })
      return state
    })
  }, intervalMs)
  return () => clearInterval(timer)
}

/** 'DEMO' (no EMS configured), 'LIVE' (EMS answering) or 'EMS OFFLINE' (bridge/EMS not reachable). */
export function useDataMode() {
  const [online, setOnline] = useState(emsStatus.online)
  useEffect(() => {
    const on = (e) => setOnline(e.detail)
    window.addEventListener('ems-status', on)
    return () => window.removeEventListener('ems-status', on)
  }, [])
  if (USING_MOCK) return { label: 'DEMO', ok: true }
  return online === false ? { label: 'EMS OFFLINE', ok: false } : { label: 'LIVE', ok: true }
}
