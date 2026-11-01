import { ChatScreen } from '../../components/chat/chat-screen'
import { AppShell } from '../../components/shell/app-shell'
import { previews } from '../../lib/sample-results'

/**
 * The chat is open to a guest (PD6b). The landing page of T-23a keeps `/`.
 * `?preview=results` and `?preview=empty` show the results panel with sample data until T-12 fills the form (T-15).
 */
export default async function ChatPage({ searchParams }: { searchParams: Promise<{ preview?: string | string[] }> }) {
  const { preview } = await searchParams
  return (
    <AppShell fixed>
      <ChatScreen preview={previews.find((name) => name === preview)} />
    </AppShell>
  )
}
