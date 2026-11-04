import { IdChecks } from '../../../components/admin/id-checks'
import { SubjectPage } from '../../../components/admin/admin-page'

/** PD8 keeps the ID photos to the named reviewers, so a moderator sees "not found" too. */
export default function IdChecksPage() {
  return (
    <SubjectPage role="reviewer" title="ID checks" intro="Oldest first. Each photo link lasts 5 minutes, and each view goes in the audit log.">
      <div className="max-w-180"><IdChecks /></div>
    </SubjectPage>
  )
}
