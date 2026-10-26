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
import { sql } from 'drizzle-orm'
import {
  pgTable, pgEnum, uuid, text, integer, boolean, date, timestamp, jsonb,
  primaryKey, uniqueIndex, index, check, unique, foreignKey,
} from 'drizzle-orm/pg-core'
import { uuidv7 } from 'uuidv7'
import {
  amenities, bathrooms, bedsFree, curfews, electricityRules, foodAnswers, furnishings, genders, guestsRules, insideItems, intents,
  listingKinds, listingStatuses, meals, minStays, placeTypes, roomTypes, sharingTypes, walkTimes, visibilities, welcomeGroups, whoCanMoveIn, whosMovingAnswers,
} from '@roomsie/contract'

/** ADR 0015: app-minted UUIDv7, no database default. */
const id = () => uuid('id').primaryKey().$defaultFn(() => uuidv7())
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()

/* ── enums ──────────────────────────────────────────────────────────────────
 * Form A enums carry `unclear`, per T-08: the assistant is allowed not to
 * know. Lifecycle enums (account status, request status) do not — those are
 * facts the system owns, not answers a person gave.
 */
/** The place type a seeker picks (PD15). A lister is a listing, not a seeker. */
export const intentEnum = pgEnum('intent', intents)
/** Private or shared room. A seeker's value comes only from the chat (PD15). */
export const roomTypeEnum = pgEnum('room_type', roomTypes)
/** The choice itself; the contract maps it to a type and a household (PD15). */
export const whosMovingEnum = pgEnum('whos_moving', whosMovingAnswers)
export const genderEnum = pgEnum('gender', genders)
export const accountStatusEnum = pgEnum('account_status', ['active', 'suspended', 'deleted'])
export const connectionStatusEnum = pgEnum('connection_status', ['pending', 'accepted', 'declined', 'withdrawn', 'expired'])
export const reportStatusEnum = pgEnum('report_status', ['open', 'actioned', 'dismissed'])
export const visibilityEnum = pgEnum('visibility', visibilities)
export const goalStatusEnum = pgEnum('goal_status', ['open', 'found'])
export const turnRoleEnum = pgEnum('turn_role', ['user', 'assistant'])
export const turnInputEnum = pgEnum('turn_input', ['typed', 'chip'])

/* The single choices of the listing flow (flow 04 of the designs). */
export const listingKindEnum = pgEnum('listing_kind', listingKinds)
export const listingStatusEnum = pgEnum('listing_status', listingStatuses)
export const placeTypeEnum = pgEnum('place_type', placeTypes)
export const furnishingEnum = pgEnum('furnishing', furnishings)
export const bathroomEnum = pgEnum('bathroom', bathrooms)
export const mealsEnum = pgEnum('meals', meals)
export const curfewEnum = pgEnum('curfew', curfews)
export const electricityEnum = pgEnum('electricity', electricityRules)
export const minStayEnum = pgEnum('min_stay', minStays)
export const guestsRuleEnum = pgEnum('guests_rule', guestsRules)
export const walkTimeEnum = pgEnum('walk_time', walkTimes)
export const bedsFreeEnum = pgEnum('beds_free', bedsFree)
export const whoCanMoveInEnum = pgEnum('who_can_move_in', whoCanMoveIn)

/** A dealbreaker filters; a preference ranks (PD3a). */
export const mustHaveWeightEnum = pgEnum('must_have_weight', ['prefer', 'dealbreaker'])

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
  /** Set on a tombstone whose account was suspended at deletion. A new sign-in with the
   *  same Google account then gets a 403, so a deletion does not undo a suspension (T-20). */
  rejoinBlocked: boolean('rejoin_blocked').notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => ({
  authProviderIdx: uniqueIndex('users_auth_provider_id_idx').on(t.authProviderId),
})).enableRLS()

/* ── the person ─────────────────────────────────────────────────────────── */

