import { useEffect } from 'react'
import { getFactorySnapshot, subscribeToLiveUpdates } from '../services/factoryApi'
import { useFactoryStore } from './useFactoryStore'

/** Loads the factory snapshot once and keeps machine data live. */
export function useFactoryData() {
  const setSnapshot = useFactoryStore((s) => s.setSnapshot)
  const setMachines = useFactoryStore((s) => s.setMachines)
  const setError = useFactoryStore((s) => s.setError)

  useEffect(() => {
    let unsub = () => {}
    let cancelled = false
    getFactorySnapshot()
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
