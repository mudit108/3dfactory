import { useEffect, useState } from 'react'

/** Phone-class screen: narrow, or a phone held sideways (short + touch). */
export function readViewport() {
  if (typeof window === 'undefined') return { mobile: false, landscape: false, portrait: false, touch: false }
  const w = window.innerWidth
  const h = window.innerHeight
  const touch = window.matchMedia?.('(pointer: coarse)').matches ?? false
  const mobile = w < 768 || (h < 520 && touch) || (h < 460 && w < 1000)
  return { mobile, landscape: mobile && w > h, portrait: h > w, touch, w, h }
}

export function useViewport() {
  const [vp, setVp] = useState(readViewport)
  useEffect(() => {
    let raf
    const on = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setVp(readViewport()))
    }
    window.addEventListener('resize', on)
    window.addEventListener('orientationchange', on)
    return () => {
      window.removeEventListener('resize', on)
      window.removeEventListener('orientationchange', on)
      cancelAnimationFrame(raf)
    }
  }, [])
  return vp
}