export const profiles = pgTable('profiles', {
  id: id(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  fullName: text('full_name').notNull(),
  /** Empty until the person gives it; a card stays hidden until then (PD16). */
  age: integer('age'),
  /** The role only, never the company (PD16). */
  jobRole: text('job_role'),
  commuteAddress: text('commute_address'),
  bio: text('bio'),
  /** A parent runs this card for an adult son or daughter (PD16). */
  managedByParent: boolean('managed_by_parent').notNull().default(false),
  /** Required when the profile is made (PD8). Null only in rows from before T-16a. */
  gender: genderEnum('gender'),

  // Form A — the hard constraints that drive the match query (T-14).
  intent: intentEnum('intent').notNull().default('unclear'),
  roomType: roomTypeEnum('room_type').notNull().default('unclear'),
  whosMoving: whosMovingEnum('whos_moving').notNull().default('unclear'),
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
  /** `hidden` is the "Hide my card" switch (PD16). */
  visibility: visibilityEnum('visibility').notNull().default('draft'),

  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => ({
  userIdx: uniqueIndex('profiles_user_id_idx').on(t.userId),
  liveIdx: index('profiles_live_idx').on(t.visibility, t.intent),
  adultCheck: check('profiles_adult_check', sql`${t.age} >= 18`),
  photoLimitCheck: check('profiles_photo_limit_check', sql`cardinality(${t.photoKeys}) <= 4`),
})).enableRLS()

/* ── the catalogues: data, not columns, so a change is a re-seed (ADR-0017) ── */
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
}).enableRLS()

/** One row per person per axis they have answered. No row means unanswered —
 *  that is T-08's `empty`. */
