import type { User } from 'firebase/auth'
import { uploadUrlResponse, type UploadUrlBody } from '@roomsie/contract'
import { api } from './api'
import { shrinkPhoto } from './photo'

/** Shrinks the photo, gets a signed link from the API, and uploads it straight to R2 (ADR-0005). Returns the key to save. */
export async function uploadPhoto(user: User, listingId: string, file: File) {
  const photo = await shrinkPhoto(file)
  const contentType = photo.type as UploadUrlBody['contentType']
  const { key, url } = await api(user, `/v1/listings/${listingId}/upload-urls`, uploadUrlResponse, {
    method: 'POST',
    body: { contentType, size: photo.size } satisfies UploadUrlBody,
  })
  // The link signs the type and the size; the browser sets content-length from the body.
  const res = await fetch(url, { method: 'PUT', headers: { 'content-type': contentType }, body: photo })
  if (!res.ok) throw new Error(`The upload failed with ${res.status}`)
  return { key, preview: URL.createObjectURL(photo) }
}
