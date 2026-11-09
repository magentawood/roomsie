import { XClose } from '@untitledui/icons'
import type { Icon } from './button'

type Option<T extends string> = { value: T; label: string }
const options = <T extends string>(labels: Record<T, string>, only?: readonly T[]): Option<T>[] =>
  (only ?? (Object.keys(labels) as T[])).map((value) => ({ value, label: labels[value] }))

/**
 * The sizes of the Tag chips of the designs, each with its stroke: `md` 36 px with a 20 px mark (the answers of a form),
 * `sm` 32 px (the chips of the chat), `xs` 24 px (the Select tag of a card).
 */
export type ChipSize = 'md' | 'sm' | 'xs'
const chipSizes: Record<ChipSize, string> = { md: 'gap-1.5 p-1.75 text-sm', sm: 'gap-1.5 px-2.25 py-1.25 text-sm', xs: 'gap-1 py-0.5 pr-1.75 pl-1 text-xs' }
const chip = (selected: boolean, size: ChipSize = 'md') =>
  `inline-flex items-center rounded-md border font-medium outline-focus-ring focus-visible:outline-2 ${chipSizes[size]} ${selected ? 'border-brand bg-secondary text-primary' : 'border-primary bg-primary text-secondary hover:bg-primary_hover'}`
const mark = (selected: boolean, round: boolean, size: ChipSize = 'md') =>
  `flex ${size === 'md' ? 'size-5' : 'size-4'} shrink-0 items-center justify-center border ${round ? 'rounded-full' : 'rounded-sm'} ${selected ? 'border-transparent bg-brand-solid' : 'border-primary bg-primary'}`

/** `labelHidden`: a heading above names the question, and the chips sit in the middle, as in the onboarding of flow 01. */
function Group({ label, required, hint, labelHidden, children }: { label: string; required?: boolean; hint?: string; labelHidden?: boolean; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className={labelHidden ? 'sr-only' : 'mb-1.5 text-sm font-medium text-secondary'}>
        {label}
        {required && <span className="text-error-primary"> *</span>}
      </legend>
      <div className={`flex flex-wrap gap-3 ${labelHidden ? 'justify-center' : ''}`}>{children}</div>
      {hint && <p className="text-sm text-tertiary">{hint}</p>}
    </fieldset>
  )
}

/** Pick one, as the Tag chips of the designs. A second tap clears it. */
export function ChoiceChips<T extends string>({ label, labels, value, onChange, required, hint, labelHidden }: {
  label: string; labels: Record<T, string>; value: T | null | undefined; onChange: (value: T | null) => void; required?: boolean; hint?: string; labelHidden?: boolean
}) {
  return (
    <Group label={label} required={required} hint={hint} labelHidden={labelHidden}>
      {options(labels).map((o) => {
        const selected = value === o.value
        return (
          <button key={o.value} type="button" role="radio" aria-checked={selected} className={chip(selected)} onClick={() => onChange(selected ? null : o.value)}>
            <span className={mark(selected, true)}>{selected && <span className="size-2 rounded-full bg-primary" />}</span>
            {o.label}
          </button>
        )
      })}
    </Group>
  )
}

export function MultiChips<T extends string>({ label, labels, only, value, onChange, labelHidden }: {
  label: string; labels: Record<T, string>; only?: readonly T[]; value: readonly T[] | undefined; onChange: (value: T[]) => void; labelHidden?: boolean
}) {
  const picked = value ?? []
  return (
    <Group label={label} labelHidden={labelHidden}>
      {options(labels, only).map((o) => {
        const selected = picked.includes(o.value)
        return <CheckChip key={o.value} label={o.label} checked={selected} onToggle={() => onChange(selected ? picked.filter((v) => v !== o.value) : [...picked, o.value])} />
      })}
    </Group>
  )
}

/** An off chip can still show checked, as an area under a picked area. `ariaLabel`: when the label alone is not clear. */
export function CheckChip({ label, ariaLabel, checked, disabled, size = 'md', onToggle }: { label: string; ariaLabel?: string; checked: boolean; disabled?: boolean; size?: ChipSize; onToggle: () => void }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} aria-label={ariaLabel} disabled={disabled} onClick={onToggle}
      className={`${chip(checked, size)} disabled:cursor-not-allowed disabled:opacity-50`}>
      <span className={mark(checked, false, size)}>{checked && <svg viewBox="0 0 12 12" className={`${size === 'md' ? 'size-3.5' : 'size-3'} text-primary_on-brand`} fill="none" stroke="currentColor" strokeWidth="2"><path d="M2.5 6l2.5 2.5 4.5-5" /></svg>}</span>
      {label}
    </button>
  )
}

/** A chip with a round mark that acts at once, as the chips of the chat (T-09). */
export function TapChip({ label, onTap }: { label: string; onTap: () => void }) {
  return (
    <button type="button" onClick={onTap} className={chip(false, 'sm')}>
      <span aria-hidden className={mark(false, true, 'sm')} />
      {label}
    </button>
  )
}

/** A picked value as a tag with ×, as the Tag "X close" of the designs. `small`: the 22 px badge of a picked card above the chat input. */
export function RemoveChip({ label, small, onRemove }: { label: string; small?: boolean; onRemove: () => void }) {
  return (
    <button type="button" aria-label={`Remove ${label}`} onClick={onRemove}
      className={small ? 'inline-flex items-center gap-0.5 rounded-md border border-badge-blue bg-badge-blue py-px pr-0.5 pl-1.75 text-xs font-medium text-badge-blue outline-focus-ring focus-visible:outline-2' : chip(false)}>
      {label}
      <span className={small ? 'p-0.5' : ''}><XClose size={small ? 12 : 14} aria-hidden className={small ? 'text-badge-blue' : 'text-fg-quaternary'} /></span>
    </button>
  )
}

/** A large radio card with an icon, as step 1 of the listing flow. */
export function ChoiceCard({ icon: CardIcon, title, subtitle, selected, disabled, onSelect }: { icon: Icon; title: string; subtitle: string; selected: boolean; disabled?: boolean; onSelect: () => void }) {
  return (
    <button type="button" role="radio" aria-checked={selected} disabled={disabled} onClick={onSelect}
      // 72 px tall and 16 px in, with the stroke of either state inside it.
      className={`flex w-full items-center gap-3 rounded-xl border text-left outline-focus-ring focus-visible:outline-2 disabled:cursor-not-allowed ${selected ? 'border-2 border-brand p-3.5' : 'border-secondary p-3.75 hover:bg-primary_hover'} ${disabled && !selected ? 'opacity-50' : ''}`}>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-primary text-fg-quaternary shadow-xs">
        <CardIcon size={16} aria-hidden />
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
