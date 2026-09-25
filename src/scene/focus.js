import * as THREE from 'three'
import { camState, interactiveRegistry } from './cameraState'
import { useFactoryStore } from '../hooks/useFactoryStore'
import { CAMERA_VIEWS } from '../data/layout'

const box = new THREE.Box3()
const center = new THREE.Vector3()
const size = new THREE.Vector3()
const dir = new THREE.Vector3()

export function goToView(name, duration = 2) {
  const v = CAMERA_VIEWS[name]
  if (!v) return
  const st = useFactoryStore.getState()
  st.setActiveView(name)
  st.flyTo(v.position, v.target, duration)
}

export function focusOnKey(key) {
  const obj = interactiveRegistry.get(key)
  const { camera, controls } = camState
  if (!obj || !camera || !controls) return
  box.setFromObject(obj)
  if (box.isEmpty()) return
  box.getCenter(center)
  box.getSize(size)
  const maxDim = Math.max(size.x, size.y, size.z)
  const dist = THREE.MathUtils.clamp(maxDim * 1.5 + 4.5, 5.5, 32)
  dir.copy(camera.position).sub(controls.target)
  dir.y = Math.max(dir.y, 0.0)
  dir.normalize()
  if (dir.y < 0.38) {
    dir.y = 0.38
    dir.normalize()
  }
  const pos = center.clone().addScaledVector(dir, dist)
  pos.y = Math.max(pos.y, 1.6)
  // keep the camera inside the shed when the object is inside (avoids walls/roof)
  const inside = Math.abs(center.x) < 50 && Math.abs(center.z) < 30
  if (inside) {
    pos.x = THREE.MathUtils.clamp(pos.x, -48.5, 48.5)
    pos.z = THREE.MathUtils.clamp(pos.z, -28.5, 28.5)
    pos.y = Math.min(pos.y, Math.max(center.y + 2.5, 7.4))
  }
  useFactoryStore.getState().setActiveView(null)
  useFactoryStore.getState().flyTo(pos.toArray(), center.toArray(), 1.4)
}
