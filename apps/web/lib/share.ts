import { savedKind, type SavedKind } from '@roomsie/contract'
import { siteUrl } from './site'

/** A place or a person, as Saved names them. */
export type Card = { kind: SavedKind; id: string }
export const cardUrl = ({ kind, id }: Card) => `${siteUrl}/${kind}/${id}`
/** The message that the Share modal sends to each ticked conversation. */
export const shareText = (title: string, url: string) => `${title}: ${url}`

type TextPart = string | { href: string; text: string }
const cardLink = new RegExp(`(${siteUrl.replace(/[.]/g, '\\.')}/(?:${savedKind.options.join('|')})/[0-9a-f-]{36})(?![\\w/-])`)

/** The text of a message, with each link to a place or a person of roomsie.in as a link. Each other link stays text (T-50). */
export const cardLinks = (text: string): TextPart[] =>
  text.split(cardLink).flatMap((part, i): TextPart[] => (i % 2 ? [{ href: part.slice(siteUrl.length), text: part }] : part ? [part] : []))
