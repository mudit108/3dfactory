import { useEffect, useRef, useState } from 'react'
import { Plane, ChevronsUp, ChevronsDown, Footprints, MousePointer2, Keyboard, X, Play, Pause, SkipForward, SkipBack, Square, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Move, RotateCcw, ZoomIn, Hand } from 'lucide-react'
import { useFactoryStore } from '../hooks/useFactoryStore'
import { PRESENTATION_STOPS } from '../data/layout'
import { goToView } from '../scene/focus'

const isTouch = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

export function WalkthroughOverlay() {
  const locked = useFactoryStore((s) => s.walkLocked)
  const requestLock = useFactoryStore((s) => s.requestWalkLock)
  const fly = useFactoryStore((s) => s.mode === 'fly')
  const [touch] = useState(isTouch)
  const Icon = fly ? Plane : Footprints
  const title = fly ? 'FREE FLY MODE' : 'WALKTHROUGH MODE'
  // the controls listen for Escape and handle the exit (fly keeps your viewpoint)
  const exit = () => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape' }))
  const stopPad = () => useFactoryStore.setState({ walkInput: { forward: 0, right: 0, up: 0 } })
  const pad = (forward, right, up = 0) => ({
    onPointerDown: (e) => {
      e.preventDefault()
      useFactoryStore.setState({ walkInput: { forward, right, up } })
    },
    onPointerUp: stopPad,
    onPointerLeave: stopPad,
    onPointerCancel: stopPad,
    onContextMenu: (e) => e.preventDefault(),
  })
  return (
    <>
      {/* crosshair */}
      <div className="pointer-events-none fixed left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2">
        <div className="h-5 w-5 rounded-full border-2 border-white/70 shadow-[0_0_8px_rgba(0,0,0,0.6)]" />
      </div>
      <div className="safe-top pointer-events-none fixed inset-x-0 top-0 z-30 flex justify-center px-2 md:pt-4">
        <div className="glass pointer-events-auto flex items-center gap-3 rounded-2xl px-3 py-2 md:gap-4 md:px-4 md:py-2.5">
          <div className="flex items-center gap-2 whitespace-nowrap text-[12px] font-extrabold tracking-[0.16em] text-cyan-300 md:text-sm md:tracking-[0.2em]">
            <Icon className="h-4 w-4" /> {title}
          </div>
          {touch && <div className="hidden whitespace-nowrap text-[11px] text-slate-400 min-[400px]:block">Drag to look</div>}
          <div className={`hidden items-center gap-3 text-[12px] text-slate-300 ${touch ? '' : 'md:flex'}`}>
            <span><kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[11px]">WASD</kbd> Move</span>
            <span><kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[11px]">Mouse</kbd> Look</span>
            {fly && <span><kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[11px]">Space / Q</kbd> Up / Down</span>}
            <span><kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[11px]">Shift</kbd> {fly ? 'Fast' : 'Run'}</span>
            <span><kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[11px]">ESC</kbd> Exit</span>
          </div>
          <button onClick={exit} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20">Exit</button>
        </div>
      </div>
      {!locked && !touch && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/40 backdrop-blur-[2px]" onClick={requestLock}>
          <div className="glass fade-in cursor-pointer rounded-3xl px-8 py-7 text-center">
            <Icon className="mx-auto h-10 w-10 text-cyan-300" />
            <div className="mt-3 text-xl font-extrabold tracking-[0.18em] text-white">{title}</div>
            {fly && <div className="mt-1 text-[13px] text-slate-300">Fly anywhere — no walls, no limits. <b>Space/E</b> up · <b>Q/C</b> down · <b>Shift</b> fast</div>}
            <div className="mt-4 grid grid-cols-3 gap-3 text-[13px] text-slate-300">
              <div className="rounded-xl bg-white/5 p-3"><Keyboard className="mx-auto mb-1 h-5 w-5" /><b>WASD</b><br />Move</div>
              <div className="rounded-xl bg-white/5 p-3"><MousePointer2 className="mx-auto mb-1 h-5 w-5" /><b>Mouse</b><br />Look</div>
              <div className="rounded-xl bg-white/5 p-3"><X className="mx-auto mb-1 h-5 w-5" /><b>ESC</b><br />Exit</div>
            </div>
            <div className="mt-5 rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-bold text-slate-900">{fly ? 'Click to start flying' : 'Click to start walking'}</div>
            <button
              className="mt-3 text-xs text-slate-400 underline"
              onClick={(e) => {
                e.stopPropagation()
                exit()
              }}
            >
              {fly ? 'Back to orbit view' : 'Back to overview'}
            </button>
          </div>
        </div>
      )}
      {touch && (
        <>
          <div className="safe-bottom safe-x fixed bottom-0 left-0 z-30 grid select-none grid-cols-3 gap-1.5 p-3">
            <span />
            <button aria-label="Forward" className="glass flex h-14 w-14 items-center justify-center rounded-2xl active:bg-white/20" {...pad(1, 0)}><ArrowUp className="h-6 w-6" /></button>
            <span />
            <button aria-label="Left" className="glass flex h-14 w-14 items-center justify-center rounded-2xl active:bg-white/20" {...pad(0, -1)}><ArrowLeft className="h-6 w-6" /></button>
            <button aria-label="Back" className="glass flex h-14 w-14 items-center justify-center rounded-2xl active:bg-white/20" {...pad(-1, 0)}><ArrowDown className="h-6 w-6" /></button>
            <button aria-label="Right" className="glass flex h-14 w-14 items-center justify-center rounded-2xl active:bg-white/20" {...pad(0, 1)}><ArrowRight className="h-6 w-6" /></button>
          </div>
          {fly && (
            <div className="safe-bottom safe-x fixed bottom-0 right-0 z-30 flex select-none flex-col gap-1.5 p-3">
              <button aria-label="Up" className="glass flex h-14 w-14 items-center justify-center rounded-2xl active:bg-white/20" {...pad(0, 0, 1)}><ChevronsUp className="h-6 w-6" /></button>
              <button aria-label="Down" className="glass flex h-14 w-14 items-center justify-center rounded-2xl active:bg-white/20" {...pad(0, 0, -1)}><ChevronsDown className="h-6 w-6" /></button>
            </div>
          )}
        </>
      )}
    </>
  )
}

