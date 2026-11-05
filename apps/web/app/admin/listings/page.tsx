import { directoryTabs, SubjectPage } from '../../../components/admin/admin-page'
import { directoryIntro, ListingsList } from '../../../components/admin/directory'

export default function AdminListingsPage() {
  return <SubjectPage role="moderator" title="People and listings" tabs={directoryTabs} intro={directoryIntro}><ListingsList /></SubjectPage>
}
