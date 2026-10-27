import { XClose } from '@untitledui/icons'
import type { Icon } from './button'

type Option<T extends string> = { value: T; label: string }
const options = <T extends string>(labels: Record<T, string>, only?: readonly T[]): Option<T>[] =>
  (only ?? (Object.keys(labels) as T[])).map((value) => ({ value, label: labels[value] }))

const chip = (selected: boolean) =>
  `inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium outline-focus-ring focus-visible:outline-2 ${selected ? 'border-brand bg-secondary text-primary' : 'border-primary bg-primary text-secondary hover:bg-primary_hover'}`
const mark = (selected: boolean, round: boolean) =>
  `flex size-4 shrink-0 items-center justify-center border ${round ? 'rounded-full' : 'rounded-sm'} ${selected ? 'border-transparent bg-brand-solid' : 'border-primary bg-primary'}`

function Group({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium text-secondary">
        {label}
        {required && <span className="text-error-primary"> *</span>}
      </legend>
      <div className="flex flex-wrap gap-2">{children}</div>
      {hint && <p className="text-sm text-tertiary">{hint}</p>}
    </fieldset>
  )
}

/** Pick one, as the Tag chips of the designs. A second tap clears it. */
export function ChoiceChips<T extends string>({ label, labels, value, onChange, required, hint }: {
  label: string; labels: Record<T, string>; value: T | null | undefined; onChange: (value: T | null) => void; required?: boolean; hint?: string
}) {
  return (
    <Group label={label} required={required} hint={hint}>
      {options(labels).map((o) => {
        const selected = value === o.value
        return (
          <button key={o.value} type="button" role="radio" aria-checked={selected} className={chip(selected)} onClick={() => onChange(selected ? null : o.value)}>
            <span className={mark(selected, true)}>{selected && <span className="size-1.5 rounded-full bg-primary" />}</span>
            {o.label}
          </button>
        )
      })}
    </Group>
  )
}

export function MultiChips<T extends string>({ label, labels, only, value, onChange }: {
  label: string; labels: Record<T, string>; only?: readonly T[]; value: readonly T[] | undefined; onChange: (value: T[]) => void
}) {
  const picked = value ?? []
  return (
    <Group label={label}>
      {options(labels, only).map((o) => {
        const selected = picked.includes(o.value)
        return <CheckChip key={o.value} label={o.label} checked={selected} onToggle={() => onChange(selected ? picked.filter((v) => v !== o.value) : [...picked, o.value])} />
      })}
    </Group>
  )
}

/** An off chip can still show checked, as an area under a picked area. */
export function CheckChip({ label, checked, disabled, onToggle }: { label: string; checked: boolean; disabled?: boolean; onToggle: () => void }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} disabled={disabled} onClick={onToggle}
      className={`${chip(checked)} disabled:cursor-not-allowed disabled:opacity-50`}>
      <span className={mark(checked, false)}>{checked && <svg viewBox="0 0 12 12" className="size-3 text-primary_on-brand" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2.5 6l2.5 2.5 4.5-5" /></svg>}</span>
      {label}
    </button>
  )
}

/** A picked value as a tag with ×, as the Tag "X close" of the designs. */
export function RemoveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button type="button" aria-label={`Remove ${label}`} onClick={onRemove} className={chip(false)}>
      {label}
      <XClose size={14} aria-hidden className="text-fg-quaternary" />
    </button>
  )
}

/** A large radio card with an icon, as step 1 of the listing flow. */
export function ChoiceCard({ icon: CardIcon, title, subtitle, selected, disabled, onSelect }: { icon: Icon; title: string; subtitle: string; selected: boolean; disabled?: boolean; onSelect: () => void }) {
  return (
    <button type="button" role="radio" aria-checked={selected} disabled={disabled} onClick={onSelect}
      className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left outline-focus-ring focus-visible:outline-2 disabled:cursor-not-allowed ${selected ? 'border-2 border-brand' : 'border-secondary hover:bg-primary_hover'} ${disabled && !selected ? 'opacity-50' : ''}`}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-primary text-fg-quaternary shadow-xs">
        <CardIcon size={20} aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium text-secondary">{title}</span>
        <span className="text-sm text-tertiary">{subtitle}</span>
      </span>
      <span className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-transparent bg-brand-solid' : 'border-primary'}`}>
        {selected && <span className="size-2 rounded-full bg-primary" />}
      </span>
    </button>
  )
}
