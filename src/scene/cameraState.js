// Mutable camera state shared between the 3D scene and DOM overlays (minimap)
// without triggering React re-renders every frame.
export const camState = {
  camera: null,
  controls: null,
  x: 0,
  y: 0,
  z: 0,
  yaw: 0,
  targetX: 0,
  targetZ: 0,
}

// Registry of interactive objects: key -> Object3D (for highlight + focus)
export const interactiveRegistry = new Map()