const FLIGHT = 3.0
const DWELL = 6.5

export function PresentationOverlay() {
  const index = useFactoryStore((s) => s.presentIndex)
  const paused = useFactoryStore((s) => s.presentPaused)
  const setIndex = useFactoryStore((s) => s.setPresentIndex)
  const setPaused = useFactoryStore((s) => s.setPresentPaused)
  const setMode = useFactoryStore((s) => s.setMode)
  const [progress, setProgress] = useState(0)
  const elapsed = useRef(0)
  const stop = PRESENTATION_STOPS[index]
  const total = FLIGHT + DWELL

  useEffect(() => {
    elapsed.current = 0
    setProgress(0)
    goToView(stop.view, FLIGHT)
    useFactoryStore.getState().setActiveView(stop.view)
  }, [index, stop.view])

  useEffect(() => {
    let last = performance.now()
    let raf
    const tick = (now) => {
      const dt = (now - last) / 1000
      last = now
      if (!useFactoryStore.getState().presentPaused) {
        elapsed.current += dt
        setProgress(Math.min(1, elapsed.current / total))
        if (elapsed.current >= total) {
          const st = useFactoryStore.getState()
          st.setPresentIndex((st.presentIndex + 1) % PRESENTATION_STOPS.length)
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [total])

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space') {
        e.preventDefault()
        setPaused(!useFactoryStore.getState().presentPaused)
      }
      if (e.code === 'ArrowRight') setIndex((useFactoryStore.getState().presentIndex + 1) % PRESENTATION_STOPS.length)
      if (e.code === 'ArrowLeft') setIndex((useFactoryStore.getState().presentIndex - 1 + PRESENTATION_STOPS.length) % PRESENTATION_STOPS.length)
      if (e.code === 'Escape') setMode('orbit')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setIndex, setPaused, setMode])

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-48 bg-gradient-to-t from-slate-950/80 to-transparent" />
      <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-2 md:bottom-6 md:px-3">
        <div key={index} className="glass slide-up pointer-events-auto w-full max-w-[760px] rounded-2xl p-3.5 md:p-5">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-amber-300">
            <span className="rounded-md bg-amber-400 px-1.5 py-0.5 text-slate-900">{index + 1}/{PRESENTATION_STOPS.length}</span>
            {stop.step}
          </div>
          <div className="mt-1 text-lg font-extrabold text-white md:mt-1.5 md:text-2xl">{stop.title}</div>
          <div className="mt-1 text-[13px] leading-relaxed text-slate-300 md:text-sm">{stop.text}</div>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-amber-400" style={{ width: `${progress * 100}%` }} />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="hidden gap-1 min-[380px]:flex">
              {PRESENTATION_STOPS.map((s, i) => (
                <button key={i} onClick={() => setIndex(i)} title={s.step} className={`h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-amber-400' : i < index ? 'w-3 bg-amber-400/50' : 'w-3 bg-white/20'}`} />
              ))}
            </div>
            <div className="ml-auto flex items-center gap-1">
              <button aria-label="Previous" onClick={() => setIndex((index - 1 + PRESENTATION_STOPS.length) % PRESENTATION_STOPS.length)} className="rounded-lg p-2.5 text-slate-300 hover:bg-white/10 md:p-2"><SkipBack className="h-4 w-4" /></button>
              <button aria-label={paused ? 'Play' : 'Pause'} onClick={() => setPaused(!paused)} className="rounded-lg bg-white/10 p-2.5 text-white hover:bg-white/20 md:p-2">{paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}</button>
              <button aria-label="Next" onClick={() => setIndex((index + 1) % PRESENTATION_STOPS.length)} className="rounded-lg p-2.5 text-slate-300 hover:bg-white/10 md:p-2"><SkipForward className="h-4 w-4" /></button>
              <button onClick={() => setMode('orbit')} className="ml-1 flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-2.5 text-xs font-semibold text-white hover:bg-white/20 md:py-2"><Square className="h-3.5 w-3.5" /> End tour</button>
            </div>
          </div>
        </div>
      </div>
      <div className="safe-top pointer-events-none fixed inset-x-0 top-0 z-30 flex justify-center md:pt-4">
        <div className="glass flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.25em] text-amber-200">
          <span className="pulse-dot h-2 w-2 rounded-full bg-rose-500" /> Presentation mode
        </div>
      </div>
    </>
  )
}

