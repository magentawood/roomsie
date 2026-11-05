import { z } from 'zod'

/** The photo types that an upload accepts, and the extension of each in the key. */
export const photoTypes = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as const
export const photoType = z.enum(Object.keys(photoTypes) as [keyof typeof photoTypes, ...(keyof typeof photoTypes)[]])
/** <folder>/<owner id>/<photo id>.<extension>. The API also checks the owner id. */
export const photoKeyIn = (folder: 'listings' | 'profiles' | 'checks') =>
  z.string().regex(new RegExp(String.raw`^${folder}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(${Object.values(photoTypes).join('|')})$`))
/** Upload with these two values as the content-type and content-length headers. The link signs them. */
export const uploadUrlBody = z.strictObject({ contentType: photoType, size: z.int().min(1).max(10 * 1024 * 1024) })
export type UploadUrlBody = z.infer<typeof uploadUrlBody>
export const uploadUrlReply = (key: ReturnType<typeof photoKeyIn>) => z.object({ key, url: z.url(), expiresAt: z.iso.datetime() })

/** A list for a client: it drops each row with a value of a field that the bundle does not know, so a tab with an older bundle keeps working (api.md). */
export const knownRows = <T extends z.ZodType<Record<string, unknown>>>(row: T, fields: Partial<Record<keyof z.infer<T> & string, readonly string[]>>) =>
  z.preprocess((rows) => (Array.isArray(rows)
    ? rows.filter((r: Record<string, unknown>) => Object.entries(fields).every(([field, values]) => (values as readonly string[]).includes(String(r?.[field]))))
    : rows), z.array(row))

/** The permanent slug of an area of PD2: `andheri-west`. */
export const areaSlug = z.string().max(60).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
export const rupees = z.int().min(0).max(100_000_000)
export const requiredText = (max: number) => z.string().trim().min(1).max(max)
export const optionalText = (max: number) => requiredText(max).nullable()

const idClockSkew = 5 * 60_000
/** The time in a UUIDv7: its first 48 bits, in milliseconds. */
const uuidv7Time = (id: string) => parseInt(id.replaceAll('-', '').slice(0, 12), 16)
/** An id that the client makes: a UUIDv7 with a time at most 5 minutes from the server clock (ADR-0015). */
export const clientId = z.uuid({ version: 'v7' })
  .refine((id) => Math.abs(Date.now() - uuidv7Time(id)) <= idClockSkew, 'The time in the id is more than 5 minutes off')

/** The words of a person in one form: no nukta, lower case, Devanagari digits as 0 to 9. The parsers and the catalogue read this form. */
export const plainWords = (text: string) => text.normalize('NFD').replace(/\u093C/g, '').toLowerCase().replace(/[०-९]/g, (d) => String(d.charCodeAt(0) - 0x966))
/** Letters and digits of each script, as plain words joined by one space. */
export const plainText = (text: string) => plainWords(text).replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim()
