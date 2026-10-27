import type { User } from 'firebase/auth'
import {
  checkExpiryDays, checkUploadResponse, rejectReasonLabels, verificationResponse, type DocumentType, type ListingKind, type VerificationResponse,
} from '@roomsie/contract'
import type { Tone } from '../components/ui/badge'
import { api } from './api'
import { fitWithin, shrinkPhoto } from './photo'
import { putPhoto, uploadBody } from './upload'

/** The offer of a check: in Settings with no check, and after a publish. */
export const verifyOffer = 'Optional. Send a passport, driving licence, voter ID or PAN card and a selfie. A Verified badge shows on your card after our check.'

/** The "Verify your ID" row of Settings in each state, as section 26 of the drafts. */
export function verifyRow({ state, reason, note }: Pick<VerificationResponse, 'state' | 'reason' | 'note'>): { badge?: { tone: Tone; label: string }; text: string; note?: string; action?: string } {
  switch (state) {
    case 'none': return { text: verifyOffer, action: 'Verify' }
    case 'in_review': return { badge: { tone: 'warning', label: 'In review' }, text: 'We check within 24 hours. You can use roomsie as usual while you wait.' }
    case 'verified': return { badge: { tone: 'success', label: 'Verified' }, text: 'Your card shows the Verified badge. We deleted the photos of your check.' }
    case 'rejected': return {
      badge: { tone: 'error', label: 'Not verified' }, text: `${reason ? `${rejectReasonLabels[reason]}. ` : ''}Send a new ID photo and take a new selfie.`,
      note: note ?? undefined, action: 'Send a new ID',
    }
    case 'expired': return { badge: { tone: 'gray', label: 'Not verified' }, text: `Your check took more than ${checkExpiryDays} days, so we deleted your photos. Please send them again. Sorry for the wait.`, action: 'Send again' }
  }
}

export const canSendCheck = (state: VerificationResponse['state']) => state === 'none' || state === 'rejected' || state === 'expired'

/** The pill of a detail screen, as the designs label it. */
export const verifiedLabel = (kind: ListingKind) =>
  ({ owner_flat: 'Verified Owner', pg: 'Verified Owner', room_in_flat: 'Verified Lister', broker_flat: 'Verified Broker' })[kind]

/** The front camera, for the live selfie. Null when the browser has no camera or the person blocks it. */
export async function openCamera() {
  if (!navigator.mediaDevices?.getUserMedia) return null
  return navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false }).catch(() => null)
}

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

/** Uploads the two photos straight to the private bucket, then sends the check (T-46). */
export async function sendCheck(user: User, documentType: DocumentType, idFile: File, selfie: Blob) {
  const idPhoto = await shrinkPhoto(idFile)
  const links = await api(user, '/v1/me/verification/upload-urls', checkUploadResponse, {
    method: 'POST', body: { idPhoto: uploadBody(idPhoto), selfie: uploadBody(selfie) },
  })
  await Promise.all([putPhoto(links.idPhoto.url, idPhoto), putPhoto(links.selfie.url, selfie)])
  return api(user, '/v1/me/verification', verificationResponse, {
    method: 'POST', body: { documentType, idPhotoKey: links.idPhoto.key, selfieKey: links.selfie.key },
  })
}