export function LoadingScreen() {
  const ready = useFactoryStore((s) => s.sceneReady)
  const loaded = useFactoryStore((s) => s.loaded)
  const error = useFactoryStore((s) => s.error)
  const [gone, setGone] = useState(false)
  useEffect(() => {
    if (ready) {
      const t = setTimeout(() => setGone(true), 900)
      return () => clearTimeout(t)
    }
  }, [ready])
  if (gone) return null
  return (
    <div className={`fixed inset-0 z-[60] flex items-center justify-center bg-[#0b1017] transition-opacity duration-700 ${ready ? 'pointer-events-none opacity-0' : 'opacity-100'}`}>
      <div className="text-center">
        <svg viewBox="0 0 40 40" className="mx-auto h-16 w-16 animate-[spin_6s_linear_infinite]">
          <g transform="rotate(45 20 20)" stroke="#f59e0b" strokeWidth="2" fill="none">
            <rect x="10" y="10" width="20" height="20" rx="2" />
            <path d="M10 16.5h20M10 23.5h20M16.5 10v20M23.5 10v20" strokeOpacity="0.6" />
          </g>
        </svg>
        <div className="mt-5 text-lg font-extrabold tracking-[0.25em] text-amber-200">SHREE SATIJI TEXTILES</div>
        <div className="mt-1 text-[11px] font-semibold tracking-[0.35em] text-slate-500">3D FACTORY VIEW</div>
        <div className="mx-auto mt-6 h-1 w-56 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-amber-400 transition-all duration-500" style={{ width: ready ? '100%' : loaded ? '70%' : '30%' }} />
        </div>
        <div className="mt-3 text-[12px] text-slate-400">{error ? `Could not load EMS data: ${error}` : loaded ? 'Building the plant…' : 'Connecting to EMS…'}</div>
      </div>
    </div>
  )
}

