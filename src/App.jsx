import { useEffect, useRef } from 'react'
import FactoryScene from './scene/FactoryScene'
import { useFactoryData } from './hooks/useFactoryData'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useFactoryStore } from './hooks/useFactoryStore'
import { Brand, Toolbar, StatusPanel, NavMenu, WorkflowBar, Tooltip } from './ui/Hud'
import MiniMap from './ui/MiniMap'
import DetailPanel from './ui/DetailPanel'
import SettingsModal from './ui/SettingsModal'
import { WalkthroughOverlay, PresentationOverlay, LoadingScreen, HelpModal } from './ui/Overlays'
import { goToView } from './scene/focus'
import { useViewport } from './hooks/useViewport'
import MobileHud from './ui/MobileHud'
import Assistant from './ui/Assistant'

export default function App() {
  useFactoryData()
  useKeyboardShortcuts()
  const mode = useFactoryStore((s) => s.mode)
  const selected = useFactoryStore((s) => s.selected)
  const { mobile, landscape, portrait } = useViewport()
  const firstOrient = useRef(true)

  // phone rotated → re-frame the current camera view for the new screen shape
  useEffect(() => {
    if (firstOrient.current) {
      firstOrient.current = false
      return
    }
    const st = useFactoryStore.getState()
    if (st.mode === 'orbit' && !st.selected && st.activeView) goToView(st.activeView, 1.2)
  }, [portrait])
  const prevMode = useRef(mode)

  // leaving walkthrough → fly back to the overview
  useEffect(() => {
    if (prevMode.current === 'walk' && mode === 'orbit') setTimeout(() => goToView('overview', 1.6), 30)
    prevMode.current = mode
    document.body.style.cursor = 'auto'
  }, [mode])

  const orbit = mode === 'orbit'

  return (
    <div className="relative h-full w-full select-none">
      <div className="absolute inset-0">
        <FactoryScene />
      </div>

      {/* HUD */}
      {mobile ? (
        <div className="pointer-events-none absolute inset-0 z-20">
          <MobileHud landscape={landscape} />
          {orbit && selected && <DetailPanel mobile landscape={landscape} />}
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-0 z-20">
          {!(mode === 'walk' || mode === 'fly') && (
            <div className="absolute left-4 top-4 flex max-w-[calc(100%-24px)] flex-col gap-2">
              <Brand />
              {mode !== 'present' && <Toolbar />}
            </div>
          )}
          {(mode === 'walk' || mode === 'fly') && (
            <div className="absolute bottom-4 right-4">
              <MiniMap size="sm" />
            </div>
          )}

          {!(mode === 'walk' || mode === 'fly') && (
            <div className="absolute bottom-4 right-4 top-4 flex flex-col items-end gap-3">
              {orbit && selected ? (
                <div className="min-h-0 flex-1">
                  <DetailPanel />
                </div>
              ) : (
                <>
                  <StatusPanel />
                  <div className="flex-1" />
                </>
              )}
              <MiniMap size={selected ? 'sm' : 'md'} />
            </div>
          )}

          {orbit && (
            <>
              <div className="absolute bottom-4 left-4">
                <NavMenu />
              </div>
              <div className="absolute bottom-4 left-[212px] right-[290px] hidden justify-center xl:flex">
                <WorkflowBar />
              </div>
            </>
          )}
        </div>
      )}

      {(mode === 'walk' || mode === 'fly') && <WalkthroughOverlay />}
      {mode === 'present' && <PresentationOverlay />}
      <Tooltip />
      <HelpModal />
      <SettingsModal />
      <Assistant />
      <LoadingScreen />
    </div>
  )
}
