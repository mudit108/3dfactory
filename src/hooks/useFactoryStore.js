import { create } from 'zustand'

export const useFactoryStore = create((set, get) => ({
  // ---- data (from services/factoryApi) ----
  loaded: false,
  error: null,
  machines: [],
  yarnInventory: [],
  finishedStock: [],
  workers: [],
  accounts: null,
  dispatch: null,
  qualityData: {},
  maintenance: [],
  company: null,
  setSnapshot: (s) => set({ ...s, loaded: true }),
  setMachines: (updater) =>
    set((st) => ({ machines: typeof updater === 'function' ? updater(st.machines) : updater })),
  setError: (error) => set({ error }),

  // ---- interaction ----
  hovered: null, // { key, label, sub, status }
  selected: null, // { type, id, key }
  setHovered: (hovered) => set({ hovered }),
  select: (sel) => set({ selected: sel }),
  clearSelection: () => set({ selected: null }),

  // ---- camera / modes ----
  mode: 'orbit', // 'orbit' | 'walk' | 'present'
  setMode: (mode) => set({ mode, selected: null, hovered: null }),
  flight: null, // { position, target, duration, id }
  flyTo: (position, target, duration = 1.8) => set({ flight: { position, target, duration, id: Math.random() } }),
  activeView: 'overview',
  setActiveView: (activeView) => set({ activeView }),
  currentZone: null,
  setCurrentZone: (currentZone) => (get().currentZone !== currentZone ? set({ currentZone }) : null),

  // presentation
  presentIndex: 0,
  presentPaused: false,
  setPresentIndex: (presentIndex) => set({ presentIndex }),
  setPresentPaused: (presentPaused) => set({ presentPaused }),

  // walkthrough
  walkLocked: false,
  setWalkLocked: (walkLocked) => set({ walkLocked }),
  walkLockRequest: 0,
  requestWalkLock: () => set((s) => ({ walkLockRequest: s.walkLockRequest + 1 })),
  walkInput: { forward: 0, right: 0 }, // for on-screen touch pad

  // ---- display options ----
  showLabels: true,
  showFlow: true,
  quality: 'high', // 'high' | 'balanced' | 'performance'
  toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
  toggleFlow: () => set((s) => ({ showFlow: !s.showFlow })),
  setQuality: (q) => set({ quality: q }),
  helpOpen: false,
  setHelpOpen: (helpOpen) => set({ helpOpen }),
  sceneReady: false,
  setSceneReady: () => set({ sceneReady: true }),
}))

// ---- derived selectors ----
export function computeSummary(state) {
  const { machines, workers } = state
  const running = machines.filter((m) => m.status === 'running')
  const production = machines.reduce((a, m) => a + m.production, 0)
  const efficiency = running.length ? running.reduce((a, m) => a + m.efficiency, 0) / running.length : 0
  return {
    machinesTotal: machines.length,
    machinesRunning: running.length,
    machinesIdle: machines.filter((m) => m.status === 'idle').length,
    machinesMaintenance: machines.filter((m) => m.status === 'maintenance').length,
    workersPresent: workers.length,
    production,
    efficiency,
    power: machines.reduce((a, m) => a + m.power, 0),
    pendingMaintenance: state.maintenance?.length ?? 0,
  }
}
