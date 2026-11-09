import { useId, type ReactNode } from 'react'
import { ChevronDown } from '@untitledui/icons'

const fieldBase = 'w-full rounded-md border border-primary bg-primary text-primary shadow-xs placeholder:text-placeholder aria-invalid:border-error outline-focus-ring focus:outline-2 focus:outline-offset-1'
/** The heights of the text boxes of the designs, each with its stroke: `md` 44 px (forms), `sm` 40 px (pop-ups), `xs` 36 px (the profile, the search boxes). */
export type FieldSize = 'md' | 'sm' | 'xs'
const fieldSizes: Record<FieldSize, string> = { md: 'px-3.25 py-2.25 text-md', sm: 'px-2.75 py-1.75 text-md', xs: 'px-2.75 py-1.75 text-sm' }
export const inputClassOf = (size: FieldSize) => `${fieldBase} ${fieldSizes[size]}`
export const inputClass = inputClassOf('md')

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

/**
 * A native select in the look of a text box: the chevron of the designs inside its padding, and the empty choice `''` in the
 * colour of a placeholder, so it does not read as an answer.
 */
export function Select({ id, value, onChange, size = 'md', children }: { id: string; value: string; onChange: (value: string) => void; size?: FieldSize; children: ReactNode }) {
  return (
    <div className="relative">
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}
        className={`${inputClassOf(size)} appearance-none pr-11 [&_option]:text-primary ${value === '' ? 'text-placeholder!' : ''}`}>
        {children}
      </select>
      <ChevronDown size={20} aria-hidden className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-fg-quaternary" />
    </div>
  )
}

/**
 * A native date box. With no date, Chrome, Edge and Firefox show "dd/mm/yyyy" in the text colour, and Safari shows a grey date.
 * The empty box takes the colour of a placeholder in each browser, as the empty `Select` does.
 */
export function DateInput({ id, value, onChange, size = 'md' }: { id: string; value: string | null | undefined; onChange: (value: string | null) => void; size?: FieldSize }) {
  return <input id={id} type="date" className={`${inputClassOf(size)} ${value ? '' : 'text-placeholder!'}`} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} />
}

type TextProps = { label: string; value: string | null | undefined; onChange: (value: string | null) => void; placeholder?: string; required?: boolean; hint?: string; error?: string; maxLength?: number; size?: FieldSize }

/** An empty text box saves null, so a cleared field clears the listing. */
export function TextInput({ label, value, onChange, placeholder, required, hint, error, maxLength, size = 'md' }: TextProps) {
  return (
    <Field label={label} required={required} hint={hint} error={error}>
      {(id) => (
        <input id={id} className={inputClassOf(size)} value={value ?? ''} placeholder={placeholder} maxLength={maxLength} aria-invalid={error ? true : undefined}
          onChange={(e) => onChange(e.target.value.trim() ? e.target.value : null)} />
      )}
    </Field>
  )
}

/** `className`: a height or a padding of one design, as the description of a listing (use `!` on a padding). */
export function TextArea({ label, value, onChange, placeholder, hint, maxLength, size = 'md', className = '' }: Omit<TextProps, 'required' | 'error'> & { className?: string }) {
  return (
    <Field label={label} hint={hint}>
      {(id) => (
        <textarea id={id} rows={5} className={`${inputClassOf(size)} resize-y ${className}`} value={value ?? ''} placeholder={placeholder} maxLength={maxLength}
          onChange={(e) => onChange(e.target.value.trim() ? e.target.value : null)} />
      )}
    </Field>
  )
}

type NumberProps = { label: string; value: number | null | undefined; onChange: (value: number | null) => void; placeholder?: string; required?: boolean; error?: string; size?: FieldSize }

export function NumberInput({ label, value, onChange, placeholder, required, error, size = 'md' }: NumberProps) {
  return (
    <Field label={label} required={required} error={error}>
      {(id) => (
        <input id={id} type="number" inputMode="numeric" className={inputClassOf(size)} value={value ?? ''} placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          onChange={(e) => onChange(e.target.value === '' ? null : Math.trunc(Number(e.target.value)))} />
      )}
    </Field>
  )
}
