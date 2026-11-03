import { siteUrl } from './site'

/** The message that the Share modal sends to each ticked conversation (T-50). */
export const shareText = (title: string, path: string) => `${title}: ${siteUrl}${path}`

type TextPart = string | { href: string; text: string }
const cardLink = new RegExp(`(${siteUrl.replace(/[.]/g, '\\.')}/(?:places|people)/[0-9a-f-]{36})(?![\\w/-])`)

/** The text of a message, with each link to a place or a person of roomsie.in as a link. Each other link stays text (T-50). */
export const cardLinks = (text: string): TextPart[] =>
  text.split(cardLink).flatMap((part, i): TextPart[] => (i % 2 ? [{ href: part.slice(siteUrl.length), text: part }] : part ? [part] : []))
