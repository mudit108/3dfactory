import { useEffect, useMemo, useRef, useState } from 'react'
import {
  X, Cog, User, Package, Boxes, Calculator, Briefcase, Truck, DoorOpen, ScanSearch, Gauge, Droplets, Timer, Zap,
  Layers, Activity, Wrench, TriangleAlert, CircleCheck, HardHat, Crosshair, IndianRupee, FileText, TrendingUp, Users,
  Wallet, Landmark, Receipt, MapPin, Clock, Presentation, ShieldCheck,
} from 'lucide-react'
import { useFactoryStore } from '../hooks/useFactoryStore'
import { focusOnKey } from '../scene/focus'
import { inr, inrShort, num, hhmm, STATUS_STYLES } from './format'
import { RadialGauge, BarChart, LineChart, Donut, ProgressBar, StackedBar } from './charts'
import { useSummary } from './Hud'

// ---- shared bits ---------------------------------------------------------------
function Row({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/5 py-1.5 text-[13px] last:border-0">
      <span className="text-slate-400">{label}</span>
      <span className={`text-right font-semibold ${accent || 'text-slate-100'}`}>{value}</span>
    </div>
  )
}

function Tile({ icon: Icon, label, value, unit, color = 'text-white', tint = 'from-white/[0.06]' }) {
  return (
    <div className={`rounded-xl bg-gradient-to-br ${tint} to-transparent p-3 ring-1 ring-white/[0.07]`}>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {Icon && <Icon className="h-3.5 w-3.5" />} {label}
      </div>
      <div className={`mt-1 text-[19px] font-bold tabular-nums leading-tight ${color}`}>
        {value}
        {unit && <span className="ml-1 text-xs font-medium text-slate-400">{unit}</span>}
      </div>
    </div>
  )
}

function Section({ title, children, right }) {
  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{title}</div>
        {right}
      </div>
      {children}
    </div>
  )
}

function StatusChip({ status }) {
  const s = STATUS_STYLES[status]
  if (!s) return null
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wider ring-1 ${s.bg} ${s.text} ${s.ring}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${status !== 'idle' ? 'pulse-dot' : ''}`} /> {s.label}
    </span>
  )
}

function Header({ icon: Icon, kicker, title, right, color = '#fbbf24' }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: `${color}22`, boxShadow: `inset 0 0 0 1px ${color}55` }}>
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{kicker}</div>
        <div className="truncate text-[22px] font-extrabold leading-tight text-white">{title}</div>
      </div>
      {right}
    </div>
  )
}

function ActionButton({ icon: Icon, children, onClick }) {
  return (
    <button onClick={onClick} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/[0.06] px-3 py-2 text-xs font-semibold text-slate-200 ring-1 ring-white/10 transition hover:bg-white/[0.12]">
      <Icon className="h-4 w-4" /> {children}
    </button>
  )
}

const selectWorker = (id) => {
  const st = useFactoryStore.getState()
  st.select({ type: 'worker', id, key: `worker:${id}` })
  setTimeout(() => focusOnKey(`worker:${id}`), 0)
}
const selectMachine = (id) => {
  const st = useFactoryStore.getState()
  st.select({ type: 'machine', id, key: `machine:${id}` })
  setTimeout(() => focusOnKey(`machine:${id}`), 0)
}

// ---- panels ------------------------------------------------------------------------
const fmtEta = (h) => {
  if (h === undefined || h === null || !Number.isFinite(h)) return '-'
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`
  if (h < 48) return `${Math.floor(h)} h ${Math.round((h % 1) * 60)} m`
  return `${(h / 24).toFixed(1)} days`
}
const fmtClock = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '-')
const fmtHM = (min) => {
  if (min === undefined || min === null || !Number.isFinite(min)) return '-'
  const h = Math.floor(min / 60)
  const m = Math.floor(min % 60)
  return `${h}:${String(m).padStart(2, '0')}`
}

function NotTracked({ label, icon: Icon }) {
  return (
    <div className="rounded-xl bg-white/[0.02] p-3 ring-1 ring-dashed ring-white/10">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {Icon && <Icon className="h-3.5 w-3.5" />} {label}
      </div>
      <div className="mt-1 text-[13px] font-semibold text-slate-500">Not tracked</div>
    </div>
  )
}

