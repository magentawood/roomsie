'use client'

import { useState } from 'react'

/** Share the page: the share sheet of the phone, or a copied link where there is no share sheet. */
export function useShare(title: string) {
  const [copied, setCopied] = useState(false)
  const share = async () => {
    const url = window.location.href
    // The types say each browser has navigator.share, but most desktop browsers do not.
    const { share: shareSheet }: Partial<Navigator> = navigator
    // A closed share sheet rejects, and that is no error.
    if (shareSheet) return shareSheet.call(navigator, { title, url }).catch(() => undefined)
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return { share, copied }
}
