import { z } from 'zod'
import { replyLanguages, type ReplyLanguage, type TurnLabel } from '@roomsie/contract'
import file from './lines.json'

const lineKeys = ['failed', 'done', 'noted', 'handoff', 'outOfScope', 'backToIt', 'adversarial', 'sensitive', 'danger'] as const

/** The fixed lines of the assistant in each reply language. A record on an enum needs each key. PC-15 of F-14 gives the final text. */
export const fixedLines = z.record(z.enum(lineKeys), z.record(z.enum(replyLanguages), z.string().min(1)))
  .refine((all) => Object.values(all.backToIt).every((line) => line.includes('{question}')), 'each backToIt line has {question}')

const lines = fixedLines.parse(file)

export const lineOf = (key: Exclude<(typeof lineKeys)[number], 'backToIt'>, language: ReplyLanguage) => lines[key][language]

/** The question stays in English (the spec of T-13), so it starts in lower case after the line. */
export const backToIt = (question: string, language: ReplyLanguage) =>
  lines.backToIt[language].replace('{question}', `${question[0]!.toLowerCase()}${question.slice(1)}`)

/** The language of a reply from the register of the router. Only a message in Devanagari alone gets Devanagari. */
export function languageOf(register: TurnLabel['register']): ReplyLanguage {
  if (!register || register.language === 'english' || register.language === 'other') return 'en'
  const devanagari = register.script === 'devanagari'
  if (register.language === 'marathi') return devanagari ? 'mr' : 'mr-Latn'
  return devanagari ? 'hi' : 'hi-Latn'
}
