# ADR 0005 — Managed platform split: Supabase + Firebase + Cloudflare R2

**Status:** Accepted · **Date:** 2026-09-10 · **Deciders:** Yash

## Context

ADR 0001 (rent infrastructure) and ADR 0002 (we own the API) mean we need exactly
four commodity services from providers — and nothing else. No query APIs, no
generated clients, no vendor-held business logic.

| # | Need | Used for |
|---|---|---|
| 1 | Postgres | All application data |
| 2 | OAuth / identity | Google Sign-In (phone OTP deferred) |
| 3 | Object storage + CDN | Profile photos, listing photos, verification selfies |
| 4 | Websocket transport | Chat delivery |

## Decision

| Component | Vendor | Plan |
|---|---|---|
| Postgres | **Supabase** | Pro, $25/mo |
| Realtime transport | **Supabase Realtime** | `broadcast` channels only — never `postgres_changes` |
| Identity | **Firebase Authentication** | Free to 50k MAU |
| Object storage + CDN | **Cloudflare R2** | Pay-as-you-go |

Estimated total at launch scale: **~$50–80/month.**

---

## Analysis 1 — Identity

Compared on consumer social sign-in only. No enterprise SSO, no SMS.

### Monthly cost by monthly-active users

| MAU | Firebase / GCIP | Supabase Auth | Clerk | Auth0 | WorkOS AuthKit |
|---|---|---|---|---|---|
| **20k** (target) | **$0** | $0 (in Pro) | ~$200 | $0 | **$0** |
| 50k | **$0** | $0 (in Pro) | ~$800 | ~$1,750 | **$0** |
| 100k | ~$275 | ~$25 | ~$1,800 | $500–3,000 | **$0** |
| 500k | ~$2,115 | ~$1,325 | ~$9,000 | very high | **$0** |
| 1M | ~$4,415 | ~$2,950 | ~$19,000 | very high | **$0** |

Published rates used:
- **Firebase / GCIP** — free to 50k MAU, then graduated: $0.0055/MAU (50k–100k),
  $0.0046 (100k–1M), $0.0032 (1M–10M). Graduated = each rate applies only to
  users within that band.
- **Supabase Auth** — 100k MAU included in Pro, then ~$0.00325/MAU.
- **Clerk** — ~$0.02/MAU. **Auth0** — ~$0.07/MAU. Both priced for B2B SaaS.
- **WorkOS AuthKit** — free to 1,000,000 MAU, no time limit, then $2,500 per
  additional million. Monetised via enterprise SSO connections we would never buy.

### Why Firebase

**This is not a cost decision at our horizon.** At 20k–50k MAU every option
except Clerk and Auth0 is $0. Even at 100k — 5× our stated ceiling — Firebase is
$275/month, negligible for a business of that size. Optimising here would mean
optimising a number that does not exist yet.

The thing that actually differs today is **mobile**:

- Firebase's Android and iOS SDKs are best in class, and this product will be
  predominantly a phone app.
- Google Sign-In integrates with Android Credential Manager / One Tap, which is
  exactly the zero-typing sign-in the spec calls for.
- Yash already knows the Firebase mobile SDKs — no ramp-up.
- Supabase officially supports Firebase as a third-party auth provider, so it
  will trust Firebase-issued JWTs and RLS still works as defence in depth.

WorkOS was genuinely tempting on price (free to 1M MAU) but is web- and
B2B-first: on mobile you wire OAuth/PKCE flows yourself and the native
experience is materially worse. That is a real cost in month four, paid to avoid
a bill we will not see for years.

**Firebase has no official KMP SDK.** This is fine — auth is inherently a
platform concern, so the KMP module uses `expect`/`actual` over the native
Firebase SDK on each side. Standard practice, not a workaround.

---

## Analysis 2 — Object storage

### Usage model at 20k registered users

**Storage:**

| Item | Calculation | Size |
|---|---|---|
| Profile photos | 20k users × 4 × ~400KB | 32 GB |
| Listing photos | ~2k listings × 8 × ~400KB | 6 GB |
| Verification selfies | 20k × ~200KB | 4 GB |
| | **Total** | **~45 GB** |

**Egress:**

| Step | Value |
|---|---|
| Weekly actives (~25% of registered) | 5,000 |
| Sessions/month | ~65,000 |
| Image loads per session (~50 cards × 1.5 photos) | ~75 |
| Per transformed WebP | ~120 KB |
| Per session | ~9 MB |
| Monthly egress incl. listings | **~700 GB** |

**The decisive ratio: ~14 GB egressed per 1 GB stored** — and it worsens as
engagement improves. Egress, not storage, is the entire bill.

### Monthly cost

