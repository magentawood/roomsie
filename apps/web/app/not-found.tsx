import { LinkBroken02 } from '@untitledui/icons'
import { Button } from '../components/ui/button'
import { EmptyState } from '../components/ui/empty-state'

/** Our own "not found", because the CSP blocks the inline styles of the page of Next (T-52). */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col px-5">
      <EmptyState icon={LinkBroken02} title="This page isn’t here" action={<Button variant="primary" size="md" href="/">Go home</Button>}>
        The link is old, or it has a typo.
      </EmptyState>
    </main>
  )
}
