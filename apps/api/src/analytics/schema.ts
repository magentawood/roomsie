import { index, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core'

/**
 * The analytics database (ADR-0012). The migration partitions `events` by month on `occurred_at`,
 * which Drizzle cannot declare. Thus the key has the time in it.
 */
export const events = pgTable('events', {
  id: uuid('id').notNull(),
  name: text('name').notNull(),
  eventVersion: integer('event_version').notNull(),
  /** The analytics id of the person, never `users.id`. Null for a guest. */
  actor: uuid('actor'),
  fields: jsonb('fields').notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.id, t.occurredAt] }),
  occurredAtIdx: index('events_occurred_at_idx').using('brin', t.occurredAt),
})).enableRLS()
