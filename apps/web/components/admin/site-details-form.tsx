'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { noContent, type SiteDetails } from '@roomsie/contract'
import { api, errorText } from '../../lib/api'
import { useUser } from '../../lib/auth'
import { queryKeys, useSite } from '../../lib/queries'
import { Button } from '../ui/button'
import { TextInput } from '../ui/field'

const fields: { key: keyof SiteDetails; label: string; placeholder: string }[] = [
  { key: 'instagram', label: 'Instagram link', placeholder: 'https://www.instagram.com/…' },
  { key: 'whatsapp', label: 'WhatsApp link', placeholder: 'https://wa.me/…' },
  { key: 'facebook', label: 'Facebook link', placeholder: 'https://www.facebook.com/…' },
  { key: 'linkedin', label: 'LinkedIn link', placeholder: 'https://www.linkedin.com/company/…' },
  { key: 'contactEmail', label: 'Contact email', placeholder: 'hello@roomsie.in' },
  { key: 'orgNumber', label: 'Organization number', placeholder: 'As it shows in the footer' },
]

function Form({ saved }: { saved: SiteDetails }) {
  const user = useUser()
  const queryClient = useQueryClient()
  const [details, setDetails] = useState(saved)
  const save = useMutation({
    mutationFn: () => {
      const body = Object.fromEntries(Object.entries(details).map(([key, value]) => [key, value?.trim() || null]))
      return api(user, '/v1/admin/site', noContent, { method: 'PUT', body })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.site }),
  })
  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
      {fields.map((field) => (
        <TextInput key={field.key} label={field.label} placeholder={field.placeholder} value={details[field.key]}
          onChange={(value) => { save.reset(); setDetails({ ...details, [field.key]: value }) }} />
      ))}
      {save.isError && <p role="alert" className="text-sm text-error-primary">{errorText(save.error)}</p>}
      {save.isSuccess && <p role="status" className="text-sm text-fg-success">Saved. The landing page shows it within a minute.</p>}
      <span>
        <Button type="submit" variant="primary" size="md" disabled={save.isPending}>Save</Button>
      </span>
    </form>
  )
}

/** The links and details of the landing page (T-23a). An empty field hides its part. */
export function SiteDetailsForm() {
  const site = useSite()
  if (site.isError) return <p role="alert" className="text-sm text-error-primary">{errorText(site.error)}</p>
  if (site.isPending) return <p className="text-sm text-tertiary">Loading…</p>
  return <Form saved={site.data.details} />
}