/** Machine panel when connected to the real EMS: only EMS numbers; everything else says "Not tracked". */
function LiveMachinePanel({ m, op }) {
  const st = STATUS_STYLES[m.status]
  const color = m.emsColor || st.hex
  const stopped = m.status !== 'running'
  const beamOver = m.beamMeters !== undefined && m.beamMeters < 0
  return (
    <>
      <Header icon={Cog} kicker="Waterjet Loom · live from EMS" title={m.id} color={color} right={<StatusChip status={m.status} />} />
      <div className="mt-4 flex items-center gap-4 rounded-2xl bg-white/[0.03] p-3 ring-1 ring-white/5">
        <RadialGauge value={m.efficiency} label={`${m.efficiency}%`} sub="Efficiency" color={color} size={112} />
        <div className="flex-1 space-y-2">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Production today</div>
            <div className="text-2xl font-bold tabular-nums text-white">
              {m.production?.toLocaleString('en-IN', { maximumFractionDigits: 2 })} <span className="text-sm text-slate-400">m</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-400">
            Operator{' '}
            {op ? (
              <button className="font-semibold text-amber-300 hover:underline" onClick={() => selectWorker(op.id)}>
                {op.name} ({op.id})
              </button>
            ) : (
              <button className="font-semibold text-rose-300 hover:underline" onClick={() => useFactoryStore.getState().setSettingsOpen(true, 'staffing')}>
                none assigned — fix in Settings
              </button>
            )}
          </div>
        </div>
      </div>
      {(m.alert || m.beamLow || m.shortPick) && (
        <div className="mt-3 space-y-1.5">
          {m.alert === 'red' && <div className="flex gap-2 rounded-xl bg-rose-500/10 p-2.5 text-[12px] text-rose-200 ring-1 ring-rose-400/30"><TriangleAlert className="h-4 w-4 shrink-0" /> EMS red alert (Manual)</div>}
          {m.alert === 'blue' && <div className="flex gap-2 rounded-xl bg-sky-500/10 p-2.5 text-[12px] text-sky-200 ring-1 ring-sky-400/30"><TriangleAlert className="h-4 w-4 shrink-0" /> EMS blue alert (Filler)</div>}
          {m.beamLow && <div className="flex gap-2 rounded-xl bg-amber-500/10 p-2.5 text-[12px] text-amber-200 ring-1 ring-amber-400/30"><Layers className="h-4 w-4 shrink-0" /> Beam alert — {beamOver ? 'beam is finished' : 'beam almost finished'} (Unload)</div>}
          {m.shortPick && <div className="flex gap-2 rounded-xl bg-amber-500/10 p-2.5 text-[12px] text-amber-200 ring-1 ring-amber-400/30"><TriangleAlert className="h-4 w-4 shrink-0" /> Short pick alert</div>}
        </div>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Tile icon={Gauge} label="RPM" value={m.rpm} color="text-sky-300" />
        <Tile icon={Activity} label="Pick" value={m.pick ?? '-'} color="text-violet-300" />
        <Tile icon={TriangleAlert} label="Stops" value={m.stopCount ?? '-'} color="text-amber-300" />
        <Tile icon={Timer} label={stopped ? 'Stopped for' : 'Running for'} value={fmtHM(m.stateMinutes)} unit="h:m" color={stopped ? 'text-rose-300' : 'text-emerald-300'} />
        <NotTracked icon={Droplets} label="Water pressure" />
        <NotTracked icon={Zap} label="Power" />
      </div>
      <Section title="Hourly output">
        <div className="rounded-xl bg-white/[0.02] p-3 text-[12px] text-slate-500 ring-1 ring-dashed ring-white/10">Not tracked on the EMS live dashboard.</div>
      </Section>
      <Section title="Machine details (EMS)">
        <div className="rounded-xl bg-white/[0.03] px-3 py-1 ring-1 ring-white/5">
          <Row label="Fabric / quality" value={m.fabric} />
          <Row label="Reed width" value={`${m.reedWidthCm} cm`} />
          <Row label="Pick" value={m.pick ?? '-'} />
          <Row label="Stops today" value={m.stopCount ?? '-'} />
          <Row label="Beam left" value={m.beamMeters === undefined ? '-' : `${m.beamMeters.toLocaleString('en-IN', { maximumFractionDigits: 2 })} m`} accent={m.beamLow ? 'text-amber-300' : undefined} />
          <Row label="Last EMS update" value={m.lastUpdate ?? '-'} />
          <Row label="Warp / weft yarn" value="Not tracked" accent="text-slate-500" />
          <Row label="Service dates" value="Not tracked" accent="text-slate-500" />
        </div>
        {m.beamMeters !== undefined && (
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-[11px] text-slate-400">
              <span>Warp beam left{m.beamNo ? ` (beam ${m.beamNo})` : ''}</span>
              <span className="font-semibold text-slate-200">
                {Math.max(0, m.beamMeters).toLocaleString('en-IN', { maximumFractionDigits: 0 })}{m.beamTotal ? ` / ${m.beamTotal.toLocaleString('en-IN')}` : ''} m
              </span>
            </div>
            <ProgressBar value={m.warpBeamRemaining ?? 0} color={m.beamLow ? '#fb7185' : '#60a5fa'} />
            {!m.beamTotal && <div className="mt-1 text-[10px] text-slate-500">Full beam length not found in the EMS for this loom; bar assumes 6,000 m.</div>}
          </div>
        )}
        <div className="mt-3 rounded-xl bg-white/[0.03] px-3 py-1 ring-1 ring-white/5">
          <Row label="Beam finishes in" value={m.etaHours === undefined ? (stopped ? 'Loom stopped' : '-') : fmtEta(m.etaHours)} accent={m.beamLow ? 'text-amber-300' : 'text-sky-300'} />
          <Row label="Expected at" value={fmtClock(m.etaAt)} />
          <Row label="Beam loaded" value={m.beamLoadedAt ? fmtClock(m.beamLoadedAt) : '-'} />
          <Row label="Beam alert at" value={m.beamAlertM ? `${m.beamAlertM} m left` : '-'} />
          <Row label="Making now" value={m.rateMph ? `${m.rateMph} m/h (${m.rateSource === 'observed' ? 'measured' : 'from rpm, pick & efficiency'})` : '-'} />
        </div>
      </Section>
      <div className="mt-4 flex gap-2">
        <ActionButton icon={Crosshair} onClick={() => focusOnKey(`machine:${m.id}`)}>Focus</ActionButton>
        {op && <ActionButton icon={User} onClick={() => selectWorker(op.id)}>Operator</ActionButton>}
      </div>
    </>
  )
}

function MachinePanel({ id }) {
  const m = useFactoryStore((s) => s.machines.find((x) => x.id === id))
  const op = useFactoryStore((s) => s.staffing?.machineOperator[id])
  if (!m) return null
  if (m.live) return <LiveMachinePanel m={m} op={op} />
  const st = STATUS_STYLES[m.status]
  return (
    <>
      <Header icon={Cog} kicker="Waterjet Loom" title={m.id} color={st.hex} right={<StatusChip status={m.status} />} />
      <div className="mt-4 flex items-center gap-4 rounded-2xl bg-white/[0.03] p-3 ring-1 ring-white/5">
        <RadialGauge value={m.efficiency} label={`${m.efficiency}%`} sub="Efficiency" color={st.hex} size={112} />
        <div className="flex-1 space-y-2">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Production today</div>
            <div className="text-2xl font-bold tabular-nums text-white">
              {num(m.production)} <span className="text-sm text-slate-400">m</span>
            </div>
          </div>
          <div>
            <div className="mb-1 flex justify-between text-[10px] text-slate-400">
              <span>Shift target</span>
              <span>{Math.round((m.production / m.targetToday) * 100)}% of {num(m.targetToday)} m</span>
            </div>
            <ProgressBar value={m.production} max={m.targetToday} color={st.hex} />
          </div>
          <div className="text-[11px] text-slate-400">
            Operator{' '}
            {op ? (
              <button className="font-semibold text-amber-300 hover:underline" onClick={() => selectWorker(op.id)}>
                {op.name} ({op.id})
              </button>
            ) : (
              <button className="font-semibold text-rose-300 hover:underline" onClick={() => useFactoryStore.getState().setSettingsOpen(true, 'staffing')}>
                none assigned — fix in Settings
              </button>
            )}
          </div>
        </div>
      </div>
      {m.maintenanceNote && (
        <div className={`mt-3 flex gap-2 rounded-xl p-3 text-[12px] ring-1 ${m.status === 'maintenance' ? 'bg-rose-500/10 text-rose-200 ring-rose-400/30' : 'bg-amber-500/10 text-amber-200 ring-amber-400/30'}`}>
          {m.status === 'maintenance' ? <Wrench className="h-4 w-4 shrink-0" /> : <TriangleAlert className="h-4 w-4 shrink-0" />}
          {m.maintenanceNote}
        </div>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Tile icon={Gauge} label="RPM" value={m.rpm} color="text-sky-300" />
        <Tile icon={Droplets} label="Water pressure" value={m.waterPressure} unit="bar" color="text-cyan-300" />
        <Tile icon={Timer} label="Runtime" value={hhmm(m.runtimeMinutes).replace(' hrs', '')} unit="hrs" />
        <Tile icon={Zap} label="Power" value={m.power.toFixed(1)} unit="kW" color="text-yellow-300" />
      </div>
      <Section title="Hourly output (m)">
        <BarChart data={m.hourly.map((v, i) => ({ label: `${6 + i}h`, value: v }))} color={st.hex} />
      </Section>
      <Section title="Machine details">
        <div className="rounded-xl bg-white/[0.03] px-3 py-1 ring-1 ring-white/5">
          <Row label="Fabric" value={m.fabric} />
          <Row label="Model / reed width" value={`${m.model.split(' / ')[0]} · ${m.reedWidthCm} cm`} />
          <Row label="Warp / weft" value={`${m.warpYarn.split(' ')[0]} ${m.warpYarn.split(' ')[1]} / ${m.weftYarn.split(' ')[1]}`} />
          <Row label="Pick density" value={`${m.picksPerCm} picks/cm`} />
          <Row label="Stops today" value={`${m.stops.warp} warp · ${m.stops.weft} weft · ${m.stops.other} other`} />
          <Row label="Last service" value={m.lastService} />
          <Row label="Next service" value={m.nextService} accent={m.status === 'maintenance' ? 'text-rose-300' : undefined} />
        </div>
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-[11px] text-slate-400">
            <span>Warp beam remaining</span>
            <span className="font-semibold text-slate-200">{m.warpBeamRemaining}%</span>
          </div>
          <ProgressBar value={m.warpBeamRemaining} color={m.warpBeamRemaining < 15 ? '#fb7185' : '#60a5fa'} />
        </div>
      </Section>
      <div className="mt-4 flex gap-2">
        <ActionButton icon={Crosshair} onClick={() => focusOnKey(`machine:${m.id}`)}>Focus</ActionButton>
        {op && <ActionButton icon={User} onClick={() => selectWorker(op.id)}>Operator</ActionButton>}
      </div>
    </>
  )
}

function shiftHours(start) {
  const [h, m] = start.split(':').map(Number)
  const now = new Date()
  let mins = now.getHours() * 60 + now.getMinutes() - (h * 60 + m)
  if (mins < 0) mins += 24 * 60
  return hhmm(Math.min(mins, 12 * 60))
}

const ATT_STYLE = {
  present: 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/30',
  half: 'bg-sky-500/15 text-sky-200 ring-sky-400/30',
  absent: 'bg-rose-500/15 text-rose-200 ring-rose-400/30',
  leave: 'bg-amber-500/15 text-amber-200 ring-amber-400/30',
}
const ATT_NAME = { present: 'Present', half: 'Half day', absent: 'Absent', leave: 'On leave' }

function OperatorPanel({ id }) {
  const settings = useFactoryStore((s) => s.settings)
  const staffing = useFactoryStore((s) => s.staffing)
  const machines = useFactoryStore((s) => s.machines)
  const op = settings?.operators.find((o) => o.id === id)
  if (!op || !staffing) return null
  const att = staffing.attendanceOf(op)
  const looms = staffing.assignments.find((a) => a.op.id === id)?.machines || []
  const shift = settings.general.shifts.find((x) => x.id === op.shift)
  const month = staffing.date.slice(0, 7)
  let full = 0
  let half = 0
  let leave = 0
  for (const [d, day] of Object.entries(settings.attendance)) {
    if (!d.startsWith(month)) continue
    const st = day[id]?.status
    if (st === 'present') full++
    if (st === 'half') half++
    if (st === 'leave') leave++
  }
  const days = full + half / 2
  const out = machines.filter((m) => looms.includes(m.id))
  const prod = out.reduce((a, m) => a + m.production, 0)
  const initials = op.name.split(' ').map((p) => p[0]).join('')
  return (
    <>
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-600 text-lg font-extrabold text-slate-900">{initials}</div>
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Loom operator · {op.id}</div>
          <div className="truncate text-xl font-extrabold text-white">{op.name}</div>
          <div className="text-[13px] text-amber-200">{shift?.name} · {shift?.start}–{shift?.end}</div>
        </div>
      </div>
      <div className={`mt-3 flex items-center justify-between rounded-xl px-3 py-2 text-[12px] font-semibold ring-1 ${ATT_STYLE[att.status]}`}>
        <span>Today: {ATT_NAME[att.status]}</span>
        <span>{att.in ? `In ${att.in}` : ''}{att.out ? ` · Out ${att.out}` : ''}{att.ot ? ` · OT ${att.ot} h` : ''}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Tile icon={Cog} label="Looms tended" value={looms.length} unit={`/ ${staffing.perOperator} max`} color="text-emerald-300" />
        <Tile icon={Layers} label="Output today" value={num(prod)} unit="m" color="text-sky-300" />
        <Tile icon={Clock} label="Days this month" value={days} unit={leave ? `· ${leave} leave` : ''} />
        <Tile icon={IndianRupee} label="Earned (month)" value={inrShort(days * (op.dailyWage || 0))} color="text-amber-300" />
      </div>
      <Section title="Assigned looms" right={<span className="text-[10px] text-slate-500">click a loom</span>}>
        {out.length ? (
          <div className="grid grid-cols-5 gap-1.5">
            {out.map((m) => {
              const st = STATUS_STYLES[m.status]
              return (
                <button key={m.id} onClick={() => selectMachine(m.id)} className={`rounded-lg py-1.5 text-center ring-1 transition hover:scale-105 ${st.bg} ${st.ring}`}>
                  <div className={`text-[11px] font-bold ${st.text}`}>{m.id.replace('WJ-', '')}</div>
                  <div className="text-[9px] text-slate-400">{m.status === 'running' ? `${m.efficiency}%` : m.status === 'idle' ? 'idle' : 'maint'}</div>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="rounded-xl bg-white/[0.03] p-3 text-[12px] text-slate-400 ring-1 ring-white/5">{PRESENT_OK(att.status) ? 'No looms assigned.' : 'Not on the floor today.'}</div>
        )}
      </Section>
      <Section title="Details">
        <div className="rounded-xl bg-white/[0.03] px-3 py-1 ring-1 ring-white/5">
          <Row label="Skill" value={op.skill} />
          <Row label="Phone" value={op.phone || '—'} />
          <Row label="Daily wage" value={inr(op.dailyWage || 0)} />
        </div>
      </Section>
      <div className="mt-4 flex gap-2">
        <ActionButton icon={Crosshair} onClick={() => focusOnKey(`worker:${op.id}`)}>Focus</ActionButton>
        <ActionButton icon={Users} onClick={() => useFactoryStore.getState().setSettingsOpen(true, 'attendance')}>Attendance</ActionButton>
      </div>
    </>
  )
}
const PRESENT_OK = (st) => st === 'present' || st === 'half'

function WorkerPanel({ id }) {
  const isOperator = useFactoryStore((s) => !!s.settings?.operators.some((o) => o.id === id))
  if (isOperator) return <OperatorPanel id={id} />
  return <StaffPanel id={id} />
}

function StaffPanel({ id }) {
  const w = useFactoryStore((s) => s.workers.find((x) => x.id === id))
  const m = useFactoryStore((s) => s.machines.find((x) => x.id === w?.station))
  if (!w) return null
  const initials = w.name.split(' ').map((p) => p[0]).join('')
  const office = ['Accounts', 'Management'].includes(w.department)
  return (
    <>
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-600 text-lg font-extrabold text-slate-900">{initials}</div>
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{w.department} · {w.id}</div>
          <div className="truncate text-xl font-extrabold text-white">{w.name}</div>
          <div className="text-[13px] text-amber-200">{w.role}</div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-[12px] font-semibold text-emerald-200 ring-1 ring-emerald-400/30">
        <Activity className="h-4 w-4" /> {w.status}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Tile icon={Clock} label="Shift start" value={w.shiftStart} />
        <Tile icon={Timer} label="On shift" value={shiftHours(w.shiftStart).replace(' hrs', '')} unit="hrs" />
        <Tile icon={ShieldCheck} label="Skill" value={w.skill} color="text-sky-300" />
        <Tile icon={TrendingUp} label="Experience" value={w.experienceYears} unit="yrs" />
      </div>
      {m && (
        <Section title="Assigned machine">
          <button onClick={() => selectMachine(m.id)} className="flex w-full items-center justify-between rounded-xl bg-white/[0.04] p-3 text-left ring-1 ring-white/10 hover:bg-white/[0.08]">
            <div>
              <div className="text-sm font-bold text-white">{m.id}</div>
              <div className="text-[11px] text-slate-400">{m.fabric}</div>
            </div>
            <div className="text-right">
              <StatusChip status={m.status} />
              <div className="mt-1 text-[11px] text-slate-400">{m.efficiency}% · {num(m.production)} m</div>
            </div>
          </button>
        </Section>
      )}
      <Section title={office ? 'Workplace' : 'Safety & PPE'}>
        <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
          {(office ? ['ID card', 'Attendance', 'Training'] : ['Helmet', 'Safety shoes', 'Uniform']).map((k) => (
            <div key={k} className="rounded-xl bg-white/[0.03] p-2 ring-1 ring-white/5">
              {office ? <CircleCheck className="mx-auto h-5 w-5 text-emerald-400" /> : <HardHat className="mx-auto h-5 w-5 text-emerald-400" />}
              <div className="mt-1 text-slate-300">{k}</div>
            </div>
          ))}
        </div>
      </Section>
      <div className="mt-4 flex gap-2">
        <ActionButton icon={Crosshair} onClick={() => focusOnKey(`worker:${w.id}`)}>Focus</ActionButton>
      </div>
    </>
  )
}

function YarnPanel({ id }) {
  const y = useFactoryStore((s) => s.yarnInventory.find((x) => x.rackId === id))
  const all = useFactoryStore((s) => s.yarnInventory)
  if (!y) return null
  const free = y.availableKg - y.reservedKg
  const cover = free / y.consumptionKgPerDay
  const total = all.reduce((a, r) => a + r.availableKg, 0)
  return (
    <>
      <Header icon={Package} kicker={`Yarn rack ${y.rackId}`} title={y.yarnType} color="#60a5fa" />
      <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white/[0.03] p-3 ring-1 ring-white/5">
        <div className="h-12 w-12 rounded-full ring-4 ring-white/10" style={{ background: `radial-gradient(circle at 35% 30%, #fff8, transparent 45%), ${y.coneColor}` }} />
        <div>
          <div className="text-lg font-bold text-white">{y.count}</div>
          <div className="text-[12px] text-slate-400">{y.variety}</div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[10px] uppercase tracking-wider text-slate-400">Batch</div>
          <div className="font-mono text-[13px] font-semibold text-sky-200">{y.batch}</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Tile label="Available" value={num(y.availableKg)} unit="kg" color="text-sky-300" />
        <Tile label="Reserved" value={num(y.reservedKg)} unit="kg" color="text-amber-300" />
        <Tile label="Free" value={num(free)} unit="kg" color="text-emerald-300" />
      </div>
      <div className="mt-3">
        <StackedBar parts={[{ label: 'Reserved', value: y.reservedKg, color: '#fbbf24' }, { label: 'Free', value: free, color: '#34d399' }]} />
        <div className="mt-1 flex justify-between text-[10px] text-slate-500">
          <span>Reserved for production</span>
          <span>Free stock</span>
        </div>
      </div>
      <Section title="Stock details">
        <div className="rounded-xl bg-white/[0.03] px-3 py-1 ring-1 ring-white/5">
          <Row label="Supplier" value={y.supplier} />
          <Row label="Last received" value={y.lastReceived} />
          <Row label="Cones on rack" value={num(y.cones)} />
          <Row label="Consumption" value={`${num(y.consumptionKgPerDay)} kg/day`} />
          <Row label="Days of cover" value={`${cover.toFixed(1)} days`} accent={cover < 4 ? 'text-rose-300' : 'text-emerald-300'} />
        </div>
      </Section>
      {cover < 4 && (
        <div className="mt-3 flex gap-2 rounded-xl bg-rose-500/10 p-3 text-[12px] text-rose-200 ring-1 ring-rose-400/30">
          <TriangleAlert className="h-4 w-4 shrink-0" /> Low cover — raise a purchase order for {y.count} {y.variety}.
        </div>
      )}
      <div className="mt-3 text-[11px] text-slate-500">Total yarn in store: <span className="font-semibold text-slate-300">{num(total)} kg</span> across {all.length} racks</div>
    </>
  )
}

function FinishedPanel({ id }) {
  const f = useFactoryStore((s) => s.finishedStock.find((x) => x.rackId === id))
  const all = useFactoryStore((s) => s.finishedStock)
  const totals = useMemo(() => all.reduce((a, r) => ({ av: a.av + r.availableM, rs: a.rs + r.reservedM, rd: a.rd + r.readyForDispatchM }), { av: 0, rs: 0, rd: 0 }), [all])
  if (!f) return null
  return (
    <>
      <Header icon={Boxes} kicker={`Finished goods · ${f.rackId === 'FG-FLOOR' ? 'Floor lots' : 'Rack ' + f.rackId}`} title={f.fabricType} color="#fbbf24" />
      <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white/[0.03] p-3 ring-1 ring-white/5">
        <div className="h-12 w-12 rounded-xl ring-4 ring-white/10" style={{ background: f.colorHex }} />
        <div>
          <div className="text-[15px] font-bold text-white">{f.construction}</div>
          <div className="text-[12px] text-slate-400">{f.color}{f.gsm ? ` · ${f.gsm} GSM` : ''}</div>
        </div>
        <div className="ml-auto rounded-lg bg-emerald-500/15 px-2 py-1 text-[11px] font-bold text-emerald-300">Grade {f.grade}</div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Tile label="Available" value={num(f.availableM)} unit="m" color="text-white" />
        <Tile label="Reserved" value={num(f.reservedM)} unit="m" color="text-amber-300" />
        <Tile label="Ready" value={num(f.readyForDispatchM)} unit="m" color="text-emerald-300" />
      </div>
      <div className="mt-3">
        <StackedBar parts={[{ label: 'Reserved', value: f.reservedM, color: '#fbbf24' }, { label: 'Ready for dispatch', value: f.readyForDispatchM, color: '#34d399' }]} />
        <div className="mt-1 flex justify-between text-[10px] text-slate-500">
          <span>Reserved</span>
          <span>Ready for dispatch</span>
        </div>
      </div>
      <Section title="Lot details">
        <div className="rounded-xl bg-white/[0.03] px-3 py-1 ring-1 ring-white/5">
          <Row label="Lot number" value={f.lot} />
          <Row label="Rolls" value={num(f.rolls)} />
          <Row label="Avg. roll length" value={`${Math.round(f.availableM / f.rolls)} m`} />
          <Row label="Reserved for" value={f.customer} />
        </div>
      </Section>
      <Section title="Warehouse total">
        <div className="grid grid-cols-3 gap-2 text-center">
          {[['Available', totals.av, 'text-white'], ['Reserved', totals.rs, 'text-amber-300'], ['Ready', totals.rd, 'text-emerald-300']].map(([l, v, c]) => (
            <div key={l} className="rounded-xl bg-white/[0.03] p-2 ring-1 ring-white/5">
              <div className={`text-[15px] font-bold tabular-nums ${c}`}>{num(v)}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500">{l} m</div>
            </div>
          ))}
        </div>
      </Section>
    </>
  )
}

function AccountsPanel() {
  const a = useFactoryStore((s) => s.accounts)
  if (!a) return null
  const agingTotal = a.receivablesAging.reduce((x, b) => x + b.value, 0)
  const expMax = Math.max(...a.expenseBreakdown.map((e) => e.value))
  return (
    <>
      <Header icon={Calculator} kicker="Accounts office" title="Accounts Dashboard" color="#f472b6" />
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Tile icon={IndianRupee} label="Today's sales" value={inr(a.todaySales)} color="text-emerald-300" tint="from-emerald-400/10" />
        <Tile icon={TrendingUp} label="Monthly revenue" value={inrShort(a.monthlyRevenue)} color="text-white" tint="from-pink-400/10" />
        <Tile icon={Wallet} label="Receivables" value={inr(a.receivables)} color="text-sky-300" tint="from-sky-400/10" />
        <Tile icon={Landmark} label="Payables" value={inr(a.payables)} color="text-amber-300" tint="from-amber-400/10" />
        <Tile icon={Receipt} label="Today's expenses" value={inr(a.todayExpenses)} color="text-rose-300" tint="from-rose-400/10" />
        <Tile icon={FileText} label="Pending invoices" value={a.pendingInvoices} color="text-white" tint="from-violet-400/10" />
      </div>
      <Section title="Sales · last 7 days" right={<span className="text-[11px] text-slate-400">₹ lakh</span>}>
        <BarChart data={a.weeklySales.map((d) => ({ label: d.day, value: d.value }))} color="#34d399" format={(v) => inrShort(v)} height={96} />
      </Section>
      <Section title="Monthly revenue (₹ Cr)">
        <LineChart data={a.monthlyTrend.map((d) => ({ label: d.month, value: d.value / 10 }))} color="#f472b6" />
      </Section>
      <Section title="Receivables ageing">
        <div className="flex items-center gap-4">
          <Donut data={a.receivablesAging} center={inrShort(agingTotal)} sub="Total" />
          <div className="flex-1 space-y-1.5">
            {a.receivablesAging.map((b) => (
              <div key={b.bucket} className="flex items-center gap-2 text-[12px]">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: b.color }} />
                <span className="text-slate-400">{b.bucket}</span>
                <span className="ml-auto font-semibold text-slate-200">{inrShort(b.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>
      <Section title="Today's expenses">
        <div className="space-y-1.5">
          {a.expenseBreakdown.map((e) => (
            <div key={e.label} className="flex items-center gap-2 text-[12px]">
              <span className="w-24 shrink-0 text-slate-400">{e.label}</span>
              <div className="flex-1">
                <ProgressBar value={e.value} max={expMax} color="#fb7185" height={5} />
              </div>
              <span className="w-16 text-right font-semibold text-slate-200">{inrShort(e.value)}</span>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Recent invoices">
        <div className="space-y-1.5">
          {a.recentInvoices.map((iv) => (
            <div key={iv.no} className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-2.5 py-2 text-[12px] ring-1 ring-white/5">
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-slate-200">{iv.party}</div>
                <div className="font-mono text-[10px] text-slate-500">{iv.no}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-white">{inr(iv.amount)}</div>
                <div className={`text-[10px] font-bold ${iv.status === 'Paid' ? 'text-emerald-300' : iv.status === 'Overdue' ? 'text-rose-300' : 'text-amber-300'}`}>{iv.status}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </>
  )
}

function ManagerPanel() {
  const s = useSummary()
  const machines = useFactoryStore((st) => st.machines)
  const tasks = useFactoryStore((st) => st.maintenance)
  const target = 24300
  return (
    <>
      <Header icon={Briefcase} kicker="Factory manager" title="Plant Overview" color="#22d3ee" />
      <div className="mt-4 rounded-2xl bg-gradient-to-br from-cyan-400/10 to-transparent p-3 ring-1 ring-cyan-300/20">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Production today</div>
        <div className="flex items-end justify-between">
          <div className="text-3xl font-extrabold tabular-nums text-white">
            {num(s.production)} <span className="text-base text-slate-400">m</span>
          </div>
          <div className="text-[11px] text-slate-400">Day target {num(target)} m</div>
        </div>
        <div className="mt-2">
          <ProgressBar value={s.production} max={target} color="#22d3ee" />
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Tile icon={Gauge} label="Machine efficiency" value={`${s.efficiency.toFixed(1)}%`} color="text-amber-300" />
        <Tile icon={Users} label="Workers present" value={s.workersPresent} color="text-white" />
        <Tile icon={Cog} label="Machines running" value={`${s.machinesRunning}/${s.machinesTotal}`} color="text-emerald-300" />
        <Tile icon={Wrench} label="Pending maintenance" value={s.pendingMaintenance} color="text-rose-300" />
      </div>
      <Section title="Loom status board" right={<span className="text-[10px] text-slate-500">click a loom</span>}>
        <div className="grid grid-cols-6 gap-1.5">
          {machines.map((m) => {
            const st = STATUS_STYLES[m.status]
            return (
              <button
                key={m.id}
                onClick={() => selectMachine(m.id)}
                className={`rounded-lg py-1.5 text-center ring-1 transition hover:scale-105 ${st.bg} ${st.ring}`}
                title={`${m.id} · ${st.label} · ${m.efficiency}%`}
              >
                <div className={`text-[10px] font-bold ${st.text}`}>{m.id.replace('WJ-', '')}</div>
                <div className="text-[9px] text-slate-400">{m.status === 'running' ? `${m.efficiency}%` : m.status === 'idle' ? 'idle' : 'maint'}</div>
              </button>
            )
          })}
        </div>
      </Section>
      <Section title="Maintenance queue">
        <div className="space-y-1.5">
          {tasks.map((t) => (
            <button key={t.machine} onClick={() => selectMachine(t.machine)} className="flex w-full items-center gap-2 rounded-lg bg-white/[0.03] px-2.5 py-2 text-left text-[12px] ring-1 ring-white/5 hover:bg-white/[0.07]">
              <Wrench className={`h-4 w-4 shrink-0 ${t.priority === 'High' ? 'text-rose-300' : 'text-amber-300'}`} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-slate-200">{t.machine} · {t.task}</div>
                <div className="text-[10px] text-slate-500">{t.status} · {t.tech}</div>
              </div>
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${t.priority === 'High' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'}`}>{t.priority}</span>
            </button>
          ))}
        </div>
      </Section>
      <Section title="Power">
        <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2 text-[13px] ring-1 ring-white/5">
          <span className="flex items-center gap-2 text-slate-400"><Zap className="h-4 w-4 text-yellow-300" /> Connected load (looms)</span>
          <span className="font-bold text-white">{s.power.toFixed(1)} kW</span>
        </div>
      </Section>
    </>
  )
}

function TruckPanel() {
  const d = useFactoryStore((s) => s.dispatch)
  if (!d) return null
  const t = d.truck
  return (
    <>
      <Header icon={Truck} kicker="Loading bay 1" title="Dispatch Truck" color="#fb923c" />
      <div className="mt-3 flex items-center justify-between rounded-2xl bg-white/[0.03] p-3 ring-1 ring-white/5">
        <div className="whitespace-nowrap rounded-md border-2 border-slate-900 bg-yellow-300 px-2.5 py-1 font-mono text-[14px] font-extrabold tracking-wide text-slate-900">{t.number}</div>
        <div className="text-right text-[12px]">
          <div className="text-slate-400">{t.transporter}</div>
          <div className="font-semibold text-slate-200">Driver: {t.driver}</div>
        </div>
      </div>
      <div className="mt-3 rounded-2xl bg-gradient-to-br from-orange-400/10 to-transparent p-3 ring-1 ring-orange-300/20">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Rolls loaded</div>
            <div className="text-3xl font-extrabold tabular-nums text-white">
              {t.rollsLoaded}<span className="text-base text-slate-400"> / {t.rollsTotal}</span>
            </div>
          </div>
          <div className="text-right text-[12px] text-orange-200">{Math.round((t.rollsLoaded / t.rollsTotal) * 100)}% loaded</div>
        </div>
        <div className="mt-2">
          <ProgressBar value={t.rollsLoaded} max={t.rollsTotal} color="#fb923c" />
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Tile icon={MapPin} label="Destination" value={t.destination.split(',')[0]} />
        <Tile icon={Layers} label="Meters" value={num(t.meters)} unit="m" />
        <Tile icon={Clock} label="Docked" value={t.dockedAt} />
        <Tile icon={Timer} label="Departure" value={t.eta} color="text-emerald-300" />
      </div>
      <Section title="Documents">
        <div className="rounded-xl bg-white/[0.03] px-3 py-1 ring-1 ring-white/5">
          <Row label="Sales order" value={t.order} />
          <Row label="Delivery challan" value={t.challan} />
          <Row label="Gross weight" value={`${num(t.weightKg)} kg`} />
        </div>
      </Section>
      <Section title="Pending orders">
        <div className="space-y-1.5">
          {d.pendingOrders.map((o) => (
            <div key={o.order} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-2.5 py-2 text-[12px] ring-1 ring-white/5">
              <div>
                <div className="font-semibold text-slate-200">{o.party}</div>
                <div className="font-mono text-[10px] text-slate-500">{o.order}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-white">{num(o.meters)} m</div>
                <div className="text-[10px] text-amber-300">{o.due}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>
      <div className="mt-3 text-[11px] text-slate-500">
        Dispatched today: <span className="font-semibold text-slate-300">{d.dispatchedToday.trucks} trucks · {num(d.dispatchedToday.meters)} m · {d.dispatchedToday.rolls} rolls</span>
      </div>
    </>
  )
}

function EntrancePanel() {
  const c = useFactoryStore((s) => s.company)
  const factoryName = useFactoryStore((s) => s.settings?.general.factoryName)
  if (!c) return null
  return (
    <>
      <Header icon={DoorOpen} kicker="Main entrance" title={factoryName || c.name} color="#fcd34d" />
      <div className="mt-1 pl-14 text-[12px] font-semibold uppercase tracking-[0.25em] text-slate-400">{c.tagline}</div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Tile label="Looms" value={c.looms} color="text-emerald-300" />
        <Tile label="Capacity" value={c.capacityPerMonth} color="text-white" />
        <Tile label="Covered area" value={c.area.split(' ')[0]} unit="m²" />
        <Tile label="Shifts" value={c.shifts} />
      </div>
      <Section title="Products">
        <div className="flex flex-wrap gap-1.5">
          {c.products.map((p) => (
            <span key={p} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] text-slate-200 ring-1 ring-white/10">{p}</span>
          ))}
        </div>
      </Section>
      <Section title="Gate & visitors">
        <div className="rounded-xl bg-white/[0.03] px-3 py-1 ring-1 ring-white/5">
          <Row label="Gate" value={c.gateStatus} />
          <Row label="Visitors today" value={c.visitorsToday} />
        </div>
      </Section>
      <button
        onClick={() => {
          const st = useFactoryStore.getState()
          st.setPresentIndex(0)
          st.setPresentPaused(false)
          st.setMode('present')
        }}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-3 py-2.5 text-sm font-bold text-slate-900 shadow-[0_0_24px_rgba(251,191,36,0.35)] hover:bg-amber-300"
      >
        <Presentation className="h-4 w-4" /> Start guided tour
      </button>
      <div className="mt-3 text-[11px] text-slate-500">{c.note}</div>
    </>
  )
}

function InspectionPanel({ id }) {
  const q = useFactoryStore((s) => s.qualityData?.[id])
  if (!q) return null
  return (
    <>
      <Header icon={ScanSearch} kicker="Quality control" title={`Inspection ${id}`} color="#a78bfa" />
      <div className="mt-3 flex items-center gap-2 rounded-xl bg-violet-500/10 px-3 py-2 text-[12px] font-semibold text-violet-200 ring-1 ring-violet-400/30">
        <Activity className="h-4 w-4" /> {q.status} · {q.speed}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Tile label="Inspected today" value={num(q.inspectedToday)} unit="m" />
        <Tile label="Grade A" value={`${q.gradeA}%`} color="text-emerald-300" />
        <Tile label="Defects" value={q.defectsPer100m} unit="/100 m" color="text-amber-300" />
        <Tile label="Current lot" value={q.lot} />
      </div>
      <Section title="Inspector">
        <div className="rounded-xl bg-white/[0.03] px-3 py-2 text-[13px] text-slate-200 ring-1 ring-white/5">{q.operator}</div>
      </Section>
      <div className="mt-3 text-[11px] text-slate-500">Inspected rolls move to the Finished Goods warehouse — step 4 of the flow.</div>
    </>
  )
}

const PANELS = {
  machine: MachinePanel, worker: WorkerPanel, yarn: YarnPanel, finished: FinishedPanel, accounts: AccountsPanel,
  manager: ManagerPanel, truck: TruckPanel, entrance: EntrancePanel, inspection: InspectionPanel,
}

export default function DetailPanel({ mobile = false, landscape = false }) {
  const selected = useFactoryStore((s) => s.selected)
  const clear = useFactoryStore((s) => s.clearSelection)
  const [collapsed, setCollapsed] = useState(false)
  const drag = useRef(null)
  useEffect(() => setCollapsed(false), [selected?.key])
  if (!selected) return null
  const P = PANELS[selected.type]
  if (!P) return null

  if (mobile && !landscape) {
    // bottom sheet: drag/tap the handle to collapse to a peek and see the 3D view
    const onDown = (e) => (drag.current = e.clientY)
    const onUp = (e) => {
      if (drag.current == null) return
      const dy = e.clientY - drag.current
      drag.current = null
      if (dy > 40) setCollapsed(true)
      else if (dy < -40) setCollapsed(false)
      else setCollapsed((c) => !c)
    }
    return (
      <div
        key={selected.key}
        className="glass slide-up safe-bottom pointer-events-auto fixed inset-x-0 bottom-0 z-40 flex flex-col rounded-t-3xl"
        style={{ maxHeight: collapsed ? 128 : '64dvh', transition: 'max-height .28s cubic-bezier(.2,.8,.2,1)', background: 'linear-gradient(180deg, rgba(17,24,38,0.94), rgba(10,15,24,0.97))' }}
      >
        <div className="flex shrink-0 touch-none items-center justify-center pb-1 pt-2" onPointerDown={onDown} onPointerUp={onUp} role="button" aria-label={collapsed ? 'Expand details' : 'Collapse details'}>
          <div className="h-1.5 w-10 rounded-full bg-white/25" />
        </div>
        <button onClick={clear} className="absolute right-2 top-2 z-10 flex h-10 w-10 items-center justify-center rounded-xl text-slate-300 active:bg-white/10" aria-label="Close">
          <X className="h-5 w-5" />
        </button>
        <div className={`min-h-0 flex-1 px-4 pb-3 pr-12 ${collapsed ? 'overflow-hidden' : 'overflow-y-auto scrollbar-thin'}`}>
          <P id={selected.id} />
        </div>
      </div>
    )
  }

  return (
    <div
      key={selected.key}
      className={
        mobile
          ? 'glass slide-in-right safe-y pointer-events-auto fixed bottom-2 right-2 top-2 z-40 w-[min(380px,52vw)] overflow-y-auto rounded-2xl p-4 scrollbar-thin'
          : 'glass slide-in-right pointer-events-auto relative max-h-full w-[372px] overflow-y-auto rounded-2xl p-4 scrollbar-thin'
      }
    >
      <button onClick={clear} className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Close">
        <X className="h-4 w-4" />
      </button>
      <div className="pr-6">
        <P id={selected.id} />
      </div>
    </div>
  )
}
