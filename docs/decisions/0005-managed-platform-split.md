# ADR 0005 — Managed platform split: Supabase + Firebase + Cloudflare R2

**Status:** Accepted · **Date:** 2026-09-10 · **Deciders:** Yash

## Context

ADR 0001 (rent infrastructure) and ADR 0002 (we own the API) have this result:
we need exactly four commodity services from providers, and nothing else: no
query APIs, no generated clients and no business logic that a vendor holds.

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
| Realtime transport | **Supabase Realtime** | Only `broadcast` channels. Never `postgres_changes`. |
| Identity | **Firebase Authentication** | Free up to 50k MAU |
| Object storage + CDN | **Cloudflare R2** | Pay-as-you-go |

The estimated total at launch scale is **~$50–80/month.**

---

## Analysis 1 — Identity

We compared the options only for consumer social sign-in, not for enterprise
SSO or SMS.

### Monthly cost by monthly-active users

| MAU | Firebase / GCIP | Supabase Auth | Clerk | Auth0 | WorkOS AuthKit |
|---|---|---|---|---|---|
| **20k** (target) | **$0** | $0 (in Pro) | ~$200 | $0 | **$0** |
| 50k | **$0** | $0 (in Pro) | ~$800 | ~$1,750 | **$0** |
| 100k | ~$275 | ~$25 | ~$1,800 | $500–3,000 | **$0** |
| 500k | ~$2,115 | ~$1,325 | ~$9,000 | very high | **$0** |
| 1M | ~$4,415 | ~$2,950 | ~$19,000 | very high | **$0** |

We used these published rates:

- **Firebase / GCIP**: graduated rates after the free tier: $0.0055/MAU
  (50k–100k), $0.0046 (100k–1M), $0.0032 (1M–10M). Each rate applies only to
  the users in that band.
- **Supabase Auth**: Pro includes 100k MAU. Then ~$0.00325/MAU.
- **Clerk**: ~$0.02/MAU. **Auth0**: ~$0.07/MAU. Both prices are for B2B SaaS.
- **WorkOS AuthKit**: Free up to 1,000,000 MAU, with no time limit. Then $2,500
  for each million more. WorkOS makes its money from enterprise SSO
  connections, which we would never buy.

### Why Firebase

**At our horizon, this is not a cost decision.** At 20k–50k MAU, all the options
other than Clerk and Auth0 cost $0. Even at 100k, which is 5× our stated ceiling,
Firebase costs $275/month, which is negligible for a business of that size. To
optimise this cost now is to optimise a number that does not exist yet.

What actually differs between the options today is **mobile**:

- The Android and iOS SDKs of Firebase are best in class. This product will be
  predominantly a phone app.
- Google Sign-In integrates with Android Credential Manager / One Tap. This
  gives exactly the zero-typing sign-in that the spec requires.
- Yash already knows the Firebase mobile SDKs, so he needs no time to learn
  them.
- Supabase officially supports Firebase as a third-party auth provider. Thus,
  Supabase will trust JWTs that Firebase issues, and RLS continues to work as
  defence in depth.

WorkOS was genuinely attractive on price (free up to 1M MAU). But WorkOS is
web-first and B2B-first. On mobile, you wire the OAuth/PKCE flows yourself, and
the native experience is materially worse. That is a real cost in month four,
paid to save on a bill that we will not see for years.

**Firebase has no official KMP SDK.** This is not a problem, because auth is
inherently a platform concern. The KMP module uses `expect`/`actual` as a layer
above the native Firebase SDK on each platform: standard practice, not a
workaround.

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
| Weekly active users (~25% of registered users) | 5,000 |
| Sessions each month | ~65,000 |
| Image loads in each session (~50 cards × 1.5 photos) | ~75 |
| Each transformed WebP image | ~120 KB |
| Each session | ~9 MB |
| Monthly egress, with listings | **~700 GB** |

**The decisive ratio is ~14 GB of egress for each 1 GB stored**, and it becomes
worse when engagement increases. Egress, not storage, is the full bill.

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

We used these published rates:

- R2: $0.015/GB storage, **$0 egress**, and a 10GB free tier.
- S3: $0.023/GB, and $0.09/GB egress.
- Supabase: 100GB storage and 250GB egress included. Then $0.0213/GB and
  $0.03–0.09/GB.
