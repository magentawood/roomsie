import { z } from 'zod'
import { knownRows } from './shared'

/** The periods of the product numbers (T-66): today until now, and the 7 and the 30 whole days that end yesterday. */
export const numberPeriods = ['today', 'week', 'month'] as const
export type NumberPeriod = (typeof numberPeriods)[number]
/** The steps of the funnel, in order, each from one event (ADR-0012). */
export const funnelSteps = ['chats', 'results', 'wall', 'signedIn', 'requests', 'accepted', 'closed'] as const
export type FunnelStep = (typeof funnelSteps)[number]

const count = z.int().min(0)
/** A count of the period and of the period before it. */
export const numberPair = z.object({ now: count, before: count })
const split = z.array(z.object({ value: z.string(), count }))
export const productNumbersQuery = z.object({ period: z.enum(numberPeriods).default('today') })
export const productNumbersResponse = z.object({
  period: z.enum(numberPeriods),
  /** The first and the last day in IST: today twice for today. */
  from: z.iso.date(), to: z.iso.date(),
  /** Null when the analytics database is not set, fails, or takes over 5 s. */
  numbers: z.object({
    steps: z.array(numberPair.extend({ step: z.enum(funnelSteps) })),
    newAccounts: numberPair, foundOnRoomsie: numberPair,
    /** Of the period, each value with its count, the largest first. */
    where: split, limits: split, reports: split, answers: split,
  }).nullable(),
})
export type ProductNumbersResponse = z.infer<typeof productNumbersResponse>
/** Drops a step that the web does not know, so a tab with an older bundle shows the other steps. */
export const productNumbersView = productNumbersResponse.extend({
  numbers: productNumbersResponse.shape.numbers.unwrap().extend({ steps: knownRows(numberPair.extend({ step: z.enum(funnelSteps) }), { step: funnelSteps }) }).nullable(),
})
