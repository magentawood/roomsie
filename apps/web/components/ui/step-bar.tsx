/**
 * `countHidden`: only the bar shows, as in the onboarding of flow 01. A screen reader still reads the step.
 * `roomy`: the line sits in the middle of a 22 px row, as in the listing flow.
 */
export function StepBar({ step, total, countHidden, roomy }: { step: number; total: number; countHidden?: boolean; roomy?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className={countHidden ? 'sr-only' : 'text-sm font-medium text-secondary'}>Step {step}/{total}</p>
      <div className={`flex gap-3 md:gap-4 ${roomy ? 'h-5.5 items-center' : ''}`} aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`h-1 flex-1 rounded-full ${i < step ? 'bg-step-complete' : 'bg-quaternary'}`} />
        ))}
      </div>
    </div>
  )
}
