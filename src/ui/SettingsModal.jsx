// Plant settings: general, staffing ratio & loom assignment, operator roster,
// daily attendance and per-loom settings. Edits are kept in a draft until Save.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  X, Save, Settings2, Users, CalendarCheck, Cog, UserCog, Download, Upload, RotateCcw, Plus, Trash2, TriangleAlert,
  CheckCircle2, ChevronLeft, ChevronRight, FileSpreadsheet,
} from 'lucide-react'
import { useFactoryStore } from '../hooks/useFactoryStore'
import { computeStaffing, SNAKE_ORDER, PRESENT } from '../services/staffing'
import { saveSettings, resetSettings, exportSettingsFile, readSettingsFile, downloadCsv } from '../services/settingsService'
import { todayKey } from '../data/defaultSettings'
import { loomPlacements } from '../data/layout'
import { inr, num, STATUS_STYLES } from './format'

const TABS = [
  { id: 'general', label: 'General', icon: Settings2 },
  { id: 'staffing', label: 'Operators per loom', icon: UserCog },
  { id: 'operators', label: 'Operator list', icon: Users },
  { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
  { id: 'machines', label: 'Looms', icon: Cog },
]
const FABRICS = ['Polyester Taffeta 190T', 'Polyester Taffeta 210T', 'Polyester Pongee', 'Nylon Taslan', 'Polyester Oxford 300D', 'Nylon Ripstop', 'Polyester Georgette', 'Micro Peach']
const SKILLS = ['Senior', 'Grade A', 'Grade B', 'Trainee']
const ATT = [
  { id: 'present', short: 'P', label: 'Present', on: 'bg-emerald-500 text-slate-900' },
  { id: 'half', short: 'H', label: 'Half day', on: 'bg-sky-400 text-slate-900' },
  { id: 'absent', short: 'A', label: 'Absent', on: 'bg-rose-500 text-white' },
  { id: 'leave', short: 'L', label: 'Leave', on: 'bg-amber-400 text-slate-900' },
]
const clone = (v) => JSON.parse(JSON.stringify(v))
const comparable = (v) => JSON.stringify({ ...v, display: null, savedAt: null })

// ---- small form primitives -----------------------------------------------------
const inputCls = 'w-full rounded-lg bg-white/[0.06] px-2.5 py-1.5 text-[13px] text-white ring-1 ring-white/10 outline-none focus:ring-amber-300/60'
function Field({ label, hint, children }) {
  return (
    <label className="block">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
      {children}
      {hint && <div className="mt-1 text-[11px] text-slate-500">{hint}</div>}
    </label>
  )
}
function Card({ title, right, children, className = '' }) {
  return (
    <div className={`rounded-2xl bg-white/[0.03] p-3 ring-1 ring-white/[0.07] sm:p-4 ${className}`}>
      {(title || right) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{title}</div>
          {right}
        </div>
      )}
      {children}
    </div>
  )
}
function Toggle({ checked, onChange, label }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-2 text-[13px] text-slate-200">
      <span className={`relative h-5 w-9 rounded-full transition ${checked ? 'bg-amber-400' : 'bg-white/15'}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
      </span>
      {label}
    </button>
  )
}
function SmallBtn({ icon: Icon, children, onClick, tone = 'default', title }) {
  const tones = {
    default: 'bg-white/[0.07] text-slate-200 hover:bg-white/[0.14] ring-white/10',
    primary: 'bg-amber-400 text-slate-900 hover:bg-amber-300 ring-amber-300',
    danger: 'bg-rose-500/15 text-rose-200 hover:bg-rose-500/25 ring-rose-400/30',
  }
  return (
    <button type="button" title={title} onClick={onClick} className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 sm:py-1.5 text-[12px] font-semibold ring-1 transition ${tones[tone]}`}>
      {Icon && <Icon className="h-3.5 w-3.5" />} {children}
    </button>
  )
}

