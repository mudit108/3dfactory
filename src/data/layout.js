// ---------------------------------------------------------------------------
// Spatial layout of the plant. All units are metres. The building spans
// x: -50..50 (length 100 m) and z: -30..30 (width 60 m). +z is the front
// (entrance side), -z is the back wall. +x is the dispatch side.
// Keeping geometry positions here (separate from EMS data) lets the same
// scene render live data from any backend.
// ---------------------------------------------------------------------------

export const BUILDING = {
  length: 100,
  width: 60,
  eaveHeight: 8.5,
  ridgeHeight: 10.5,
  minX: -50,
  maxX: 50,
  minZ: -30,
  maxZ: 30,
  bay: 10, // portal frame spacing
}

export const ZONES = [
  { id: 'yarn', name: 'Yarn Stock', short: 'YARN', rect: [-50, -30, -30, 14], color: '#60a5fa' },
  { id: 'production', name: 'Waterjet Production', short: 'PRODUCTION', rect: [-28, -28, 14, 11], color: '#34d399' },
  { id: 'inspection', name: 'Fabric Inspection', short: 'INSPECTION', rect: [14, -24, 22, 11], color: '#a78bfa' },
  { id: 'finished', name: 'Finished Goods', short: 'FINISHED', rect: [22, -30, 50, 2], color: '#fbbf24' },
  { id: 'dispatch', name: 'Loading & Dispatch', short: 'DISPATCH', rect: [22, 4, 50, 30], color: '#fb923c' },
  { id: 'accounts', name: 'Accounts Office', short: 'ACCOUNTS', rect: [3, 21, 15, 30], color: '#f472b6' },
  { id: 'manager', name: 'Manager Office', short: 'MANAGER', rect: [-26, 18.5, -14, 30], color: '#22d3ee' },
  { id: 'entrance', name: 'Entrance & Lobby', short: 'ENTRANCE', rect: [-13, 18, 2, 30], color: '#e5e7eb' },
]

// ---- Waterjet looms: 3 rows x 6 columns --------------------------------------
export const LOOM_COLUMNS = [-23, -16.5, -10, -3.5, 3, 9.5]
export const LOOM_ROWS = [-20, -11, -2]
export const LOOM_SIZE = { width: 3.4, depth: 2.2, height: 1.9 }

export const loomPlacements = LOOM_ROWS.flatMap((z, r) =>
  LOOM_COLUMNS.map((x, c) => {
    const n = r * LOOM_COLUMNS.length + c + 1
    return { id: `WJ-${String(n).padStart(2, '0')}`, position: [x, 0, z], rotation: 0, row: r, col: c }
  }),
)

// ---- Fabric inspection frames -------------------------------------------------
export const inspectionPlacements = [
  { id: 'INS-01', position: [18, 0, -12.5] },
  { id: 'INS-02', position: [18, 0, -0.5] },
]

// ---- Yarn racks: 4 lines x 3 racks, long axis along z -----------------------
const YARN_LINES = [
  { x: -48.85, face: 1 },
  { x: -42.15, face: -1 },
  { x: -40.95, face: 1 },
  { x: -34.0, face: -1 },
]
const YARN_Z = [-22.8, -13.4, -4.0]
export const yarnRackPlacements = YARN_LINES.flatMap((line, li) =>
  YARN_Z.map((z, zi) => ({
    id: `R-${String(li * 3 + zi + 1).padStart(2, '0')}`,
    position: [line.x, 0, z],
    // racks are modelled along +x; rotate so the long axis runs along z
    rotation: line.face === 1 ? Math.PI / 2 : -Math.PI / 2,
  })),
)
export const YARN_RACK = { length: 8.4, depth: 1.1, height: 5.8, bays: 3, levels: [0.12, 1.6, 3.1, 4.6] }

