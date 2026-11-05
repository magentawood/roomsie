import { date, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { uuidv7 } from 'uuidv7'

/**
 * The analytics database (ADR-0012). The migration partitions `events` by month on `created_at`,
 * which Drizzle cannot declare. Thus the key has the time in it.
 */
export const events = pgTable('events', {
  id: uuid('id').notNull().$defaultFn(() => uuidv7()),
  name: text('name').notNull(),
  eventVersion: integer('event_version').notNull(),
  /** The analytics id of the person, never `users.id`. Null for a guest. */
  actor: uuid('actor'),
  fields: jsonb('fields').notNull(),
  /** `track()` sets the time of the event: the batch insert comes up to 5 seconds later. */
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.id, t.createdAt] }),
  createdAtIdx: index('events_created_at_idx').using('brin', t.createdAt),
})).enableRLS()

/**
 * The count of each event of each day in IST, and of each value of the fields that the product numbers split (T-66).
 * `field` and `value` are '' for the count of all the events of a name. The job `jobs.roll_up_events` writes it, so its
 * key is the day, the event, the field and the value: SQL mints no UUIDv7 (ADR-0015). No person is in it.
 */
export const eventDays = pgTable('event_days', {
  day: date('day').notNull(),
  name: text('name').notNull(),
  field: text('field').notNull(),
  value: text('value').notNull(),
  count: integer('count').notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.day, t.name, t.field, t.value] }),
})).enableRLS()

