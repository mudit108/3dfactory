// Demo EMS data for the waterjet looms. Replace via services/factoryApi.js.
// status: 'running' | 'idle' | 'maintenance'

const operators = [
  'Ramesh Patel', 'Suresh Yadav', 'Mahesh Rathod', 'Dinesh Chauhan', 'Rajesh Kumar', 'Anil Solanki',
  'Vijay Parmar', 'Manoj Verma', 'Sanjay Gupta', 'Prakash Joshi', 'Arvind Singh', 'Kishore Desai',
  'Harish Makwana', 'Bharat Vasava', 'Naresh Rana', 'Ashok Mishra', 'Gopal Prajapati', 'Vinod Thakor',
]

const fabrics = [
  'Polyester Taffeta 190T', 'Polyester Pongee', 'Nylon Taslan', 'Polyester Oxford 300D',
  'Nylon Ripstop', 'Polyester Georgette', 'Micro Peach', 'Polyester Taffeta 210T',
]

// [status, efficiency %, production m, rpm, pressure bar, runtime min, power kW, beam %, fabric idx]
const rows = [
  ['running', 87, 1115, 650, 120, 522, 18.4, 62, 0],
  ['running', 88, 1178, 680, 122, 531, 18.9, 48, 0],
  ['running', 84, 1048, 640, 118, 509, 17.8, 71, 1],
  ['running', 89, 1141, 660, 121, 526, 18.6, 35, 1],
  ['idle', 64, 550, 0, 0, 305, 1.2, 4, 2],
  ['running', 86, 1080, 650, 119, 520, 18.2, 57, 2],
  ['running', 88, 1157, 670, 123, 529, 18.8, 66, 3],
  ['running', 85, 1063, 645, 118, 516, 18.0, 22, 3],
  ['running', 88, 1119, 655, 120, 524, 18.5, 80, 4],
  ['running', 90, 1204, 690, 124, 533, 19.1, 44, 4],
  ['running', 83, 1025, 635, 117, 505, 17.6, 59, 5],
  ['maintenance', 41, 241, 0, 0, 182, 0.4, 51, 5],
  ['running', 89, 1135, 660, 121, 527, 18.6, 73, 6],
  ['running', 86, 1078, 650, 119, 519, 18.2, 38, 6],
  ['running', 84, 1035, 640, 118, 511, 17.9, 26, 7],
  ['running', 88, 1112, 655, 120, 523, 18.4, 67, 7],
  ['running', 87, 1100, 650, 120, 521, 18.3, 53, 0],
  ['running', 81, 1039, 630, 116, 498, 17.4, 12, 1],
]

function hourly(prod, status, seed) {
  const base = prod / 9
  return Array.from({ length: 8 }, (_, h) => {
    const wobble = Math.sin((seed + 1) * 1.7 + h * 1.3) * 0.08
    let v = base * (1 + wobble)
    if (status === 'idle' && h >= 5) v = base * 0.15 * (7 - h)
    if (status === 'maintenance' && h >= 2) v = 0
    return Math.max(0, Math.round(v))
  })
}

export const machines = rows.map(([status, efficiency, production, rpm, waterPressure, runtimeMin, power, beam, f], i) => {
  const n = String(i + 1).padStart(2, '0')
  return {
    id: `WJ-${n}`,
    model: i % 3 === 0 ? 'WJ-851 / 190 cm' : i % 3 === 1 ? 'WJ-851 / 230 cm' : 'WJ-408 / 190 cm',
    status,
    efficiency,
    production,
    targetToday: 1350,
    operator: operators[i],
    operatorId: `W-${n}`,
    rpm,
    waterPressure,
    runtimeMinutes: runtimeMin,
    power,
    fabric: fabrics[f],
    reedWidthCm: i % 3 === 1 ? 230 : 190,
    picksPerCm: 24 + (i % 4) * 2,
    warpBeamRemaining: beam,
    warpYarn: f % 2 ? 'Nylon 70D/24F' : 'Polyester 75D/36F',
    weftYarn: f % 2 ? 'Nylon 70D/24F' : 'Polyester 150D/48F',
    stops: { warp: 2 + (i % 4), weft: 1 + (i % 3), other: i % 2 },
    lastService: `2026-0${(i % 3) + 7}-${String(4 + (i % 20)).padStart(2, '0')}`,
    nextService: status === 'maintenance' ? 'In progress' : `2026-10-${String(2 + (i % 25)).padStart(2, '0')}`,
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
