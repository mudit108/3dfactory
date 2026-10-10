import { create } from 'zustand'
import { computeStaffing, applyMachineSettings } from '../services/staffing'

export const useFactoryStore = create((set, get) => ({
  // ---- data (from services/factoryApi) ----
  loaded: false,
  error: null,
  machines: [],
  emsSummary: null, // header numbers + filter counts exactly as the EMS reports them (LIVE only)
  setEmsSummary: (emsSummary) => set({ emsSummary }),
  yarnInventory: [],
  finishedStock: [],
  workers: [],
  accounts: null,
  dispatch: null,
  qualityData: {},
  maintenance: [],
  company: null,
  setSnapshot: (s) =>
    set((st) => ({
      ...s,
      // loom operators come from the saved roster + attendance (Settings); the
      // EMS worker list supplies the other staff
      workers: s.workers.filter((w) => w.department !== 'Weaving'),
      machines: applyMachineSettings(s.machines, st.settings),
      loaded: true,
    })),

  // ---- saved settings (operators, attendance, staffing ratio…) ----
  settings: null,
  staffing: null,
  settingsOpen: false,
  settingsTab: 'general',
  setSettingsOpen: (settingsOpen, settingsTab) => set((st) => ({ settingsOpen, settingsTab: settingsTab || st.settingsTab })),
  applySettings: (settings, { display = false } = {}) =>
    set((st) => ({
      settings,
      staffing: computeStaffing(settings),
      machines: applyMachineSettings(st.machines, settings),
      ...(display
        ? { showLabels: settings.display.showLabels, showFlow: settings.display.showFlow, openView: settings.display.openView, quality: settings.display.quality }
        : {}),
    })),
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
  mode: 'orbit', // 'orbit' | 'walk' | 'fly' | 'present'
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
  walkInput: { forward: 0, right: 0, up: 0 }, // for on-screen touch pad

  // ---- display options ----
  showLabels: true,
  showFlow: true,
  openView: true, // hide roof, lights & exterior skin for an unobstructed view
  cameraInside: false, // camera is inside the shed (below the eaves) → roof & lights shown even in open view
  setCameraInside: (v) => set({ cameraInside: v }),
  soundOn: false, // procedural shop-floor sound (needs a click to start audio)
  setSoundOn: (v) => set({ soundOn: v }),
  toggleOpenView: () => set((s) => ({ openView: !s.openView })),
  quality: 'high', // 'high' | 'balanced' | 'performance'
  toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
  toggleFlow: () => set((s) => ({ showFlow: !s.showFlow })),
  setQuality: (q) => set({ quality: q }),
  // ---- reports / history / heatmap ----
  history: null, // { mode, today, days, at } from services/historyApi
  historyError: null,
  setHistory: (history) => set({ history, historyError: null }),
  setHistoryError: (historyError) => set({ historyError }),
  reportsOpen: false,
  reportsTab: 'today',
  setReportsOpen: (reportsOpen, reportsTab) => set((st) => ({ reportsOpen, reportsTab: reportsTab || st.reportsTab })),
  colorBy: 'off', // floor heatmap under the looms: 'off' | 'efficiency' | 'production' | 'stops' | 'beam'
  setColorBy: (colorBy) => set({ colorBy }),
  // ---- phone app (bottom tabs) ----
  phoneMode: false, // true while the phone layout is on screen
  setPhoneMode: (phoneMode) => (get().phoneMode !== phoneMode ? set({ phoneMode }) : null),
  phoneTab: 'home', // 'home' | 'looms' | '3d' | 'reports' | 'ask'
  setPhoneTab: (phoneTab) => set({ phoneTab }),
  phoneLoom: null, // loom id open in the phone detail page
  setPhoneLoom: (phoneLoom) => set({ phoneLoom }),
  // assistant chat (kept here so it survives switching tabs)
  chat: [],
  setChat: (updater) => set((st) => ({ chat: typeof updater === 'function' ? updater(st.chat) : updater })),
  helpOpen: false,
  setHelpOpen: (helpOpen) => set({ helpOpen }),
  sceneReady: false,
  setSceneReady: () => set({ sceneReady: true }),
}))

// ---- derived selectors ----
export function computeSummary(state) {
  const { machines, workers, staffing } = state
  const running = machines.filter((m) => m.status === 'running')
  const ems = state.emsSummary
  const production = ems ? ems.production : machines.reduce((a, m) => a + m.production, 0)
  const efficiency = ems?.efficiency ?? (running.length ? running.reduce((a, m) => a + m.efficiency, 0) / running.length : 0)
  return {
    machinesTotal: machines.length,
    machinesRunning: running.length,
    machinesIdle: machines.filter((m) => m.status === 'idle').length,
    machinesMaintenance: machines.filter((m) => m.status === 'maintenance').length,
    workersPresent: workers.length + (staffing?.present.length ?? 0),
    operatorsPresent: staffing?.present.length ?? 0,
    operatorsRoster: staffing?.roster.length ?? 0,
    operatorsRequired: staffing?.requiredOperators ?? 0,
    uncovered: staffing?.uncovered.length ?? 0,
    perOperator: staffing?.perOperator ?? 0,
    production,
    efficiency,
    power: machines.reduce((a, m) => a + m.power, 0),
    pendingMaintenance: state.maintenance?.length ?? 0,
    ems,
  }
}
