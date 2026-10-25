/** "Step 2/7" and one segment for each step. */
export function StepBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-medium text-secondary">Step {step}/{total}</p>
      <div className="flex gap-2 md:gap-4" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`h-1 flex-1 rounded-full ${i < step ? 'bg-step-complete' : 'bg-quaternary'}`} />
        ))}
      </div>
    </div>
  )
}
