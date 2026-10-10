// Places staff in the scene: loom operators come from the saved roster +
// today's attendance (each tends a block of looms), other staff from the EMS list.
import { useMemo } from 'react'
import { loomPlacements, LOOM_ROWS } from '../data/layout'
import { useFactoryStore } from '../hooks/useFactoryStore'
import { Worker } from '../components/Worker'
import { Interactive } from '../components/Interactive'

// Named posts for non-operator staff. Paths are [x, z] waypoints (ping-pong).
const POSTS = {
  'yarn-keeper': { position: [-42.4, 0, -7.5], rotation: -Math.PI / 2 },
  'yarn-carrier': { position: [-42.4, 0, -4], path: [[-42.4, -4], [-42.4, 12.4], [-35.2, 12.4], [-35.2, -2.2], [-16, -2.2]], speed: 1.1, pause: 2.2, vest: true },
  'roll-mover': { position: [20.6, 0, -2.2], path: [[20.6, -2.2], [27.0, -2.2], [27.0, -8.2], [38.5, -8.2]], speed: 1.0, pause: 2.4, vest: true, carryColor: '#e2ddcf' },
  'fg-keeper': { position: [41.5, 0, -17.2], rotation: Math.PI },
}

function postFor(worker, machinesById) {
  const loom = loomPlacements.find((p) => p.id === worker.station)
  if (loom) {
    const m = machinesById[loom.id]
    const [x, , z] = loom.position
    if (m?.status === 'maintenance') return { position: [x - 2.35, 0, z + 0.35], rotation: Math.PI / 2 }
    if (m?.status === 'idle') return { position: [x + 1.2, 0, z + 1.75], rotation: Math.PI * 0.85 }
    return { position: [x + 0.2, 0, z + 1.6], rotation: Math.PI }
  }
  return POSTS[worker.station] || { position: [0, 0, 0], rotation: 0 }
}

const AISLE_L = -35.6
const AISLE_R = 22.6
const loomById = Object.fromEntries(loomPlacements.map((p) => [p.id, p]))
const front = (id) => {
  const p = loomById[id]
  return [p.position[0] + 0.2, p.position[2] + 1.6]
}

/** Walking route through an operator's looms (via side aisles between rows). */
function operatorRoute(ids) {
  const pts = []
  const stopIdx = []
  ids.forEach((id, i) => {
    const f = front(id)
    if (i > 0) {
      const prev = loomById[ids[i - 1]]
      const cur = loomById[id]
      if (prev.row !== cur.row) {
        const pf = front(ids[i - 1])
        const side = (pf[0] + f[0]) / 2 < -6 ? AISLE_L : AISLE_R
        pts.push([side, pf[1]], [side, f[1]])
      }
    }
    stopIdx.push(pts.length)
    pts.push(f)
  })
  // distances of each stop along the route
  const dist = [0]
  for (let i = 1; i < pts.length; i++) dist.push(dist[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  return { path: pts, stops: stopIdx.map((k) => dist[k]) }
}

function OperatorWalker({ assignment, index }) {
  const { op, machines } = assignment
  const route = useMemo(() => (machines.length > 1 ? operatorRoute(machines) : null), [machines])
  const single = machines.length === 1 ? front(machines[0]) : null
  const idle = machines.length === 0
  const p = route ? [route.path[0][0], 0, route.path[0][1]] : single ? [single[0], 0, single[1]] : [AISLE_L, 0, LOOM_ROWS[0] + 3 + index * 1.2]
  return (
    <Interactive type="worker" id={op.id} label={`${op.name} (${op.id})`} sub={`Loom operator · ${machines.length} looms`}>
      <Worker
        appearance={index % 5}
        activity={route ? 'tend' : idle ? 'lookAround' : 'operate'}
        position={p}
        rotation={Math.PI}
        path={route?.path}
        stops={route?.stops}
        speed={0.9}
        seed={index + 3}
        scale={0.96 + ((index * 37) % 9) / 100}
      />
    </Interactive>
  )
}

export default function WorkersLayer() {
  const workers = useFactoryStore((s) => s.workers)
  const machines = useFactoryStore((s) => s.machines)
  const statusKey = machines.map((m) => m.status).join(',')
  const machinesById = useMemo(
    () => Object.fromEntries(machines.map((m) => [m.id, m])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [statusKey],
  )
  const placed = useMemo(() => workers.map((w, i) => ({ w, i, post: postFor(w, machinesById) })), [workers, machinesById])
  const assignments = useFactoryStore((s) => s.staffing?.assignments) || []

  return (
    <group>
      {assignments.map((a, i) => (
        <OperatorWalker key={a.op.id + ':' + a.machines.join(',')} assignment={a} index={i} />
      ))}
      {placed.map(({ w, i, post }) => (
        <Interactive key={w.id} type="worker" id={w.id} label={`${w.name} (${w.id})`} sub={w.role}>
          <Worker
            appearance={w.appearance}
            activity={w.activity}
            position={post.position}
            rotation={post.rotation ?? 0}
            path={post.path}
            speed={post.speed}
            pause={post.pause}
            vest={post.vest}
            carryColor={post.carryColor}
            seed={i + 1}
            scale={0.96 + ((i * 37) % 9) / 100}
          />
        </Interactive>
      ))}
    </group>
  )
}
