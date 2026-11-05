import { randomUUID } from 'node:crypto'
import type { FastifyBaseLogger, FastifyRequest } from 'fastify'
import { and, asc, desc, eq, inArray, sql, type SQL } from 'drizzle-orm'
import { modelOutcomes, modelRoles, routerAnswer, slowTurnMs, traceDays, type AdminTurnRow, type ModelUsage, type TraceFilter } from '@roomsie/contract'
import { uuidv7 } from 'uuidv7'
import { z } from 'zod'
import { afterReplyOf } from '../after-reply'
import type { Db } from '../db/client'
import { tracePrompts, traces, traceViews } from '../db/schema'
import { hashOf, userTurnCount } from '../goals/store'
import { vendorOf, type ModelCall } from '../models/models'
import { rupeesOf } from '../models/spend'
import { emailsOf } from '../users'
import { forTrace } from './mask'

/** What an attempt of a model call gives to its trace. */
export type Attempt = { attempt: number; model: string; fallback: boolean; outcome: (typeof modelOutcomes)[number]; startedAt: Date; ms: number; usage: ModelUsage; answer: string | null }

/** "s-" and four characters from the goal: never a name, and no link to a card (T-64). */
export const sessionCodeOf = (goalId: string) => `s-${hashOf(goalId).slice(0, 4)}`

/** The traces of the model calls (PD20, T-64). A save never fails the call: it goes after the attempt, and a failure goes to the error report. */
export function tracesOf({ db, log }: { db: Db; log: FastifyBaseLogger }) {
  const queue = afterReplyOf('traces', log)
  // The calls of one request are one turn. Its number comes at the first call, before the route saves the turn of the person.
  const turns = new WeakMap<FastifyRequest, Promise<{ key: string; number: number }>>()
  const requestTurn = (req: FastifyRequest, goalId: string) => {
    const known = turns.get(req)
    if (known) return known
    const turn = userTurnCount(db, goalId).then((count) => ({ key: randomUUID(), number: count + 1 }))
    turns.set(req, turn)
    return turn
  }

  return {
    save(call: ModelCall & { session: string }, attempt: Attempt) {
      const turn = requestTurn(call.req, call.session)
      queue.later(async () => {
        const { key, number } = await turn
        const hash = hashOf(call.system)
        await db.insert(tracePrompts).values({ hash, text: call.system }).onConflictDoNothing()
        await db.insert(traces).values({
          id: uuidv7(), turnKey: key, goalId: call.session, sessionCode: sessionCodeOf(call.session), turnNumber: number, role: call.role,
          attempt: attempt.attempt, model: attempt.model, fallback: attempt.fallback, outcome: attempt.outcome, startedAt: attempt.startedAt, ms: attempt.ms, ...attempt.usage,
          promptHash: hash, messages: { version: 1, list: call.messages.map(({ role, content }) => ({ role, content: forTrace(content) })) },
          answer: attempt.answer === null ? null : forTrace(attempt.answer),
        })
      })
    },
    settled: () => queue.settled(),
  }
}
export type Traces = ReturnType<typeof tracesOf>

const turnLimit = 50
// The stored values of the contract enums, parsed when the code reads them (database.md).
const storedRole = z.enum(modelRoles)
const storedOutcome = z.enum(modelOutcomes)
const roleOrder = modelRoles as readonly string[]
const firstRole = (roles: string[] | null) => roles?.toSorted((a, b) => roleOrder.indexOf(a) - roleOrder.indexOf(b))[0] ?? null

// One row for each turn. Its calls are its roles: a retry is an attempt of the same call. Its time is from its first call to the end of its last call before the reply.
// A failed role is a role of the turn with no answer in any of its attempts.
const turnStats = sql`
  select t.turn_key, min(t.session_code) as code, min(t.turn_number) as num, min(t.started_at) as at, count(distinct t.role)::int as calls,
    coalesce(round(extract(epoch from max(t.started_at + t.ms * interval '1 millisecond') filter (where t.role <> 'observer')
      - min(t.started_at) filter (where t.role <> 'observer')) * 1000), 0)::int as span,
    (select array_agg(f.role) from (select role from traces r where r.turn_key = t.turn_key group by role having not bool_or(r.outcome = 'ok')) f) as failed_roles,
    array_agg(distinct t.role) filter (where t.fallback) as fallback_roles
  from traces t group by t.turn_key`
const filterSql: Record<TraceFilter, SQL> = { failed: sql`failed_roles is not null`, fallback: sql`fallback_roles is not null`, slow: sql`span > ${slowTurnMs}` }

type TurnStats = { turn_key: string; code: string; num: number; at: string | Date; calls: number; span: number; failed_roles: string[] | null; fallback_roles: string[] | null }

/** The band and the register of a turn, from the answer of its router: the mask keeps them. */
async function labelsOf(db: Db, keys: string[]) {
  const rows = keys.length ? await db.select({ key: traces.turnKey, answer: traces.answer }).from(traces)
    .where(and(inArray(traces.turnKey, keys), eq(traces.role, 'router'), eq(traces.outcome, 'ok'))) : []
  return new Map(rows.flatMap(({ key, answer }) => {
    const parsed = routerAnswer.safeParse(JSON.parse(answer ?? 'null'))
    return parsed.success ? [[key, parsed.data] as const] : []
  }))
}

