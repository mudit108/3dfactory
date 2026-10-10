// Save / load plant settings. Uses browser storage today; if VITE_EMS_API_URL
// is set it also syncs to the EMS (GET/PUT /api/settings).
import { createDefaultSettings } from '../data/defaultSettings'

const KEY = 'satiji-factory-settings-v1'
const API_BASE = import.meta.env.VITE_EMS_API_URL || ''

function merge(defaults, saved) {
  if (!saved || typeof saved !== 'object') return defaults
  return {
    ...defaults,
    ...saved,
    general: { ...defaults.general, ...(saved.general || {}) },
    staffing: { ...defaults.staffing, ...(saved.staffing || {}) },
    machines: { ...defaults.machines, ...(saved.machines || {}) },
    display: { ...defaults.display, ...(saved.display || {}) },
    operators: Array.isArray(saved.operators) ? saved.operators : defaults.operators,
    attendance: saved.attendance || defaults.attendance,
  }
}

export async function loadSettings() {
  const defaults = createDefaultSettings()
  if (API_BASE) {
    try {
      const res = await fetch(`${API_BASE}/api/settings`)
      if (res.ok) return merge(defaults, await res.json())
    } catch (e) {
      console.warn('EMS settings unavailable, using local copy', e)
    }
  }
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return merge(defaults, JSON.parse(raw))
  } catch {
    /* storage unavailable */
  }
  return defaults
}

export async function saveSettings(settings) {
  const data = { ...settings, savedAt: new Date().toISOString() }
  let local = false
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
    local = true
  } catch {
    /* storage unavailable */
  }
  if (API_BASE) {
    // the read-only bridge has no /api/settings - the browser copy is then the saved copy
    try {
      const res = await fetch(`${API_BASE}/api/settings`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!res.ok) throw new Error(`EMS save failed: ${res.status}`)
    } catch (e) {
      if (!local) throw e
    }
  } else if (!local) {
    throw new Error('Could not save in this browser (storage blocked). Use Export instead.')
  }
  return data
}

export function resetSettings() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
  return createDefaultSettings()
}

export function exportSettingsFile(settings) {
  const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `satiji-settings-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export async function readSettingsFile(file) {
  const text = await file.text()
  return merge(createDefaultSettings(), JSON.parse(text))
}

export function downloadCsv(filename, rows) {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
