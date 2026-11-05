import { directoryTabs, SubjectPage } from '../../../components/admin/admin-page'
import { ListingsList } from '../../../components/admin/directory'

const intro = 'Find a person or a listing, and act on it. Gender, religion and community never show here.'

export default function AdminListingsPage() {
  return <SubjectPage role="moderator" title="People and listings" tabs={directoryTabs} intro={intro}><ListingsList /></SubjectPage>
}
