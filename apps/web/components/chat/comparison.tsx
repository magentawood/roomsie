'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LinkExternal01 } from '@untitledui/icons'
import type { CompareKind, Comparison } from '@roomsie/contract'
import { toggled } from '../../lib/chat'
import { fieldsOf, firstFields, tableOf } from '../../lib/compare'
import { CheckChip } from '../ui/choice'

/**
 * The table of "Compare answer", which code builds from the database (T-49). The picker adds or removes rows with no new request.
 * `onOpen`: an option opens in the results panel of the chat (2026-11-09). A click with a key held, or a chat with no panel, opens the page.
 */
export function ComparisonTable({ table, onOpen }: { table: Comparison; onOpen?: (card: { kind: CompareKind; id: string }) => void }) {
  const [shown, setShown] = useState<string[]>(firstFields[table.kind])
  const nameOf = (option: Comparison['options'][number]) => ('title' in option ? option.title : option.fullName)
  return (
    <section aria-label="Comparison" className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-xl border border-secondary">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr>
              <td />
              {table.options.map((option, i) => (
                <th key={option.id} scope="col" className="px-3 py-3 text-left font-medium whitespace-nowrap lg:px-6">
                  <Link href={`/${table.kind === 'place' ? 'places' : 'people'}/${option.id}`} title={nameOf(option)}
                    onClick={(e) => {
                      if (!onOpen || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
                      e.preventDefault()
                      onOpen({ kind: table.kind, id: option.id })
                    }}
                    className="inline-flex items-center gap-1 rounded-sm text-primary underline outline-focus-ring focus-visible:outline-2">
                    Option {i + 1}<LinkExternal01 size={14} aria-hidden />
                    <span className="sr-only">: {nameOf(option)}</span>
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* A row is 72 with its line, as in the designs, where the line is inside the row. */}
            {tableOf(table, shown).map((row) => (
              <tr key={row.field} className="h-17.75 border-t border-secondary">
                <th scope="row" className="px-3 pt-3.75 pb-4 text-left font-medium whitespace-nowrap text-primary lg:px-6">{row.label}</th>
                {row.cells.map((cell, i) => <td key={table.options[i]!.id} className="px-3 pt-3.75 pb-4 text-tertiary lg:px-6">{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <details className="text-sm">
        <summary className="w-fit cursor-pointer rounded-sm font-medium text-secondary outline-focus-ring focus-visible:outline-2">Change the fields</summary>
        <div role="group" aria-label="Fields to compare" className="mt-3 flex flex-wrap gap-2">
          {fieldsOf(table.kind).map(({ field, label }) => <CheckChip key={field} size="sm" label={label} checked={shown.includes(field)} onToggle={() => setShown(toggled(shown, field))} />)}
        </div>
      </details>
    </section>
  )
}
