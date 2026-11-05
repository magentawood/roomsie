import { aiTabs, SubjectPage } from '../../../components/admin/admin-page'
import { AiOverview } from '../../../components/admin/ai-pipeline'

export default function AiPage() {
  return (
    <SubjectPage role="moderator" title="AI pipeline" tabs={aiTabs} intro="Each model call of the assistant: DeepSeek first, Gemini when a call fails. The numbers are for today, in IST.">
      <AiOverview />
    </SubjectPage>
  )
}
