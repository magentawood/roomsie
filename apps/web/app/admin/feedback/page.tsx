import { FeedbackList } from '../../../components/admin/feedback-list'
import { ModeratorPage } from '../../../components/admin/moderator-page'

export default function FeedbackPage() {
  return (
    <ModeratorPage title="Feedback" backHref="/admin" intro="The 100 newest messages: from the landing page, and with a face after a goal closed.">
      <FeedbackList />
    </ModeratorPage>
  )
}
