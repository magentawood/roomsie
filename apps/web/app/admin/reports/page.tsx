import { moderationTabs, SubjectPage } from '../../../components/admin/admin-page'
import { ReportQueue } from '../../../components/admin/report-queue'

export default function ReportsPage() {
  return (
    <SubjectPage role="moderator" title="Moderation" tabs={moderationTabs}
      intro="Open reports. Safety reports come first, then the oldest. Review a safety report in 4 hours and the others in 24 hours.">
      <div className="max-w-180"><ReportQueue /></div>
    </SubjectPage>
  )
}
