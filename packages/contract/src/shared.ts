import { z } from 'zod'

/** The photo types that an upload accepts, and the extension of each in the key. */
export const photoTypes = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as const
export const photoType = z.enum(Object.keys(photoTypes) as [keyof typeof photoTypes, ...(keyof typeof photoTypes)[]])
/** <folder>/<owner id>/<photo id>.<extension>. The API also checks the owner id. */
export const photoKeyIn = (folder: 'listings' | 'profiles') =>
  z.string().regex(new RegExp(String.raw`^${folder}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(${Object.values(photoTypes).join('|')})$`))
/** Upload with these two values as the content-type and content-length headers. The link signs them. */
export const uploadUrlBody = z.strictObject({ contentType: photoType, size: z.int().min(1).max(10 * 1024 * 1024) })
export type UploadUrlBody = z.infer<typeof uploadUrlBody>
export const uploadUrlReply = (key: ReturnType<typeof photoKeyIn>) => z.object({ key, url: z.url(), expiresAt: z.iso.datetime() })

export const rupees = z.int().min(0).max(100_000_000)
export const optionalText = (max: number) => z.string().trim().min(1).max(max).nullable()
