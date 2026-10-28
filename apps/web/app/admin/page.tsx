import { ModeratorPage } from '../../components/admin/moderator-page'
import { ReportQueue } from '../../components/admin/report-queue'
import { Button } from '../../components/ui/button'

export default function AdminPage() {
  return (
    <ModeratorPage title="Reports" backHref="/" intro="Open reports. Safety reports come first, then the oldest.">
      <nav aria-label="Landing page" className="flex flex-wrap gap-2">
        <Button size="sm" href="/admin/invites">Invites</Button>
        <Button size="sm" href="/admin/quotes">Quotes</Button>
        <Button size="sm" href="/admin/site">Site details</Button>
        <Button size="sm" href="/admin/feedback">Feedback</Button>
      </nav>
      <ReportQueue />
    </ModeratorPage>
  )
}
