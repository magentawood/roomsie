'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageTextCircle01 } from '@untitledui/icons'
import { landingQuoteCount, noContent } from '@roomsie/contract'
import { api, errorText } from '../../lib/api'
import { useUser } from '../../lib/auth'
import { queryKeys, useAdminQuotes } from '../../lib/queries'
import { ago } from '../../lib/reports'
import { Button } from '../ui/button'
import { EmptyState } from '../ui/empty-state'
import { TextArea, TextInput } from '../ui/field'
import { Checkbox } from '../ui/toggle'

function AddQuote() {
  const user = useUser()
  const queryClient = useQueryClient()
  const [text, setText] = useState<string | null>(null)
  const [name, setName] = useState<string | null>(null)
  const [consent, setConsent] = useState(false)
  const add = useMutation({
    mutationFn: () => api(user, '/v1/admin/quotes', noContent, { method: 'POST', body: { text, name, consent } }),
    onSuccess: () => {
      setText(null)
      setName(null)
      setConsent(false)
      return queryClient.invalidateQueries({ queryKey: queryKeys.adminQuotes })
    },
  })
  return (
    <form className="flex flex-col gap-4 rounded-xl border border-secondary p-4 md:p-5" onSubmit={(e) => { e.preventDefault(); add.mutate() }}>
      <TextArea label="Quote" value={text} onChange={setText} maxLength={200} hint="200 characters at most. Copy the words of the person." />
      <TextInput label="Name" value={name} onChange={setName} maxLength={40} placeholder="Vikram D." hint="As it shows under the quote." />
      <Checkbox label="This person agreed that Roomsie shows this quote with this name" checked={consent} onChange={setConsent} required />
      {add.isError && <p role="alert" className="text-sm text-error-primary">{errorText(add.error)}</p>}
      <span>
        <Button type="submit" variant="primary" size="md" disabled={!text || !name || !consent || add.isPending}>Add quote</Button>
      </span>
    </form>
  )
}

/** The quotes of the landing page (T-23a). The section shows only with a full collage. */
export function QuotesEditor() {
  const user = useUser()
  const queryClient = useQueryClient()
  const quotes = useAdminQuotes()
  const remove = useMutation({
    mutationFn: (id: string) => api(user, `/v1/admin/quotes/${id}`, noContent, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.adminQuotes }),
  })
  if (quotes.isError) return <p role="alert" className="text-sm text-error-primary">{errorText(quotes.error)}</p>
  if (quotes.isPending) return <p className="text-sm text-tertiary">Loading…</p>
  const count = quotes.data.quotes.length
  return (
    <>
      <p className="text-sm font-medium text-secondary">
        {count >= landingQuoteCount
          ? `Live. The landing page shows the ${landingQuoteCount} newest quotes.`
          : `${count} of ${landingQuoteCount}. The section goes live at ${landingQuoteCount} quotes.`}
      </p>
      <AddQuote />
      {count === 0
        ? <EmptyState icon={MessageTextCircle01} title="No quotes yet.">Add the words of real users, with their agreement.</EmptyState>
        : (
          <ul className="flex flex-col gap-3">
            {quotes.data.quotes.map((quote) => (
              <li key={quote.id} className="flex flex-col gap-2 rounded-xl border border-secondary p-4">
                <p className="text-md text-primary">“{quote.text}”</p>
                <p className="flex flex-wrap items-center justify-between gap-2 text-sm text-tertiary">
                  <span>{quote.name} · added {ago(quote.createdAt)}</span>
                  <Button variant="link-error" disabled={remove.isPending} onClick={() => remove.mutate(quote.id)}>Delete</Button>
                </p>
              </li>
            ))}
          </ul>
        )}
      {remove.isError && <p role="alert" className="text-sm text-error-primary">{errorText(remove.error)}</p>}
    </>
  )
}
