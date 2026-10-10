// ---------------------------------------------------------------------------
// Spatial layout of the weaving shed. Units are metres.
// Building: x -55..55 (110 m), z -22..22 (44 m). +z is the front (factory
// name sign / entrance), -z is the back wall.
// Zones (left → right): Yarn Stock · Waterjet Looms (38) · Finished Stock
// ---------------------------------------------------------------------------

export const BUILDING = {
  length: 110,
  width: 44,
  eaveHeight: 8.5,
  ridgeHeight: 10.2,
  minX: -55,
  maxX: 55,
  minZ: -22,
  maxZ: 22,
  bay: 10,
}

export const ZONES = [
  { id: 'yarn', name: 'Yarn Stock', short: 'YARN STOCK', rect: [-55, -22, -35, 22], color: '#60a5fa' },
  { id: 'production', name: 'Waterjet Looms', short: 'WATERJET LOOMS', rect: [-35, -22, 24, 22], color: '#34d399' },
  { id: 'finished', name: 'Finished Stock', short: 'FINISHED STOCK', rect: [24, -22, 55, 22], color: '#fbbf24' },
]

// ---- Waterjet looms: 4 rows (10 + 10 + 9 + 9 = 38) --------------------------
export const LOOM_COLUMNS = Array.from({ length: 10 }, (_, i) => Math.round((-31.4 + i * 5.6) * 10) / 10)
export const LOOM_ROWS = [-16, -7, 2, 11]
const ROW_COUNTS = [10, 10, 9, 9]
export const LOOM_SIZE = { width: 3.4, depth: 2.2, height: 1.9 }

export const loomPlacements = (() => {
  const list = []
  LOOM_ROWS.forEach((z, r) => {
    for (let c = 0; c < ROW_COUNTS[r]; c++) {
      const n = list.length + 1
      list.push({ id: `WJ-${String(n).padStart(2, '0')}`, position: [LOOM_COLUMNS[c], 0, z], rotation: 0, row: r, col: c })
    }
  })
  return list
})()
export const LOOM_COUNT = loomPlacements.length // 38

// ---- Yarn racks: 4 lines x 3 racks, long axis along z -----------------------
const YARN_LINES = [
  { x: -53.85, face: 1 },
  { x: -47.15, face: -1 },
  { x: -45.95, face: 1 },
  { x: -39.0, face: -1 },
]
const YARN_Z = [-16.4, -7.0, 2.4]
export const yarnRackPlacements = YARN_LINES.flatMap((line, li) =>
  YARN_Z.map((z, zi) => ({
    id: `R-${String(li * 3 + zi + 1).padStart(2, '0')}`,
    position: [line.x, 0, z],
    rotation: line.face === 1 ? Math.PI / 2 : -Math.PI / 2,
  })),
)
export const YARN_RACK = { length: 8.4, depth: 1.1, height: 5.8, bays: 3, levels: [0.12, 1.6, 3.1, 4.6] }

// ---- Finished goods racks: 4 lines x 2 racks, long axis along x --------------
const FG_LINES = [
  { z: -20.9, face: 1 },
  { z: -13.55, face: -1 },
  { z: -11.65, face: 1 },
  { z: -4.3, face: -1 },
]
const FG_X = [34.7, 44.1]
export const finishedRackPlacements = FG_LINES.flatMap((line, li) =>
  FG_X.map((x, xi) => ({
    id: `FG-${String(li * 2 + xi + 1).padStart(2, '0')}`,
    position: [x, 0, line.z],
    rotation: line.face === 1 ? 0 : Math.PI,
  })),
)
export const FG_RACK = { length: 8.4, depth: 1.8, height: 5.2, bays: 3, levels: [0.12, 1.45, 2.8, 4.1] }

// ---- Openings --------------------------------------------------------------------
export const ENTRANCE = { opening: [-4, 3], height: 5.2, canopyDepth: 4.5 }
export const RECEIVING_DOOR = { minZ: 10, maxZ: 16, height: 4.4 } // left wall (yarn in)
export const FG_DOOR = { minZ: 8, maxZ: 14, height: 4.6 } // right wall (fabric out)