- B2: $0.006/GB, with free egress to Cloudflare through the Bandwidth Alliance.
- DO Spaces: $5 flat for 250GB and 1TB transfer.

### Why R2

- **Zero egress fees.** At all other providers, this workload is 93% egress by
  cost. This is worth approximately **$600/month by the time we reach 200k
  users**: more than all the other infrastructure line items together.
- **S3-compatible API.** The exit is a bucket copy and an endpoint change.
- Cloudflare CDN and Image Transformations are available natively.

**⚠️ We ruled out Wasabi because of its policy, not its price.** Its "no egress
fees" claim has a fair-use expectation that monthly downloads stay *below* the
stored volume. Our downloads are ~14× the stored volume, so we would violate the
policy from month one. The prices of Wasabi are for backup and archive, not
media serving.

**We rejected Backblaze B2 because of the vendor count.** Its storage is
marginally cheaper. But its free egress requires Cloudflare in front, through
the Bandwidth Alliance: a fourth vendor to save ~$5/month. R2 already *is*
Cloudflare.

---

## Analysis 3 — Postgres and Realtime (Supabase)

- Supabase Postgres is real Postgres, with no proprietary layer on the critical
  path. `pg_dump` is the exit.
- Supabase is open source and self-hostable. Thus, the "self-host later to learn
  ops" path of ADR 0001 is a supported migration, not a rewrite.

**Why `broadcast`, not `postgres_changes`.** In the popular mode, clients
subscribe to changes on a *table*. This would silently destroy ADR 0002:
clients would learn our table names and column shapes, and a schema change would
break shipped mobile apps, which we cannot force-update.

With `broadcast`, our API writes the message, applies the rules (rate limit,
contact-detail stripping, message-request routing), and publishes a payload to a
channel. Clients subscribe to channels, never to tables. The feature and the
cost are the same, and the boundary is not damaged.

**Capacity note:** Pro includes 500 concurrent realtime connections. Each
1,000 more connections cost $10. At 20k registered users, peak concurrent
chat could plausibly be 500–1,500. Budget $10–20/month more.

---

## Rules this decision creates

These rules are non-negotiable and reviewable:

1. **Our own `users.id` is the primary key everywhere.** We store the Firebase
   UID in a plain `auth_provider_id` column, and only the login path reads it.
   All other tables foreign-key to *our* ID.
   *Why:* Auth is the one piece with real lock-in. You cannot `pg_dump` an OAuth
   relationship. With this rule, a change of provider is a one-column backfill
   and a silent Google re-login. Without it, the ID of the provider is in all
   the foreign keys, and the migration is a rewrite.
2. **Never proxy image bytes through the API.** The API issues a short-lived
   presigned upload URL. The client uploads directly to R2 and reports the key.
3. **Verification selfies are in a separate, non-public bucket** with short
   retention. Only short-lived signed URLs give access to them, and we issue
   these URLs after an authorization check. If we mix selfies with profile
   photos, one bad bucket policy exposes biometric-grade data.
4. **Realtime is `broadcast` only.** No client ever subscribes to a table.
5. **When phone OTP lands, it goes behind our own endpoints**
   (`POST /auth/phone/start`, `/auth/phone/verify`), so that we can replace the
   SMS provider. In India, Firebase SMS costs $0.01–0.07 for each verification,
   and local providers like MSG91 cost ~$0.003.

## Escape hatches

| Component | Lock-in | Exit |
|---|---|---|
| Postgres | ~None | `pg_dump`, restore, change the connection string |
| Object storage | Low | S3-compatible: copy the bucket, change the endpoint |
| Realtime | Low | The transport is behind our API. Replace it, and the clients see no change. |
| Identity | Medium | One-column backfill and silent re-login, *only because of Rule 1* |

## Revisit when

- The auth cost becomes material (~500k+ MAU) → assess WorkOS AuthKit again.
- Realtime concurrent connections are more than ~5,000 → compare a self-run
  websocket tier with the Supabase price for each connection.
- The overall infrastructure cost becomes material → self-host Supabase, as ADR
  0001 says.
