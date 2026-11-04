import { FeedbackList } from '../../../components/admin/feedback-list'
import { moderationTabs, SubjectPage } from '../../../components/admin/admin-page'

export default function FeedbackPage() {
  return (
    <SubjectPage role="moderator" title="Moderation" tabs={moderationTabs} intro="The 100 newest messages: from the landing page, and with a face after a goal closed.">
      <FeedbackList />
    </SubjectPage>
  )
}