async function rowsOf(db: Db, stats: TurnStats[]): Promise<AdminTurnRow[]> {
  const labels = await labelsOf(db, stats.map((s) => s.turn_key))
  return stats.map((s) => {
    const label = labels.get(s.turn_key)
    const failed = firstRole(s.failed_roles)
    const fellBack = firstRole(s.fallback_roles)
    return {
      key: s.turn_key, sessionCode: s.code, turn: s.num, at: new Date(s.at).toISOString(), band: label?.band ?? null,
      language: label?.register.language ?? null, script: label?.register.script ?? null, calls: s.calls, ms: s.span,
      result: failed ? 'failed' : fellBack ? 'fallback' : 'ok', resultRole: failed ?? fellBack,
    }
  })
}

/** "s-7f3a" or "7f3a" as a session code. */
export const codeOf = (q: string) => `s-${q.toLowerCase().replace(/^s-/, '')}`

/** The newest turns of a search by session code or of a filter, and the turns of each filter of all the traces. */
export async function turnsOf(db: Db, { q, filter }: { q?: string; filter?: TraceFilter }) {
  const [listed, counted] = await Promise.all([
    db.execute<TurnStats>(sql`with t as (${turnStats}) select * from t
      where ${and(q ? sql`code = ${codeOf(q)}` : undefined, filter && filterSql[filter]) ?? sql`true`} order by at desc limit ${turnLimit}`),
    db.execute<{ failed: number; fallback: number; slow: number }>(sql`with t as (${turnStats}) select
      count(*) filter (where ${filterSql.failed})::int as failed, count(*) filter (where ${filterSql.fallback})::int as fallback,
      count(*) filter (where ${filterSql.slow})::int as slow from t`),
  ])
  return { turns: await rowsOf(db, [...listed]), counts: counted[0]! }
}

const istOffsetMs = 5.5 * 3_600_000
/** The day in IST that the nightly job deletes a trace of this time: its first run at 04:15 IST after the days of PD20. */
export function goneOnOf(startedAt: Date) {
  const due = new Date(startedAt.getTime() + traceDays * 86_400_000 + istOffsetMs)
  const afterRun = due.getUTCHours() * 60 + due.getUTCMinutes() >= 4 * 60 + 15
  return new Date(due.getTime() + (afterRun ? 86_400_000 : 0)).toISOString().slice(0, 10)
}

/** One turn with each of its calls, or null. The last open of the turn is the one before this read. */
export async function turnOf(db: Db, key: string) {
  const attempts = await db.select({ trace: traces, prompt: { hash: tracePrompts.hash, text: tracePrompts.text } })
    .from(traces).innerJoin(tracePrompts, eq(tracePrompts.hash, traces.promptHash)).where(eq(traces.turnKey, key)).orderBy(asc(traces.startedAt), asc(traces.attempt))
  if (!attempts.length) return null
  const [stats] = await db.execute<TurnStats>(sql`with t as (${turnStats}) select * from t where turn_key = ${key}`)
  const [row] = await rowsOf(db, [stats!])
  const [last] = await db.select({ by: traceViews.moderatorUserId, at: traceViews.createdAt }).from(traceViews).where(eq(traceViews.turnKey, key)).orderBy(desc(traceViews.createdAt)).limit(1)
  const emails = last?.by ? await emailsOf(db, [last.by]) : new Map<string, string | null>()
  return {
    ...row!,
    rupees: attempts.reduce((sum, { trace: t }) => sum + rupeesOf(vendorOf(t.model)!, t), 0),
    goneOn: goneOnOf(attempts[0]!.trace.startedAt),
    lastView: last ? { by: (last.by && emails.get(last.by)) ?? null, at: last.at.toISOString() } : null,
    attempts: attempts.map(({ trace: t, prompt }) => ({
      id: t.id, role: storedRole.parse(t.role), attempt: t.attempt, model: t.model, fallback: t.fallback, outcome: storedOutcome.parse(t.outcome), startedAt: t.startedAt.toISOString(), ms: t.ms,
      tokensIn: t.tokensIn, cachedTokensIn: t.cachedTokensIn, tokensOut: t.tokensOut,
      systemPrompt: { name: `${t.role} · ${prompt.hash.slice(0, 8)}`, text: prompt.text }, messages: t.messages.list, answer: t.answer,
    })),
  }
}

// clock_timestamp(): the log gives the last open, so two opens keep their order (database.md).
export const logView = (db: Db, moderatorUserId: string, turn: Pick<AdminTurnRow, 'key' | 'sessionCode' | 'turn'>) =>
  db.insert(traceViews).values({ id: uuidv7(), moderatorUserId, turnKey: turn.key, sessionCode: turn.sessionCode, turnNumber: turn.turn, createdAt: sql`clock_timestamp()` })

const viewLimit = 100
export async function viewsOf(db: Db) {
  const rows = await db.select().from(traceViews).orderBy(desc(traceViews.createdAt)).limit(viewLimit)
  const emails = await emailsOf(db, rows.flatMap((r) => (r.moderatorUserId ? [r.moderatorUserId] : [])))
  return rows.map((r) => ({ sessionCode: r.sessionCode, turn: r.turnNumber, by: (r.moderatorUserId && emails.get(r.moderatorUserId)) ?? null, at: r.createdAt.toISOString() }))
}
