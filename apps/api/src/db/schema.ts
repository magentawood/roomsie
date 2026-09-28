/**
 * roomsie — database schema v1   (T-06, issue #11)
 *
 * Conventions come from two accepted ADRs and are not negotiable here:
 *   0015  every id is a UUIDv7 minted in app code, never by the database
 *   0006  Drizzle is the schema source of truth; SQL migrations are generated
 *
 * Shape: `users` is thin — identity and account state only. Everything about
 * a person lives in `profiles`. The per-request auth check then reads a tiny
 * row, and editing a profile never touches the auth row.
 */
import {
  pgTable, pgEnum, uuid, text, integer, boolean, date, timestamp, jsonb,
  primaryKey, uniqueIndex, index,
} from 'drizzle-orm/pg-core'
import { uuidv7 } from 'uuidv7'

/** ADR 0015: app-minted UUIDv7, no database default. */
const id = () => uuid('id').primaryKey().$defaultFn(() => uuidv7())
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()

/* ── enums ──────────────────────────────────────────────────────────────────
 * Form A enums carry `unclear`, per T-08: the assistant is allowed not to
 * know. Lifecycle enums (account status, request status) do not — those are
 * facts the system owns, not answers a person gave.
 */
export const intentEnum = pgEnum('intent', ['has_flat', 'wants_flat', 'wants_room', 'open', 'unclear'])
export const roomTypeEnum = pgEnum('room_type', ['private', 'shared', 'whole_flat', 'unclear'])
export const accountStatusEnum = pgEnum('account_status', ['active', 'suspended', 'deleted'])
export const connectionStatusEnum = pgEnum('connection_status', ['pending', 'accepted', 'declined', 'withdrawn'])
export const reportStatusEnum = pgEnum('report_status', ['open', 'actioned', 'dismissed'])
export const visibilityEnum = pgEnum('visibility', ['draft', 'live', 'hidden'])

/** How much an answer counts. A dealbreaker filters people out; a preference
 *  only moves them down the ranking. */
export const weightEnum = pgEnum('answer_weight', ['prefer', 'dealbreaker'])

/** Where a value came from. T-08's fourth state, `empty`, is the absence of a
 *  row — we never store "we don't know". */
export const sourceEnum = pgEnum('answer_source', ['stated', 'inferred', 'default'])

/* ── identity ───────────────────────────────────────────────────────────── */

