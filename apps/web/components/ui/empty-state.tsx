import type { ReactNode } from 'react'
import type { Icon } from './button'

export function EmptyState({ icon: StateIcon, title, children, action }: { icon: Icon; title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl border border-primary text-fg-quaternary shadow-xs"><StateIcon size={24} aria-hidden /></span>
      <div className="flex max-w-88 flex-col gap-1">
        <h2 className="text-md font-semibold text-primary">{title}</h2>
        <p className="text-sm text-tertiary">{children}</p>
      </div>
      {action}
    </div>
  )
}
