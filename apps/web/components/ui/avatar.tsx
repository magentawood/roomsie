import { User01 } from '@untitledui/icons'

const sizes = { sm: { box: 'size-8', icon: 16 }, md: { box: 'size-10', icon: 20 } }

/** `online`: the "Status icon / Online" of the account card (97:29495), a 10 px green dot with a 1.5 px white ring at the lower right. */
export function Avatar({ src, size, online }: { src: string | null; size: keyof typeof sizes; online?: boolean }) {
  const { box, icon } = sizes[size]
  const face = src
    ? <img src={src} alt="" className={`${box} rounded-full`} referrerPolicy="no-referrer" />
    : <span className={`flex ${box} items-center justify-center rounded-full bg-tertiary text-fg-quaternary`}><User01 size={icon} aria-hidden /></span>
  if (!online) return face
  return (
    <span className="relative shrink-0">
      {face}
      <span aria-hidden className="absolute right-0 bottom-0 size-2.5 rounded-full bg-dot-success ring-[1.5px] ring-(color:--background-color-primary)" />
    </span>
  )
}
