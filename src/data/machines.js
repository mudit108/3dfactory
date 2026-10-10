// Demo EMS data for the 38 waterjet looms. Replace via services/factoryApi.js.
// status: 'running' | 'idle' | 'maintenance'

const FIRST = ['Ramesh', 'Suresh', 'Mahesh', 'Dinesh', 'Rajesh', 'Anil', 'Vijay', 'Manoj', 'Sanjay', 'Prakash', 'Arvind', 'Kishore', 'Harish', 'Bharat', 'Naresh', 'Ashok', 'Gopal', 'Vinod', 'Jitendra', 'Pankaj', 'Hitesh', 'Mukesh', 'Nilesh', 'Raju', 'Kalpesh', 'Jayesh', 'Sunil', 'Ravi', 'Lalit', 'Dilip', 'Pradeep', 'Santosh', 'Amit', 'Yogesh', 'Bhavesh', 'Mohan', 'Tarun', 'Chetan']
const LAST = ['Patel', 'Yadav', 'Rathod', 'Chauhan', 'Kumar', 'Solanki', 'Parmar', 'Verma', 'Gupta', 'Joshi', 'Singh', 'Desai', 'Makwana', 'Vasava', 'Rana', 'Mishra', 'Prajapati', 'Thakor', 'Gohil', 'Bhatt']
const FABRICS = [
  'Polyester Taffeta 190T', 'Polyester Pongee', 'Nylon Taslan', 'Polyester Oxford 300D',
  'Nylon Ripstop', 'Polyester Georgette', 'Micro Peach', 'Polyester Taffeta 210T',
]

const IDLE = new Set([9, 27])
const MAINT = new Set([14, 33])

// small deterministic pseudo-random
const rnd = (i, k) => {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453
  return x - Math.floor(x)
}

function hourly(prod, status, seed) {
  const base = prod / 9
  return Array.from({ length: 8 }, (_, h) => {
    let v = base * (1 + Math.sin((seed + 1) * 1.7 + h * 1.3) * 0.08)
    if (status === 'idle' && h >= 5) v = base * 0.15 * (7 - h)
    if (status === 'maintenance' && h >= 2) v = 0
    return Math.max(0, Math.round(v))
  })
}

export const machines = Array.from({ length: 38 }, (_, i) => {
  const n = i + 1
  const id = `WJ-${String(n).padStart(2, '0')}`
  const status = IDLE.has(n) ? 'idle' : MAINT.has(n) ? 'maintenance' : 'running'
  const running = status === 'running'
  const efficiency = running ? Math.round(81 + rnd(n, 1) * 11) : status === 'idle' ? 60 + Math.round(rnd(n, 2) * 8) : 38 + Math.round(rnd(n, 3) * 6)
  const production = running ? Math.round(980 + rnd(n, 4) * 260) : status === 'idle' ? 520 + Math.round(rnd(n, 5) * 80) : 220 + Math.round(rnd(n, 6) * 50)
  const f = (i * 3) % FABRICS.length
  return {
    id,
    model: i % 3 === 1 ? 'WJ-851 / 230 cm' : 'WJ-851 / 190 cm',
    status,
    efficiency,
    production,
    targetToday: 1350,
    operator: `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`,
    operatorId: `W-${String(n).padStart(2, '0')}`,
    rpm: running ? 630 + Math.round(rnd(n, 7) * 60) : 0,
    waterPressure: running ? 116 + Math.round(rnd(n, 8) * 8) : 0,
    runtimeMinutes: running ? 495 + Math.round(rnd(n, 9) * 40) : status === 'idle' ? 300 : 180,
    power: running ? Math.round((17.3 + rnd(n, 10) * 1.8) * 10) / 10 : status === 'idle' ? 1.2 : 0.4,
    fabric: FABRICS[f],
    reedWidthCm: i % 3 === 1 ? 230 : 190,
    picksPerCm: 24 + (i % 4) * 2,
    warpBeamRemaining: status === 'idle' ? 3 : Math.round(12 + rnd(n, 11) * 78),
    warpYarn: f % 2 ? 'Nylon 70D/24F' : 'Polyester 75D/36F',
    weftYarn: f % 2 ? 'Nylon 70D/24F' : 'Polyester 150D/48F',
    stops: { warp: 2 + (i % 4), weft: 1 + (i % 3), other: i % 2 },
    lastService: `2026-0${(i % 3) + 7}-${String(4 + (i % 20)).padStart(2, '0')}`,
    nextService: status === 'maintenance' ? 'In progress' : `2026-10-${String(8 + (i % 20)).padStart(2, '0')}`,
    maintenanceNote:
      status === 'maintenance'
        ? 'Nozzle & pump seal replacement — technician on site. ETA 2 h.'
        : status === 'idle'
          ? 'Warp beam exhausted — waiting for beam change (new beam staged).'
          : null,
    hourly: hourly(production, status, i),
  }
})

export default machines
