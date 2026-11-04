import type { FastifyBaseLogger } from 'fastify'
import { reportError } from '@roomsie/config/report'

/** Best-effort work after the reply of a route. A failure goes to the error report. */
export function afterReplyOf(where: string, log: FastifyBaseLogger) {
  const pending = new Set<Promise<void>>()
  return {
    // setImmediate: the route sends its reply first.
    later(work: () => Promise<void>) {
      const done: Promise<void> = new Promise((next) => setImmediate(next)).then(work)
        .catch((err: unknown) => reportError(err, { where, log })).finally(() => pending.delete(done))
      pending.add(done)
    },
    /** Waits for the work that is on its way: at a shutdown, and in the tests. */
    async settled() {
      while (pending.size) await Promise.all(pending)
    },
  }
}
export type AfterReply = ReturnType<typeof afterReplyOf>
