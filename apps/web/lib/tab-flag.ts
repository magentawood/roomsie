import { useState } from 'react'

/** A flag for this visit of the browser tab, as "Explore for now" or a closed card. Session storage keeps it, so a reload keeps it too. */
export function useTabFlag(key: string) {
  const [raised, setRaised] = useState(() => typeof sessionStorage !== 'undefined' && sessionStorage.getItem(key) === '1')
  const raise = () => {
    sessionStorage.setItem(key, '1')
    setRaised(true)
  }
  return [raised, raise] as const
}
