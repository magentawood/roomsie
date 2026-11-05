import { aiTabs, SubjectPage } from '../../../../components/admin/admin-page'
import { AiSettingsAndLog } from '../../../../components/admin/ai-pipeline'

export default function AiLogPage() {
  return (
    <SubjectPage role="moderator" title="AI pipeline" tabs={aiTabs} intro="The settings of the server, each flip of the Gemini switch, and each open of a trace.">
      <AiSettingsAndLog />
    </SubjectPage>
  )
}
