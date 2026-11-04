import { IdChecks } from '../../../components/admin/id-checks'
import { SubjectPage } from '../../../components/admin/admin-page'

/** ID reviewers only, also not a moderator (T-46). */
export default function IdChecksPage() {
  return (
    <SubjectPage role="reviewer" title="ID checks" intro="Oldest first. Each photo link lasts 5 minutes, and each view goes in the audit log.">
      <div className="max-w-180"><IdChecks /></div>
    </SubjectPage>
  )
}
