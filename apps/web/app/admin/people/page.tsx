import { directoryTabs, SubjectPage } from '../../../components/admin/admin-page'
import { PeopleList } from '../../../components/admin/directory'

const intro = 'Find a person or a listing, and act on it. Gender, religion and community never show here.'

export default function AdminPeoplePage() {
  return <SubjectPage role="moderator" title="People and listings" tabs={directoryTabs} intro={intro}><PeopleList /></SubjectPage>
}
