'use client'

import { useParams } from 'next/navigation'
import { AdminFrame } from '../../../../../components/admin/admin-page'
import { TurnView } from '../../../../../components/admin/traces'

export default function TurnPage() {
  const { key } = useParams<{ key: string }>()
  return <AdminFrame role="moderator" crumb="AI pipeline"><TurnView turnKey={key} /></AdminFrame>
}
