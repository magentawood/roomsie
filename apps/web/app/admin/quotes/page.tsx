import { QuotesEditor } from '../../../components/admin/quotes-editor'
import { siteContentTabs, SubjectPage } from '../../../components/admin/admin-page'

export default function QuotesPage() {
  return (
    <SubjectPage role="moderator" title="Site content" tabs={siteContentTabs} intro="The quotes of real users on the landing page, newest first. A change shows there within a minute.">
      <QuotesEditor />
    </SubjectPage>
  )
}
