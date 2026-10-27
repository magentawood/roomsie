import { z } from 'zod'
import { photoKeyIn, uploadUrlBody, uploadUrlReply } from './shared'

/** The IDs of the v0 route of PD8. Never an Aadhaar. */
export const documentTypes = ['passport', 'driving_licence', 'voter_id', 'pan_card'] as const
export const documentTypeLabels: Record<(typeof documentTypes)[number], string> = {
  passport: 'Passport', driving_licence: 'Driving licence', voter_id: 'Voter ID', pan_card: 'PAN card',
}
export const rejectReasons = ['id_not_clear', 'selfie_not_clear', 'no_match', 'not_accepted', 'id_expired'] as const
export const rejectReasonLabels: Record<(typeof rejectReasons)[number], string> = {
  id_not_clear: 'The ID photo is not clear',
  selfie_not_clear: 'The selfie is not clear',
  no_match: 'The selfie and the ID don’t match',
  not_accepted: 'We don’t accept this document',
  id_expired: 'The ID has expired',
}
export const reviewNoteLimit = 200
/** A check with no review after this many days expires, and the bucket deletes its files. */
export const checkExpiryDays = 7

export const checkPhotoKey = photoKeyIn('checks')
export const checkUploadBody = z.strictObject({ idPhoto: uploadUrlBody, selfie: uploadUrlBody })
export const checkUploadResponse = z.object({ idPhoto: uploadUrlReply(checkPhotoKey), selfie: uploadUrlReply(checkPhotoKey) })
export const sendCheckBody = z.strictObject({ documentType: z.enum(documentTypes), idPhotoKey: checkPhotoKey, selfieKey: checkPhotoKey })

export const verificationStates = ['none', 'in_review', 'verified', 'rejected', 'expired'] as const
/** The latest check of the person. `none`: the person never sent one. */
export const verificationResponse = z.object({
  state: z.enum(verificationStates),
  reason: z.enum(rejectReasons).nullable(),
  note: z.string().nullable(),
  sentAt: z.iso.datetime().nullable(),
  reviewedAt: z.iso.datetime().nullable(),
})
export type VerificationResponse = z.infer<typeof verificationResponse>

/** `faceMatch`: the similarity of Amazon Rekognition, 0 to 100, or null with no score. `earlierChecks`: the checks that the person sent before. */
export const idCheckQueueResponse = z.object({
  checks: z.array(z.object({
    id: z.uuid(),
    name: z.string().nullable(),
    photoUrl: z.url().nullable(),
    documentType: z.enum(documentTypes),
    faceMatch: z.number().min(0).max(100).nullable(),
    earlierChecks: z.int().min(0),
    sentAt: z.iso.datetime(),
  })),
})
export type IdCheckQueueResponse = z.infer<typeof idCheckQueueResponse>
export const idCheckPhotosResponse = z.object({ idPhotoUrl: z.url(), selfieUrl: z.url(), expiresAt: z.iso.datetime() })
export const reviewCheckBody = z.discriminatedUnion('action', [
  z.strictObject({ action: z.literal('approve') }),
  z.strictObject({ action: z.literal('reject'), reason: z.enum(rejectReasons), note: z.string().trim().max(reviewNoteLimit).nullable().default(null) }),
])
export type ReviewCheckBody = z.input<typeof reviewCheckBody>
