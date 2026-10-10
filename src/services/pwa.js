// Install-as-app + share link. Free browser features, nothing to set up.
let deferred = null
const listeners = new Set()

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e
    listeners.forEach((f) => f())
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    listeners.forEach((f) => f())
  })
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
  }
}

export const canInstall = () => !!deferred
export const onInstallChange = (f) => (listeners.add(f), () => listeners.delete(f))

export async function promptInstall() {
  if (deferred) {
    deferred.prompt()
    await deferred.userChoice.catch(() => {})
    deferred = null
    listeners.forEach((f) => f())
    return
  }
  // iPhone: Safari has no install prompt
  window.alert('To install: open this site in Safari, tap Share, then "Add to Home Screen".')
}

export async function shareSite() {
  const data = { title: 'Shree Satiji Textiles — live factory', url: window.location.origin }
  try {
    if (navigator.share) return await navigator.share(data)
    await navigator.clipboard.writeText(data.url)
    window.alert('Link copied: ' + data.url)
  } catch {
    /* cancelled */
  }
}

import { useSyncExternalStore } from 'react'
export const useCanInstall = () => useSyncExternalStore(onInstallChange, canInstall, () => false)
export const isIOS = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.navigator.standalone
