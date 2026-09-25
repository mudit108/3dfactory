import { useEffect } from 'react'
import { useFactoryStore } from './useFactoryStore'
import { NAV_VIEWS } from '../data/layout'
import { goToView } from '../scene/focus'

export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const st = useFactoryStore.getState()
      if (st.mode === 'walk' || st.mode === 'present') return
      const n = Number(e.key)
      if (n >= 1 && n <= NAV_VIEWS.length) {
        st.clearSelection()
        goToView(NAV_VIEWS[n - 1])
        return
      }
      switch (e.code) {
        case 'KeyP':
          st.setPresentIndex(0)
          st.setPresentPaused(false)
          st.setMode('present')
          break
        case 'KeyG':
          st.setMode('walk')
          break
        case 'KeyL':
          st.toggleLabels()
          break
        case 'KeyF':
          st.toggleFlow()
          break
        case 'KeyH':
          st.setHelpOpen(!st.helpOpen)
          break
        case 'Escape':
          if (st.helpOpen) st.setHelpOpen(false)
          else st.clearSelection()
          break
        default:
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
