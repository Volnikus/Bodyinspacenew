import { useSyncExternalStore } from 'react'

/** Tiny hash router: "#/organ/heart" → ["organ", "heart"]. Works on GitHub Pages without server rules. */
function read(): string {
  return window.location.hash.replace(/^#\/?/, '')
}

function subscribe(callback: () => void) {
  window.addEventListener('hashchange', callback)
  return () => window.removeEventListener('hashchange', callback)
}

export function useRoute(): string[] {
  const path = useSyncExternalStore(subscribe, read)
  return path.split('/').filter(Boolean)
}

export function go(path: string) {
  window.location.hash = path ? `/${path}` : '/'
}
