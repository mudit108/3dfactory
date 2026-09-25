const inrFmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
const numFmt = new Intl.NumberFormat('en-IN')

export const inr = (v) => inrFmt.format(v)
export const num = (v) => numFmt.format(Math.round(v))
export function inrShort(v) {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`
  return inr(v)
}
export function hhmm(minutes) {
  const h = Math.floor(minutes / 60)
  const m = Math.floor(minutes % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} hrs`
}
export const STATUS_STYLES = {
  running: { label: 'RUNNING', text: 'text-emerald-300', bg: 'bg-emerald-500/15', ring: 'ring-emerald-400/40', dot: 'bg-emerald-400', hex: '#34d399' },
  idle: { label: 'IDLE', text: 'text-amber-300', bg: 'bg-amber-500/15', ring: 'ring-amber-400/40', dot: 'bg-amber-400', hex: '#fbbf24' },
  maintenance: { label: 'MAINTENANCE', text: 'text-rose-300', bg: 'bg-rose-500/15', ring: 'ring-rose-400/40', dot: 'bg-rose-400', hex: '#fb7185' },
}
