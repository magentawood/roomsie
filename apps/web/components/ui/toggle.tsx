export function Toggle({ title, help, checked, onChange }: { title: string; help: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span className="flex flex-col">
        <span className="text-md font-medium text-primary">{title}</span>
        <span className="text-sm text-tertiary">{help}</span>
      </span>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={`relative mt-1 h-5 w-9 shrink-0 rounded-full transition-colors outline-focus-ring focus-visible:outline-2 ${checked ? 'bg-brand-solid' : 'bg-tertiary'}`}>
        <span className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-primary shadow-sm transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </button>
    </label>
  )
}

export function Checkbox({ label, checked, onChange, required }: { label: string; checked: boolean; onChange: (checked: boolean) => void; required?: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm font-medium text-secondary">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-4 accent-current" />
      <span>
        {label}
        {required && <span className="text-error-primary"> *</span>}
      </span>
    </label>
  )
}
