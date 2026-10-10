// Works out which operator looks after which looms, from the saved settings
// (machines per operator, roster, today's attendance, manual assignments).
import { loomPlacements, LOOM_ROWS } from '../data/layout'
import { todayKey } from '../data/defaultSettings'

// Walking order: row 1 left→right, row 2 right→left, … (snake)
export const SNAKE_ORDER = (() => {
  const out = []
  LOOM_ROWS.forEach((_, r) => {
    const row = loomPlacements.filter((p) => p.row === r)
    if (r % 2) row.reverse()
    out.push(...row.map((p) => p.id))
  })
  return out
})()

export const PRESENT = new Set(['present', 'half'])
export const ATT_LABEL = { present: 'Present', half: 'Half day', absent: 'Absent', leave: 'Leave' }

export function computeStaffing(settings, date = todayKey()) {
  if (!settings) return null
  const shift = settings.general.currentShift
  const roster = settings.operators.filter((o) => o.active !== false && o.shift === shift)
  const day = settings.attendance?.[date] || {}
  const attendanceOf = (o) => day[o.id] || { status: 'absent', in: '', out: '', ot: 0 }
  const present = roster.filter((o) => PRESENT.has(attendanceOf(o).status))
  const N = Math.max(1, Number(settings.staffing.machinesPerOperator) || 5)
  const requiredOperators = Math.ceil(SNAKE_ORDER.length / N)

  const assignments = []
  const machineOperator = {}
  if (settings.staffing.mode === 'manual') {
    const taken = new Set()
    for (const op of present) {
      const ids = (settings.staffing.manual?.[op.id] || []).filter((id) => !taken.has(id))
      ids.sort((a, b) => SNAKE_ORDER.indexOf(a) - SNAKE_ORDER.indexOf(b))
      ids.forEach((id) => taken.add(id))
      assignments.push({ op, machines: ids })
    }
  } else {
    for (let i = 0; i < present.length; i++) {
      assignments.push({ op: present[i], machines: SNAKE_ORDER.slice(i * N, i * N + N) })
    }
  }
  for (const a of assignments) for (const id of a.machines) machineOperator[id] = a.op
  const uncovered = SNAKE_ORDER.filter((id) => !machineOperator[id])

  return {
    date,
    shift,
    shiftInfo: settings.general.shifts.find((s) => s.id === shift),
    perOperator: N,
    roster,
    present,
    absent: roster.filter((o) => !PRESENT.has(attendanceOf(o).status)),
    attendanceOf,
    assignments,
    machineOperator,
    uncovered,
    requiredOperators,
  }
}

/** Apply per-machine overrides (status / fabric / target) from settings. */
export function applyMachineSettings(machines, settings) {
  if (!settings) return machines
  return machines.map((m) => {
    const o = settings.machines?.[m.id] || {}
    const target = Number(o.target) || Number(settings.general.targetPerLoom) || m.targetToday
    let next = { ...m, targetToday: target, fabric: o.fabric || m.baseFabric || m.fabric, baseFabric: m.baseFabric || m.fabric }
    const baseStatus = m.baseStatus || m.status
    next.baseStatus = baseStatus
    const status = o.status && o.status !== 'auto' ? o.status : baseStatus
    if (status !== m.status) {
      if (status === 'running') next = { ...next, status, rpm: 650, waterPressure: 120, power: 18.2, maintenanceNote: null }
      if (status === 'idle') next = { ...next, status, rpm: 0, waterPressure: 0, power: 1.2, maintenanceNote: 'Set to idle in settings.' }
      if (status === 'maintenance') next = { ...next, status, rpm: 0, waterPressure: 0, power: 0.4, maintenanceNote: 'Marked for maintenance in settings.' }
    }
    return next
  })
}
