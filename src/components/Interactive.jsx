import { useEffect, useRef } from 'react'
import { useFactoryStore } from '../hooks/useFactoryStore'
import { interactiveRegistry } from '../scene/cameraState'
import { focusOnKey, goToView } from '../scene/focus'

/**
 * Wraps any group of meshes and makes it hoverable/clickable.
 * type + id identify the record shown in the side panel.
 */
export function Interactive({ type, id, label, sub, status, view, children, ...groupProps }) {
  const ref = useRef()
  const key = `${type}:${id}`

  useEffect(() => {
    const obj = ref.current
    interactiveRegistry.set(key, obj)
    return () => {
      if (interactiveRegistry.get(key) === obj) interactiveRegistry.delete(key)
    }
  }, [key])

  const onOver = (e) => {
    const st = useFactoryStore.getState()
    if (st.mode !== 'orbit') return
    e.stopPropagation()
    if (st.hovered?.key !== key) st.setHovered({ key, label, sub, status })
    document.body.style.cursor = 'pointer'
  }
  const onOut = () => {
    const st = useFactoryStore.getState()
    if (st.hovered?.key === key) {
      st.setHovered(null)
      document.body.style.cursor = 'auto'
    }
  }
  const onClick = (e) => {
    const st = useFactoryStore.getState()
    if (st.mode !== 'orbit') return
    e.stopPropagation()
    if (e.delta > 6) return // it was a drag
    st.select({ type, id, key })
    if (view) goToView(view, 1.6)
    else focusOnKey(key)
  }

  return (
    <group ref={ref} onPointerOver={onOver} onPointerOut={onOut} onClick={onClick} {...groupProps}>
      {children}
    </group>
  )
}
