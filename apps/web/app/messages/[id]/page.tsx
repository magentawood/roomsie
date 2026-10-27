'use client'

import { useParams } from 'next/navigation'
import { errorText } from '../../../lib/api'
import { useConversations, useOutgoingRequests } from '../../../lib/queries'
import { MessagesFrame } from '../../../components/messages/inbox'
import { ChatThread, SentThread } from '../../../components/messages/thread'

/** A conversation has the id of its accepted request, so one route opens a chat or a request that the user sent. */
function Thread({ id }: { id: string }) {
  const conversations = useConversations(true)
  const outgoing = useOutgoingRequests(true)
  const failed = conversations.error ?? outgoing.error
  if (failed) return <p role="alert" className="p-6 text-sm text-error-primary">{errorText(failed)}</p>
  if (!conversations.data || !outgoing.data) return <p className="p-6 text-sm text-tertiary">Loading…</p>
  const conversation = conversations.data.conversations.find((c) => c.id === id)
  if (conversation) return <ChatThread key={id} conversation={conversation} />
  const sent = outgoing.data.requests.find((r) => r.id === id && r.state !== 'accepted')
  if (sent) return <SentThread request={sent} />
  return <p className="m-auto p-6 text-sm text-tertiary">This chat is not available.</p>
}

export default function ThreadPage() {
  const { id } = useParams<{ id: string }>()
  return <MessagesFrame selected={id}><Thread id={id} /></MessagesFrame>
}
