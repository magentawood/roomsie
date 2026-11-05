import { z } from 'zod'
import { scopeBands } from './goals'
import { modelRoles } from './models'
import { knownRows } from './shared'

/**
 * The words that a trace shows as "[hidden]" (PD20, T-64): religion, and the community names that are not names of a language.
 * The names of a language, such as Marathi, stay (the spec of T-64). A word in Latin letters also masks its endings "s", "o", "on",
 * "ism" and "ic". A word in Devanagari masks each ending that joins it, as "मुस्लिमांसाठी".
 */
export const traceMaskWords = {
  religion: [
    'hindu', 'हिंदू', 'हिन्दू', 'हिंदु', 'हिन्दु',
    'muslim', 'musalman', 'musalmaan', 'mussalman', 'muslman', 'islam', 'मुस्लिम', 'मुसलमान', 'मुसल्मान', 'इस्लाम',
    'christian', 'isai', 'esai', 'catholic', 'protestant', 'ईसाई', 'इसाई', 'ख्रिश्चन', 'ख्रिस्ती', 'कैथोलिक', 'कॅथलिक',
    'sikh', 'सिख', 'सिक्ख', 'शीख',
    'jain', 'जैन',
    'buddhist', 'buddhism', 'bauddh', 'baudh', 'बौद्ध', 'बौध',
    'parsi', 'parsee', 'zoroastrian', 'पारसी',
    'jew', 'jewish', 'yahudi', 'यहूदी', 'ज्यू',
    'atheist', 'nastik', 'नास्तिक',
  ],
  community: [
    'marwari', 'marwadi', 'marvadi', 'मारवाड़ी', 'मारवाडी',
    'bihari', 'बिहारी',
    'uttar pradesh', 'up wala', 'up wale', 'up wali', 'upwala', 'upwale', 'उत्तर प्रदेश', 'यूपी',
    'kannadiga', 'कन्नडिगा',
    'malayali', 'mallu', 'मलयाली', 'मल्याळी',
    'north east', 'north-east', 'northeast', 'north eastern', 'north-eastern', 'northeastern', 'पूर्वोत्तर', 'नॉर्थ ईस्ट', 'ईशान्य',
  ],
} as const
/** The slots of Form A that show "set" in a trace, in place of their value (the spec of the admin panel). */
export const traceMaskedSlots = ['religionPreference', 'communityPreference', 'ownReligion', 'ownCommunity'] as const

/** A turn slower than this is in the filter "Slower than 8 s" (T-64). */
export const slowTurnMs = 8000
export const traceFilters = ['failed', 'fallback', 'slow'] as const
export type TraceFilter = (typeof traceFilters)[number]
/** A search by the session code, as "s-7f3a" or "7f3a", or a filter. */
export const adminTurnsQuery = z.object({ q: z.string().trim().max(10).optional(), filter: z.enum(traceFilters).optional() })
export type AdminTurnsQuery = z.input<typeof adminTurnsQuery>

/** The roles that save a trace: each but the check of the keys, which has no goal. */
export const tracedRoles = ['router', 'extractor', 'observer', 'composer', 'advisor'] as const satisfies readonly Exclude<(typeof modelRoles)[number], 'check'>[]
export type TracedRole = (typeof tracedRoles)[number]
/** The result of a turn: OK, a role with no answer, or a role that the fallback answered. */
export const turnResults = ['ok', 'failed', 'fallback'] as const
/** One turn: the model calls of one typed message. A session code and a number, never a name or an email (T-64). */
export const adminTurnRow = z.object({
  key: z.uuid(), sessionCode: z.string(), turn: z.int().min(1), at: z.iso.datetime(),
  band: z.enum(scopeBands).nullable(), language: z.string().nullable(), script: z.string().nullable(),
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
/** Drops a turn with a result that the web does not know, so a tab with an older bundle shows the other turns. */
export const adminTurnsView = adminTurnsResponse.extend({ turns: knownRows(adminTurnRow, 'result', turnResults) })

/** One attempt of a model call, masked. `answer` is null when the vendor gave no answer. */
const traceCall = z.object({
  /** 1 is the first attempt of the call, 2 the retry, 3 the fallback after the retry. */
  id: z.uuid(), role: z.enum(tracedRoles), attempt: z.int().min(1), model: z.string(), fallback: z.boolean(), outcome: z.enum(['ok', 'invalid', 'failed']),
  startedAt: z.iso.datetime(), ms: z.int().min(0), tokensIn: z.int().min(0), cachedTokensIn: z.int().min(0), tokensOut: z.int().min(0),
  systemPrompt: z.object({ name: z.string(), text: z.string() }),
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })),
  answer: z.string().nullable(),
})
export type TraceMessage = z.infer<typeof traceCall>['messages'][number]
export const adminTurnResponse = adminTurnRow.extend({
  rupees: z.number().min(0),
  /** The day that the traces of the turn go: 30 days after its first call (PD20). */
  goneOn: z.iso.date(),
  lastView: z.object({ by: z.string().nullable(), at: z.iso.datetime() }).nullable(),
  calls: z.array(traceCall),
})
export const adminTurnView = adminTurnResponse.extend({ calls: knownRows(traceCall, 'role', tracedRoles) })
export type AdminTurnResponse = z.infer<typeof adminTurnResponse>

export const traceViewsResponse = z.object({ views: z.array(z.object({ sessionCode: z.string(), turn: z.int().min(1), by: z.string().nullable(), at: z.iso.datetime() })) })
