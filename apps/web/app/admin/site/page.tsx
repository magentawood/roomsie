import { SiteDetailsForm } from '../../../components/admin/site-details-form'
import { siteContentTabs, SubjectPage } from '../../../components/admin/admin-page'

export default function SiteDetailsPage() {
  return (
    <SubjectPage role="moderator" title="Site content" tabs={siteContentTabs} intro="The links and details of the landing page. An empty field hides its part.">
      <div className="max-w-160"><SiteDetailsForm /></div>
    </SubjectPage>
  )
}
