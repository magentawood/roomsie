import { useId, type ReactNode } from 'react'

export const inputClass =
  'w-full rounded-md border border-primary bg-primary px-3.5 py-2.5 text-md text-primary shadow-xs placeholder:text-placeholder aria-invalid:border-error outline-focus-ring focus:outline-2 focus:outline-offset-1'

/** A label, the control, and a hint or an error under it. */
export function Field({ label, required, hint, error, children }: { label: string; required?: boolean; hint?: string; error?: string; children: (id: string) => ReactNode }) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-secondary">
        {label}
        {required && <span className="text-error-primary"> *</span>}
      </label>
      {children(id)}
      {error ? <p className="text-sm text-error-primary">{error}</p> : hint && <p className="text-sm text-tertiary">{hint}</p>}
    </div>
  )
}

type TextProps = { label: string; value: string | null | undefined; onChange: (value: string | null) => void; placeholder?: string; required?: boolean; hint?: string; error?: string; maxLength?: number }

/** An empty text box saves null, so a cleared field clears the listing. */
export function TextInput({ label, value, onChange, placeholder, required, hint, error, maxLength }: TextProps) {
  return (
    <Field label={label} required={required} hint={hint} error={error}>
      {(id) => (
        <input id={id} className={inputClass} value={value ?? ''} placeholder={placeholder} maxLength={maxLength} aria-invalid={error ? true : undefined}
          onChange={(e) => onChange(e.target.value.trim() ? e.target.value : null)} />
      )}
    </Field>
  )
}

export function TextArea({ label, value, onChange, placeholder, hint, maxLength }: Omit<TextProps, 'required' | 'error'>) {
  return (
    <Field label={label} hint={hint}>
      {(id) => (
        <textarea id={id} rows={5} className={`${inputClass} resize-y`} value={value ?? ''} placeholder={placeholder} maxLength={maxLength}
          onChange={(e) => onChange(e.target.value.trim() ? e.target.value : null)} />
      )}
    </Field>
  )
}

type NumberProps = { label: string; value: number | null | undefined; onChange: (value: number | null) => void; placeholder?: string; required?: boolean; error?: string }

export function NumberInput({ label, value, onChange, placeholder, required, error }: NumberProps) {
  return (
    <Field label={label} required={required} error={error}>
      {(id) => (
        <input id={id} type="number" inputMode="numeric" className={inputClass} value={value ?? ''} placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          onChange={(e) => onChange(e.target.value === '' ? null : Math.trunc(Number(e.target.value)))} />
      )}
    </Field>
  )
}
