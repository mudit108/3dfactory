import { useMemo } from 'react'
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
function MachinePanel({ id }) {
  const m = useFactoryStore((s) => s.machines.find((x) => x.id === id))
  if (!m) return null
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
            <button className="font-semibold text-amber-300 hover:underline" onClick={() => selectWorker(m.operatorId)}>
              {m.operator} ({m.operatorId})
            </button>
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
        <ActionButton icon={User} onClick={() => selectWorker(m.operatorId)}>Operator</ActionButton>
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

function WorkerPanel({ id }) {
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
  if (!c) return null
  return (
    <>
      <Header icon={DoorOpen} kicker="Main entrance" title={c.name} color="#fcd34d" />
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
          <Row label="Security on duty" value={<button className="text-amber-300 hover:underline" onClick={() => selectWorker('W-27')}>Balwant Singh</button>} />
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

export default function DetailPanel({ mobile = false }) {
  const selected = useFactoryStore((s) => s.selected)
  const clear = useFactoryStore((s) => s.clearSelection)
  if (!selected) return null
  const P = PANELS[selected.type]
  if (!P) return null
  return (
    <div
      key={selected.key}
      className={
        mobile
          ? 'glass slide-up pointer-events-auto fixed inset-x-2 bottom-2 z-40 max-h-[62vh] overflow-y-auto rounded-2xl p-4 scrollbar-thin'
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
