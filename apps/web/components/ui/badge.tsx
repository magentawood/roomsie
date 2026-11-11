import { CheckVerified02, XClose } from '@untitledui/icons'

export type Tone = 'success' | 'error' | 'gray' | 'warning' | 'blue'
const tones: Record<Tone, { pill: string; dot: string; icon: string }> = {
  success: { pill: 'border-badge-success bg-badge-success text-badge-success', dot: 'bg-dot-success', icon: 'text-badge-icon-success' },
  error: { pill: 'border-badge-error bg-badge-error text-badge-error', dot: 'bg-dot-error', icon: 'text-badge-error' },
  gray: { pill: 'border-badge-gray bg-badge-gray text-badge-gray', dot: 'bg-dot-gray', icon: 'text-badge-gray' },
  warning: { pill: 'border-badge-warning bg-badge-warning text-badge-warning', dot: 'bg-dot-warning', icon: 'text-badge-icon-warning' },
  blue: { pill: 'border-badge-blue bg-badge-blue text-badge-blue', dot: 'bg-dot-blue', icon: 'text-badge-blue' },
}

/**
 * The pill badge of the designs, with its stroke: `sm` 22 px with 12 px text (the cards), `lg` 28 px with 14 px text (the title of a detail).
 * `verified`: the check-verified icon leads, as "Verified", "Owner" and "Broker" (67:6750), with the 1.5 px stroke of the designs.
 * A screen reader hears "Verified" before a text that does not say it.
 */
export function Badge({ tone, dot = true, verified, size = 'sm', children }: { tone: Tone; dot?: boolean; verified?: boolean; size?: 'sm' | 'lg'; children: string }) {
  const lead = verified ? 'icon' : dot ? 'dot' : 'none'
  const pad = size === 'lg'
    ? { icon: 'gap-1 py-0.75 pr-2.75 pl-2.25 text-sm', dot: 'gap-1.5 py-0.75 pr-2.75 pl-2.25 text-sm', none: 'py-0.75 px-2.75 text-sm' }[lead]
    : { icon: 'gap-0.5 py-px pr-1.75 pl-1.25 text-xs', dot: 'gap-1 py-px pr-1.75 pl-1.25 text-xs', none: 'py-px px-1.75 text-xs' }[lead]
  return (
    <span className={`inline-flex items-center rounded-full border font-medium ${pad} ${tones[tone].pill}`}>
      {lead === 'icon' && <CheckVerified02 size={12} strokeWidth={3} aria-hidden className={`shrink-0 ${tones[tone].icon}`} />}
      {lead === 'icon' && !/verified/i.test(children) && <span className="sr-only">Verified </span>}
      {lead === 'dot' && <span className={`size-1.5 rounded-full ${tones[tone].dot}`} aria-hidden />}
      {children}
    </span>
  )
}

/** The X of a removable badge, in the colour of the "Badge close X" of the designs. */
const closeTones: Partial<Record<Tone, string>> = { blue: 'text-fg-badge-blue' }

/**
 * The Badge "Size=sm, Type=Pill color, Icon=X close" of the designs: a picked card above the chat input (63:4472).
 * The X is its own button, so a tap on the name does nothing.
 */
export function RemovableBadge({ tone, label, onRemove }: { tone: Tone; label: string; onRemove: () => void }) {
  return (
    <span className={`inline-flex max-w-full items-center gap-0.5 rounded-full border py-px pr-0.5 pl-1.75 text-xs font-medium ${tones[tone].pill}`}>
      <span className="truncate">{label}</span>
      <button type="button" aria-label={`Remove ${label}`} onClick={onRemove}
        className={`shrink-0 rounded-full p-0.5 outline-focus-ring hover:bg-primary focus-visible:outline-2 ${closeTones[tone] ?? 'text-fg-quaternary'}`}>
        <XClose size={12} aria-hidden />
      </button>
    </span>
  )
}
