import { z } from 'zod'
import { requiredText } from './shared'

/** A signed-in person sends it from the landing page, and later from the app (T-23a, T-50). */
export const feedbackBody = z.strictObject({ text: requiredText(2000) })
export type FeedbackBody = z.infer<typeof feedbackBody>
/** The newest feedback for the moderators. It names no sender. */
export const feedbackResponse = z.object({ feedback: z.array(z.object({ id: z.uuid(), text: z.string(), createdAt: z.iso.datetime() })) })
export type FeedbackResponse = z.infer<typeof feedbackResponse>
