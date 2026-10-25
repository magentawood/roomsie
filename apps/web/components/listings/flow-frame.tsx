import type { ReactNode } from 'react'
import { StepBar } from '../ui/step-bar'
import { PageHeader } from '../shell/app-shell'

/** The frame of each step of flow 04: header, step bar, title, the fields, and the bar fixed to the bottom. */
export function FlowFrame({ step, total, title, helper, error, notice, footer, children }: {
  step: number; total: number; title: string; helper: string; error?: string | null; notice?: ReactNode; footer: ReactNode; children: ReactNode
}) {
  return (
    <>
      <PageHeader title="Post a listing" backHref="/listings" />
      <main className="flex flex-1 flex-col gap-6 px-5 py-5 md:px-6 md:py-8">
        <StepBar step={step} total={total} />
        <div className="flex flex-col gap-1 border-b border-secondary pb-5">
          <h2 className="text-md font-semibold text-primary">{title}</h2>
          <p className="text-sm text-tertiary">{helper}</p>
        </div>
        {notice}
        {error && <p role="alert" className="rounded-md border border-error bg-badge-error p-3 text-sm text-error-primary">{error}</p>}
        <div className="flex flex-col gap-6">{children}</div>
      </main>
      <footer className="sticky bottom-0 z-30 flex items-center gap-3 border-t border-secondary bg-primary px-5 py-3 md:px-6 md:py-4">{footer}</footer>
    </>
  )
}
