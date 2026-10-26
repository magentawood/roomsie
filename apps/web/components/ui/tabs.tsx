/** Tabs with a line under the selected one. The panel below is the caller's. */
export function Tabs<T extends string>({ label, tabs, value, onChange }: { label: string; tabs: Record<T, string>; value: T; onChange: (value: T) => void }) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-4 border-b border-secondary">
      {(Object.keys(tabs) as T[]).map((tab) => (
        <button key={tab} type="button" role="tab" aria-selected={value === tab} onClick={() => onChange(tab)}
          className={`-mb-px border-b-2 px-1 pb-3 text-sm font-semibold outline-focus-ring focus-visible:outline-2 ${value === tab ? 'border-brand text-primary' : 'border-transparent text-quaternary hover:text-secondary'}`}>
          {tabs[tab]}
        </button>
      ))}
    </div>
  )
}
