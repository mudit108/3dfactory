// 2D (x/z) axis-aligned collision boxes for Walkthrough Mode: [x1, z1, x2, z2]
import {
  loomPlacements, inspectionPlacements, yarnRackPlacements, finishedRackPlacements, ACCOUNTS_OFFICE as AO,
  MANAGER_MEZZ as MZ, DISPATCH, ENTRANCE, RECEIVING_DOOR,
} from '../data/layout'

export function buildColliders() {
  const c = []
  for (const p of loomPlacements) {
    const [x, , z] = p.position
    c.push([x - 2.35, z - 1.45, x + 2.35, z + 1.15])
  }
  for (const p of inspectionPlacements) {
    const [x, , z] = p.position
    c.push([x - 2.4, z - 0.8, x + 2.0, z + 0.9])
  }
  for (const p of yarnRackPlacements) {
    const [x, , z] = p.position
    c.push([x - 0.65, z - 4.3, x + 0.65, z + 4.3])
  }
  for (const p of finishedRackPlacements) {
    const [x, , z] = p.position
    c.push([x - 4.3, z - 1.0, x + 4.3, z + 1.0])
  }
  // offices, mezzanine stair & columns
  c.push([AO.minX, AO.minZ, AO.maxX, AO.maxZ])
  c.push([MZ.stair.toX, MZ.stair.minZ - 0.1, MZ.stair.fromX, MZ.stair.maxZ + 0.1])
  for (const [x, z] of [[-25.8, 18.7], [-20, 18.7], [-14.2, 18.7], [-25.8, 24.2], [-14.2, 24.2], [-20, 24.2]]) c.push([x - 0.3, z - 0.3, x + 0.3, z + 0.3])
  c.push([-25.3, 24.8, -24.2, 26.8], [-23.3, 28.3, -20.7, 29.8], [-22.6, 26.9, -21.4, 27.5])
  // security desk
  const [sx, , sz] = ENTRANCE.securityDesk
  c.push([sx - 0.4, sz - 1.15, sx + 1.1, sz + 1.65])
  // interior column row
  for (let x = -40; x <= 40; x += 10) c.push([x - 0.35, 12.65, x + 0.35, 13.4])
  // dispatch platform, ramp, staging bays, order board
  const P = DISPATCH.platform
  c.push([P.minX, P.minZ, P.maxX, P.maxZ], [DISPATCH.ramp.minX, DISPATCH.ramp.minZ, DISPATCH.ramp.maxX, DISPATCH.ramp.maxZ])
  for (const [x, z] of [[27, 7], [31, 7], [35, 7], [27, 24], [31, 24], [35, 24]]) c.push([x - 1.1, z - 1.1, x + 1.1, z + 1.1])
  c.push([32.5, 15.6, 34.5, 16])
  // stores clutter
  c.push([-47.3, 1.4, -44.1, 11.3], [-39.3, 7.8, -37.9, 11.6], [-37.1, 11, -35.8, 12.2], [-43.2, 8.8, -41.8, 10.2])
  c.push([44, -28.6, 49.5, -3.8], [19.8, -10, 21.8, -7], [19.8, 2.2, 21.8, 4.3])
  c.push([-25.2, -29.6, -17, -27], [-21.7, -28.4, -8.3, -27.2], [-2.5, -30, 2.2, -28.9])
  // walls (with openings)
  const [o0, o1] = ENTRANCE.opening
  c.push([-50.4, -30.4, 50.4, -29.7]) // back
  c.push([-50.4, 29.7, o0, 30.4], [o1, 29.7, 50.4, 30.4]) // front with entrance
  c.push([-50.4, -30.4, -49.7, RECEIVING_DOOR.minZ], [-50.4, RECEIVING_DOOR.maxZ, -49.7, 30.4]) // left
  c.push([49.7, -30.4, 50.4, 30.4]) // right (dock blocked by platform anyway)
  // canopy columns + open door leaves outside
  c.push([-11.4, 33.9, -10.9, 34.5], [-2.1, 33.9, -1.6, 34.5], [-13.7, 30.3, -10.1, 30.8], [-2.9, 30.3, 0.7, 30.8])
  // cars
  c.push([7.5, 38, 11.5, 43], [13.5, 38, 17.5, 43], [19.5, 38, 23.5, 43])
  // guard cabin
  c.push([1.2, 46.6, 4.4, 49])
  return c
}

export const WALK_BOUNDS = [-77, -44, 77, 49.5]
export const WALK_START = { position: [-6.5, 1.65, 36], yaw: 0 }
