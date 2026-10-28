import type { FastifyBaseLogger, FastifyRequest } from 'fastify'
import { analyticsEvent, type AnalyticsEvent } from '@roomsie/contract'
import type { AnalyticsDb } from './client'
import { events } from './schema'

/** The API writes the events in batches, not one at a time (ADR-0012). */
const batchSize = 100
const flushMs = 5_000

export type Analytics = {
  /** The one way to write an event. The actor is the analytics id of the person of `req`, or nobody for a guest. */
  track(req: FastifyRequest, event: AnalyticsEvent): void
  /** Writes the events in memory now, and waits for each write: in the tests. */
  flush(): Promise<void>
  /** Stops the timer and writes the rest: at a shutdown. */
  close(): Promise<void>
}

/** Best effort, as the alerts: a failed write goes to the log, and its events are lost. Without a database, it does nothing. */
export function analyticsOf(db: AnalyticsDb | undefined, log: FastifyBaseLogger): Analytics {
  if (!db) return { track: () => {}, flush: async () => {}, close: async () => {} }
  let buffer: (typeof events.$inferInsert)[] = []
  const writing = new Set<Promise<void>>()
  function write() {
    if (!buffer.length) return
    const batch = buffer
    buffer = []
    const done: Promise<void> = db!.insert(events).values(batch)
      .then(() => {}, (err: unknown) => log.error({ err, lost: batch.length }, 'analytics'))
      .finally(() => writing.delete(done))
    writing.add(done)
  }
  const timer = setInterval(write, flushMs).unref()
  const flush = async () => {
    write()
    await Promise.all(writing)
  }
  return {
    track(req, event) {
      // The action of the route is already saved, so a bad event goes to the log, never to the person.
      const parsed = analyticsEvent.safeParse(event)
      if (!parsed.success) return log.error({ err: parsed.error }, 'analytics')
      const { name, eventVersion, ...fields } = parsed.data
      buffer.push({ name, eventVersion, actor: req.analyticsId, fields, occurredAt: new Date() })
      if (buffer.length >= batchSize) write()
    },
    flush,
    async close() {
      clearInterval(timer)
      await flush()
    },
  }
}
