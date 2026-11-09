import { z } from 'zod'
import { replyLanguages, type ReplyLanguage, type TurnLabel } from '@roomsie/contract'
import file from './lines.json'

const lineKeys = ['failed', 'done', 'noted', 'adviceHedge', 'handoff', 'outOfScope', 'backToIt', 'adversarial', 'sensitive', 'danger', 'compareBest', 'compareCheapest', 'notesList', 'notesEmpty', 'notesHint', 'sameMove', 'sameMoveAgain'] as const

/** The fixed lines of the assistant in each reply language. A record on an enum needs each key. PC-15 of F-14 gives the final text. */
export const fixedLines = z.record(z.enum(lineKeys), z.record(z.enum(replyLanguages), z.string().min(1)))
  .refine((all) => Object.values(all.backToIt).every((line) => line.includes('{question}')), 'each backToIt line has {question}')
  .refine((all) => Object.values(all.compareCheapest).every((line) => line.includes('{option}') && line.includes('{amount}')), 'each compareCheapest line has {option} and {amount}')

const lines = fixedLines.parse(file)

export const lineOf = (key: Exclude<(typeof lineKeys)[number], 'backToIt' | 'compareCheapest'>, language: ReplyLanguage) => lines[key][language]

/** The line of the option of a comparison with the least cash to move in (T-49). */
export const cheapestLine = (option: number, amount: string, language: ReplyLanguage) =>
  lines.compareCheapest[language].replace('{option}', String(option)).replace('{amount}', amount)

/** The question stays in English (the spec of T-13), so it starts in lower case after the line. */
export const backToIt = (question: string, language: ReplyLanguage) =>
  lines.backToIt[language].replace('{question}', `${question[0]!.toLowerCase()}${question.slice(1)}`)

/** The language of a reply from the register of the router. A message with mostly Devanagari letters gets Devanagari (T-27). */
export function languageOf(register: TurnLabel['register']): ReplyLanguage {
  if (!register || register.language === 'english' || register.language === 'other') return 'en'
  const devanagari = register.script === 'devanagari'
  if (register.language === 'marathi') return devanagari ? 'mr' : 'mr-Latn'
  return devanagari ? 'hi' : 'hi-Latn'
}
