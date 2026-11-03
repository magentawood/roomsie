import { z } from 'zod'
import { optionalText, requiredText } from './shared'

/** The five faces of the feedback pop-up, from the best to the worst (T-50). */
export const feedbackRatings = ['satisfied', 'good', 'neutral', 'bad', 'unsatisfied'] as const
export const feedbackRating = z.enum(feedbackRatings)
export type FeedbackRating = z.infer<typeof feedbackRating>
/** A signed-in person sends it from the landing page (T-23a). */
export const feedbackBody = z.strictObject({ text: requiredText(2000) })
/** The feedback pop-up after a goal closes: a face, and words if the person wants (T-50). */
export const goalFeedbackBody = z.strictObject({ rating: feedbackRating, text: optionalText(2000).default(null) })
export type GoalFeedbackBody = z.infer<typeof goalFeedbackBody>
/** The newest feedback for the moderators. It names no sender. */
export const feedbackResponse = z.object({
  feedback: z.array(z.object({ id: z.uuid(), text: z.string().nullable(), rating: feedbackRating.nullable().default(null), createdAt: z.iso.datetime() })),
})
