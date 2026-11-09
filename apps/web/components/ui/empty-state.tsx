import type { ReactNode } from 'react'
import type { Icon } from './button'

/** `className`: where the state sits, as a top padding of the designs. The default is the middle of the page. */
export function EmptyState({ icon: StateIcon, title, children, action, className = 'flex-1 justify-center py-16' }: { icon: Icon; title: string; children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-4 text-center lg:gap-5 ${className}`}>
      <span className="flex size-12 items-center justify-center rounded-xl border border-primary text-fg-quaternary shadow-xs"><StateIcon size={24} aria-hidden /></span>
      <div className="flex max-w-88 flex-col gap-1 lg:gap-2">
        <h2 className="text-md font-semibold text-primary">{title}</h2>
        <p className="text-sm text-tertiary">{children}</p>
      </div>
      {action && <div className="mt-2 lg:mt-3">{action}</div>}
    </div>
  )
}
