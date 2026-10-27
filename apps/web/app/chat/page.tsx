import { ChatScreen } from '../../components/chat/chat-screen'
import { AppShell } from '../../components/shell/app-shell'

/** The chat is open to a guest (PD6b). The landing page of T-23a keeps `/`. */
export default function ChatPage() {
  return (
    <AppShell fixed>
      <ChatScreen />
    </AppShell>
  )
}