// ---- Finished goods racks: 4 lines x 2 racks, long axis along x --------------
const FG_LINES = [
  { z: -28.9, face: 1 },
  { z: -21.55, face: -1 },
  { z: -19.65, face: 1 },
  { z: -12.3, face: -1 },
]
const FG_X = [29.7, 39.1]
export const finishedRackPlacements = FG_LINES.flatMap((line, li) =>
  FG_X.map((x, xi) => ({
    id: `FG-${String(li * 2 + xi + 1).padStart(2, '0')}`,
    position: [x, 0, line.z],
    rotation: line.face === 1 ? 0 : Math.PI,
  })),
)
export const FG_RACK = { length: 8.4, depth: 1.8, height: 5.2, bays: 3, levels: [0.12, 1.45, 2.8, 4.1] }

// ---- Offices ------------------------------------------------------------------
export const ACCOUNTS_OFFICE = { minX: 3, maxX: 15, minZ: 21, maxZ: 29.8, height: 3.2, doorX: [8, 9.3] }
export const MANAGER_MEZZ = {
  minX: -26, maxX: -14, minZ: 18.5, maxZ: 29.8, floorY: 3.4,
  office: { minX: -25.6, maxX: -15, minZ: 20.6, maxZ: 29.6, height: 3.0 },
  stair: { fromX: -8.6, toX: -14, minZ: 18.9, maxZ: 20.1 },
}

// ---- Entrance ------------------------------------------------------------------
export const ENTRANCE = { opening: [-10, -3], height: 5.2, canopyDepth: 4.5, securityDesk: [-1.4, 0, 26.2] }
export const COMPOUND = { gateZ: 50, gateOpening: [-13, -1] }

// ---- Dispatch / loading bay ---------------------------------------------------------
export const DISPATCH = {
  platform: { minX: 44.5, maxX: 50, minZ: 7, maxZ: 23, height: 1.1 },
  ramp: { minX: 40.3, maxX: 44.5, minZ: 19.5, maxZ: 23 },
  door: { minZ: 11, maxZ: 17, height: 4.6 },
  truck: { position: [50.35, 0, 14], length: 10.2 },
}

// ---- Yarn receiving door (left wall) ---------------------------------------------
export const RECEIVING_DOOR = { minZ: 3, maxZ: 9, height: 4.4 }

// ---- Material flow path (floor chevrons) -----------------------------------------
// Yarn → Production → Fabric inspection → Finished goods → Dispatch
export const FLOW_SEGMENTS = [
  { stage: 'yarn', color: '#60a5fa', points: [[-36.5, 7.5], [-27, 7.5], [-27, -6.5]] },
  { stage: 'production', color: '#34d399', points: [[-27, -6.5], [13, -6.5]] },
  { stage: 'inspection', color: '#a78bfa', points: [[13, -6.5], [22.5, -6.5]] },
  { stage: 'finished', color: '#fbbf24', points: [[22.5, -6.5], [37.5, -6.5], [37.5, 3]] },
  { stage: 'dispatch', color: '#fb923c', points: [[37.5, 3], [37.5, 14], [43.5, 14]] },
]

// Data links (EMS network) – every zone reports into Accounts + Manager
export const DATA_HUBS = {
  yarn: [-40, 6.4, -9],
  production: [-6, 5.2, -11],
  inspection: [18, 4.2, -6.5],
  finished: [34.4, 6.2, -16],
  dispatch: [38, 4.8, 16],
  accounts: [9, 3.9, 25],
  manager: [-20.3, 7.0, 24.5],
}

