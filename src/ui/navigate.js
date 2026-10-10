// One place that decides how to "show a loom": on phones open its detail page,
// on bigger screens select it in 3D and fly the camera there.
import { useFactoryStore } from '../hooks/useFactoryStore'
import { focusOnKey } from '../scene/focus'

export function showLoom(id) {
  const st = useFactoryStore.getState()
  if (st.phoneMode) {
    st.setPhoneLoom(id)
    return
  }
  st.select({ type: 'machine', id, key: `machine:${id}` })
  setTimeout(() => focusOnKey(`machine:${id}`), 0)
}

/** Phone: switch to the 3D tab with this loom selected (camera flies there once the scene is up). */
export function showLoomIn3D(id) {
  const st = useFactoryStore.getState()
  st.setPhoneLoom(null)
  st.select({ type: 'machine', id, key: `machine:${id}` })
  if (st.phoneMode && st.phoneTab !== '3d') st.setPhoneTab('3d') // the 3D tab flies to it once the scene is up
  else setTimeout(() => focusOnKey(`machine:${id}`), 0)
}

export function openReports(tab) {
  const st = useFactoryStore.getState()
  if (st.phoneMode) {
    if (tab) useFactoryStore.setState({ reportsTab: tab })
    st.setPhoneTab('reports')
  } else st.setReportsOpen(true, tab)
}
