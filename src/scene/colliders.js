// 2D (x/z) axis-aligned collision boxes for Walkthrough Mode: [x1, z1, x2, z2]
import { loomPlacements, yarnRackPlacements, finishedRackPlacements, ENTRANCE, RECEIVING_DOOR, FG_DOOR, BUILDING, LOOM_COLUMNS, LOOM_ROWS } from '../data/layout'

export function buildColliders() {
  const c = []
  for (const p of loomPlacements) {
    const [x, , z] = p.position
    c.push([x - 2.35, z - 1.45, x + 2.35, z + 1.15])
  }
  for (const p of yarnRackPlacements) {
    const [x, , z] = p.position
    c.push([x - 0.65, z - 4.3, x + 0.65, z + 4.3])
  }
  for (const p of finishedRackPlacements) {
    const [x, , z] = p.position
    c.push([x - 4.3, z - 1.0, x + 4.3, z + 1.0])
  }
  // roll stacks at the end of rows 3-4
  for (const z of [LOOM_ROWS[2], LOOM_ROWS[3]]) c.push([LOOM_COLUMNS[9] - 1.2, z - 0.9, LOOM_COLUMNS[9] + 1.2, z + 1.3])
  // stores clutter
  c.push([-52.3, 8.6, -49, 19.4], [-44.3, 16, -42.9, 19.6], [-41.4, 19.2, -39.8, 20.4], [-48.1, 17, -46.7, 18.4])
  c.push([50.8, -21, 53, -8.4], [48.8, -0.2, 52.2, 5.4], [47.6, 15.6, 52.6, 20.4])
  // back wall equipment: water tanks, spare beams, MCC
  c.push([-28.8, -21.8, -23.4, -19.4], [-12.6, -20.7, 0.8, -19.7], [-2.5, -22, 2.2, -20.9])
  // walls (with door openings)
  const { minX, maxX, minZ, maxZ } = BUILDING
  const [o0, o1] = ENTRANCE.opening
  c.push([minX - 0.4, minZ - 0.4, maxX + 0.4, minZ + 0.3])
  c.push([minX - 0.4, maxZ - 0.3, o0, maxZ + 0.4], [o1, maxZ - 0.3, maxX + 0.4, maxZ + 0.4])
  c.push([minX - 0.4, minZ, minX + 0.3, RECEIVING_DOOR.minZ], [minX - 0.4, RECEIVING_DOOR.maxZ, minX + 0.3, maxZ])
  c.push([maxX - 0.3, minZ, maxX + 0.4, FG_DOOR.minZ], [maxX - 0.3, FG_DOOR.maxZ, maxX + 0.4, maxZ])
  // canopy columns + parked door leaves outside the entrance
  c.push([o0 - 1.5, 25.9, o0 - 0.9, 26.5], [o1 + 0.9, 25.9, o1 + 1.5, 26.5], [o0 - 3.8, 22.3, o0 - 0.1, 22.8], [o1 + 0.1, 22.3, o1 + 3.8, 22.8])
  return c
}

export const WALK_BOUNDS = [-80, -50, 80, 48]
export const WALK_START = { position: [-0.5, 1.65, 32], yaw: 0 }
