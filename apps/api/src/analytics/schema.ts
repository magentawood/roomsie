import { index, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { uuidv7 } from 'uuidv7'

/**
 * The analytics database (ADR-0012). The migration partitions `events` by month on `occurred_at`,
 * which Drizzle cannot declare. Thus the key has the time in it.
 */
export const events = pgTable('events', {
  id: uuid('id').notNull().$defaultFn(() => uuidv7()),
  name: text('name').notNull(),
  eventVersion: integer('event_version').notNull(),
  /** The analytics id of the person, never `users.id`. Null for a guest. */
  actor: uuid('actor'),
  fields: jsonb('fields').notNull(),
  /** The time of the event. The batch insert comes up to 5 seconds later, so it takes the place of `created_at`. */
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.id, t.occurredAt] }),
  occurredAtIdx: index('events_occurred_at_idx').using('brin', t.occurredAt),
})).enableRLS()
