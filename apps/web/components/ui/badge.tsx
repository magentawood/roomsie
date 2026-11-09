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
