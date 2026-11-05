/** A `progress` element: the CSP allows no `style` width. */
export function Bar({ value, max, label, className = 'w-full' }: { value: number; max: number; label: string; className?: string }) {
  return (
    <progress value={value} max={Math.max(max, 1)} aria-label={label}
      className={`h-2 ${className} appearance-none overflow-hidden rounded-full bg-secondary [&::-moz-progress-bar]:bg-brand-solid [&::-webkit-progress-bar]:bg-secondary [&::-webkit-progress-value]:bg-brand-solid`} />
  )
}
