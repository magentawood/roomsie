import type { User } from 'firebase/auth'
import {
  checkUploadResponse, rejectReasonLabels, verificationResponse, type ListingKind, type UploadUrlBody, type VerificationResponse,
} from '@roomsie/contract'
import type { Tone } from '../components/ui/badge'
import { api } from './api'
import { fitWithin, shrinkPhoto } from './photo'

type DocumentType = 'passport' | 'driving_licence' | 'voter_id' | 'pan_card'

/** The "Verify your ID" row of Settings in each state, as section 26 of the drafts. */
export function verifyRow({ state, reason, note }: Pick<VerificationResponse, 'state' | 'reason' | 'note'>): { badge?: [Tone, string]; text: string; note?: string; action?: string } {
  switch (state) {
    case 'none': return { text: 'Optional. Send a passport, driving licence, voter ID or PAN card and a selfie. A Verified badge shows on your card after our check.', action: 'Verify' }
    case 'in_review': return { badge: ['warning', 'In review'], text: 'We check within 24 hours. You can use roomsie as usual while you wait.' }
    case 'verified': return { badge: ['success', 'Verified'], text: 'Your card shows the Verified badge. We deleted the photos of your check.' }
    case 'rejected': return {
      badge: ['error', 'Not verified'], text: `${reason ? `${rejectReasonLabels[reason]}. ` : ''}Send a new ID photo and take a new selfie.`,
      note: note ?? undefined, action: 'Send a new ID',
    }
    case 'expired': return { badge: ['gray', 'Not verified'], text: 'Your check took more than 7 days, so we deleted your photos. Please send them again. Sorry for the wait.', action: 'Send again' }
  }
}

/** The person can send a check: none yet, or the last one was rejected or expired. */
export const canSendCheck = (state: VerificationResponse['state']) => state === 'none' || state === 'rejected' || state === 'expired'

/** The pill of a detail screen, as the designs label it. */
export const verifiedLabel = (kind: ListingKind) =>
  ({ owner_flat: 'Verified Owner', pg: 'Verified Owner', room_in_flat: 'Verified Lister', broker_flat: 'Verified Broker' })[kind]

/** The front camera, for the live selfie. Null when the browser has no camera or the person blocks it. */
export async function openCamera() {
  if (!navigator.mediaDevices?.getUserMedia) return null
  return navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false }).catch(() => null)
}

/** One frame of the live video, as a JPEG of 1600 px or less. */
export function takeSelfie(video: HTMLVideoElement) {
  const { width, height } = fitWithin(video.videoWidth, video.videoHeight, 1600)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')!.drawImage(video, 0, 0, width, height)
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The camera gave no photo'))), 'image/jpeg', 0.9),
  )
}

const put = async (url: string, photo: Blob) => {
  // The link signs the type and the size; the browser sets content-length from the body.
  const res = await fetch(url, { method: 'PUT', headers: { 'content-type': photo.type }, body: photo })
  if (!res.ok) throw new Error(`The upload failed with ${res.status}`)
}
const uploadBody = (photo: Blob): UploadUrlBody => ({ contentType: photo.type as UploadUrlBody['contentType'], size: photo.size })

/** Uploads the two photos straight to the private bucket, then sends the check (T-46). */
export async function sendCheck(user: User, documentType: DocumentType, idFile: File, selfie: Blob) {
  const idPhoto = await shrinkPhoto(idFile)
  const links = await api(user, '/v1/me/verification/upload-urls', checkUploadResponse, {
    method: 'POST', body: { idPhoto: uploadBody(idPhoto), selfie: uploadBody(selfie) },
  })
  await Promise.all([put(links.idPhoto.url, idPhoto), put(links.selfie.url, selfie)])
  return api(user, '/v1/me/verification', verificationResponse, {
    method: 'POST', body: { documentType, idPhotoKey: links.idPhoto.key, selfieKey: links.selfie.key },
  })
}
