import { ChatScreen, type Preview } from '../../components/chat/chat-screen'
import { AppShell } from '../../components/shell/app-shell'

const previews: readonly string[] = ['results', 'empty'] satisfies Preview[]
const isPreview = (value: unknown): value is Preview => typeof value === 'string' && previews.includes(value)

/**
 * The chat is open to a guest (PD6b). The landing page of T-23a keeps `/`.
 * `?preview=results` and `?preview=empty` show the results panel with sample data until T-12 fills the form (T-15).
 */
export default async function ChatPage({ searchParams }: { searchParams: Promise<{ preview?: string | string[] }> }) {
  const { preview } = await searchParams
  return (
    <AppShell fixed>
      <ChatScreen preview={isPreview(preview) ? preview : undefined} />
    </AppShell>
  )
}
