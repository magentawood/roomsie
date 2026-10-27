'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, SearchLg } from '@untitledui/icons'
import { maxProfileAreas, type AreasResponse } from '@roomsie/contract'
import { areaTree, chipState, pickArea, pickLabel } from '../../lib/areas'
import { CheckChip, RemoveChip } from '../ui/choice'
import { inputClass } from '../ui/field'

/** Pockets show only in the search results (section 23 of the drafts). */
export function AreaPicker({ areas, value, onChange }: { areas: AreasResponse['areas']; value: string[]; onChange: (areas: string[]) => void }) {
  const tree = useMemo(() => areaTree(areas), [areas])
  const [query, setQuery] = useState('')
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const toggle = (slug: string) => onChange(pickArea(tree, value, slug))
  const chip = (slug: string, label: string) => {
    const state = chipState(tree, value, slug)
    return <CheckChip key={slug} label={label} checked={state === 'picked' || state === 'covered'} disabled={state === 'covered' || state === 'full'} onToggle={() => toggle(slug)} />
  }
  const groupStatus = (group: string) => {
    if (value.includes(group)) return 'All'
    const pickedUnder = value.filter((slug) => tree.lineage(slug).includes(group)).length
    return pickedUnder ? `${pickedUnder} picked` : null
  }
  const results = tree.search(query)

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1.5 text-sm font-medium text-secondary">Areas you are looking for</legend>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((slug) => <RemoveChip key={slug} label={pickLabel(tree, slug)} onRemove={() => toggle(slug)} />)}
        </div>
      )}
      <div className="relative">
        <SearchLg size={20} aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-fg-quaternary" />
        <input type="search" aria-label="Search an area" className={`${inputClass} pl-10`} placeholder="Search an area, eg. Kandivli" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {query.trim() ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-tertiary">
            {results.length ? `${results.length} ${results.length === 1 ? 'area matches' : 'areas match'} “${query.trim()}”, by name or another name` : `No area matches “${query.trim()}”.`}
          </p>
          {results.map((a) => chip(a.slug, a.parent ? `${a.name} · ${tree.label(a.parent)}` : pickLabel(tree, a.slug)))}
        </div>
      ) : (
        <ul className="flex flex-col">
          {tree.groups.map((group) => {
            const isOpen = openGroup === group.slug
            const status = groupStatus(group.slug)
            return (
              <li key={group.slug} className="border-b border-secondary">
                <button type="button" aria-expanded={isOpen} onClick={() => setOpenGroup(isOpen ? null : group.slug)}
                  className="flex w-full items-center gap-2 py-3.5 text-left text-sm font-medium text-secondary outline-focus-ring focus-visible:outline-2">
                  <span className="flex-1">{group.name}{status && <span className="ml-2 font-normal text-tertiary">{status}</span>}</span>
                  {isOpen ? <ChevronDown size={20} aria-hidden className="text-fg-quaternary" /> : <ChevronRight size={20} aria-hidden className="text-fg-quaternary" />}
                </button>
                {isOpen && (
                  <div className="flex flex-wrap gap-2 pt-1 pb-4">
                    {chip(group.slug, `All of ${group.name}`)}
                    {tree.under(group.slug).map((sub) => chip(sub.slug, sub.name))}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <p className="text-sm text-tertiary">
        {value.length >= maxProfileAreas ? `${maxProfileAreas} of ${maxProfileAreas}. Remove one to add another.` : `${value.length} of ${maxProfileAreas} areas. A pick includes the areas under it.`}
      </p>
    </fieldset>
  )
}