// ---- Material flow path (floor chevrons): Yarn → Looms → Finished ---------------
export const FLOW_SEGMENTS = [
  { stage: 'yarn', color: '#60a5fa', points: [[-42.5, 13], [-34.6, 13], [-34.6, -2.5]] },
  { stage: 'production', color: '#34d399', points: [[-34.6, -2.5], [23, -2.5]] },
  { stage: 'finished', color: '#fbbf24', points: [[23, -2.5], [27.5, -2.5], [27.5, -8], [47, -8]] },
]

// ---- Camera views -------------------------------------------------------------------
// `portrait` = framing used on tall phone screens (the 110 m shed is turned so its long side runs into the screen)
export const CAMERA_VIEWS = {
  overview: { label: 'Overview', position: [-24, 68, 86], target: [0, 0, -1], portrait: { position: [-112, 92, 40], target: [-4, 0, -1] } },
  top: { label: 'Top View', position: [0, 120, 0.01], target: [0, 0, 0], portrait: { position: [-0.01, 175, 0], target: [0, 0, 0] } },
  production: { label: 'Waterjet Looms', position: [8, 6.6, 21], target: [-6, 0.6, -5], portrait: { position: [-37.5, 7.2, 13.5], target: [-8, 0.6, -4] } },
  looms: { label: 'Loom Close-up', position: [-12.8, 3.6, 8.6], target: [-8.6, 1.1, 2], portrait: { position: [-11.9, 4.6, 10.4], target: [-8.6, 1.0, 2] } },
  yarn: { label: 'Yarn Stock', position: [-30, 7.4, 17], target: [-46, 1.8, -4], portrait: { position: [-40.2, 9.5, 21.5], target: [-45.5, 1.2, -3] } },
  finished: { label: 'Finished Stock', position: [24, 6.4, 10], target: [40, 1.6, -10], portrait: { position: [29, 6.6, 9], target: [40, 1.4, -12] } },
  entrance: { label: 'Factory Front', position: [-0.5, 7.5, 50], target: [-0.5, 4.5, 22], portrait: { position: [-0.5, 9, 72], target: [-0.5, 4.5, 22] } },
}

export const NAV_VIEWS = ['overview', 'top', 'production', 'looms', 'yarn', 'finished']

export const PRESENTATION_STOPS = [
  {
    view: 'entrance', step: 'Welcome', zone: null,
    title: 'Shree Satiji Textiles',
    text: 'Our waterjet weaving shed — yarn comes in on one side, finished fabric leaves from the other.',
  },
  {
    view: 'overview', step: 'The Shed', zone: 'production',
    title: 'One Straight Flow',
    text: 'A 110 m × 44 m steel shed laid out left to right: Yarn Stock → 38 Waterjet Looms → Finished Stock.',
  },
  {
    view: 'production', step: 'Waterjet Looms', zone: 'production',
    title: '38 Waterjet Looms',
    text: 'Four rows of high-speed waterjet looms weaving polyester and nylon filament fabric. Every loom reports RPM, efficiency and output.',
  },
  {
    view: 'looms', step: 'Loom Close-up', zone: 'production',
    title: 'On the Loom',
    text: 'Warp beam, heald frames, waterjet weft insertion and the take-up roll — one operator per loom.',
  },
  {
    view: 'yarn', step: 'Yarn Stock', zone: 'yarn',
    title: 'Yarn Stock',
    text: 'Batch-tracked polyester and nylon filament yarn on steel pallet racks, with available and reserved quantities per rack.',
  },
  {
    view: 'finished', step: 'Finished Stock', zone: 'finished',
    title: 'Finished Stock',
    text: 'Woven rolls stored by lot, with available, reserved and ready-to-dispatch metres per rack.',
  },
]

export const WORKFLOW_STEPS = [
  { id: 'yarn', label: 'Yarn Stock', view: 'yarn' },
  { id: 'production', label: 'Waterjet Looms', view: 'production' },
  { id: 'finished', label: 'Finished Stock', view: 'finished' },
]

export function zoneAt(x, z) {
  if (x < BUILDING.minX || x > BUILDING.maxX || z < BUILDING.minZ || z > BUILDING.maxZ) return null
  for (const zn of ZONES) {
    const [x1, z1, x2, z2] = zn.rect
    if (x >= x1 && x <= x2 && z >= z1 && z <= z2) return zn.id
  }
  return null
}
