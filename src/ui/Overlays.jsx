import { useEffect, useRef, useState } from 'react'
import { Footprints, MousePointer2, Keyboard, X, Play, Pause, SkipForward, SkipBack, Square, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Move, RotateCcw, ZoomIn, Hand } from 'lucide-react'
import { useFactoryStore } from '../hooks/useFactoryStore'
import { PRESENTATION_STOPS } from '../data/layout'
import { goToView } from '../scene/focus'

const isTouch = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

export function WalkthroughOverlay() {
  const locked = useFactoryStore((s) => s.walkLocked)
  const requestLock = useFactoryStore((s) => s.requestWalkLock)
  const setMode = useFactoryStore((s) => s.setMode)
  const [touch] = useState(isTouch)
  const exit = () => {
    setMode('orbit')
    setTimeout(() => goToView('overview', 1.6), 30)
  }
  const pad = (forward, right) => ({
    onPointerDown: (e) => {
      e.preventDefault()
      useFactoryStore.setState({ walkInput: { forward, right } })
    },
    onPointerUp: () => useFactoryStore.setState({ walkInput: { forward: 0, right: 0 } }),
    onPointerLeave: () => useFactoryStore.setState({ walkInput: { forward: 0, right: 0 } }),
  })
  return (
    <>
      {/* crosshair */}
      <div className="pointer-events-none fixed left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2">
        <div className="h-5 w-5 rounded-full border-2 border-white/70 shadow-[0_0_8px_rgba(0,0,0,0.6)]" />
      </div>
      <div className="pointer-events-none fixed left-1/2 top-4 z-30 -translate-x-1/2">
        <div className="glass pointer-events-auto flex items-center gap-4 rounded-2xl px-4 py-2.5">
          <div className="flex items-center gap-2 whitespace-nowrap text-sm font-extrabold tracking-[0.2em] text-cyan-300">
            <Footprints className="h-4 w-4" /> WALKTHROUGH MODE
          </div>
          <div className="hidden items-center gap-3 text-[12px] text-slate-300 md:flex">
            <span><kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[11px]">WASD</kbd> Move</span>
            <span><kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[11px]">Mouse</kbd> Look</span>
            <span><kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[11px]">Shift</kbd> Run</span>
            <span><kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[11px]">ESC</kbd> Exit</span>
          </div>
          <button onClick={exit} className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/20">Exit</button>
        </div>
      </div>
      {!locked && !touch && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/40 backdrop-blur-[2px]" onClick={requestLock}>
          <div className="glass fade-in cursor-pointer rounded-3xl px-8 py-7 text-center">
            <Footprints className="mx-auto h-10 w-10 text-cyan-300" />
            <div className="mt-3 text-xl font-extrabold tracking-[0.18em] text-white">WALKTHROUGH MODE</div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-[13px] text-slate-300">
              <div className="rounded-xl bg-white/5 p-3"><Keyboard className="mx-auto mb-1 h-5 w-5" /><b>WASD</b><br />Move</div>
              <div className="rounded-xl bg-white/5 p-3"><MousePointer2 className="mx-auto mb-1 h-5 w-5" /><b>Mouse</b><br />Look</div>
              <div className="rounded-xl bg-white/5 p-3"><X className="mx-auto mb-1 h-5 w-5" /><b>ESC</b><br />Exit</div>
            </div>
            <div className="mt-5 rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-bold text-slate-900">Click to start walking</div>
            <button
              className="mt-3 text-xs text-slate-400 underline"
              onClick={(e) => {
                e.stopPropagation()
                exit()
              }}
            >
              Back to overview
            </button>
          </div>
        </div>
      )}
      {touch && (
        <div className="fixed bottom-6 left-6 z-30 grid grid-cols-3 gap-1.5">
          <span />
          <button className="glass flex h-14 w-14 items-center justify-center rounded-xl" {...pad(1, 0)}><ArrowUp className="h-6 w-6" /></button>
          <span />
          <button className="glass flex h-14 w-14 items-center justify-center rounded-xl" {...pad(0, -1)}><ArrowLeft className="h-6 w-6" /></button>
          <button className="glass flex h-14 w-14 items-center justify-center rounded-xl" {...pad(-1, 0)}><ArrowDown className="h-6 w-6" /></button>
          <button className="glass flex h-14 w-14 items-center justify-center rounded-xl" {...pad(0, 1)}><ArrowRight className="h-6 w-6" /></button>
        </div>
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
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-center px-3">
        <div key={index} className="glass slide-up pointer-events-auto w-full max-w-[760px] rounded-2xl p-4 md:p-5">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-amber-300">
            <span className="rounded-md bg-amber-400 px-1.5 py-0.5 text-slate-900">{index + 1}/{PRESENTATION_STOPS.length}</span>
            {stop.step}
          </div>
          <div className="mt-1.5 text-xl font-extrabold text-white md:text-2xl">{stop.title}</div>
          <div className="mt-1 text-[13px] leading-relaxed text-slate-300 md:text-sm">{stop.text}</div>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-amber-400" style={{ width: `${progress * 100}%` }} />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex gap-1">
              {PRESENTATION_STOPS.map((s, i) => (
                <button key={i} onClick={() => setIndex(i)} title={s.step} className={`h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-amber-400' : i < index ? 'w-3 bg-amber-400/50' : 'w-3 bg-white/20'}`} />
              ))}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setIndex((index - 1 + PRESENTATION_STOPS.length) % PRESENTATION_STOPS.length)} className="rounded-lg p-2 text-slate-300 hover:bg-white/10"><SkipBack className="h-4 w-4" /></button>
              <button onClick={() => setPaused(!paused)} className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/20">{paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}</button>
              <button onClick={() => setIndex((index + 1) % PRESENTATION_STOPS.length)} className="rounded-lg p-2 text-slate-300 hover:bg-white/10"><SkipForward className="h-4 w-4" /></button>
              <button onClick={() => setMode('orbit')} className="ml-1 flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-2 text-xs font-semibold text-white hover:bg-white/20"><Square className="h-3.5 w-3.5" /> End tour</button>
            </div>
          </div>
        </div>
      </div>
      <div className="pointer-events-none fixed left-1/2 top-4 z-30 -translate-x-1/2">
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
  const items = [
    [RotateCcw, 'Rotate', 'Left-drag / one-finger drag'],
    [Move, 'Pan', 'Right-drag / two-finger drag'],
    [ZoomIn, 'Zoom', 'Mouse wheel / pinch'],
    [Hand, 'Inspect', 'Hover for a tooltip, click any machine, rack, office, worker or truck'],
  ]
  const keys = [['1 – 7', 'Camera views'], ['P', 'Presentation mode'], ['G', 'Walkthrough mode'], ['L', 'Toggle labels'], ['F', 'Toggle flow'], ['Esc', 'Close panel / exit mode']]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div className="glass fade-in w-full max-w-lg rounded-3xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="text-lg font-extrabold text-white">How to explore</div>
          <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 space-y-2">
          {items.map(([Icon, t, d]) => (
            <div key={t} className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-3">
              <Icon className="h-5 w-5 text-amber-300" />
              <div>
                <div className="text-sm font-bold text-white">{t}</div>
                <div className="text-[12px] text-slate-400">{d}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-[12px]">
          {keys.map(([k, d]) => (
            <div key={k} className="flex items-center gap-2 text-slate-300">
              <kbd className="min-w-[44px] rounded bg-white/10 px-1.5 py-0.5 text-center font-mono text-[11px] text-white">{k}</kbd> {d}
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl bg-amber-400/10 p-3 text-[12px] text-amber-100 ring-1 ring-amber-300/20">
          The floor chevrons show the material flow <b>Yarn → Weaving → Inspection → Finished Goods → Dispatch</b>; the glowing overhead links show every zone reporting live into Accounts and the Manager’s office.
        </div>
      </div>
    </div>
  )
}