export const profileLifestyle = pgTable('profile_lifestyle', {
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  axisKey: text('axis_key').notNull().references(() => lifestyleAxes.key),
  /** Must be one of the axis's allowedValues. Enforced in the contract layer,
   *  not by a CHECK, because the allowed set is data and changes without a
   *  migration. */
  value: text('value').notNull(),
  source: sourceEnum('source').notNull().default('stated'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => ({
  pk: primaryKey({ columns: [t.profileId, t.axisKey] }),
})).enableRLS()

export const mustHaves = pgTable('must_haves', {
  key: text('key').primaryKey(),
  label: text('label').notNull(),
  sortOrder: integer('sort_order').notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: createdAt(),
}).enableRLS()

export const profileMustHaves = pgTable('profile_must_haves', {
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  mustHaveKey: text('must_have_key').notNull().references(() => mustHaves.key),
  weight: mustHaveWeightEnum('weight').notNull().default('prefer'),
  source: sourceEnum('source').notNull().default('stated'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => ({
  pk: primaryKey({ columns: [t.profileId, t.mustHaveKey] }),
})).enableRLS()

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
 * and `must_haves` take the same exception for the same reason (ADR-0017).
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
})).enableRLS()

/* ── listings: the eight steps of the listing flow (ADR-0017) ─────────────── */
export const listings = pgTable('listings', {
  id: id(),
  ownerUserId: uuid('owner_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  kind: listingKindEnum('kind').notNull(),
  status: listingStatusEnum('status').notNull().default('draft'),

  // Where is it?
  pgName: text('pg_name'),
  areaSlug: text('area_slug').references(() => areas.slug),
  /** Private until the lister turns on shareAddress. */
  address: text('address'),
  shareAddress: boolean('share_address').notNull().default(false),
  building: text('building'),
  street: text('street'),
  landmark: text('landmark'),
  pincode: text('pincode'),

  // What's nearby?
  nearestStation: text('nearest_station'),
  walkStation: walkTimeEnum('walk_station'),
  walkBus: walkTimeEnum('walk_bus'),
  walkMarket: walkTimeEnum('walk_market'),
  walkGym: walkTimeEnum('walk_gym'),
  walkMall: walkTimeEnum('walk_mall'),

  // What's the place?
  placeType: placeTypeEnum('place_type'),
  furnishing: furnishingEnum('furnishing'),
  roomType: roomTypeEnum('room_type'),
  floor: integer('floor'),
  carpetAreaSqft: integer('carpet_area_sqft'),
  sharing: text('sharing').array().$type<(typeof sharingTypes)[number][]>().notNull().default([]),
  bedsFree: bedsFreeEnum('beds_free'),
  meals: mealsEnum('meals'),
  curfew: curfewEnum('curfew'),
  bathroom: bathroomEnum('bathroom'),
  balcony: boolean('balcony'),
  insideItems: text('inside_items').array().$type<(typeof insideItems)[number][]>().notNull().default([]),
  amenities: text('amenities').array().$type<(typeof amenities)[number][]>().notNull().default([]),

  // Rent, deposit and dates. The rents are in listing_rates. Money is in rupees.
  maintenance: integer('maintenance'),
  maintenanceIncluded: boolean('maintenance_included'),
  electricity: electricityEnum('electricity'),
  rentNegotiable: boolean('rent_negotiable'),
  brokerage: integer('brokerage'),
  availableFrom: date('available_from'),
  minStay: minStayEnum('min_stay'),

  // House rules and who's welcome
  vegOnlyKitchen: boolean('veg_only_kitchen'),
  smokingAllowed: boolean('smoking_allowed'),
  alcoholAllowed: boolean('alcohol_allowed'),
  guests: guestsRuleEnum('guests'),
  whoCanMoveIn: whoCanMoveInEnum('who_can_move_in'),
  whoIsWelcome: text('who_is_welcome').array().$type<(typeof welcomeGroups)[number][]>().notNull().default([]),

  /** The lister confirmed "My flatmates agreed to be shown". */
  flatmatesConsent: boolean('flatmates_consent').notNull().default(false),

  photoKeys: text('photo_keys').array().notNull().default([]),
  description: text('description'),
  /** Set when the listing goes live: stale listings expire, not 404 (seo-with-gated-products.md). */
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  /** Set when reports hide the listing (PD18). Only the moderator clears it. */
  hiddenAt: timestamp('hidden_at', { withTimezone: true }),

  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => ({
  areaStatusIdx: index('listings_area_status_idx').on(t.areaSlug, t.status, t.expiresAt),
  ownerIdx: index('listings_owner_idx').on(t.ownerUserId),
  idKindUnique: unique('listings_id_kind_unique').on(t.id, t.kind),
  insideIdx: index('listings_inside_items_idx').using('gin', t.insideItems),
  sharingIdx: index('listings_sharing_idx').using('gin', t.sharing),
  amenitiesIdx: index('listings_amenities_idx').using('gin', t.amenities),
  welcomeIdx: index('listings_who_is_welcome_idx').using('gin', t.whoIsWelcome),
  photoLimitCheck: check('listings_photo_limit_check', sql`cardinality(${t.photoKeys}) <= 5`),
  liveFieldsCheck: check('listings_live_fields_check', sql`${t.status} = 'draft' or (
    ${t.areaSlug} is not null
    and (${t.kind} <> 'pg' or ${t.pgName} is not null)
    and (${t.kind} <> 'broker_flat' or ${t.brokerage} is not null))`),
  liveExpiryCheck: check('listings_live_expiry_check', sql`${t.status} <> 'live' or ${t.expiresAt} is not null`),
  roomTypeCheck: check('listings_room_type_check', sql`${t.roomType} <> 'unclear'`),
})).enableRLS()

/** One rent for a room or a flat; one for each sharing type of a PG. */
export const listingRates = pgTable('listing_rates', {
  id: id(),
  listingId: uuid('listing_id').notNull(),
  /** Copies the listing's kind, so a check can tie `sharing` to PGs. */
  listingKind: listingKindEnum('listing_kind').notNull(),
  sharing: text('sharing').$type<(typeof sharingTypes)[number]>(),
  rent: integer('rent').notNull(),
  deposit: integer('deposit'),
  createdAt: createdAt(),
}, (t) => ({
  listingFk: foreignKey({ columns: [t.listingId, t.listingKind], foreignColumns: [listings.id, listings.kind] })
    .onDelete('cascade').onUpdate('cascade'),
  sharingUnique: unique('listing_rates_sharing_unique').on(t.listingId, t.sharing).nullsNotDistinct(),
  sharingCheck: check('listing_rates_sharing_check', sql`(${t.listingKind} = 'pg') = (${t.sharing} is not null)`),
})).enableRLS()

/** "Who lives here" of a room listing: people who never sign up. */
export const listingFlatmates = pgTable('listing_flatmates', {
  id: id(),
  listingId: uuid('listing_id').notNull(),
  listingKind: listingKindEnum('listing_kind').notNull(),
  name: text('name').notNull(),
  age: integer('age'),
  whatTheyDo: text('what_they_do'),
  food: text('food').$type<(typeof foodAnswers)[number]>(),
  photoKey: text('photo_key'),
  /** The order that the lister gave. */
  position: integer('position').notNull().default(0),
  createdAt: createdAt(),
}, (t) => ({
  listingFk: foreignKey({ columns: [t.listingId, t.listingKind], foreignColumns: [listings.id, listings.kind] })
    .onDelete('cascade').onUpdate('cascade'),
  roomOnlyCheck: check('listing_flatmates_room_only_check', sql`${t.listingKind} = 'room_in_flat'`),
})).enableRLS()

/* ── the anonymous visitor ──────────────────────────────────────────────── */

export const anonymousSessions = pgTable('anonymous_sessions', {
  id: id(),
  /** Per-device, per-network hash. Feeds the rate limits in T-21. */
  deviceHash: text('device_hash').notNull(),
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
})).enableRLS()

/* ── goals: one move each, with its own chat and search (ADR-0017) ────────── */

export const goals = pgTable('goals', {
  id: id(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  anonymousSessionId: uuid('anonymous_session_id').references(() => anonymousSessions.id, { onDelete: 'cascade' }),
  title: text('title'),
  /** Form A of this move, as the assistant has filled it. Partial by definition. */
  form: jsonb('form').notNull().default({}),
  status: goalStatusEnum('status').notNull().default('open'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => ({
  userIdx: index('goals_user_idx').on(t.userId, t.status),
  sessionIdx: index('goals_session_idx').on(t.anonymousSessionId),
  oneOwnerCheck: check('goals_one_owner_check', sql`num_nonnulls(${t.userId}, ${t.anonymousSessionId}) = 1`),
})).enableRLS()

/** Both sides of a goal's chat. The observer reads only the typed user turns. */
export const chatTurns = pgTable('chat_turns', {
  id: id(),
  goalId: uuid('goal_id').notNull().references(() => goals.id, { onDelete: 'cascade' }),
  role: turnRoleEnum('role').notNull(),
  inputMethod: turnInputEnum('input_method'),
  text: text('text').notNull(),
  /** The cards and chips an assistant turn showed, to redraw a reopened goal. */
  parts: jsonb('parts'),
  createdAt: createdAt(),
}, (t) => ({
  goalIdx: index('chat_turns_goal_idx').on(t.goalId, t.createdAt),
  inputCheck: check('chat_turns_input_check', sql`(${t.role} = 'user') = (${t.inputMethod} is not null)`),
})).enableRLS()

/* ── connecting ─────────────────────────────────────────────────────────── */

/** A message request (PD17): to a card, or to the owner of a listing, who needs no profile (T-18a). */
export const connectionRequests = pgTable('connection_requests', {
  id: id(),
  fromUserId: uuid('from_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  fromProfileId: uuid('from_profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  toUserId: uuid('to_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  toProfileId: uuid('to_profile_id').references(() => profiles.id, { onDelete: 'cascade' }),
  listingId: uuid('listing_id').references(() => listings.id, { onDelete: 'cascade' }),
  /** T-44 makes it the first message of the chat after an accept. */
  note: text('note').notNull(),
  status: connectionStatusEnum('status').notNull().default('pending'),
  createdAt: createdAt(),
  respondedAt: timestamp('responded_at', { withTimezone: true }),
}, (t) => ({
  /** One open or accepted request between two people, in either direction and for any target (PD17). */
  pairIdx: uniqueIndex('connection_requests_pair_idx')
    .on(sql`least(${t.fromUserId}, ${t.toUserId})`, sql`greatest(${t.fromUserId}, ${t.toUserId})`)
    .where(sql`${t.status} in ('pending', 'accepted')`),
  inboxIdx: index('connection_requests_inbox_idx').on(t.toUserId, t.status),
  senderDayIdx: index('connection_requests_sender_day_idx').on(t.fromUserId, t.createdAt),
  targetCheck: check('connection_requests_target_check', sql`num_nonnulls(${t.toProfileId}, ${t.listingId}) = 1`),
})).enableRLS()

/* ── safety ─────────────────────────────────────────────────────────────────
 * ADR 0015: reports and blocks are client-mintable, so their endpoints accept
 * an `id` and dedupe with ON CONFLICT (id) DO NOTHING. A retried tap on a bad
 * connection must never file two reports.
 */

export const reports = pgTable('reports', {
  id: id(),
  reporterUserId: uuid('reporter_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  subjectUserId: uuid('subject_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  /** The reported listing. The report stays for the moderator when the owner deletes the listing (T-43). */
  listingId: uuid('listing_id').references(() => listings.id, { onDelete: 'set null' }),
  reason: text('reason').notNull(),
  detail: text('detail'),
  status: reportStatusEnum('status').notNull().default('open'),
  createdAt: createdAt(),
}, (t) => ({
  /** The moderator's saved query: open reports, oldest first (T-19). */
  queueIdx: index('reports_queue_idx').on(t.status, t.createdAt),
  subjectIdx: index('reports_subject_idx').on(t.subjectUserId),
  listingReporterIdx: uniqueIndex('reports_listing_reporter_idx').on(t.listingId, t.reporterUserId),
})).enableRLS()

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
})).enableRLS()

/* ── saved ──────────────────────────────────────────────────────────────── */

/** A place or a person that a user keeps under Saved (T-47). */
export const saves = pgTable('saves', {
  id: id(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  listingId: uuid('listing_id').references(() => listings.id, { onDelete: 'cascade' }),
  profileId: uuid('profile_id').references(() => profiles.id, { onDelete: 'cascade' }),
  createdAt: createdAt(),
}, (t) => ({
  userListingIdx: uniqueIndex('saves_user_listing_idx').on(t.userId, t.listingId),
  userProfileIdx: uniqueIndex('saves_user_profile_idx').on(t.userId, t.profileId),
  // The delete of a listing or a profile finds its saves through these.
  listingIdx: index('saves_listing_idx').on(t.listingId),
  profileIdx: index('saves_profile_idx').on(t.profileId),
  oneTargetCheck: check('saves_one_target_check', sql`num_nonnulls(${t.listingId}, ${t.profileId}) = 1`),
})).enableRLS()

/* ── waitlist ───────────────────────────────────────────────────────────── */

export const waitlist = pgTable('waitlist', {
  id: id(),
  email: text('email').notNull(),
  /** Where they asked for. Decides which area opens next (T-22). */
  area: text('area'),
  createdAt: createdAt(),
  invitedAt: timestamp('invited_at', { withTimezone: true }),
}, (t) => ({
  emailIdx: uniqueIndex('waitlist_email_idx').on(t.email),
})).enableRLS()
