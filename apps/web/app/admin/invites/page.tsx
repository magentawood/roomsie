import { InvitesEditor } from '../../../components/admin/invites-editor'
import { siteContentTabs, SubjectPage } from '../../../components/admin/admin-page'

export default function InvitesPage() {
  return (
    <SubjectPage role="moderator" title="Site content" tabs={siteContentTabs} intro="Until roomsie opens, only these emails and the moderators can sign in.">
      <div className="max-w-180"><InvitesEditor /></div>
    </SubjectPage>
  )
}
