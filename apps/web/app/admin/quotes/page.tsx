import { ModeratorPage } from '../../../components/admin/moderator-page'
import { QuotesEditor } from '../../../components/admin/quotes-editor'

export default function QuotesPage() {
  return (
    <ModeratorPage title="Quotes" backHref="/admin" intro="The quotes of real users on the landing page, newest first. A change shows there within a minute.">
      <QuotesEditor />
    </ModeratorPage>
  )
}
