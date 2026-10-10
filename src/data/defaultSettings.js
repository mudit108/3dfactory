// Default plant settings. Everything here can be edited in the Settings
// panel and is saved (browser storage, or your EMS when VITE_EMS_API_URL is set).
import { loomPlacements } from './layout'

const NAMES_A = ['Ramesh Patel', 'Suresh Yadav', 'Mahesh Rathod', 'Dinesh Chauhan', 'Rajesh Kumar', 'Anil Solanki', 'Vijay Parmar', 'Manoj Verma', 'Sanjay Gupta', 'Prakash Joshi']
const NAMES_B = ['Arvind Singh', 'Kishore Desai', 'Harish Makwana', 'Bharat Vasava', 'Naresh Rana', 'Ashok Mishra', 'Gopal Prajapati', 'Vinod Thakor', 'Jitendra Gohil', 'Pankaj Bhatt']
const SKILLS = ['Senior', 'Grade A', 'Grade A', 'Grade B']

export const todayKey = (d = new Date()) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return z.toISOString().slice(0, 10)
}

function makeOperators() {
  const mk = (names, shift, start) =>
    names.map((name, i) => ({
      id: `OP-${shift}${String(i + 1).padStart(2, '0')}`,
      name,
      shift,
      skill: SKILLS[(i + start) % SKILLS.length],
      phone: `98${String(250000 + (i + start) * 7919).padStart(8, '0').slice(0, 8)}`,
      dailyWage: 650 + ((i + start) % 4) * 50,
      active: true,
    }))
  return [...mk(NAMES_A, 'A', 0), ...mk(NAMES_B, 'B', 3)]
}

function defaultAttendance(operators) {
  const day = {}
  operators.forEach((op, i) => {
    if (op.shift === 'A') {
      // one absentee + one on leave to show how cover works
      const status = i === 3 ? 'absent' : i === 8 ? 'leave' : 'present'
      day[op.id] = { status, in: status === 'present' ? `08:0${i % 6}` : '', out: '', ot: 0 }
    } else {
      day[op.id] = { status: 'present', in: '', out: '', ot: 0 }
    }
  })
  return { [todayKey()]: day }
}

export function createDefaultSettings() {
  const operators = makeOperators()
  return {
    version: 1,
    general: {
      factoryName: 'SHREE SATIJI TEXTILES',
      tagline: 'TEXTILE MANUFACTURING',
      currentShift: 'A',
      shifts: [
        { id: 'A', name: 'Day shift', start: '08:00', end: '20:00' },
        { id: 'B', name: 'Night shift', start: '20:00', end: '08:00' },
      ],
      targetPerLoom: 1350, // metres per loom per shift
      weeklyOff: 'Sunday',
    },
    staffing: {
      machinesPerOperator: 5, // 1 operator per 4–6 looms is typical
      mode: 'auto', // 'auto' = split looms among present operators, 'manual' = pick looms per operator
      manual: {}, // operatorId -> [machine ids]
    },
    operators,
    attendance: defaultAttendance(operators),
    machines: Object.fromEntries(loomPlacements.map((p) => [p.id, { status: 'auto', fabric: '', target: '' }])),
    display: { showLabels: true, showFlow: true, openView: true, quality: 'high' },
  }
}
