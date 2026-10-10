import { useEffect } from 'react'
import { getFactorySnapshot, subscribeToLiveUpdates } from '../services/factoryApi'
import { loadSettings } from '../services/settingsService'
import { useFactoryStore } from './useFactoryStore'
import { readViewport } from './useViewport'

/** Loads the factory snapshot once and keeps machine data live. */
export function useFactoryData() {
  const setSnapshot = useFactoryStore((s) => s.setSnapshot)
  const setMachines = useFactoryStore((s) => s.setMachines)
  const setError = useFactoryStore((s) => s.setError)

  useEffect(() => {
    const onSummary = (e) => useFactoryStore.getState().setEmsSummary(e.detail)
    window.addEventListener('ems-summary', onSummary)
    return () => window.removeEventListener('ems-summary', onSummary)
  }, [])

  useEffect(() => {
    let unsub = () => {}
    let cancelled = false
    loadSettings()
      .then((settings) => {
        if (!cancelled) {
          const st = useFactoryStore.getState()
          st.applySettings(settings, { display: true })
          // phones start one step lighter (no ambient occlusion, smaller shadow maps); can be raised from the menu
          if (readViewport().mobile && useFactoryStore.getState().quality === 'high') st.setQuality('balanced')
        }
        return getFactorySnapshot()
      })
      .then((snap) => {
        if (cancelled) return
        setSnapshot(snap)
        unsub = subscribeToLiveUpdates(setMachines)
      })
      .catch((e) => setError(e.message))
    return () => {
      cancelled = true
      unsub()
    }
  }, [setSnapshot, setMachines, setError])
}
