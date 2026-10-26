export type Tone = 'success' | 'error' | 'gray'
const tones: Record<Tone, { pill: string; dot: string }> = {
  success: { pill: 'border-badge-success bg-badge-success text-badge-success', dot: 'bg-dot-success' },
  error: { pill: 'border-badge-error bg-badge-error text-badge-error', dot: 'bg-dot-error' },
  gray: { pill: 'border-badge-gray bg-badge-gray text-badge-gray', dot: 'bg-dot-gray' },
}

export function Badge({ tone, children }: { tone: Tone; children: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${tones[tone].pill}`}>
      <span className={`size-1.5 rounded-full ${tones[tone].dot}`} aria-hidden />
      {children}
    </span>
  )
}
