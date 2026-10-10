// Workforce on the current shift. `station` ties a person to a machine id or
// a named post in the 3D layout; `activity` selects their idle animation.
import { machines } from './machines'

export const APPEARANCES = [
  { name: 'Blue uniform', shirt: '#3d5d8c', pants: '#262a31', helmet: '#e8b923', skin: '#8d5a3b' },
  { name: 'Grey uniform', shirt: '#7b8187', pants: '#1f2a3c', helmet: '#f1f1ec', skin: '#a0694a' },
  { name: 'Khaki uniform', shirt: '#9c8b66', pants: '#3a3934', helmet: '#e8b923', skin: '#7a4b30' },
  { name: 'Light blue', shirt: '#86a7c7', pants: '#2e3440', helmet: '#e2791f', skin: '#b07a55' },
  { name: 'Maroon shirt', shirt: '#7a3c3c', pants: '#2b2b2b', helmet: '#e8b923', skin: '#6e4429' },
]

const operators = machines.map((m, i) => ({
  id: m.operatorId,
  name: m.operator,
  role: m.status === 'maintenance' ? 'Loom Operator (assisting maintenance)' : 'Loom Operator',
  department: 'Weaving',
  station: m.id,
  activity: m.status === 'running' ? 'operate' : m.status === 'idle' ? 'lookAround' : 'repair',
  appearance: i % 5,
  shiftStart: '06:00',
  status: 'On duty',
  skill: ['Grade A', 'Grade A', 'Grade B', 'Senior'][i % 4],
  experienceYears: 2 + ((i * 7) % 13),
  looms: [m.id],
}))

export const workers = [
  ...operators,
  { id: 'W-39', name: 'Kamlesh Bhatt', role: 'Yarn Store Keeper', department: 'Stores', station: 'yarn-keeper', activity: 'inspect', appearance: 1, shiftStart: '06:00', status: 'On duty', skill: 'Senior', experienceYears: 11 },
  { id: 'W-40', name: 'Deepak Vaghela', role: 'Yarn Handler', department: 'Stores', station: 'yarn-carrier', activity: 'carry', appearance: 2, shiftStart: '06:00', status: 'Moving yarn to looms', skill: 'Grade B', experienceYears: 3 },
  { id: 'W-41', name: 'Ravi Chaudhary', role: 'Roll Handler', department: 'Finished Goods', station: 'roll-mover', activity: 'carryRoll', appearance: 0, shiftStart: '06:00', status: 'Moving rolls to FG store', skill: 'Grade B', experienceYears: 4 },
  { id: 'W-42', name: 'Imran Shaikh', role: 'Finished Stock Keeper', department: 'Finished Goods', station: 'fg-keeper', activity: 'inspect', appearance: 4, shiftStart: '06:00', status: 'Counting lot LT-26-0920', skill: 'Senior', experienceYears: 8 },
]

export default workers
