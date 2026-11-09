import { InvitesEditor } from '../../../components/admin/invites-editor'
import { siteContentTabs, SubjectPage } from '../../../components/admin/admin-page'

export default function InvitesPage() {
  return (
    <SubjectPage role="moderator" title="Site content" tabs={siteContentTabs} intro="Until roomsie opens, only these emails and the moderators can sign in.">
      <div className="flex max-w-180 flex-col gap-4"><InvitesEditor /></div>
    </SubjectPage>
  )
}
