import { z } from 'zod'
import file from './sentences.json'

const sentence = z.strictObject({
  id: z.string(),
  text: z.string().min(1),
  language: z.enum(['english', 'hinglish', 'marathi']),
  script: z.enum(['latin', 'devanagari', 'mixed']),
  mix: z.enum(['none', 'light', 'medium', 'heavy']),
  vague: z.boolean(),
  expected: z.object({ lifestyle: z.record(z.string(), z.unknown()).optional(), mustHaves: z.record(z.string(), z.unknown()).optional() }).catchall(z.unknown()),
})
export type EvalSentence = z.infer<typeof sentence>

/** The eval sentences of M-03, with the reference date of their move dates. */
export const evalSet = z.strictObject({ version: z.literal(1), today: z.iso.date(), sentences: z.array(sentence) }).parse(file)

const inGroup = (group: string, values: Record<string, unknown> = {}) => Object.fromEntries(Object.entries(values).map(([key, value]) => [`${group}.${key}`, value]))
/** The labels by slot, as `lifestyle.food` for a lifestyle answer. */
export const labelledSlots = ({ lifestyle, mustHaves, ...top }: EvalSentence['expected']): Record<string, unknown> =>
  ({ ...top, ...inGroup('lifestyle', lifestyle), ...inGroup('mustHaves', mustHaves) })
