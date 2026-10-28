'use client'

import { useEffect, useRef } from 'react'

type Props = { src: string; phoneSrc?: string; poster: string; label?: string; className?: string }

export function LoopVideo({ src, phoneSrc, poster, label, className }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const el = video.current!
    const reduce = matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => {
      if (!reduce.matches) return void el.play().catch(() => {})
      el.pause()
      el.currentTime = 0
    }
    apply()
    reduce.addEventListener('change', apply)
    return () => reduce.removeEventListener('change', apply)
  }, [])
  return (
    <video ref={video} poster={poster} muted loop playsInline preload="metadata" aria-label={label} aria-hidden={label ? undefined : true} className={className}>
      {phoneSrc && <source src={phoneSrc} type="video/mp4" media="(max-width: 767px)" />}
      <source src={src} type="video/mp4" />
    </video>
  )
}