// ---- tabs ------------------------------------------------------------------------
function GeneralTab({ d, set }) {
  const g = d.general
  const upd = (patch) => set((x) => ({ ...x, general: { ...x.general, ...patch } }))
  const updShift = (i, patch) => upd({ shifts: g.shifts.map((s, k) => (k === i ? { ...s, ...patch } : s)) })
  const disp = d.display
  const updDisp = (patch) => set((x) => ({ ...x, display: { ...x.display, ...patch } }))
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Factory">
        <div className="space-y-3">
          <Field label="Factory name" hint="Shown on the front sign, banner and header.">
            <input className={inputCls} value={g.factoryName} onChange={(e) => upd({ factoryName: e.target.value.toUpperCase() })} />
          </Field>
          <Field label="Tagline">
            <input className={inputCls} value={g.tagline} onChange={(e) => upd({ tagline: e.target.value.toUpperCase() })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Target per loom / shift" hint="metres">
              <input type="number" min="0" className={inputCls} value={g.targetPerLoom} onChange={(e) => upd({ targetPerLoom: Number(e.target.value) })} />
            </Field>
            <Field label="Weekly off">
              <select className={inputCls} value={g.weeklyOff} onChange={(e) => upd({ weeklyOff: e.target.value })}>
                {['None', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((x) => (
                  <option key={x} className="bg-slate-900">{x}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      </Card>
      <Card title="Shifts">
        <div className="space-y-2">
          {g.shifts.map((s, i) => (
            <div key={s.id} className="grid grid-cols-[40px_1fr_118px_118px] items-center gap-2">
              <div className="text-center text-sm font-bold text-amber-300">{s.id}</div>
              <input className={inputCls} value={s.name} onChange={(e) => updShift(i, { name: e.target.value })} />
              <input type="time" className={`${inputCls} [color-scheme:dark]`} value={s.start} onChange={(e) => updShift(i, { start: e.target.value })} />
              <input type="time" className={`${inputCls} [color-scheme:dark]`} value={s.end} onChange={(e) => updShift(i, { end: e.target.value })} />
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Field label="Shift shown on the floor now" hint="The 3D view shows the operators of this shift.">
            <div className="flex gap-2">
              {g.shifts.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => upd({ currentShift: s.id })}
                  className={`flex-1 rounded-lg px-3 py-2 text-[13px] font-semibold ring-1 ${g.currentShift === s.id ? 'bg-amber-400 text-slate-900 ring-amber-300' : 'bg-white/[0.05] text-slate-300 ring-white/10'}`}
                >
                  {s.id} · {s.name}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </Card>
      <Card title="Default view (applied when the app opens)">
        <div className="grid grid-cols-2 gap-3">
          <Toggle checked={disp.showLabels} onChange={(v) => updDisp({ showLabels: v })} label="Loom labels" />
          <Toggle checked={disp.showFlow} onChange={(v) => updDisp({ showFlow: v })} label="Material flow arrows" />
          <Toggle checked={disp.openView} onChange={(v) => updDisp({ openView: v })} label="Open view (no roof)" />
          <select className={inputCls} value={disp.quality} onChange={(e) => updDisp({ quality: e.target.value })}>
            {['high', 'balanced', 'performance'].map((q) => (
              <option key={q} value={q} className="bg-slate-900">Quality: {q}</option>
            ))}
          </select>
        </div>
      </Card>
    </div>
  )
}

function StaffingTab({ d, set, preview }) {
  const st = d.staffing
  const upd = (patch) => set((x) => ({ ...x, staffing: { ...x.staffing, ...patch } }))
  const [pick, setPick] = useState(null)
  const ops = preview.roster
  const owner = useMemo(() => {
    const m = {}
    for (const [opId, ids] of Object.entries(st.manual || {})) for (const id of ids) m[id] = opId
    return m
  }, [st.manual])
  const toggleLoom = (id) => {
    if (!pick) return
    const cur = new Set(st.manual?.[pick] || [])
    const next = { ...(st.manual || {}) }
    if (cur.has(id)) cur.delete(id)
    else {
      // take it away from whoever had it
      for (const k of Object.keys(next)) next[k] = (next[k] || []).filter((x) => x !== id)
      cur.add(id)
    }
    next[pick] = [...cur]
    upd({ manual: next })
  }
  const copyAuto = () => {
    const manual = { ...(st.manual || {}) }
    preview.assignments.forEach((a) => (manual[a.op.id] = [...a.machines]))
    upd({ manual, mode: 'manual' })
  }
  const N = st.machinesPerOperator
  const ok = preview.uncovered.length === 0
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Card title="Looms per operator">
          <div className="flex items-end gap-4">
            <div className="text-5xl font-extrabold tabular-nums text-amber-300">{N}</div>
            <div className="pb-1.5 text-sm text-slate-300">looms per operator<br /><span className="text-slate-500">= {preview.requiredOperators} operators needed for {loomPlacements.length} looms</span></div>
          </div>
          <input type="range" min="1" max="8" value={N} onChange={(e) => upd({ machinesPerOperator: Number(e.target.value) })} className="mt-3 w-full accent-amber-400" />
          <div className="mt-2 flex gap-2">
            {[4, 5, 6].map((n) => (
              <button key={n} type="button" onClick={() => upd({ machinesPerOperator: n })} className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold ring-1 ${N === n ? 'bg-amber-400 text-slate-900 ring-amber-300' : 'bg-white/[0.05] text-slate-300 ring-white/10'}`}>
                1 : {n}
              </button>
            ))}
          </div>
        </Card>
        <Card title={`Today · ${preview.shiftInfo?.name || ''}`}>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white/[0.04] p-2"><div className="text-2xl font-bold text-white">{preview.present.length}</div><div className="text-[10px] uppercase tracking-wider text-slate-400">present</div></div>
            <div className="rounded-xl bg-white/[0.04] p-2"><div className="text-2xl font-bold text-slate-300">{preview.requiredOperators}</div><div className="text-[10px] uppercase tracking-wider text-slate-400">needed</div></div>
            <div className="rounded-xl bg-white/[0.04] p-2"><div className={`text-2xl font-bold ${ok ? 'text-emerald-300' : 'text-rose-300'}`}>{preview.uncovered.length}</div><div className="text-[10px] uppercase tracking-wider text-slate-400">looms uncovered</div></div>
          </div>
          <div className={`mt-3 flex items-start gap-2 rounded-xl p-2.5 text-[12px] ring-1 ${ok ? 'bg-emerald-500/10 text-emerald-200 ring-emerald-400/30' : 'bg-rose-500/10 text-rose-200 ring-rose-400/30'}`}>
            {ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <TriangleAlert className="h-4 w-4 shrink-0" />}
            {ok
              ? 'Every loom has an operator.'
              : st.mode === 'auto'
                ? `Need ${preview.requiredOperators - preview.present.length} more operator(s) present, or raise looms per operator.`
                : 'Some looms are not given to any present operator.'}
          </div>
          <div className="mt-3 flex gap-2">
            {['auto', 'manual'].map((m) => (
              <button key={m} type="button" onClick={() => upd({ mode: m })} className={`flex-1 rounded-lg px-3 py-2 text-[12px] font-semibold ring-1 ${st.mode === m ? 'bg-amber-400 text-slate-900 ring-amber-300' : 'bg-white/[0.05] text-slate-300 ring-white/10'}`}>
                {m === 'auto' ? 'Automatic split' : 'Pick looms myself'}
              </button>
            ))}
          </div>
          {st.mode === 'auto' && (
            <button type="button" onClick={copyAuto} className="mt-2 text-[11px] text-slate-400 underline hover:text-slate-200">Copy this split to manual and adjust it</button>
          )}
        </Card>
      </div>

      {st.mode === 'manual' && (
        <Card title="Pick looms for an operator" right={<span className="text-[11px] text-slate-500">Choose an operator, then click looms</span>}>
          <div className="flex flex-wrap gap-1.5">
            {ops.map((o) => {
              const cnt = (st.manual?.[o.id] || []).length
              const here = PRESENT.has(preview.attendanceOf(o).status)
              return (
                <button key={o.id} type="button" onClick={() => setPick(o.id)} className={`rounded-lg px-2.5 py-1.5 text-[12px] font-semibold ring-1 ${pick === o.id ? 'bg-amber-400 text-slate-900 ring-amber-300' : here ? 'bg-white/[0.06] text-slate-200 ring-white/10' : 'bg-white/[0.02] text-slate-500 ring-white/5 line-through'}`}>
                  {o.name.split(' ')[0]} · {cnt}
                </button>
              )
            })}
          </div>
          <div className="mt-3 grid grid-cols-10 gap-1.5">
            {loomPlacements.map((p) => {
              const own = owner[p.id]
              const mine = own === pick
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleLoom(p.id)}
                  disabled={!pick}
                  className={`rounded-md py-1.5 text-[11px] font-bold ring-1 transition ${mine ? 'bg-amber-400 text-slate-900 ring-amber-300' : own ? 'bg-white/[0.08] text-slate-400 ring-white/10' : 'bg-rose-500/10 text-rose-200 ring-rose-400/30'}`}
                  title={own ? `Assigned to ${ops.find((o) => o.id === own)?.name || own}` : 'Unassigned'}
                >
                  {p.id.replace('WJ-', '')}
                </button>
              )
            })}
          </div>
        </Card>
      )}

      <Card title="Who runs which looms (preview)">
        <div className="grid gap-2 md:grid-cols-2">
          {preview.assignments.map((a) => (
            <div key={a.op.id} className="flex items-center gap-2 rounded-xl bg-white/[0.03] px-2.5 py-2 ring-1 ring-white/5">
              <div className="w-32 shrink-0">
                <div className="truncate text-[13px] font-semibold text-white">{a.op.name}</div>
                <div className="text-[10px] text-slate-500">{a.op.id} · {a.machines.length} looms</div>
              </div>
              <div className="flex flex-wrap gap-1">
                {a.machines.length ? a.machines.map((id) => (
                  <span key={id} className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-200">{id.replace('WJ-', '')}</span>
                )) : <span className="text-[11px] text-slate-500">none</span>}
              </div>
            </div>
          ))}
          {preview.uncovered.length > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 px-2.5 py-2 ring-1 ring-rose-400/30">
              <div className="w-32 shrink-0 text-[13px] font-semibold text-rose-200">No operator</div>
              <div className="flex flex-wrap gap-1">
                {preview.uncovered.map((id) => (
                  <span key={id} className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-200">{id.replace('WJ-', '')}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

function OperatorsTab({ d, set }) {
  const ops = d.operators
  const upd = (id, patch) => set((x) => ({ ...x, operators: x.operators.map((o) => (o.id === id ? { ...o, ...patch } : o)) }))
  const add = (shift) => {
    set((x) => {
      const nums = x.operators.filter((o) => o.shift === shift).map((o) => Number(o.id.slice(4)) || 0)
      const id = `OP-${shift}${String(Math.max(0, ...nums) + 1).padStart(2, '0')}`
      return { ...x, operators: [...x.operators, { id, name: 'New operator', shift, skill: 'Grade B', phone: '', dailyWage: 650, active: true }] }
    })
  }
  const remove = (id) => {
    if (!window.confirm('Remove this operator from the list? Their past attendance stays in the records.')) return
    set((x) => {
      const manual = { ...(x.staffing.manual || {}) }
      delete manual[id]
      return { ...x, operators: x.operators.filter((o) => o.id !== id), staffing: { ...x.staffing, manual } }
    })
  }
  return (
    <Card
      title={`${ops.length} operators`}
      right={
        <div className="flex gap-2">
          {d.general.shifts.map((s) => (
            <SmallBtn key={s.id} icon={Plus} onClick={() => add(s.id)}>Add to shift {s.id}</SmallBtn>
          ))}
        </div>
      }
    >
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[760px] text-[13px]">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500">
              <th className="py-1.5 pr-2">ID</th>
              <th className="pr-2">Name</th>
              <th className="pr-2">Shift</th>
              <th className="pr-2">Skill</th>
              <th className="pr-2">Phone</th>
              <th className="pr-2">Daily wage ₹</th>
              <th className="pr-2">Active</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {ops.map((o) => (
              <tr key={o.id} className="border-t border-white/5">
                <td className="py-1.5 pr-2 font-mono text-[11px] text-slate-400">{o.id}</td>
                <td className="pr-2"><input className={inputCls} value={o.name} onChange={(e) => upd(o.id, { name: e.target.value })} /></td>
                <td className="pr-2 w-20">
                  <select className={inputCls} value={o.shift} onChange={(e) => upd(o.id, { shift: e.target.value })}>
                    {d.general.shifts.map((s) => <option key={s.id} value={s.id} className="bg-slate-900">{s.id}</option>)}
                  </select>
                </td>
                <td className="pr-2 w-28">
                  <select className={inputCls} value={o.skill} onChange={(e) => upd(o.id, { skill: e.target.value })}>
                    {SKILLS.map((k) => <option key={k} className="bg-slate-900">{k}</option>)}
                  </select>
                </td>
                <td className="pr-2 w-32"><input className={inputCls} value={o.phone} onChange={(e) => upd(o.id, { phone: e.target.value })} /></td>
                <td className="pr-2 w-24"><input type="number" min="0" className={inputCls} value={o.dailyWage} onChange={(e) => upd(o.id, { dailyWage: Number(e.target.value) })} /></td>
                <td className="pr-2"><Toggle checked={o.active !== false} onChange={(v) => upd(o.id, { active: v })} /></td>
                <td><button type="button" onClick={() => remove(o.id)} className="rounded-md p-1.5 text-slate-500 hover:bg-rose-500/15 hover:text-rose-300" title="Remove"><Trash2 className="h-4 w-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function shiftDate(key, days) {
  const dt = new Date(key + 'T12:00:00')
  dt.setDate(dt.getDate() + days)
  return todayKey(dt)
}

function AttendanceTab({ d, set }) {
  const [date, setDate] = useState(todayKey())
  const [view, setView] = useState('day')
  const [shiftF, setShiftF] = useState(d.general.currentShift)
  const ops = d.operators.filter((o) => o.active !== false && (shiftF === 'all' || o.shift === shiftF))
  const day = d.attendance[date] || {}
  const rec = (id) => day[id] || { status: '', in: '', out: '', ot: 0 }
  const updRec = (id, patch) =>
    set((x) => {
      const dd = { ...(x.attendance[date] || {}) }
      dd[id] = { ...{ status: 'absent', in: '', out: '', ot: 0 }, ...(dd[id] || {}), ...patch }
      return { ...x, attendance: { ...x.attendance, [date]: dd } }
    })
  const markAll = (status) => {
    const sh = (o) => d.general.shifts.find((s) => s.id === o.shift)
    set((x) => {
      const dd = { ...(x.attendance[date] || {}) }
      ops.forEach((o) => (dd[o.id] = { ...(dd[o.id] || { ot: 0, out: '' }), status, in: status === 'present' ? dd[o.id]?.in || sh(o)?.start || '' : '' }))
      return { ...x, attendance: { ...x.attendance, [date]: dd } }
    })
  }
  const counts = ATT.map((a) => ({ ...a, n: ops.filter((o) => rec(o.id).status === a.id).length }))
  const unmarked = ops.filter((o) => !rec(o.id).status).length

  // monthly view
  const month = date.slice(0, 7)
  const daysInMonth = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate()
  const dayKeys = Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)
  const monthRow = (o) => {
    let p = 0, h = 0, a = 0, l = 0, ot = 0
    const cells = dayKeys.map((k) => {
      const r = d.attendance[k]?.[o.id]
      if (r?.status === 'present') p++
      if (r?.status === 'half') h++
      if (r?.status === 'absent') a++
      if (r?.status === 'leave') l++
      ot += Number(r?.ot) || 0
      return r?.status || ''
    })
    const paidDays = p + h / 2
    return { cells, p, h, a, l, ot, paidDays, pay: paidDays * (o.dailyWage || 0) }
  }
  const exportCsv = () => {
    if (view === 'day') {
      downloadCsv(`attendance-${date}.csv`, [
        ['Date', 'Operator ID', 'Name', 'Shift', 'Status', 'In', 'Out', 'OT hours'],
        ...ops.map((o) => [date, o.id, o.name, o.shift, rec(o.id).status, rec(o.id).in, rec(o.id).out, rec(o.id).ot]),
      ])
    } else {
      downloadCsv(`attendance-${month}.csv`, [
        ['Operator ID', 'Name', 'Shift', ...dayKeys.map((k) => k.slice(8)), 'Present', 'Half', 'Absent', 'Leave', 'OT hours', 'Paid days', 'Daily wage', 'Payable'],
        ...ops.map((o) => {
          const r = monthRow(o)
          return [o.id, o.name, o.shift, ...r.cells.map((c) => ATT.find((x) => x.id === c)?.short || ''), r.p, r.h, r.a, r.l, r.ot, r.paidDays, o.dailyWage, r.pay]
        }),
      ])
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-xl bg-white/[0.05] p-1 ring-1 ring-white/10">
          <button type="button" onClick={() => setDate(shiftDate(date, view === 'day' ? -1 : -30))} className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10"><ChevronLeft className="h-4 w-4" /></button>
          <input type="date" className="bg-transparent px-1 text-[13px] text-white outline-none [color-scheme:dark]" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          <button type="button" onClick={() => setDate(shiftDate(date, view === 'day' ? 1 : 30))} className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <SmallBtn onClick={() => setDate(todayKey())}>Today</SmallBtn>
        <select className={`${inputCls.replace("w-full ", "")} w-auto`} value={shiftF} onChange={(e) => setShiftF(e.target.value)}>
          {d.general.shifts.map((s) => <option key={s.id} value={s.id} className="bg-slate-900">Shift {s.id} · {s.name}</option>)}
          <option value="all" className="bg-slate-900">All shifts</option>
        </select>
        <div className="flex rounded-xl bg-white/[0.05] p-1 ring-1 ring-white/10">
          {['day', 'month'].map((v) => (
            <button key={v} type="button" onClick={() => setView(v)} className={`rounded-lg px-3 py-1 text-[12px] font-semibold ${view === v ? 'bg-amber-400 text-slate-900' : 'text-slate-300'}`}>{v === 'day' ? 'Day' : 'Month & pay'}</button>
          ))}
        </div>
        <div className="flex gap-2 sm:ml-auto">
          {view === 'day' && <SmallBtn icon={CheckCircle2} onClick={() => markAll('present')}>Mark all present</SmallBtn>}
          <SmallBtn icon={FileSpreadsheet} onClick={exportCsv}>Export CSV</SmallBtn>
        </div>
      </div>

      {view === 'day' ? (
        <>
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {counts.map((c) => (
              <div key={c.id} className="rounded-xl bg-white/[0.04] p-2 text-center ring-1 ring-white/5">
                <div className="text-xl font-bold text-white">{c.n}</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400">{c.label}</div>
              </div>
            ))}
            <div className="rounded-xl bg-white/[0.04] p-2 text-center ring-1 ring-white/5">
              <div className={`text-xl font-bold ${unmarked ? 'text-amber-300' : 'text-slate-500'}`}>{unmarked}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">Not marked</div>
            </div>
          </div>
          {/* phones: one card per operator */}
          <div className="space-y-2 md:hidden">
            {ops.map((o) => {
              const r = rec(o.id)
              return (
                <div key={o.id} className="rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-semibold text-white">{o.name}</div>
                      <div className="font-mono text-[10px] text-slate-500">{o.id} · Shift {o.shift}</div>
                    </div>
                    <div className="flex gap-1">
                      {ATT.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          title={a.label}
                          aria-label={a.label}
                          onClick={() => updRec(o.id, { status: a.id, in: a.id === 'present' || a.id === 'half' ? r.in || d.general.shifts.find((s) => s.id === o.shift)?.start || '' : '' })}
                          className={`h-9 w-9 rounded-lg text-[13px] font-bold ring-1 ring-white/10 ${r.status === a.id ? a.on : 'bg-white/[0.05] text-slate-400'}`}
                        >
                          {a.short}
                        </button>
                      ))}
                    </div>
                  </div>
                  {(r.status === 'present' || r.status === 'half') && (
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <label className="text-[10px] uppercase tracking-wider text-slate-500">In<input type="time" className={`${inputCls} mt-0.5 [color-scheme:dark]`} value={r.in || ''} onChange={(e) => updRec(o.id, { in: e.target.value })} /></label>
                      <label className="text-[10px] uppercase tracking-wider text-slate-500">Out<input type="time" className={`${inputCls} mt-0.5 [color-scheme:dark]`} value={r.out || ''} onChange={(e) => updRec(o.id, { out: e.target.value })} /></label>
                      <label className="text-[10px] uppercase tracking-wider text-slate-500">OT (h)<input type="number" inputMode="decimal" min="0" step="0.5" className={`${inputCls} mt-0.5`} value={r.ot || 0} onChange={(e) => updRec(o.id, { ot: Number(e.target.value) })} /></label>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <Card className="hidden md:block">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[720px] text-[13px]">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500">
                    <th className="py-1.5 pr-2">Operator</th>
                    <th className="pr-2">Shift</th>
                    <th className="pr-2">Status</th>
                    <th className="pr-2">In</th>
                    <th className="pr-2">Out</th>
                    <th className="pr-2">OT (h)</th>
                  </tr>
                </thead>
                <tbody>
                  {ops.map((o) => {
                    const r = rec(o.id)
                    return (
                      <tr key={o.id} className="border-t border-white/5">
                        <td className="py-1.5 pr-2">
                          <div className="font-semibold text-white">{o.name}</div>
                          <div className="font-mono text-[10px] text-slate-500">{o.id}</div>
                        </td>
                        <td className="pr-2 text-slate-300">{o.shift}</td>
                        <td className="pr-2">
                          <div className="flex gap-1">
                            {ATT.map((a) => (
                              <button
                                key={a.id}
                                type="button"
                                title={a.label}
                                onClick={() => updRec(o.id, { status: a.id, in: a.id === 'present' || a.id === 'half' ? r.in || d.general.shifts.find((s) => s.id === o.shift)?.start || '' : '' })}
                                className={`h-7 w-7 rounded-md text-[12px] font-bold ring-1 ring-white/10 ${r.status === a.id ? a.on : 'bg-white/[0.05] text-slate-400 hover:bg-white/10'}`}
                              >
                                {a.short}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="pr-2 w-28"><input type="time" className={`${inputCls} [color-scheme:dark]`} value={r.in || ''} onChange={(e) => updRec(o.id, { in: e.target.value })} /></td>
                        <td className="pr-2 w-28"><input type="time" className={`${inputCls} [color-scheme:dark]`} value={r.out || ''} onChange={(e) => updRec(o.id, { out: e.target.value })} /></td>
                        <td className="pr-2 w-20"><input type="number" min="0" step="0.5" className={inputCls} value={r.ot || 0} onChange={(e) => updRec(o.id, { ot: Number(e.target.value) })} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : (
        <Card title={new Date(month + '-01T12:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="text-[11px]">
              <thead>
                <tr className="text-slate-500">
                  <th className="sticky left-0 bg-[#111826] py-1 pr-2 text-left">Operator</th>
                  {dayKeys.map((k) => <th key={k} className="w-6 text-center font-medium">{Number(k.slice(8))}</th>)}
                  <th className="px-1.5">P</th><th className="px-1.5">H</th><th className="px-1.5">A</th><th className="px-1.5">L</th><th className="px-1.5">OT</th>
                  <th className="px-1.5 text-right">Paid days</th><th className="px-1.5 text-right">Payable</th>
                </tr>
              </thead>
              <tbody>
                {ops.map((o) => {
                  const r = monthRow(o)
                  return (
                    <tr key={o.id} className="border-t border-white/5">
                      <td className="sticky left-0 whitespace-nowrap bg-[#111826] py-1 pr-2 font-semibold text-white">{o.name}</td>
                      {r.cells.map((c, i) => {
                        const a = ATT.find((x) => x.id === c)
                        return (
                          <td key={i} className="p-[1px] text-center">
                            <span className={`block h-5 w-5 rounded text-[10px] font-bold leading-5 ${a ? a.on : 'bg-white/[0.04] text-slate-600'}`}>{a ? a.short : '·'}</span>
                          </td>
                        )
                      })}
                      <td className="px-1.5 text-center text-emerald-300">{r.p}</td>
                      <td className="px-1.5 text-center text-sky-300">{r.h}</td>
                      <td className="px-1.5 text-center text-rose-300">{r.a}</td>
                      <td className="px-1.5 text-center text-amber-300">{r.l}</td>
                      <td className="px-1.5 text-center text-slate-300">{r.ot}</td>
                      <td className="px-1.5 text-right text-white">{r.paidDays}</td>
                      <td className="whitespace-nowrap px-1.5 text-right font-semibold text-white">{inr(r.pay)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">Payable = paid days × daily wage (half day = ½). Overtime is listed but not priced.</div>
        </Card>
      )}
    </div>
  )
}

function MachinesTab({ d, set, preview }) {
  const machines = useFactoryStore((s) => s.machines)
  const live = useMemo(() => Object.fromEntries(machines.map((m) => [m.id, m])), [machines])
  const upd = (id, patch) => set((x) => ({ ...x, machines: { ...x.machines, [id]: { ...(x.machines[id] || {}), ...patch } } }))
  const setAll = (patch) => set((x) => ({ ...x, machines: Object.fromEntries(Object.entries(x.machines).map(([k, v]) => [k, { ...v, ...patch }])) }))
  return (
    <Card
      title={`${loomPlacements.length} looms`}
      right={
        <div className="flex flex-wrap justify-end gap-2">
          <SmallBtn onClick={() => setAll({ status: 'auto' })}>All status → live</SmallBtn>
          <SmallBtn onClick={() => setAll({ target: '' })}>All targets → default</SmallBtn>
        </div>
      }
    >
      {/* phones: one card per loom */}
      <div className="space-y-2 md:hidden">
        {SNAKE_ORDER.slice().sort().map((id) => {
          const o = d.machines[id] || {}
          const m = live[id]
          const st = m && STATUS_STYLES[m.status]
          const op = preview.machineOperator[id]
          return (
            <div key={id} className="rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/[0.06]">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-[14px] font-bold text-white">{id}</span>
                {st && <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${st.bg} ${st.text}`}>{st.label}</span>}
                <span className="ml-auto truncate text-[11px]">{op ? <span className="text-slate-300">{op.name}</span> : <span className="text-rose-300">no operator</span>}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[10px] uppercase tracking-wider text-slate-500">Status
                  <select className={`${inputCls} mt-0.5`} value={o.status || 'auto'} onChange={(e) => upd(id, { status: e.target.value })}>
                    <option value="auto" className="bg-slate-900">Live (EMS)</option>
                    <option value="running" className="bg-slate-900">Running</option>
                    <option value="idle" className="bg-slate-900">Idle</option>
                    <option value="maintenance" className="bg-slate-900">Maintenance</option>
                  </select>
                </label>
                <label className="text-[10px] uppercase tracking-wider text-slate-500">Target m
                  <input type="number" inputMode="numeric" min="0" className={`${inputCls} mt-0.5`} value={o.target || ''} placeholder={String(d.general.targetPerLoom)} onChange={(e) => upd(id, { target: e.target.value })} />
                </label>
                <label className="col-span-2 text-[10px] uppercase tracking-wider text-slate-500">Fabric
                  <select className={`${inputCls} mt-0.5`} value={o.fabric || ''} onChange={(e) => upd(id, { fabric: e.target.value })}>
                    <option value="" className="bg-slate-900">{m ? `Live: ${m.baseFabric || m.fabric}` : 'Live'}</option>
                    {FABRICS.map((f) => <option key={f} className="bg-slate-900">{f}</option>)}
                  </select>
                </label>
              </div>
            </div>
          )
        })}
      </div>
      <div className="hidden overflow-x-auto scrollbar-thin md:block">
        <table className="w-full min-w-[760px] text-[13px]">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500">
              <th className="py-1.5 pr-2">Loom</th>
              <th className="pr-2">Now</th>
              <th className="pr-2">Status setting</th>
              <th className="pr-2">Fabric</th>
              <th className="pr-2">Target m (blank = {num(d.general.targetPerLoom)})</th>
              <th className="pr-2">Operator</th>
            </tr>
          </thead>
          <tbody>
            {SNAKE_ORDER.slice().sort().map((id) => {
              const o = d.machines[id] || {}
              const m = live[id]
              const st = m && STATUS_STYLES[m.status]
              const op = preview.machineOperator[id]
              return (
                <tr key={id} className="border-t border-white/5">
                  <td className="py-1.5 pr-2 font-bold text-white">{id}</td>
                  <td className="pr-2">{st && <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${st.bg} ${st.text}`}>{st.label}</span>}</td>
                  <td className="pr-2 w-40">
                    <select className={inputCls} value={o.status || 'auto'} onChange={(e) => upd(id, { status: e.target.value })}>
                      <option value="auto" className="bg-slate-900">Live (from EMS)</option>
                      <option value="running" className="bg-slate-900">Running</option>
                      <option value="idle" className="bg-slate-900">Idle</option>
                      <option value="maintenance" className="bg-slate-900">Maintenance</option>
                    </select>
                  </td>
                  <td className="pr-2 w-52">
                    <select className={inputCls} value={o.fabric || ''} onChange={(e) => upd(id, { fabric: e.target.value })}>
                      <option value="" className="bg-slate-900">{m ? `Live: ${m.baseFabric || m.fabric}` : 'Live'}</option>
                      {FABRICS.map((f) => <option key={f} className="bg-slate-900">{f}</option>)}
                    </select>
                  </td>
                  <td className="pr-2 w-32"><input type="number" min="0" className={inputCls} value={o.target || ''} placeholder={String(d.general.targetPerLoom)} onChange={(e) => upd(id, { target: e.target.value })} /></td>
                  <td className="pr-2 text-[12px]">{op ? <span className="text-slate-200">{op.name}</span> : <span className="text-rose-300">none</span>}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ---- modal ----------------------------------------------------------------------------
export default function SettingsModal() {
  const open = useFactoryStore((s) => s.settingsOpen)
  const tab = useFactoryStore((s) => s.settingsTab)
  const saved = useFactoryStore((s) => s.settings)
  const [draft, setDraft] = useState(null)
  const [status, setStatus] = useState(null) // {type, text}
  const fileRef = useRef()

  // fresh draft every time the panel opens (with the current view toggles)
  useEffect(() => {
    if (open && saved) {
      const st = useFactoryStore.getState()
      const d = clone(saved)
      d.display = { showLabels: st.showLabels, showFlow: st.showFlow, openView: st.openView, quality: st.quality }
      setDraft(d)
      setStatus(null)
    }
    if (!open) setDraft(null)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const preview = useMemo(() => (draft ? computeStaffing(draft) : null), [draft])
  const dirty = useMemo(() => !!(draft && saved && comparable(draft) !== comparable(saved)), [draft, saved])

  if (!open || !draft || !preview) return null
  return <ModalBody {...{ draft, setDraft, saved, preview, dirty, status, setStatus, fileRef, tab }} />
}

function ModalBody({ draft, setDraft, saved, preview, dirty, status, setStatus, fileRef, tab }) {
  const close = () => {
    if (dirty && !window.confirm('Discard unsaved changes?')) return
    useFactoryStore.getState().setSettingsOpen(false)
  }
  const setTab = (t) => useFactoryStore.setState({ settingsTab: t })
  const save = async () => {
    try {
      const out = await saveSettings(draft)
      useFactoryStore.getState().applySettings(out, { display: true })
      setDraft(clone(out))
      setStatus({ type: 'ok', text: `Saved at ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` })
    } catch (e) {
      setStatus({ type: 'err', text: e.message })
    }
  }
  const onImport = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      setDraft(await readSettingsFile(f))
      setStatus({ type: 'ok', text: 'File loaded — press Save to keep it.' })
    } catch {
      setStatus({ type: 'err', text: 'That file is not a valid settings file.' })
    }
  }
  const onReset = () => {
    if (!window.confirm('Reset all settings, operators and attendance to the demo defaults?')) return
    setDraft(resetSettings())
    setStatus({ type: 'ok', text: 'Defaults loaded — press Save to keep them.' })
  }

  // Esc closes, Ctrl/Cmd+S saves
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') close()
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const T = { general: GeneralTab, staffing: StaffingTab, operators: OperatorsTab, attendance: AttendanceTab, machines: MachinesTab }[tab] || GeneralTab

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm md:p-6" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="glass fade-in flex h-full max-h-[880px] w-full max-w-6xl flex-col overflow-hidden rounded-none md:rounded-3xl" style={{ background: 'linear-gradient(180deg, rgba(17,24,38,0.98), rgba(10,15,24,0.99))' }}>
        {/* header */}
        <div className="safe-top flex items-center gap-3 border-b border-white/[0.07] px-4 py-3 md:px-5 md:py-3.5">
          <Settings2 className="h-5 w-5 text-amber-300" />
          <div className="text-lg font-extrabold text-white">Settings</div>
          {dirty ? (
            <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-200">Unsaved changes</span>
          ) : (
            saved?.savedAt && <span className="hidden text-[11px] text-slate-500 sm:inline">Last saved {new Date(saved.savedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
          )}
          <button type="button" onClick={close} aria-label="Close settings" className="ml-auto flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {/* tabs */}
          <div className="no-scrollbar flex shrink-0 gap-1 overflow-x-auto border-b border-white/[0.07] p-2 md:w-52 md:flex-col md:border-b-0 md:border-r">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                ref={(el) => tab === t.id && el?.scrollIntoView?.({ block: 'nearest', inline: 'center' })}
                onClick={() => setTab(t.id)}
                className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] font-semibold ${tab === t.id ? 'bg-amber-400/15 text-amber-100 ring-1 ring-amber-300/40' : 'text-slate-300 hover:bg-white/[0.06]'}`}
              >
                <t.icon className={`h-4 w-4 ${tab === t.id ? 'text-amber-300' : 'text-slate-500'}`} />
                {t.label}
                {t.id === 'staffing' && preview.uncovered.length > 0 && <span className="ml-auto h-2 w-2 rounded-full bg-rose-400" />}
              </button>
            ))}
          </div>
          {/* content */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 scrollbar-thin sm:p-4 md:p-5">
            <T d={draft} set={setDraft} preview={preview} />
          </div>
        </div>
        {/* footer */}
        <div className="safe-bottom flex flex-wrap items-center gap-2 border-t border-white/[0.07] px-3 py-2.5 md:px-5 md:py-3">
          <SmallBtn icon={Download} onClick={() => exportSettingsFile(draft)} title="Download a backup of all settings">Export</SmallBtn>
          <SmallBtn icon={Upload} onClick={() => fileRef.current?.click()} title="Load settings from a backup file">Import</SmallBtn>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onImport} />
          <SmallBtn icon={RotateCcw} tone="danger" onClick={onReset}>Reset</SmallBtn>
          {status && <span className={`text-[12px] ${status.type === 'ok' ? 'text-emerald-300' : 'text-rose-300'}`}>{status.text}</span>}
          <div className="flex w-full gap-2 sm:ml-auto sm:w-auto [&>*]:flex-1 sm:[&>*]:flex-none">
            <SmallBtn onClick={close}>Close</SmallBtn>
            <SmallBtn icon={Save} tone="primary" onClick={save}>Save settings</SmallBtn>
          </div>
        </div>
      </div>
    </div>
  )
}
