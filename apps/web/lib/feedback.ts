import { FaceFrown, FaceHappy, FaceNeutral, FaceSad, FaceSmile } from '@untitledui/icons'
import type { FeedbackRating } from '@roomsie/contract'

/** The five faces of the feedback pop-up, also on the admin list (T-50). */
export const faces: Record<FeedbackRating, { label: string; icon: typeof FaceHappy }> = {
  satisfied: { label: 'Satisfied', icon: FaceHappy },
  good: { label: 'Good', icon: FaceSmile },
  neutral: { label: 'Neutral', icon: FaceNeutral },
  bad: { label: 'Bad', icon: FaceFrown },
  unsatisfied: { label: 'Unsatisfied', icon: FaceSad },
}
