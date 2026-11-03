/** `countHidden`: only the bar shows, as in the onboarding of flow 01. A screen reader still reads the step. */
export function StepBar({ step, total, countHidden }: { step: number; total: number; countHidden?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className={countHidden ? 'sr-only' : 'text-sm font-medium text-secondary'}>Step {step}/{total}</p>
      <div className="flex gap-2 md:gap-4" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`h-1 flex-1 rounded-full ${i < step ? 'bg-step-complete' : 'bg-quaternary'}`} />
        ))}
      </div>
    </div>
  )
}
