import { InvitesEditor } from '../../../components/admin/invites-editor'
import { ModeratorPage } from '../../../components/admin/moderator-page'

export default function InvitesPage() {
  return (
    <ModeratorPage title="Invites" backHref="/admin" intro="Until roomsie opens, only these emails and the moderators can sign in.">
      <InvitesEditor />
    </ModeratorPage>
  )
}
