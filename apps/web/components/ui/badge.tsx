import { XClose } from '@untitledui/icons'

export type Tone = 'success' | 'error' | 'gray' | 'warning' | 'blue'
const tones: Record<Tone, { pill: string; dot: string }> = {
  success: { pill: 'border-badge-success bg-badge-success text-badge-success', dot: 'bg-dot-success' },
  error: { pill: 'border-badge-error bg-badge-error text-badge-error', dot: 'bg-dot-error' },
  gray: { pill: 'border-badge-gray bg-badge-gray text-badge-gray', dot: 'bg-dot-gray' },
  warning: { pill: 'border-badge-warning bg-badge-warning text-badge-warning', dot: 'bg-dot-warning' },
  blue: { pill: 'border-badge-blue bg-badge-blue text-badge-blue', dot: 'bg-dot-blue' },
}

export function Badge({ tone, dot = true, children }: { tone: Tone; dot?: boolean; children: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border py-px text-xs font-medium ${dot ? 'pr-1.75 pl-1.25' : 'px-1.75'} ${tones[tone].pill}`}>
      {dot && <span className={`size-1.5 rounded-full ${tones[tone].dot}`} aria-hidden />}
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