// ---- Camera views -------------------------------------------------------------------
export const CAMERA_VIEWS = {
  overview: { label: 'Overview', position: [-18, 78, 96], target: [2, 0, 2] },
  entrance: { label: 'Entrance', position: [-4, 7.5, 62], target: [-6, 4.5, 30] },
  production: { label: 'Production', position: [4, 6.3, 11.5], target: [-8, 0.6, -12] },
  looms: { label: 'Waterjet Looms', position: [-14.5, 3.6, -4.6], target: [-9.8, 1.1, -11.2] },
  yarn: { label: 'Yarn Stock', position: [-25.5, 7.4, 10.5], target: [-41, 1.8, -10] },
  finished: { label: 'Finished Stock', position: [19.5, 6.1, 3], target: [36.5, 1.6, -16] },
  accounts: { label: 'Accounts', position: [5.5, 6.2, 12.2], target: [9.5, 1.2, 25] },
  manager: { label: 'Manager', position: [-12.2, 6.9, 8.8], target: [-20.4, 4.3, 25.5] },
  dispatch: { label: 'Dispatch', position: [30, 7.2, 26], target: [47.5, 1.2, 13] },
}

export const NAV_VIEWS = ['overview', 'production', 'yarn', 'finished', 'accounts', 'manager', 'dispatch']

export const PRESENTATION_STOPS = [
  {
    view: 'entrance', step: 'Factory Entrance', zone: 'entrance',
    title: 'Welcome to Shree Satiji Textiles',
    text: 'Our integrated waterjet weaving plant — every stage from yarn to dispatch under one roof, monitored in real time.',
  },
  {
    view: 'overview', step: 'Production Floor', zone: 'production',
    title: 'The Production Floor',
    text: 'A 100 m × 60 m pre-engineered steel shed laid out in a single forward flow: Yarn → Weaving → Inspection → Finished Goods → Dispatch.',
  },
  {
    view: 'looms', step: 'Waterjet Machines', zone: 'production',
    title: '18 Waterjet Looms',
    text: 'High-speed waterjet looms weaving polyester and nylon filament fabrics at 600+ RPM. Every loom streams RPM, efficiency and power to the EMS.',
  },
  {
    view: 'yarn', step: 'Yarn Stock', zone: 'yarn',
    title: 'Yarn Stock Room',
    text: 'Batch-tracked polyester and nylon filament yarn on steel pallet racking — quantities, reservations and suppliers visible at a glance.',
  },
  {
    view: 'finished', step: 'Finished Stock', zone: 'finished',
    title: 'Finished Goods Warehouse',
    text: 'Inspected, graded fabric rolls stored by lot, with reserved and ready-to-dispatch meters tracked per rack.',
  },
  {
    view: 'accounts', step: 'Accounts Office', zone: 'accounts',
    title: 'Accounts Office',
    text: 'Sales, receivables, payables and invoicing are connected directly to production and stock movements.',
  },
  {
    view: 'manager', step: 'Manager Office', zone: 'manager',
    title: 'Factory Manager’s Office',
    text: 'The mezzanine office overlooks the floor — live efficiency, attendance and maintenance status on one dashboard.',
  },
  {
    view: 'dispatch', step: 'Dispatch Area', zone: 'dispatch',
    title: 'Loading & Dispatch',
    text: 'Orders are picked from finished stock, loaded at the dock and invoiced — completing the flow from yarn to customer.',
  },
]

export const WORKFLOW_STEPS = [
  { id: 'yarn', label: 'Yarn', view: 'yarn' },
  { id: 'production', label: 'Production', view: 'production' },
  { id: 'inspection', label: 'Fabric', view: 'looms' },
  { id: 'finished', label: 'Finished Stock', view: 'finished' },
  { id: 'accounts', label: 'Accounts', view: 'accounts' },
  { id: 'dispatch', label: 'Dispatch', view: 'dispatch' },
]

export function zoneAt(x, z) {
  // offices first (they overlap broader zones)
  const order = ['accounts', 'manager', 'entrance', 'inspection', 'production', 'yarn', 'finished', 'dispatch']
  for (const id of order) {
    const zn = ZONES.find((q) => q.id === id)
    const [x1, z1, x2, z2] = zn.rect
    if (x >= x1 && x <= x2 && z >= z1 && z <= z2) return id
  }
  if (z > 30) return 'entrance'
  return null
}
