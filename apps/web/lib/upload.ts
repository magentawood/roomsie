import type { User } from 'firebase/auth'
import type { z } from 'zod'
import type { UploadUrlBody } from '@roomsie/contract'
import { api } from './api'
import { shrinkPhoto } from './photo'

export type UploadTarget = { path: string; reply: z.ZodType<{ key: string; url: string }> }

/** Shrinks the photo, gets a signed link from the API, and uploads it straight to R2 (ADR-0005). Returns the key to save. */
export async function uploadPhoto(user: User, target: UploadTarget, file: File) {
  const photo = await shrinkPhoto(file)
  const contentType = photo.type as UploadUrlBody['contentType']
  const { key, url } = await api(user, target.path, target.reply, {
    method: 'POST',
    body: { contentType, size: photo.size } satisfies UploadUrlBody,
  })
  // The link signs the type and the size; the browser sets content-length from the body.
  const res = await fetch(url, { method: 'PUT', headers: { 'content-type': contentType }, body: photo })
  if (!res.ok) throw new Error(`The upload failed with ${res.status}`)
  return { key, preview: URL.createObjectURL(photo) }
}
