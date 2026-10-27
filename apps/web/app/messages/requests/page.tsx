'use client'

import { MessagesFrame } from '../../../components/messages/inbox'
import { Requests } from '../../../components/messages/requests'

export default function RequestsPage() {
  return <MessagesFrame selected="requests"><Requests /></MessagesFrame>
}
