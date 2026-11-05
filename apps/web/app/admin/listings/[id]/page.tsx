'use client'

import { useParams } from 'next/navigation'
import { AdminFrame } from '../../../../components/admin/admin-page'
import { ListingView } from '../../../../components/admin/directory'

export default function AdminListingPage() {
  const { id } = useParams<{ id: string }>()
  return <AdminFrame role="moderator" crumb="People and listings"><ListingView id={id} /></AdminFrame>
}
