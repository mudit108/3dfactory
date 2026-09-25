// Lightweight SVG charts (no chart library needed).

export function RadialGauge({ value, max = 100, size = 110, color = '#34d399', label, sub }) {
  const r = size / 2 - 9
  const c = 2 * Math.PI * r
  const frac = Math.max(0, Math.min(1, value / max))
  const arc = c * 0.75
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[135deg]">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9" strokeDasharray={`${arc} ${c}`} strokeLinecap="round" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="9"
          strokeDasharray={`${arc * frac} ${c}`} strokeLinecap="round" style={{ transition: 'stroke-dasharray .6s ease', filter: `drop-shadow(0 0 6px ${color}66)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-bold tabular-nums text-white">{label ?? value}</div>
        {sub && <div className="text-[10px] uppercase tracking-wider text-slate-400">{sub}</div>}
      </div>
    </div>
  )
}

export function BarChart({ data, height = 90, color = '#38bdf8', highlightLast = true, format = (v) => v }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((d, i) => {
        const last = highlightLast && i === data.length - 1
        return (
          <div key={i} className="group relative flex flex-1 flex-col items-center justify-end gap-1" style={{ height: '100%' }}>
            <div className="pointer-events-none absolute -top-5 hidden rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-white group-hover:block">{format(d.value)}</div>
            <div
              className="w-full rounded-t-[3px] transition-all"
              style={{ height: `${(d.value / max) * 82}%`, background: last ? color : `${color}55`, boxShadow: last ? `0 0 12px ${color}55` : 'none' }}
            />
            <div className="text-[9px] text-slate-500">{d.label}</div>
          </div>
        )
      })}
    </div>
  )
}

export function Sparkline({ values, width = 120, height = 32, color = '#34d399', fill = true }) {
  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => [(i / (values.length - 1)) * width, height - 3 - ((v - min) / span) * (height - 6)])
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      {fill && <path d={`${d} L${width},${height} L0,${height} Z`} fill={`${color}22`} />}
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" fill={color} />
    </svg>
  )
}

export function LineChart({ data, height = 110, color = '#f472b6', suffix = '' }) {
  const width = 320
  const max = Math.max(...data.map((d) => d.value)) * 1.08
  const min = Math.min(...data.map((d) => d.value)) * 0.9
  const span = max - min || 1
  const pts = data.map((d, i) => [20 + (i / (data.length - 1)) * (width - 40), height - 22 - ((d.value - min) / span) * (height - 38)])
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ')
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id="lc-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((k) => (
        <line key={k} x1="20" x2={width - 20} y1={16 + k * (height - 38)} y2={16 + k * (height - 38)} stroke="rgba(255,255,255,0.06)" />
      ))}
      <path d={`${path} L${pts[pts.length - 1][0]},${height - 22} L${pts[0][0]},${height - 22} Z`} fill="url(#lc-fill)" />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 4.5 : 3} fill={i === pts.length - 1 ? color : '#0f172a'} stroke={color} strokeWidth="2" />
          <text x={p[0]} y={height - 6} textAnchor="middle" fontSize="10" fill="#64748b">{data[i].label}</text>
          {i === pts.length - 1 && (
            <text x={p[0]} y={p[1] - 10} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">{data[i].value}{suffix}</text>
          )}
        </g>
      ))}
    </svg>
  )
}

export function Donut({ data, size = 110, thickness = 16, center, sub }) {
  const total = data.reduce((a, d) => a + d.value, 0)
  const r = size / 2 - thickness / 2
  const c = 2 * Math.PI * r
  let acc = 0
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {data.map((d, i) => {
          const len = (d.value / total) * c
          const el = (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={d.color} strokeWidth={thickness} strokeDasharray={`${Math.max(0, len - 2)} ${c}`} strokeDashoffset={-acc} />
          )
          acc += len
          return el
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-sm font-bold text-white">{center}</div>
        {sub && <div className="text-[9px] uppercase tracking-wider text-slate-400">{sub}</div>}
      </div>
    </div>
  )
}

export function ProgressBar({ value, max = 100, color = '#34d399', height = 6 }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="w-full overflow-hidden rounded-full bg-white/8" style={{ height, background: 'rgba(255,255,255,0.08)' }}>
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color, boxShadow: `0 0 10px ${color}66` }} />
    </div>
  )
}

export function StackedBar({ parts, height = 10 }) {
  const total = parts.reduce((a, p) => a + p.value, 0)
  return (
    <div className="flex w-full overflow-hidden rounded-full" style={{ height, background: 'rgba(255,255,255,0.08)' }}>
      {parts.map((p, i) => (
        <div key={i} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} title={`${p.label}: ${p.value}`} />
      ))}
    </div>
  )
}
