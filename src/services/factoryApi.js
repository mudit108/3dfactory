// ---------------------------------------------------------------------------
// factoryApi — the single integration point between the 3D demo and your EMS.
//
// Today it serves mock data from src/data. To go live, set VITE_EMS_API_URL
// in a `.env` file (e.g. VITE_EMS_API_URL=https://ems.example.com) and make
// your backend expose the endpoints listed in ENDPOINTS below, returning the
// same JSON shapes as the files in src/data.
// ---------------------------------------------------------------------------
import { machines } from '../data/machines'
import { yarnInventory } from '../data/yarnInventory'
import { finishedStock } from '../data/finishedStock'
import { workers } from '../data/workers'
import { accountsData } from '../data/accountsData'
import { dispatchData, qualityData, maintenanceTasks, companyInfo } from '../data/operationsData'

const API_BASE = import.meta.env.VITE_EMS_API_URL || ''
export const USING_MOCK = !API_BASE

export const ENDPOINTS = {
  machines: '/api/machines',
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

async function request(key, mock) {
  if (USING_MOCK) {
    await delay(60)
    return clone(mock)
  }
  const res = await fetch(`${API_BASE}${ENDPOINTS[key]}`, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`EMS ${key} request failed: ${res.status}`)
  return res.json()
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
