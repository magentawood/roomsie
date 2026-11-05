'use client'

import { useParams } from 'next/navigation'
import { AdminFrame } from '../../../../components/admin/admin-page'
import { PersonView } from '../../../../components/admin/directory'

export default function AdminPersonPage() {
  const { id } = useParams<{ id: string }>()
  return <AdminFrame role="moderator" crumb="People and listings"><PersonView userId={id} /></AdminFrame>
}
