export const tabClass = (selected: boolean, roomy?: boolean) =>
  `-mb-px border-b-2 ${roomy ? 'px-1 pt-1 pb-3' : 'px-0.5 pb-2.5'} text-sm font-semibold outline-focus-ring focus-visible:outline-2 ${selected ? 'border-brand text-primary' : 'border-transparent text-quaternary hover:text-secondary'}`

/** Tabs with a line under the selected one. The panel below is the caller's. */
export function Tabs<T extends string>({ label, tabs, value, onChange }: { label: string; tabs: Record<T, string>; value: T; onChange: (value: T) => void }) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-3 border-b border-secondary">
      {(Object.keys(tabs) as T[]).map((tab) => (
        <button key={tab} type="button" role="tab" aria-selected={value === tab} onClick={() => onChange(tab)}
          // Phones share the width between the tabs, as the drafts do.
          className={`flex-1 md:flex-none ${tabClass(value === tab)}`}>
          {tabs[tab]}
        </button>
      ))}
    </div>
  )
}
