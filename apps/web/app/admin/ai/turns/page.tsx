import { aiTabs, SubjectPage } from '../../../../components/admin/admin-page'
import { tracesIntro, TurnsList } from '../../../../components/admin/traces'

export default function TurnsPage() {
  return <SubjectPage role="moderator" title="AI pipeline" tabs={aiTabs} intro={tracesIntro}><TurnsList /></SubjectPage>
}