export function HelpModal() {
  const open = useFactoryStore((s) => s.helpOpen)
  const setOpen = useFactoryStore((s) => s.setHelpOpen)
  if (!open) return null
  const touch = isTouch()
  const items = touch
    ? [
        [RotateCcw, 'Rotate', 'Drag with one finger'],
        [Move, 'Pan', 'Drag with two fingers'],
        [ZoomIn, 'Zoom', 'Pinch in and out'],
        [Hand, 'Inspect', 'Tap any loom, rack or person for details. Drag the sheet handle down to peek at the 3D view.'],
        [Footprints, 'Walk / Free fly', 'Open the menu ☰. Drag to look around, use the arrow pad to move (▲▼ to fly up and down).'],
      ]
    : [
        [RotateCcw, 'Rotate', 'Left-drag / one-finger drag'],
        [Move, 'Pan', 'Right-drag / two-finger drag'],
        [ZoomIn, 'Zoom', 'Mouse wheel / pinch'],
        [Hand, 'Inspect', 'Hover for a tooltip, click any machine, rack, office, worker or truck'],
      ]
  const keys = [['1 – 6', 'Camera views'], ['P', 'Presentation mode'], ['G', 'Walkthrough mode'], ['V', 'Free fly mode'], ['O', 'Open view (roof on/off)'], ['L', 'Toggle labels'], ['F', 'Toggle flow'], ['M', 'Factory sound on/off'], [',', 'Settings'], ['Esc', 'Close panel / exit mode']]
  return (
    <div className="safe-top safe-bottom fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-3 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div className="glass fade-in max-h-full w-full max-w-lg overflow-y-auto rounded-3xl p-5 scrollbar-thin md:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="text-lg font-extrabold text-white">How to explore</div>
          <button onClick={() => setOpen(false)} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-4 space-y-2">
          {items.map(([Icon, t, d]) => (
            <div key={t} className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-3">
              <Icon className="h-5 w-5 shrink-0 text-amber-300" />
              <div>
                <div className="text-sm font-bold text-white">{t}</div>
                <div className="text-[12px] text-slate-400">{d}</div>
              </div>
            </div>
          ))}
        </div>
        <div className={`mt-4 grid-cols-2 gap-2 text-[12px] ${touch ? 'hidden' : 'grid'}`}>
          {keys.map(([k, d]) => (
            <div key={k} className="flex items-center gap-2 text-slate-300">
              <kbd className="min-w-[44px] rounded bg-white/10 px-1.5 py-0.5 text-center font-mono text-[11px] text-white">{k}</kbd> {d}
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl bg-amber-400/10 p-3 text-[12px] text-amber-100 ring-1 ring-amber-300/20">
          The floor chevrons show the material flow <b>Yarn Stock → Waterjet Looms → Finished Stock</b>. Orbit has no limits: rotate under, over and around anything, and zoom right in.{touch && ' On a phone, turn it sideways for a wider view.'}
        </div>
      </div>
    </div>
  )
}
