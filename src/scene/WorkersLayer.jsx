// Places every worker from the EMS roster in the scene.
import { useMemo } from 'react'
import { loomPlacements, inspectionPlacements, ENTRANCE, DISPATCH } from '../data/layout'
import { useFactoryStore } from '../hooks/useFactoryStore'
import { Worker } from '../components/Worker'
import { Interactive } from '../components/Interactive'

// Named posts for non-operator staff. Paths are [x, z] waypoints (ping-pong).
const POSTS = {
  'yarn-keeper': { position: [-37.4, 0, -14.5], rotation: -Math.PI / 2 },
  'yarn-carrier': { position: [-37.4, 0, -10], path: [[-37.4, -10], [-37.4, 6.6], [-27.6, 6.6], [-27.6, -6.1], [-12.4, -6.1]], speed: 1.1, pause: 2.2, vest: true },
  'roll-mover': { position: [21.5, 0, -5.8], path: [[21.8, -5.8], [34.2, -5.8], [34.2, -16.2]], speed: 1.0, pause: 2.4, vest: true, carryColor: '#e2ddcf' },
  loader: { position: [46.4, DISPATCH.platform.height, 19], path: [[46.2, 17.6], [47.4, 14.2], [51.6, 14.0]], speed: 0.95, pause: 1.9, vest: true, carryColor: '#28324a' },
  'dispatch-supervisor': { position: [41.6, 0, 10.4], rotation: Math.PI / 2, vest: true },
  'accounts-desk': { position: [5.72, 0, 24.6], rotation: Math.PI / 2 },
  'manager-desk': { position: [-21.22, 3.4, 25.4], rotation: Math.PI / 2 },
  'security-desk': { position: [ENTRANCE.securityDesk[0] + 0.85, 0, ENTRANCE.securityDesk[2] - 0.2], rotation: -Math.PI / 2 },
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
  const ins = inspectionPlacements.find((p) => p.id === worker.station)
  if (ins) return { position: [ins.position[0] - 0.3, 0, ins.position[2] + 1.35], rotation: Math.PI }
  return POSTS[worker.station] || { position: [0, 0, 0], rotation: 0 }
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

  return (
    <group>
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
      {/* visitors in the lounge (not staff – not counted) */}
      <Worker appearance="visitor" activity="sit" position={[-22.4, 0, 28.78]} rotation={Math.PI} seed={91} />
      <Worker appearance="visitorB" activity="sit" position={[-21.6, 0, 28.78]} rotation={Math.PI} seed={92} />
    </group>
  )
}