export const users = pgTable('users', {
  id: id(),
  /** Firebase uid. The only link to the identity provider. */
  authProviderId: text('auth_provider_id').notNull(),
  status: accountStatusEnum('status').notNull().default('active'),
  /** Tokens issued before this instant are rejected. Moves on sign-out-everywhere,
   *  suspension and deletion, so revocation needs no token blacklist. */
  tokensValidAfter: timestamp('tokens_valid_after', { withTimezone: true }).notNull().defaultNow(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => ({
  authProviderIdx: uniqueIndex('users_auth_provider_id_idx').on(t.authProviderId),
}))

/* ── the person ─────────────────────────────────────────────────────────── */

export const profiles = pgTable('profiles', {
  id: id(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  displayName: text('display_name').notNull(),
  age: integer('age'),
  work: text('work'),

  // Form A — the hard constraints that drive the match query (T-14).
  intent: intentEnum('intent').notNull().default('unclear'),
  roomType: roomTypeEnum('room_type').notNull().default('unclear'),
  /** Rupees per month. A band in the UI, a range here. */
  budgetMin: integer('budget_min'),
  budgetMax: integer('budget_max'),
  /** Multi-select, so an array. Every value must be an `areas.slug`.
   *  Postgres cannot put a foreign key on an array element, so this is
   *  enforced in the contract layer — the same pattern as
   *  profile_lifestyle.value against its axis. */
  areas: text('areas').array().notNull().default([]),
  moveDate: date('move_date'),

  /** Object keys in R2. Photo bytes never pass through the API (T-16). */
  photoKeys: text('photo_keys').array().notNull().default([]),
  visibility: visibilityEnum('visibility').notNull().default('draft'),

  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => ({
  userIdx: uniqueIndex('profiles_user_id_idx').on(t.userId),
  liveIdx: index('profiles_live_idx').on(t.visibility, t.intent),
}))

/* ── the axis catalogue ─────────────────────────────────────────────────────
 *
 *  ⚠️  THE NINE AXIS NAMES BELOW ARE PROVISIONAL — CHOSEN BY ENGINEERING.
 *
 *  Every planning document says "the nine lifestyle axes" and not one of them
 *  says what the nine are. Rather than block, the axes are stored as DATA in
 *  `lifestyle_axes`, not as nine columns here.
 *
 *  Adding, renaming, dropping or re-valuing an axis is therefore a seed edit
 *  and a re-seed — no migration, no backfill, no deploy. See seed-axes.ts.
 *
 *  That only stays true if three things hold:
 *    1. packages/contract generates Form A from this table, never hardcodes it
 *    2. the match query (T-14) joins through it, never `WHERE smoking = ...`
 *    3. the extraction prompt (T-12) is built from it, never typed out
 *  One and three are P2's lane. This is a shared contract, like Form A itself.
 */
export const lifestyleAxes = pgTable('lifestyle_axes', {
  /** Stable machine key, e.g. `smoking`. Referenced by contract and prompts. */
  key: text('key').primaryKey(),
  /** What the assistant asks. Closed question, so the UI can offer chips. */
  question: text('question').notNull(),
  /** The allowed answers, in display order. Chips are derived from this. */
  allowedValues: text('allowed_values').array().notNull(),
  sortOrder: integer('sort_order').notNull(),
  /** Retire an axis without deleting anyone's answers. */
  active: boolean('active').notNull().default(true),
  createdAt: createdAt(),
})

/** One row per person per axis they have answered. No row means unanswered —
 *  that is T-08's `empty`. */
export const profileLifestyle = pgTable('profile_lifestyle', {
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  axisKey: text('axis_key').notNull().references(() => lifestyleAxes.key),
  /** Must be one of the axis's allowedValues. Enforced in the contract layer,
   *  not by a CHECK, because the allowed set is data and changes without a
   *  migration. */
  value: text('value').notNull(),
  weight: weightEnum('weight').notNull().default('prefer'),
  source: sourceEnum('source').notNull().default('stated'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => ({
  pk: primaryKey({ columns: [t.profileId, t.axisKey] }),
  /** The match query filters on dealbreakers first — this is its index. */
  axisValueIdx: index('profile_lifestyle_axis_value_idx').on(t.axisKey, t.value, t.weight),
}))

/* ── areas ──────────────────────────────────────────────────────────────────
 * A controlled vocabulary, not free text.
 *
 * Two things depend on area slugs being stable and canonical:
 *   · the public area pages (`/flats-in-powai`) that seo-with-gated-products.md
 *     calls the main SEO asset — a URL has to mean the same thing forever
 *   · every aggregate on those pages, which splits into useless fragments the
 *     moment "Powai", "powai" and "Powai, Mumbai" become three cells
 *
 * This table is also where the evergreen copy lives: the commute notes and
 * area description written once and reused on every page.
 *
 * ADR 0015 exception, deliberately: the primary key is the slug, not a UUIDv7.
 * The ADR's reasoning is enumerability — you should not be able to walk
 * `/users/1024` to `/users/1025`. Areas are the opposite: the slugs are
 * published, guessable by design, and meant to be linked. `lifestyle_axes`
 * takes the same exception for the same reason.
 */
export const areas = pgTable('areas', {
  /** URL slug. Canonical, permanent, lowercase-hyphenated: `bandra-east`. */
  slug: text('slug').primaryKey(),
  /** Display name: `Bandra East`. */
  name: text('name').notNull(),
  /** Evergreen copy for the area page. Written once, not generated. */
  description: text('description'),
  commuteNotes: text('commute_notes'),
  /** F-06 picks three to open with. The rest exist for the waitlist (T-22). */
  isLaunchArea: boolean('is_launch_area').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => ({
  launchIdx: index('areas_launch_idx').on(t.isLaunchArea, t.sortOrder),
}))

/* ── listings ───────────────────────────────────────────────────────────────
 * A flat or a room being offered, posted by someone whose intent is has_flat.
 *
 * Named as a table by ADR 0015's client-vs-API minting split, and required by
 * seo-with-gated-products.md, which aggregates rent bands by room type across
 * listings and states that listings expire after 30 days.
 *
 * Distinct from `profiles` on purpose: a profile is a person, a listing is a
 * property. One person can post more than one, and a listing outlives any
 * single conversation about it.
 */
export const listings = pgTable('listings', {
  id: id(),
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),

  title: text('title').notNull(),
  description: text('description'),
  /** References areas.slug. Not a text array — a listing is in one place. */
  areaSlug: text('area_slug').notNull().references(() => areas.slug),
  roomType: roomTypeEnum('room_type').notNull().default('unclear'),

  /** Rupees per month. A listing states a rent; a seeker states a budget. */
  rent: integer('rent').notNull(),
  deposit: integer('deposit'),
  availableFrom: date('available_from'),

  photoKeys: text('photo_keys').array().notNull().default([]),
  visibility: visibilityEnum('visibility').notNull().default('draft'),
  /** Listings go stale and Google demotes link decay, so they expire rather
   *  than 404. Thirty days, per seo-with-gated-products.md. */
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),

  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => ({
  /** The area-page aggregate: rent bands by room type, per area. */
  areaRentIdx: index('listings_area_rent_idx').on(t.areaSlug, t.roomType, t.rent),
  /** Live listings only — expired ones vanish from results but stay queryable
   *  for the aggregates, which is why they are dated rather than deleted. */
  liveIdx: index('listings_live_idx').on(t.visibility, t.expiresAt),
  ownerIdx: index('listings_owner_idx').on(t.profileId),
}))

/* ── the anonymous visitor ──────────────────────────────────────────────── */

export const anonymousSessions = pgTable('anonymous_sessions', {
  id: id(),
  /** Per-device, per-network hash. Feeds the rate limits in T-21. */
  deviceHash: text('device_hash').notNull(),
  /** Form A so far, as the assistant has filled it. Partial by definition. */
  form: jsonb('form').notNull().default({}),
  /** Typed turns only — chip taps are free and do not count (T-21). */
  turnCount: integer('turn_count').notNull().default(0),
  /** Set when the visitor signs in and the chat is carried over (T-17). */
  claimedByUserId: uuid('claimed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
}, (t) => ({
  deviceIdx: index('anonymous_sessions_device_idx').on(t.deviceHash),
  claimedIdx: index('anonymous_sessions_claimed_idx').on(t.claimedByUserId),
}))

/* ── connecting ─────────────────────────────────────────────────────────── */

export const connectionRequests = pgTable('connection_requests', {
  id: id(),
  fromProfileId: uuid('from_profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  toProfileId: uuid('to_profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  status: connectionStatusEnum('status').notNull().default('pending'),
  createdAt: createdAt(),
  respondedAt: timestamp('responded_at', { withTimezone: true }),
}, (t) => ({
  /** One open request per direction. Contact is revealed only when a row here
   *  reaches `accepted` (T-18a). */
  pairIdx: uniqueIndex('connection_requests_pair_idx').on(t.fromProfileId, t.toProfileId),
  inboxIdx: index('connection_requests_inbox_idx').on(t.toProfileId, t.status),
}))

/* ── safety ─────────────────────────────────────────────────────────────────
 * ADR 0015: reports and blocks are client-mintable, so their endpoints accept
 * an `id` and dedupe with ON CONFLICT (id) DO NOTHING. A retried tap on a bad
 * connection must never file two reports.
 */

export const reports = pgTable('reports', {
  id: id(),
  reporterUserId: uuid('reporter_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  subjectUserId: uuid('subject_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  reason: text('reason').notNull(),
  detail: text('detail'),
  status: reportStatusEnum('status').notNull().default('open'),
  createdAt: createdAt(),
}, (t) => ({
  /** The moderator's saved query: open reports, oldest first (T-19). */
  queueIdx: index('reports_queue_idx').on(t.status, t.createdAt),
  subjectIdx: index('reports_subject_idx').on(t.subjectUserId),
}))

export const blocks = pgTable('blocks', {
  id: id(),
  blockerUserId: uuid('blocker_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  blockedUserId: uuid('blocked_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: createdAt(),
}, (t) => ({
  pairIdx: uniqueIndex('blocks_pair_idx').on(t.blockerUserId, t.blockedUserId),
  /** The match query subtracts blocks in BOTH directions — a block hides each
   *  person from the other, not just one way. */
  blockedIdx: index('blocks_blocked_idx').on(t.blockedUserId),
}))

/* ── measurement ────────────────────────────────────────────────────────── */

export const events = pgTable('events', {
  id: id(),
  /** Exactly one of these is set. Anonymous events matter most — they are how
   *  you see people who start a chat and never sign up (T-24). */
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  anonymousSessionId: uuid('anonymous_session_id').references(() => anonymousSessions.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  props: jsonb('props').notNull().default({}),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
  createdAt: createdAt(),
}, (t) => ({
  funnelIdx: index('events_name_occurred_idx').on(t.name, t.occurredAt),
}))

export const waitlist = pgTable('waitlist', {
  id: id(),
  email: text('email').notNull(),
  /** Where they asked for. Decides which area opens next (T-22). */
  area: text('area'),
  createdAt: createdAt(),
  invitedAt: timestamp('invited_at', { withTimezone: true }),
}, (t) => ({
  emailIdx: uniqueIndex('waitlist_email_idx').on(t.email),
}))