| Provider | 20k users<br>50 GB / 700 GB out | 200k users<br>500 GB / 7 TB out |
|---|---|---|
| **Cloudflare R2** | **~$1–15** | **~$10–30** |
| Backblaze B2 + Cloudflare | ~$0.30–6 | ~$3–10 |
| DigitalOcean Spaces | ~$5 | ~$70 |
| Bunny.net | ~$8 | ~$80 |
| Supabase Storage | ~$15–40 *(plus Pro)* | ~$210–615 |
| AWS S3 | ~$55 | ~$632 |
| Wasabi | ⚠️ policy violation | ⚠️ policy violation |

Published rates used: R2 $0.015/GB storage, **$0 egress**, 10GB free tier;
S3 $0.023/GB + $0.09/GB egress; Supabase 100GB storage and 250GB egress
included, then $0.0213/GB and $0.03–0.09/GB; B2 $0.006/GB with free egress to
Cloudflare via Bandwidth Alliance; DO Spaces $5 flat for 250GB + 1TB transfer.

### Why R2

- **Zero egress fees**, on a workload that is 93% egress by cost anywhere else.
  Worth roughly **$600/month by the time we reach 200k users** — more than every
  other infrastructure line item combined.
- **S3-compatible API**, so the exit is a bucket copy and an endpoint change.
- Cloudflare CDN and Image Transformations available natively.

**⚠️ Wasabi ruled out on policy, not price.** Its "no egress fees" claim carries
a fair-use expectation that monthly downloads stay *below* stored volume. We are
at ~14× stored volume and would be in violation from month one. Wasabi is priced
for backup and archive, not media serving.

**Backblaze B2 rejected on vendor count.** Marginally cheaper storage, but free
egress requires Cloudflare in front via the Bandwidth Alliance — a fourth vendor
to save ~$5/month. R2 already *is* Cloudflare.

---

## Analysis 3 — Postgres and Realtime (Supabase)

Postgres: real Postgres, no proprietary layer on the critical path, `pg_dump`
is the exit. Supabase is open source and self-hostable, so ADR 0001's
"self-host later to learn ops" path is a supported migration rather than a
rewrite.

**Realtime must be used as `broadcast`, not `postgres_changes`.** The popular
mode has clients subscribe to changes on a *table*, which would silently
demolish ADR 0002 — clients would learn our table names and column shapes, and a
schema change would break shipped mobile apps we cannot force-update. With
`broadcast`, our API writes the message, applies the rules (rate limit,
contact-detail stripping, message-request routing), then publishes a payload to
a channel. Clients subscribe to channels, never to tables. Same feature, same
cost, boundary intact.

**Capacity note:** Pro includes 500 concurrent realtime connections, then $10
per additional 1,000. At 20k registered users, peak concurrent chat could
plausibly be 500–1,500 — budget an extra $10–20/month.

---

## Rules this decision creates

These are non-negotiable and reviewable:

1. **Our own `users.id` is the primary key everywhere.** The Firebase UID is
   stored as a plain `auth_provider_id` column that only the login path reads.
   Every other table foreign-keys to *our* ID.
   *Why:* auth is the one piece with real lock-in — you cannot `pg_dump` an OAuth
   relationship. With this rule, switching providers is a one-column backfill
   plus a silent Google re-login. Without it, the provider's ID is embedded in
   every foreign key and the migration is a rewrite.
2. **Never proxy image bytes through the API.** The API issues a short-lived
   presigned upload URL; the client uploads directly to R2 and reports the key.
3. **Verification selfies live in a separate, non-public bucket** with short
   retention, reachable only via short-lived signed URLs issued after an
   authorization check. Mixing them with profile photos means one bad bucket
   policy exposes biometric-grade data.
4. **Realtime is `broadcast` only.** No client ever subscribes to a table.
5. **Phone OTP, when it lands, goes behind our own endpoints**
   (`POST /auth/phone/start`, `/auth/phone/verify`) so the SMS provider is
   swappable — Firebase SMS in India runs $0.01–0.07 per verification against
   ~$0.003 for local providers like MSG91.

## Escape hatches

| Component | Lock-in | Exit |
|---|---|---|
| Postgres | ~None | `pg_dump`, restore, change connection string |
| Object storage | Low | S3-compatible: copy bucket, change endpoint |
| Realtime | Low | Transport sits behind our API; swap it, clients unaffected |
| Identity | Medium | One-column backfill + silent re-login — *only because of Rule 1* |

## Revisit when

- Auth cost becomes material (~500k+ MAU) → reassess WorkOS AuthKit.
- Realtime concurrent connections exceed ~5,000 → compare a self-run websocket
  tier against Supabase's per-connection pricing.
- Infrastructure cost overall becomes material → self-host Supabase per ADR 0001.
