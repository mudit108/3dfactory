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
  { id: 'W-19', name: 'Kamlesh Bhatt', role: 'Yarn Store Keeper', department: 'Stores', station: 'yarn-keeper', activity: 'inspect', appearance: 1, shiftStart: '06:00', status: 'On duty', skill: 'Senior', experienceYears: 11 },
  { id: 'W-20', name: 'Deepak Vaghela', role: 'Yarn Handler', department: 'Stores', station: 'yarn-carrier', activity: 'carry', appearance: 2, shiftStart: '06:00', status: 'Moving yarn to looms', skill: 'Grade B', experienceYears: 3 },
  { id: 'W-21', name: 'Sunita Patil', role: 'Fabric Inspector', department: 'Quality', station: 'INS-01', activity: 'inspect', appearance: 3, shiftStart: '06:00', status: 'Inspecting LT-26-0921', skill: 'Senior', experienceYears: 9 },
  { id: 'W-22', name: 'Ravi Chaudhary', role: 'Roll Handler', department: 'Finished Goods', station: 'roll-mover', activity: 'carryRoll', appearance: 0, shiftStart: '06:00', status: 'Moving rolls to FG store', skill: 'Grade B', experienceYears: 4 },
  { id: 'W-23', name: 'Imran Shaikh', role: 'Loading Crew', department: 'Dispatch', station: 'loader', activity: 'load', appearance: 4, shiftStart: '06:00', status: 'Loading GJ 05 BX 4821', skill: 'Grade B', experienceYears: 5 },
  { id: 'W-24', name: 'Mukesh Solanki', role: 'Dispatch Supervisor', department: 'Dispatch', station: 'dispatch-supervisor', activity: 'inspect', appearance: 1, shiftStart: '08:00', status: 'Checking challan', skill: 'Senior', experienceYears: 12 },
  { id: 'W-25', name: 'Neha Agarwal', role: 'Accounts Executive', department: 'Accounts', station: 'accounts-desk', activity: 'sit', appearance: 'office', shiftStart: '09:30', status: 'At desk', skill: 'M.Com', experienceYears: 6 },
  { id: 'W-26', name: 'Rakesh Mehta', role: 'Factory Manager', department: 'Management', station: 'manager-desk', activity: 'sit', appearance: 'manager', shiftStart: '08:30', status: 'In office', skill: 'B.Tech Textile', experienceYears: 18 },
  { id: 'W-27', name: 'Balwant Singh', role: 'Security Guard', department: 'Security', station: 'security-desk', activity: 'guard', appearance: 'security', shiftStart: '06:00', status: 'At gate', skill: 'Ex-servicemen', experienceYears: 14 },
]

export default workers
