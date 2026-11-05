import { z } from 'zod'
import { scopeBands } from '@roomsie/contract'
import file from './sentences.json'

export const languages = ['english', 'hinglish', 'marathi'] as const
export type EvalLanguage = (typeof languages)[number]

const sentence = z.strictObject({
  id: z.string(),
  text: z.string().min(1),
  language: z.enum(languages),
  script: z.enum(['latin', 'devanagari', 'mixed']),
  mix: z.enum(['none', 'light', 'medium', 'heavy']),
  vague: z.boolean(),
  expected: z.object({ lifestyle: z.record(z.string(), z.unknown()).optional(), mustHaves: z.record(z.string(), z.unknown()).optional() }).catchall(z.unknown()),
  // The band and the flags of the router (T-61). A sentence with no band is a search.
  band: z.enum(scopeBands).default('core'),
  danger: z.boolean().default(false),
  community: z.boolean().default(false),
  /** The name of a friend in the sentence, in lower case, in each script: the name test of the composer (T-61). */
  names: z.array(z.string().refine((name) => name === name.toLowerCase(), 'a name of the set is in lower case')).default([]),
})
export type EvalSentence = z.infer<typeof sentence>
/** Only the router scores the other sentences (the spec of T-61). */
export const isPlainSearch = (s: Pick<EvalSentence, 'band' | 'community'>) => s.band === 'core' && !s.community

/** The eval sentences of M-03 and T-61, with the reference date of their move dates. */
export const evalSet = z.strictObject({ version: z.literal(1), today: z.iso.date(), sentences: z.array(sentence) }).parse(file)

const inGroup = (group: string, values: Record<string, unknown> = {}) => Object.fromEntries(Object.entries(values).map(([key, value]) => [`${group}.${key}`, value]))
/** The labels by slot, as `lifestyle.food` for a lifestyle answer. */
export const labelledSlots = ({ lifestyle, mustHaves, ...top }: EvalSentence['expected']): Record<string, unknown> =>
  ({ ...top, ...inGroup('lifestyle', lifestyle), ...inGroup('mustHaves', mustHaves) })
