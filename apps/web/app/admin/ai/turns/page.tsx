import { aiTabs, SubjectPage } from '../../../../components/admin/admin-page'
import { TurnsList } from '../../../../components/admin/traces'

export default function TurnsPage() {
  return <SubjectPage role="moderator" title="AI pipeline" tabs={aiTabs} intro="Each typed turn and its model calls. A trace shows a session code, never a name. Religion and community words show as [hidden]."><TurnsList /></SubjectPage>
}
