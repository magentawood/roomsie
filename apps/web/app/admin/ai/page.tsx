import { aiTabs, SubjectPage } from '../../../components/admin/admin-page'
import { AiOverview } from '../../../components/admin/ai-pipeline'

export default function AiPage() {
  return (
    <SubjectPage role="moderator" title="AI pipeline" tabs={aiTabs} intro="Each model call of the assistant: the main model first, the fallback after a failed call or while the switch is on. The numbers are for today, in IST.">
      <AiOverview />
    </SubjectPage>
  )
}
