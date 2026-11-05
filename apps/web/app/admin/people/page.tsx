import { directoryTabs, SubjectPage } from '../../../components/admin/admin-page'
import { directoryIntro, PeopleList } from '../../../components/admin/directory'

export default function AdminPeoplePage() {
  return <SubjectPage role="moderator" title="People and listings" tabs={directoryTabs} intro={directoryIntro}><PeopleList /></SubjectPage>
}
