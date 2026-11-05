import { z } from 'zod'
import { scopeBands } from './goals'
import { modelOutcomes, modelRoles } from './models'
import { knownRows } from './shared'

/** Religion, and the community names that are not names of a language (PD20). */
export const traceMaskWords = {
  religion: [
    'hindu', 'हिंदू', 'हिन्दू', 'हिंदु', 'हिन्दु',
    'muslim', 'musalman', 'musalmaan', 'mussalman', 'muslman', 'islam', 'मुस्लिम', 'मुस्लीम', 'मुसलमान', 'मुसल्मान', 'इस्लाम',
    'christian', 'christianity', 'isai', 'esai', 'catholic', 'protestant', 'ईसाई', 'इसाई', 'ख्रिश्चन', 'ख्रिस्ती', 'कैथोलिक', 'कॅथलिक',
    'sikh', 'सिख', 'सिक्ख', 'शीख',
    'jain', 'जैन',
    'buddhist', 'buddhism', 'bauddh', 'baudh', 'बौद्ध', 'बौध',
    'parsi', 'parsee', 'zoroastrian', 'पारसी',
    'jew', 'jewish', 'judaism', 'yahudi', 'यहूदी', 'ज्यू',
    'atheist', 'nastik', 'नास्तिक',
  ],
  community: [
    'marwari', 'marwadi', 'marvadi', 'मारवाड़ी', 'मारवाडी',
    'bihari', 'बिहारी',
    'uttar pradesh', 'up wala', 'up wale', 'up wali', 'upwala', 'upwale', 'उत्तर प्रदेश', 'यूपी',
    'kannadiga', 'कन्नडिगा',
    'malayali', 'malayalee', 'mallu', 'मलयाली', 'मल्याळी',
    'north east', 'north-east', 'northeast', 'north eastern', 'north-eastern', 'northeastern', 'north easterner', 'north-easterner', 'northeasterner', 'पूर्वोत्तर', 'नॉर्थ ईस्ट', 'ईशान्य',
  ],
} as const
const devanagariWord = (word: string) => !/^[\x20-\x7e]+$/.test(word)
/** Each word of the mask, and each word in Devanagari with its long ई or ी at the end short, as before an ending: "ईसाई" in "ईसाइयों". */
export const traceMaskForms = [...new Set([...traceMaskWords.religion, ...traceMaskWords.community]
  .flatMap((word) => (devanagariWord(word) ? [word, word.replace(/ी$/, 'ि').replace(/ई$/, 'इ')] : [word])))]
/** Words that start like a mask word, but are not religion or community: to teach, intellectual, juice and UPSC. */
export const traceMaskKeep = ['सिखा', 'बौद्धिक', 'ज्यूस', 'यूपीएससी'] as const
/** The slots of Form A that show "set" in a trace, in place of their value (the spec of the admin panel). */
export const traceMaskedSlots = ['religionPreference', 'communityPreference', 'ownReligion', 'ownCommunity'] as const

export const slowTurnMs = 8000
/** A trace goes this many days after its call (PD20). */
export const traceDays = 30
export const traceFilters = ['failed', 'fallback', 'slow'] as const
export type TraceFilter = (typeof traceFilters)[number]
/** A search by the session code, as "s-7f3a" or "7f3a", or a filter. */
export const adminTurnsQuery = z.object({ q: z.string().trim().max(10).optional(), filter: z.enum(traceFilters).optional() })
export type AdminTurnsQuery = z.input<typeof adminTurnsQuery>

/** The result of a turn: OK, a role with no answer, or a role that the fallback answered. */
export const turnResults = ['ok', 'failed', 'fallback'] as const
/** One turn: the model calls of one typed message. A session code and a number, never a name or an email (T-64). */
export const adminTurnRow = z.object({
  key: z.uuid(), sessionCode: z.string(), turn: z.int().min(1), at: z.iso.datetime(),
  band: z.enum(scopeBands).nullable(), language: z.string().nullable(), script: z.string().nullable(),
  /** The calls of the turn, one for each role. A retry is an attempt of the same call. */
  calls: z.int().min(0), ms: z.int().min(0), result: z.enum(turnResults),
  /** The first role that failed or that the fallback answered. Null when the result is OK. */
  resultRole: z.string().nullable(),
})
export type AdminTurnRow = z.infer<typeof adminTurnRow>
export const adminTurnsResponse = z.object({
  turns: z.array(adminTurnRow),
  /** The turns of each filter, of all the traces that are kept. */
  counts: z.object({ failed: z.int().min(0), fallback: z.int().min(0), slow: z.int().min(0) }),
})
/** For a tab with an older bundle: a band that it does not know shows no band, and a row with a value that it does not know goes. */
const knownBand = { band: adminTurnRow.shape.band.catch(null) }
export const adminTurnsView = adminTurnsResponse.extend({ turns: knownRows(adminTurnRow.extend(knownBand), { result: turnResults }) })

/** One attempt of a model call, masked. `answer` is null when the vendor gave no answer. */
const traceAttempt = z.object({
  id: z.uuid(), role: z.enum(modelRoles), attempt: z.int().min(1), model: z.string(), fallback: z.boolean(), outcome: z.enum(modelOutcomes),
  startedAt: z.iso.datetime(), ms: z.int().min(0), tokensIn: z.int().min(0), cachedTokensIn: z.int().min(0), tokensOut: z.int().min(0),
  systemPrompt: z.object({ name: z.string(), text: z.string() }),
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })),
  answer: z.string().nullable(),
})
export type TraceMessage = z.infer<typeof traceAttempt>['messages'][number]
export const adminTurnResponse = adminTurnRow.extend({
  rupees: z.number().min(0),
  /** The day that the traces of the turn go: 30 days after its first call (PD20). */
  goneOn: z.iso.date(),
  lastView: z.object({ by: z.string().nullable(), at: z.iso.datetime() }).nullable(),
  /** Each attempt of each call of the turn, in the order of their start. */
  attempts: z.array(traceAttempt),
})
export const adminTurnView = adminTurnResponse.extend({ ...knownBand, attempts: knownRows(traceAttempt, { role: modelRoles, outcome: modelOutcomes }) })
export type AdminTurnResponse = z.infer<typeof adminTurnResponse>

export const traceViewsResponse = z.object({ views: z.array(z.object({ sessionCode: z.string(), turn: z.int().min(1), by: z.string().nullable(), at: z.iso.datetime() })) })
