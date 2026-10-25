import type { ComponentType, SVGProps } from 'react'

type Option<T extends string> = { value: T; label: string }
const options = <T extends string>(labels: Record<T, string>, only?: readonly T[]): Option<T>[] =>
  (only ?? (Object.keys(labels) as T[])).map((value) => ({ value, label: labels[value] }))

const chip = (selected: boolean) =>
  `inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium outline-focus-ring focus-visible:outline-2 ${selected ? 'border-brand bg-secondary text-primary' : 'border-primary bg-primary text-secondary hover:bg-primary_hover'}`
const mark = (selected: boolean, round: boolean) =>
  `flex size-4 shrink-0 items-center justify-center border ${round ? 'rounded-full' : 'rounded-sm'} ${selected ? 'border-transparent bg-brand-solid' : 'border-primary bg-primary'}`

function Group({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium text-secondary">
        {label}
        {required && <span className="text-error-primary"> *</span>}
      </legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  )
}

/** Pick one, as the Tag chips of the designs. A second tap clears it. */
export function ChoiceChips<T extends string>({ label, labels, only, value, onChange, required }: {
  label: string; labels: Record<T, string>; only?: readonly T[]; value: T | null | undefined; onChange: (value: T | null) => void; required?: boolean
}) {
  return (
    <Group label={label} required={required}>
      {options(labels, only).map((o) => {
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

/** Pick many. */
export function MultiChips<T extends string>({ label, labels, only, value, onChange }: {
  label: string; labels: Record<T, string>; only?: readonly T[]; value: readonly T[] | undefined; onChange: (value: T[]) => void
}) {
  const picked = value ?? []
  return (
    <Group label={label}>
      {options(labels, only).map((o) => {
        const selected = picked.includes(o.value)
        return (
          <button key={o.value} type="button" role="checkbox" aria-checked={selected} className={chip(selected)}
            onClick={() => onChange(selected ? picked.filter((v) => v !== o.value) : [...picked, o.value])}>
            <span className={mark(selected, false)}>{selected && <svg viewBox="0 0 12 12" className="size-3 text-white" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2.5 6l2.5 2.5 4.5-5" /></svg>}</span>
            {o.label}
          </button>
        )
      })}
    </Group>
  )
}

/** A yes or no question as two chips. */
export function YesNoChips({ label, yes, no, value, onChange }: { label: string; yes: string; no: string; value: boolean | null | undefined; onChange: (value: boolean | null) => void }) {
  return (
    <ChoiceChips label={label} labels={{ yes, no }} value={value == null ? null : value ? 'yes' : 'no'} onChange={(v) => onChange(v === null ? null : v === 'yes')} />
  )
}

type Icon = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>

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
