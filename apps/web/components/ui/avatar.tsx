import { User01 } from '@untitledui/icons'

const sizes = { sm: { box: 'size-8', icon: 16 }, md: { box: 'size-10', icon: 20 } }

export function Avatar({ src, size }: { src: string | null; size: keyof typeof sizes }) {
  const { box, icon } = sizes[size]
  return src
    ? <img src={src} alt="" className={`${box} rounded-full`} referrerPolicy="no-referrer" />
    : <span className={`flex ${box} items-center justify-center rounded-full bg-tertiary text-fg-quaternary`}><User01 size={icon} aria-hidden /></span>
}
