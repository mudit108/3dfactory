import { useEffect, useRef, useState } from 'react'
import FactoryScene from './scene/FactoryScene'
import { useFactoryData } from './hooks/useFactoryData'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useFactoryStore } from './hooks/useFactoryStore'
import { Brand, Toolbar, StatusPanel, NavMenu, WorkflowBar, Tooltip } from './ui/Hud'
import MiniMap from './ui/MiniMap'
import DetailPanel from './ui/DetailPanel'
import { WalkthroughOverlay, PresentationOverlay, LoadingScreen, HelpModal } from './ui/Overlays'
import { goToView } from './scene/focus'

function useIsMobile() {
  const q = '(max-width: 767px)'
  const [m, setM] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const mq = window.matchMedia(q)
    const on = () => setM(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return m
}

export default function App() {
  useFactoryData()
  useKeyboardShortcuts()
  const mode = useFactoryStore((s) => s.mode)
  const selected = useFactoryStore((s) => s.selected)
  const mobile = useIsMobile()
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
      <div className="pointer-events-none absolute inset-0 z-20">
        {mode !== 'walk' && (
          <div className="absolute left-3 top-3 flex max-w-[calc(100%-24px)] flex-col gap-2 md:left-4 md:top-4">
            <Brand />
            {mode !== 'present' && <Toolbar />}
            {mobile && orbit && <StatusPanel compact />}
          </div>
        )}
        {mode === 'walk' && (
          <div className="absolute bottom-4 right-4 hidden md:block">
            <MiniMap size="sm" />
          </div>
        )}

        {!mobile && mode !== 'walk' && (
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
            <div className={`absolute ${mobile ? 'bottom-3 left-3 right-3' : 'bottom-4 left-4'}`}>
              <NavMenu horizontal={mobile} />
            </div>
            {!mobile && (
              <div className="absolute bottom-4 left-[212px] right-[290px] hidden justify-center xl:flex">
                <WorkflowBar />
              </div>
            )}
          </>
        )}
        {mobile && orbit && selected && <DetailPanel mobile />}
      </div>

      {mode === 'walk' && <WalkthroughOverlay />}
      {mode === 'present' && <PresentationOverlay />}
      <Tooltip />
      <HelpModal />
      <LoadingScreen />
    </div>
  )
}
