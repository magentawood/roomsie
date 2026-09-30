# How Roomsie is built, and why

*Architecture record · v0.1*

Fourteen architecture decisions settled, and the schema now being designed on top of them. Each records what we chose, the data behind it, and what we rejected — so nothing here has to be re-argued from memory.

Sept 2026 · One city · 20k users · 4 devs × 2h/day · ~$50–80/mo

### The ledger

| # | Decision | Summary | Status |
|---|---|---|---|
| 01 | [Rent the infrastructure](#01--rent-the-infrastructure-own-the-application) | Own the application layer, not the machines | Settled |
| 02 | [Clients talk to our API](#02--clients-talk-to-our-api-never-to-the-database) | Never to the database | Settled |
| 03 | [The API is its own deployable](#03--the-api-is-its-own-deployable) | One monorepo, two artefacts | Settled |
| 04 | [TypeScript · Fastify · Zod](#04--typescript-fastify-zod) | Contract-first, OpenAPI generated | Settled |
| 05 | [Supabase · Firebase · Cloudflare R2](#05--supabase-firebase-cloudflare-r2) | Postgres, identity, storage | Settled |
| 06 | [Drizzle](#06--drizzle-as-the-database-layer) | Schema in TypeScript, migrations in plain SQL | Settled |
| 07 | [Hybrid rendering, Bearer tokens](#07--hybrid-rendering-bearer-tokens-instant-revocation) | One auth path for web, Android and iOS | Settled |
| 08 | [Next 16 · Tailwind v4 · TanStack Query](#08--the-web-stack) | Existing design work ported in | Settled |
| 09 | [Fly.io Mumbai · Vercel · Supabase ap-south-1](#09--hosting--region) | Region is sticky; compute follows it | Settled |
| 10 | [pnpm workspaces + Turborepo](#10--monorepo-tooling) | Strict dependencies, zero-config remote caching | Settled |
| 11 | [Untitled UI · theme.css generated from Figma](#11--design-system-and-the-token-pipeline) | Figma is the source of truth, one way | Settled |
| 12 | [Analytics in our own Postgres](#12--analytics-events) | No vendor — the schema is what must be right | Settled |
| 13 | [CI gate & testing baseline](#13--ci-gate-and-testing) | Test where the expensive bugs live | Settled |
| 14 | [Sentry SDK → GlitchTip](#14--error-tracking) | GlitchTip now, Crashlytics for web when it lands | Settled |

### The budget that decides everything

Four people at two hours a day for a month is roughly 200 real hours. The v1 scope is UI-heavy, so the split isn't negotiable — and the backend share is what every decision here was measured against.

| Item | Value |
|---|---|
| Frontend | 120–140h |
| Backend + infra | 60–80h |

Every “should we build this ourselves?” question was answered against the second bar.

### The principle underneath

“Build for scale from the start” is where most small teams burn their runway. Rework cost isn’t uniform — so we spend up front only on the things that get baked into every client and every stored row.

> [!success] Cheap to change later
>
> - Hosting provider, server size, region
> - CDN
> - Which cloud we’re on
> - Client-side libraries

> [!failure] Expensive to change later
>
> - Data model
> - API contract
> - Identity & auth model
> - Analytics event schema

### The stack

<svg viewBox="0 0 640 316" role="img" aria-label="Web and KMP clients call our API over HTTPS with a bearer JWT; the API talks to Supabase, Cloudflare R2 and Firebase">
          <defs><marker id="ar" markerWidth="7" markerHeight="7" refX="5.5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="var(--line-2)"/></marker></defs>
          <g font-family="Manrope, sans-serif">
            <rect x="96" y="8" width="164" height="52" rx="10" fill="var(--surface-2)" stroke="var(--line)"/>
            <text x="178" y="30" text-anchor="middle" font-size="13.5" font-weight="700" fill="var(--text)">apps/web</text>
            <text x="178" y="47" text-anchor="middle" font-size="10.5" fill="var(--text-3)">Next 16 · Tailwind v4</text>
            <rect x="380" y="8" width="164" height="52" rx="10" fill="var(--surface-2)" stroke="var(--line)" stroke-dasharray="4 3"/>
            <text x="462" y="30" text-anchor="middle" font-size="13.5" font-weight="700" fill="var(--text-3)">KMP clients</text>
            <text x="462" y="47" text-anchor="middle" font-size="10.5" fill="var(--text-3)">Compose · SwiftUI · later</text>
            <path d="M178,60 L178,92 L305,92 L305,118" fill="none" stroke="var(--line-2)" stroke-width="1.4" marker-end="url(#ar)"/>
            <path d="M462,60 L462,92 L335,92 L335,118" fill="none" stroke="var(--line-2)" stroke-width="1.4" marker-end="url(#ar)"/>
            <text x="320" y="86" text-anchor="middle" font-size="9.5" font-family="JetBrains Mono, monospace" fill="var(--accent)" letter-spacing="1">HTTPS · BEARER JWT</text>
            <rect x="192" y="120" width="256" height="64" rx="11" fill="var(--accent-wash)" stroke="var(--accent)" stroke-width="1.5"/>
            <text x="320" y="145" text-anchor="middle" font-size="15" font-weight="800" fill="var(--accent)">apps/api</text>
            <text x="320" y="163" text-anchor="middle" font-size="10.5" fill="var(--text-2)">Node · Fastify · Zod · Drizzle</text>
            <text x="320" y="177" text-anchor="middle" font-size="10" fill="var(--text-3)">all business logic lives here</text>
            <path d="M320,184 L320,206" fill="none" stroke="var(--line-2)" stroke-width="1.4"/>
            <path d="M104,206 L536,206" fill="none" stroke="var(--line-2)" stroke-width="1.4"/>
            <path d="M104,206 L104,234" fill="none" stroke="var(--line-2)" stroke-width="1.4" marker-end="url(#ar)"/>
            <path d="M320,206 L320,234" fill="none" stroke="var(--line-2)" stroke-width="1.4" marker-end="url(#ar)"/>
            <path d="M536,206 L536,234" fill="none" stroke="var(--line-2)" stroke-width="1.4" marker-end="url(#ar)"/>
            <rect x="20" y="236" width="168" height="64" rx="10" fill="var(--surface-2)" stroke="var(--line)"/>
            <text x="104" y="258" text-anchor="middle" font-size="13" font-weight="700" fill="var(--text)">Supabase</text>
            <text x="104" y="274" text-anchor="middle" font-size="10" fill="var(--text-3)">Postgres · Realtime</text>
            <text x="104" y="288" text-anchor="middle" font-size="10" fill="var(--text-3)">broadcast only</text>
            <rect x="236" y="236" width="168" height="64" rx="10" fill="var(--surface-2)" stroke="var(--line)"/>
            <text x="320" y="258" text-anchor="middle" font-size="13" font-weight="700" fill="var(--text)">Cloudflare R2</text>
            <text x="320" y="274" text-anchor="middle" font-size="10" fill="var(--text-3)">storage · CDN</text>
            <text x="320" y="288" text-anchor="middle" font-size="10" fill="var(--text-3)">zero egress</text>
            <rect x="452" y="236" width="168" height="64" rx="10" fill="var(--surface-2)" stroke="var(--line)"/>
            <text x="536" y="258" text-anchor="middle" font-size="13" font-weight="700" fill="var(--text)">Firebase</text>
            <text x="536" y="274" text-anchor="middle" font-size="10" fill="var(--text-3)">Google sign-in</text>
            <text x="536" y="288" text-anchor="middle" font-size="10" fill="var(--text-3)">JWT verified by us</text>
          </g>
        </svg>

Clients hold a Firebase ID token and hit `apps/api`. They never open a database connection, never subscribe to a Postgres table, and never learn a column name.

### Standing rules

- Our own **users.id** is the primary key everywhere. The Firebase UID is a plain `auth_provider_id` column.
- Every byte entering the API from outside is **parsed by a Zod schema** before any other code touches it.
- The **OpenAPI document** is generated and committed from day one. It is the contract all clients generate from.
- Image bytes **never pass through the API** — clients upload directly to R2 via presigned URLs.
- Verification selfies live in a **separate, non-public bucket** with short retention.
- Realtime is **broadcast only**. No client subscribes to a table.
- No business logic in Next.js. Route handlers are for OAuth callbacks, image proxying and webhooks only.

---

## 01 · Rent the infrastructure, own the application

**Decision:** A provider runs Postgres, storage and CDN. We hand-write every migration, query and endpoint ourselves.

No vendor-generated application code. No `apt install`.

Wanting operational control is a good instinct, but “ops” means two different things — and only one is worth paying for now.

| Layer | What it is | Cost to reclaim later |
|---|---|---|
| Infrastructure ops | Provisioning, Postgres tuning, backups, TLS, pooling, monitoring, patching | **[Low]** a weekend |
| Application ops | Schema, migrations, API, deploys, observability | **[High]** a rewrite |

Moving from managed Postgres to your own is a dump and a restore — same database. But if a vendor owns your business logic or your data access patterns, unwinding that is a rewrite. **So we buy control of the application and rent the machines.**

> [!danger] Worth saying plainly
>
> At 20k users in one city there is no scaling problem yet. A single modest Postgres instance covers it comfortably. The scaling lessons are real, but you’d be learning them against a load that doesn’t exist.

- Run our own VPS + Postgres from day one
  Rejected
  Realistically 40–60 person-hours before the first feature ships, plus an ongoing tax — out of a ~200 hour budget. Buys control over the layer that’s cheapest to reclaim.

---

## 02 · Clients talk to our API, never to the database

**Decision:** All application reads and writes go through an HTTP API we write. Clients never hold a database connection.

We rent three genuine infrastructure pieces: the OAuth flow, storage + CDN, and the websocket transport. RLS stays on underneath as defence in depth, not as the primary lock.

This is the decision that determines whether the KMP apps in month four are a port or a rewrite.

- A · Direct-to-database (BaaS)
  Rejected
  Clients query Postgres directly; RLS policies are the only security layer. Fastest v1 — but business rules split between SQL policies and three clients, each coupled to your table shapes. Rename a column, break iOS.
- B · Own API for absolutely everything
  Rejected
  Maximum portability. But you hand-build OAuth token handling, upload pipelines and websocket infrastructure — 30–40 hours against a 60–80 hour budget, spent on solved, non-differentiating problems.
- C · Own the logic, rent the plumbing **(chosen)**
  Chosen
  Our API owns every read and write that carries business logic. The platform provides OAuth, storage and the chat socket only.

### The argument that settled it

Parts of the spec **cannot be expressed as RLS at all.** The queue ranking score, exclusion of already-seen profiles, the three-rejects-then-suppress-90-days rule, chat rate limits, first-message contact-detail stripping — all of it needs server-side code.

So a backend exists no matter which option we pick. The only question is whether we admit it now, or discover it in week three having already built half of one by accident.

---

## 03 · The API is its own deployable

**Decision:** One repository, two artefacts: `apps/web` and `apps/api`, building and deploying independently.

Separate *deployable* — not separate *repository*.

The cheap way to build the API is inside Next.js as route handlers: one project, one deploy, no CORS, no network hop. For a solo project shipping only a website, that’s right. Four reasons it isn’t ours.

- **It makes Decision 02 enforceable rather than aspirational.** Inside the Next app, the database is one import away from every Server Component. Under deadline pressure someone queries it directly because it works — and that rule now lives only in the web client. A network boundary can’t be reached past by accident.
- **The runtime model fits.** Background jobs (auto-suspend on report threshold, ghost-profile decay at 30/60 days, analytics aggregation), scheduled work and a persistent connection pool are each a workaround on serverless. A long-running service simply has them.
- **Deploy coupling.** Otherwise a CSS change redeploys the API that shipped mobile apps — which can’t be force-updated — depend on.
- **Four part-time people parallelise better** across two deployables with a contract between them than across one codebase.

- **~4h** CORS, token propagation, two local processes
- **1–5ms** Extra SSR hop, in-region

A few hours now against the boundary holding under pressure for the next two years.

---

## 04 · TypeScript, Fastify, Zod

**Decision:** `apps/api` is TypeScript on Node, using Fastify for HTTP and Zod for runtime validation at every external boundary.

The OpenAPI document generated from those schemas is the single source of truth for all clients.

### Language

Team preferences split between JavaScript and Java; Yash is Android/Kotlin. At 20k users every candidate is over-provisioned — only a load test would tell them apart. So the binding constraint is hours, not throughput.

| Option | For | Against |
|---|---|---|
| TypeScript | Two devs know it; single-toolchain monorepo; strongest AI assistance; fastest to an endpoint | Types erased at runtime — validation must be a discipline |
| Kotlin + Ktor | Yash’s strongest; one language server→Android→KMP; shared DTOs | Polyglot monorepo (Gradle + pnpm); two devs ramping; thinner server ecosystem |
| Java + Spring | Most mature ecosystem; runtime type safety; big hiring pool | 3–4× the code per endpoint; heavy runtime; slow rebuilds |

> [!danger] Why not Kotlin, honestly
>
> Kotlin’s real advantage — sharing DTOs directly with the KMP module — is **recoverable later** through OpenAPI codegen. The month spent ramping the team is not. You can’t buy back a month.

### Framework

Fastify is built for exactly the long-running Node process Decision 03 committed to, and ships first-party plugins for CORS, rate limiting, JWT, multipart uploads and OpenAPI generation — all of which the spec requires.

Hono’s headline advantages are edge-runtime portability (moot here) and TypeScript-only RPC typing, **which Kotlin cannot consume** — risking crowding out the real OpenAPI spec mobile needs. Express is dated and effectively in maintenance.

### Why Zod is mandatory, not optional

In Kotlin, types are real at runtime. In TypeScript they’re erased at compile time — `as SomeType` is a promise you made to the compiler, not a check.

Lies to you

```
// TS believes age is a number.
// It has checked nothing.
const body = await req.json()
  as { age: number }

body.age.toFixed()  // 💥 "twenty-five"
```

Actually safe

```
const Profile = z.object({
  age: z.number().int().min(18),
  city: z.string().min(1),
})

const body = Profile.parse(await req.json())
// past here, genuinely that shape
```

> [!warning] The rule
>
> Every byte entering the API from outside — request bodies, query params, webhooks, third-party responses — is parsed by a schema before anything else touches it. Skip that and TypeScript’s safety is theatre.

---

## 05 · Supabase, Firebase, Cloudflare R2

**Decision:** Postgres + Realtime on Supabase · Google sign-in on Firebase · object storage on Cloudflare R2

Roughly `$50–80/month` at launch scale.

After Decisions 01–03 we need exactly four commodity services and nothing else: Postgres, OAuth, storage + CDN, and a websocket transport. No query APIs, no generated clients, no vendor-held logic.

### Identity — the cost is not the argument

| Item | Value |
|---|---|
| WorkOS | $0 |
| Supabase | $25 |
| Firebase | $275 |
| Clerk | $1,800 |
| Auth0 | $500–3k |

Monthly cost at 100,000 MAU — five times our stated ceiling. Firebase is free below 50k.

| MAU | Firebase | Supabase | Clerk | WorkOS |
|---|---|---|---|---|
| 20k **[target]** | $0 | $0 | ~$200 | $0 |
| 50k | $0 | $0 | ~$800 | $0 |
| 100k | ~$275 | ~$25 | ~$1,800 | $0 |
| 1M | ~$4,415 | ~$2,950 | ~$19,000 | $0 |

Firebase past 50k free MAU is graduated: `$0.0055`/MAU to 100k, `$0.0046` to 1M. Graduated means each rate applies only within its band — so 100k MAU is `50k free + 50k × $0.0055 = $275`.

> [!danger] So we chose on mobile, not price
>
> At 20–50k MAU every option but Clerk and Auth0 is free. What actually differs today is that this product will be predominantly a phone app — and Firebase’s Android/iOS SDKs and Credential Manager / One Tap integration deliver exactly the zero-typing sign-in the spec calls for.
>
> WorkOS was tempting at free-to-1M, but it’s web- and B2B-first: on mobile you wire OAuth/PKCE flows yourself. A real cost in month four, paid to avoid a bill we won’t see for years.

### Storage — here the cost *is* the argument

A swipe app is an egress monster. Modelled at 20k users:

- **45 GB** Stored — profiles, listings, selfies
- **700 GB** Egressed per month
- **14 : 1** Egress to storage ratio

| Item | Value |
|---|---|
| Cloudflare R2 | $10–30 |
| DO Spaces | ~$70 |
| Supabase | $210–615 |
| AWS S3 | ~$632 |

Monthly cost at 200k users — 500 GB stored, 7 TB egressed. Storage costs everyone under $12; the rest is egress.

**R2 charges nothing for egress.** Worth roughly $600/month by the time we reach 200k users — more than every other infrastructure line item combined. And it’s S3-compatible, so the exit is a bucket copy and an endpoint change.

> [!tip] Wasabi ruled out on policy, not price
>
> Its “no egress fees” claim carries a fair-use expectation that monthly downloads stay *below* stored volume. At 14× stored volume we’d be in violation from month one. Wasabi is priced for backup and archive, not media serving.

### Realtime — broadcast, never postgres_changes

Supabase Realtime’s popular mode has clients subscribe to changes on a *table* — which would silently demolish Decision 02. With `broadcast`, our API writes the message, applies the rules, then publishes to a channel. Clients subscribe to channels, never tables. Same feature, same cost, boundary intact.

Capacity: Pro includes 500 concurrent connections, then $10 per additional 1,000. Budget $10–20/month extra.

### Where the lock-in actually is

| Piece | Lock-in | Exit |
|---|---|---|
| Postgres | **[None]** | pg_dump, restore, change connection string |
| Storage | **[Low]** | S3-compatible — copy bucket, change endpoint |
| Realtime | **[Low]** | Transport sits behind our API; clients unaffected |
| Identity | **[Medium]** | One-column backfill + silent re-login — *only because of Rule 1* |

> [!warning] The five-minute decision that saves weeks
>
> You cannot `pg_dump` an OAuth relationship. So the Firebase UID is stored as a plain `auth_provider_id` column, and every other table foreign-keys to *our* `users.id`.
>
> With that rule, switching providers means re-linking one column and asking users to tap Google once more. Without it, the provider’s ID is embedded in every foreign key in the database.

---

## 06 · Drizzle as the database layer

**Decision:** Drizzle, in `apps/api` only. The TypeScript schema is the single source of truth for the entire database.

> [!note] Not like Room
>
> In Room, every phone has its own SQLite file. Here there is exactly **one** Postgres database, and the schema file describes its real, complete structure — every table, column, index and foreign key. Not a client view or a subset.

```
schema.ts  →  drizzle-kit generate  →  0003_add_verified_flag.sql  →  Postgres
```

- **Portability.** Migrations are plain SQL any Postgres accepts. Leave Drizzle or leave Supabase and the schema history travels intact.
- **It teaches SQL rather than replacing it.** The query builder mirrors SQL structure instead of hiding it. Prisma would teach you Prisma.
- **The hardest query stays typed.** The ranking score must run inside Postgres. Drizzle supports raw SQL with a typed result; under Prisma that’s an untyped `$queryRaw` escape hatch.
- **Compile-time safety matters disproportionately here.** Four people editing one schema at two hours a day. Renaming a column breaks the build and lists every affected query — rather than failing in production, in an untested endpoint, on a Tuesday.

### Adoption — mid-2026

| ORM | 30-day downloads | Weekly trend |
|---|---|---|
| Prisma | 55.3M | 3.8M → 4.3M |
| Drizzle | 48.1M | 2.9M → 5.1M |
| TypeORM | 19.3M | declining |

Drizzle overtook Prisma on weekly downloads in Q4 2025 and the gap is widening. Production users include Replit, Sentry, Databricks and Figma; Astro DB is built on it; Hono ships it as the default. It gained company backing in March 2026, removing the main prior objection.

| Cost / benefit | Hours |
|---|---|
| Learning cost | −2 to −3 |
| Migration tooling not hand-rolled | +4 to +6 |
| Row mapping across ~100 queries | +5 to +8 |
| Schema drift caught at compile time | unpriced — the main one |
| Net | ~15–25 hours saved |

---

## 07 · Hybrid rendering, Bearer tokens, instant revocation

**Decision:** Rendering splits by whether a page needs SEO. Identity travels as `Authorization: Bearer` everywhere.

| Surface | Rendering | Identity |
|---|---|---|
| Landing, listings | Server-rendered by Next, calling the API server-to-server | None — public data |
| Stack, liked, chat, settings | Client-rendered in the browser | `Bearer <ID token>` |

Listings are the organic-search surface. The authenticated app has no SEO value at all — nobody googles someone’s chat inbox.

### Why Bearer and not session cookies

A cookie path would be web-only — **mobile clients cannot use cookies** — leaving two authentication code paths to build, test and keep in sync forever. Exactly the divergence Decision 02 exists to prevent.

| Token | Lifetime | Who sees it |
|---|---|---|
| ID token (JWT) | ~1 hour **[fixed]** | Sent to our API on every request |
| Refresh token | Long-lived | Stays on device. **Our API never sees it.** |

The API verifies the JWT signature against Google’s cached public keys — locally, no database lookup, no call to Firebase.

### Why we don’t shorten the 1-hour TTL

It’s fixed by Firebase and not configurable. But more usefully: **it’s the wrong lever.** The threat a short TTL addresses is a stolen token, and tokens are stolen via XSS. An attacker who can run JavaScript harvests fresh tokens for as long as the tab is open, or takes the refresh token and mints their own. A 5-minute TTL barely inconveniences them, while costing 12× the refresh traffic and a class of expired-mid-request edge cases.

> [!danger] What we build instead — instant revocation
>
> One column, three lines of middleware, about an hour of work.

```
users.tokens_valid_after   timestamptz  not null  default now()

// after verifying the JWT signature
if (decoded.iat * 1000 < user.tokens_valid_after.getTime())
  throw unauthorized()   // every token issued before this moment is dead
```

Setting that column to `now()` kills every session the user holds, on every device, immediately. Suspend, ban, log-out-everywhere and compromise response are all the same one-line write — and the spec requires auto-suspend on crossing the report-rate threshold, which needs exactly this.

---

## 08 · The web stack

**Decision:** Next 16 App Router · React 19 · Tailwind v4 · TanStack Query

Existing pages from `femmeflats-design` get ported in, not rebuilt.

Styling was already decided by code that exists — a landing page, login, signup and browse screen built on Tailwind v4. Re-litigating it would discard real work for no benefit.

### TanStack Query — caching is not the reason

That’s a side effect people over-index on. The reason is boilerplate and correctness.

Without

```
const [data,setData]=useState(null)
const [loading,setLoading]=useState(true)
const [error,setError]=useState(null)

useEffect(()=>{
  let cancelled = false
  fetch(`/profiles/${id}`)
    .then(r=>r.json())
    .then(d=>{ if(!cancelled) setData(d) })
    .catch(e=>{ if(!cancelled) setError(e) })
  return ()=>{ cancelled = true }
},[id])
```

With

```
const { data, isLoading, error } =
  useQuery({
    queryKey: ['profile', id],
    queryFn: () => api.getProfile(id),
  })
```

> [!warning] Look at the cancelled guard
>
> Without it, a response landing after `id` has changed overwrites fresh data with stale. In a swipe stack **id changes every second or two** — so this race is the main interaction in the product, not an edge case. It presents as “sometimes the wrong profile appears,” which is expensive to diagnose.

| Fetching components across the authed app | ~30–40 |
|---|---|
| Lines saved | ~400 |
| Race-condition opportunities removed | ~30–40 |
| Learning cost | 1–2 hours |
| Break-even | ~5th endpoint |

It also gives two things the product specifically needs: **prefetching the next N cards** so the stack feels instant, and **optimistic accept/reject** with automatic rollback.

---

## 09 · Hosting & region

**Decision:** Supabase `ap-south-1` · `apps/api` on Fly.io Mumbai · `apps/web` on Vercel pinned to `bom1`

Postgres region is the sticky choice and compute follows it. Moving `apps/api` between hosts is an afternoon; moving a Supabase project between regions is a dump-and-restore with downtime.

### Region matters more than the vendor

Every API request makes several round trips to Postgres, so the latency that dominates isn’t user→API — it’s **API→database**.

| Setup | API→DB per query | Endpoint doing 5 queries |
|---|---|---|
| API Mumbai · DB Mumbai | ~1ms | ~5ms |
| API Singapore · DB Singapore | ~1ms | ~5ms |
| API Singapore · DB Mumbai | ~55ms | ~275ms wasted |

The failure mode isn’t picking the wrong city — it’s **splitting API and database across regions.** Of the obvious hosts, only Fly.io has an Indian region; Render has none, Railway has none confirmed. Vercel does offer `bom1` (Mumbai), so latency alone doesn’t separate Fly from Vercel.

### Fly.io vs Vercel — the runtime

|   | Fly.io (bom) | Vercel (bom1) |
|---|---|---|
| Runtime model | Always-on container | Function instances, reused via Fluid |
| Cold starts | None | Reduced, not eliminated |
| Max duration | Unlimited | 300s default · 800s paid |
| Persistent worker | Just run one | None — Cron + queue |
| DB connections | Real long-lived pool | Needs Supabase’s pooler |
| Fastify fit | What it’s designed for | Needs an adapter |
| Portability | A container runs anywhere | Vercel-shaped code |
| Cost | ~$5–10/mo fixed | Per invocation |

### Vendor health — mid-2026

|   | Fly.io | Vercel |
|---|---|---|
| Revenue | $11.2M (2024) | $340M ARR (Feb 2026) |
| Employees | ~60 | ~1,011 |
| Customers | 37,000 | 1M+ monthly Next.js devs |
| Latest round | $25M Series D · Aug 2026 | Series F · Sept 2025 · $9.3B |

> [!danger] The inversion worth noticing
>
> Fly’s own Series D messaging says agent-native customers are now ~two-thirds of revenue among its largest, growing ~12× year on year. Read plainly: Fly is becoming an AI-agent infrastructure company, and general web hosting is a shrinking share of its attention.
>
> But ask what you’d be locked into. On Fly you deploy a **Docker container** — if Fly disappoints, the same image runs on Railway, Render or AWS unchanged. An afternoon. Vercel is the far safer company but produces code that runs nowhere else. **The safer vendor gives the riskier coupling.**

### The argument that actually decided it

> [!danger] Serverless functions have no shared memory between requests
>
> So nothing can be buffered, batched, throttled or cached *across* requests. Every request is an island. That is the whole con — everything else follows from it.

Take analytics ingestion, which the spec (§3.1) defines as a per-card lifecycle flushed on every decision:

- **65k** Sessions per month at 5k weekly actives
- **~12M** Events per month
- **~4.2M** HTTP requests for analytics alone

On a long-running process: an in-memory buffer batches inserts of ~500 over one persistent connection. A traffic spike means more concurrent requests to the same process — the database sees the same steady writes.

On serverless: every flush is an isolated invocation. A launch-night spike scales out to many instances, each needing a connection, all arriving at the pooler at once. The pooler queues, latency climbs, and the swipe stack — the core interaction — stutters. The fix is architectural, discovered under load at 2am.

Two more collisions: **rate limiting** (§8.2 caps new conversations per day — a counter in process versus an external round trip on every message send), and **auto-suspend on report threshold**, which wants a process continuously watching.

### But serverless wins the other half — so we use it there

| Workload | Req/month | Cacheable | Best fit |
|---|---|---|---|
| Listings grid | ~500k | ✅ CDN | **[Serverless]** |
| Profile detail | ~300k | ✅ mostly | **[Serverless]** |
| Swipe queue | ~325k | ❌ personalised | **[Either]** |
| Analytics firehose | ~4.2M | ❌ write | **[Long-running]** |
| Rate limits | per message | ❌ stateful | **[Long-running]** |
| Background jobs | continuous | ❌ daemon | **[Long-running]** |

Grids and lists are the part serverless does *well* — and Decision 07 already put them there. Public pages render on Vercel and cache at the edge; everything write-heavy sits behind `apps/api` on Fly. Each tool where it is actually good.

---

## 10 · Monorepo tooling

**Decision:** pnpm workspaces for dependencies · Turborepo for task running

```
roomsie/
├── apps/
│   ├── web/          Next 16 · Tailwind v4
│   └── api/          Fastify · Drizzle
├── packages/
│   ├── contract/     OpenAPI spec + generated types
│   └── config/       shared tsconfig, eslint
└── docs/decisions/
```

### Why pnpm — strictness, not speed

npm and yarn flatten every dependency into one hoisted `node_modules`, so `apps/web` can import a package only `apps/api` declared. It works on a laptop and fails in CI. pnpm enforces that a package may import only what it declares. With four people and two independently deployed artefacts, that bug class is worth designing out.

### Why Turborepo over Nx

Both are task runners over the same workspace, so this is narrow. Two things decided it: `apps/web` deploys to Vercel, which auto-detects Turborepo and gives **remote caching with zero configuration** — team and CI share a build cache for free. And it is one config file, at a moment when the team is already absorbing Fastify, Zod, Drizzle, TanStack Query, Fly.io and Docker.

> [!note] Nx’s real advantage is `affected`, not generators
>
> Nx builds a project graph from actual imports, so it runs only what a change could have broken. That matters at twenty packages with a fifteen-minute CI run. At four packages, `turbo build` with caching finishes either way.
>
> And the migration is cheap — delete `turbo.json`, run `nx init`, update a few scripts. About half a day. Adopting a heavier tool now to avoid that inverts the principle applied everywhere else in this document.

Terminology note: Nx has deprecated the package-based vs integrated distinction, replacing it with inferred tasks (“Project Crystal”). Incremental plugin adoption is now simply how Nx works — there is nothing to hedge for by picking a repo style up front.

---

## 11 · Design system and the token pipeline

**Decision:** Roomsie DS = customised Untitled UI. Figma is the single source of truth; `theme.css` is generated wholesale from the export.

Untitled UI Figma kit ↔ Untitled UI React (React Aria) · `@untitledui/icons` · light-first, matching the library.

We are not architecting a token system — Untitled UI already did. The export carries **691 variables across 7 collections**, already tiered, already light/dark moded, already namespaced for Tailwind v4. The outstanding work is rebranding values, not building structure.

| Tier | Collections | Example |
|---|---|---|
| Primitives | colour · spacing primitives | `Colors/Brand/600 → #2563eb` |
| Semantic **[has modes]** | text · fg · bg · border · effects · alpha | `bg-brand-solid` |
| Component | colour — component · utility | `utility-brand-900_alt` |

### The flow is one-way

```
Figma  ──►  figma-variables.json  ──►  generator  ──►  theme.css
          (lossless)                                (build artefact)
```

Per the bridge’s own docs, values flow **Figma → export only**. Editing an exported file changes nothing in Figma and the next export overwrites it. There is no round trip: a token code needs but Figma lacks goes `DS-GAP` → designer adds it → re-export.

> [!warning] Why not the DTCG file
>
> The bridge also writes `tokens.dtcg.json`, and DTCG is the industry-standard interchange format. But it is **lossy in exactly the way that matters here**: `$value` carries only the collection’s default mode, with the rest buried in `$extensions["com.figma"].modes`. Light and dark are both first-class, so a standard build would silently drop one — and we would be reading the Figma extension block by hand anyway, which removes DTCG’s only real advantage.

### Aliases are preserved, never flattened

```
@theme {
  --color-neutral-900: #171717;                    /* primitive: literal   */
  --color-text-primary: var(--color-neutral-900);  /* semantic: reference  */
}
@layer base {
  .dark-mode {
    --color-text-primary: var(--color-neutral-50);  /* reassigns the SEMANTIC token */
  }
}
```

The primitive → semantic tier stays visible in the CSS itself, recolouring one primitive cascades everywhere, and DevTools shows the chain. Flattening to hex would leave that structure documented only in Figma.

> [!tip] The trap that makes this work or break
>
> Plain `@theme` compiles the utility to `color: var(--color-text-primary)`, so `.dark-mode` reassigning that token is picked up. `@theme inline` bakes the value in as `color: var(--color-neutral-900)` and the reassignment has **no effect**.
>
> So: **plain `@theme`**, and **dark mode reassigns the semantic token, never the primitive.** That matches how Figma already models it — semantic variables carry per-mode aliases, primitives are mode-independent.

### Generating wholesale needs a guard

A pure build artefact means a naming divergence would silently break Untitled UI React components rather than error. So the generator ends with a verification pass: collect every `var(--…)` the Untitled UI React source references, and **hard-fail the build** if the generated file does not define one. A silent visual break becomes a loud build error.

> [!note] Blocked on one command
>
> `token-map.md` proposes `--color-bg-primary` → utility `bg-primary`, but stock Tailwind v4 would generate `bg-bg-primary`. Untitled UI must define custom utilities to get the shorter names, and its docs do not say how. Run `npx untitledui@latest tailwind` and read the real `theme.css` — its names win. Everything else above is settled.

Outstanding customisation: the Brand ramp is still Untitled UI blue and fonts are still Inter. When Brand moves to a rose/red hue, brand and `error` must stay clearly distinguishable — Block, Report and destructive confirmations cannot read as primary actions on a safety product.

---

## 12 · Analytics events

**Decision:** All events go to a separate, append-only Postgres instance we own. No third-party analytics vendor.

Partitioned monthly · buffered batched writes from `apps/api` · schema versioned in `packages/contract`.

- **~12M** Events per month at 5k weekly actives
- **~5/sec** Average write rate
- **$25** Per month, vs ~$390 for PostHog

> [!danger] The schema is expensive; the store is not
>
> Once fifty million rows carry a field name, renaming it means a migration and a gap in history. Moving those rows to ClickHouse later is an export and an import. So the schema is defined once, versioned, in `packages/contract` with an `event_version` on every row — that is the part that has to be right today.

### Why not specialist tooling

~5 writes/sec is unremarkable for Postgres, and because `apps/api` is a long-running process (Decision 09) it buffers and batches — Postgres sees a few large inserts, not a firehose. ClickHouse and Tinybird are the right answer at roughly ten times this scale.

| Option | Cost/month | Verdict |
|---|---|---|
| Own Postgres | ~$25 | **[Chosen]** |
| Tinybird | ~$99 | **[Overkill now]** |
| ClickHouse Cloud | $67+ | **[Overkill now]** |
| PostHog | ~$390 | **[Rejected]** |

### Why a separate instance, not a separate table

The point of keeping analytics off the primary database is resource isolation — write bursts must not compete for IOPS or connections with a user waiting on the swipe stack. A different schema in the same instance would not achieve that.

### Data sovereignty

This platform holds verified profiles, locations, budgets and behavioural traces of women searching for housing. The behavioural stream is sensitive in its own right — who looked at whom, for how long. Keeping it inside our own infrastructure rather than shipping it to a vendor is the defensible position for this product specifically.

> [!warning] What owning the data costs you
>
> **You build your own dashboards.** Funnels, D7/D30 retention, activation and accept rate are queries and UI we write. Real work, deliberately accepted — and deferrable, since events accumulate from day one whether or not anything reads them yet.
>
> **Deletion becomes your problem.** Events reference `users.id`, so they are personal data under India’s DPDP Act. Account deletion must purge or pseudonymise a user’s event history, and raw events need a defined retention window. Design this with the schema, not after — it is the one genuinely harder part of owning the data rather than renting it.

Also required: automated partition creation, or inserts fail at a month boundary. And rollup tables built by a background job — which apps/api already has.

---

## 13 · CI gate and testing

**Decision:** Typecheck · lint · build · unit tests · API integration tests · generated-file check · token check · gitleaks

Unit tests are written alongside the code, not as a later phase. Playwright E2E deferred.

Two constraints shape this. **CI must finish in about five minutes** — past that people stop waiting and start merging on hope. And every test is an hour not spent on features, out of roughly 200. So the question is not how much testing is good in the abstract, but where the expensive bugs actually live.

| Rule | Failure mode |
|---|---|
| Verification gates participation | An unverified account initiates chat — a product-promise failure, not a bug |
| `tokens_valid_after` revocation | A suspended account stays logged in |
| Chat rate limits | The daily new-conversation cap silently does nothing |
| Queue exclusion & suppression | Users cycle the same faces; the product feels broken |

Every one is server-side, deterministic, and genuinely hard to eyeball. A snapshot test on a card component, by contrast, is near-worthless while the design still moves weekly.

> [!danger] Integration tests run against a real Postgres, not mocks
>
> The queue rules are largely SQL. A mocked database would test nothing that ships.

> [!note] Deferred: Playwright on critical paths
>
> Signup → verification → swipe → first message. Genuinely valuable, and it catches integration breaks nothing else sees. Deferred because E2E is slow to write and brittle while the UI moves weekly — 15–20 hours now plus maintenance, against a 200-hour launch budget. Revisit once the UI stabilises, before a regression can reach real users.

---

## 14 · Error tracking

**Decision:** Instrument with the Sentry SDK. Point the DSN at self-hosted GlitchTip now; switch to paid Sentry later by changing one variable.

Firebase Crashlytics handles Android and iOS in month 4 — free, and we are already on Firebase.

### Why not just use Vercel’s logs

Two structural gaps, not preferences. Vercel sees only `apps/web` — the API on Fly, where the business logic lives, is invisible to it. And it logs what runs on *Vercel’s servers*: the authenticated app is client-rendered, so a React crash in the swipe stack or a failed fetch never touches a Vercel server and **never appears**. That is most user-facing breakage.

|   | Vercel logs | Sentry SDK |
|---|---|---|
| Server/SSR errors in apps/web | ✅ | ✅ |
| Browser errors | ❌ | ✅ |
| Errors from apps/api on Fly | ❌ | ✅ |
| Grouping | ❌ raw lines | ✅ |
| Readable traces from minified code | ❌ | ✅ source maps |
| Alerting | ❌ | ✅ |
| “Started after deploy X” | ❌ | ✅ |

> [!danger] The move that makes this reversible
>
> GlitchTip implements the Sentry protocol. So we instrument with the Sentry SDK and the destination is a **DSN — a URL, not a vendor commitment**. Moving to paid Sentry later is one environment variable.

| Option | Cost | Why not |
|---|---|---|
| GlitchTip self-hosted | ~$5/mo | **[Chosen]** — unlimited users, data stays ours |
| Sentry free tier | $0 | Binding limit is **1 user**, not the 5k errors — we are four |
| Sentry Team | $26/mo | Best product; a third of the infra budget. Deferred, not rejected |
| Crashlytics for web | free | **Private preview** since I/O 2026 — cannot carry a launch |

> [!note] Planned: move to Crashlytics for web when it reaches GA
>
> It will be free, we are already on Firebase, Crashlytics is handling Android and iOS anyway, and being built on Google Cloud’s Observability Suite it puts client and server errors in one place — consolidating all three clients onto one free tool and retiring the GlitchTip instance we operate.
>
> ⚠️ **That migration is not the one-variable switch.** GlitchTip speaks the Sentry protocol; Crashlytics is the Firebase JS SDK — a different integration entirely. So error reporting gets wrapped in a thin internal module from day one: a single `reportError(err, context)` that application code calls. Swapping the SDK then touches one file per app instead of every call site.

> [!warning] Two things to get right
>
> **PII scrubbing via `beforeSend` is mandatory.** No message bodies, no phone numbers, no precise locations, `Authorization` redacted. Less acute while data stays on our own GlitchTip — but it must be correct before the DSN ever points at a vendor.
>
> **Error tracking runs on the infrastructure it monitors.** If Fly has a problem, GlitchTip may be down exactly when needed. Accepted knowingly — and one more reason the DSN switch must stay trivial.

---

## § · Schema design

The fourteen decisions above settle *what we build on*. This settles *what the data looks like* — the most expensive thing in the system to change, because it is copied into every table, every API response, every generated Kotlin data class, and eventually into the local cache on 20,000 phones.

The order below is a dependency chain, not a preference. Each step needs the one above it to be fixed first.

```
1. Identity     users                              ← every other table has a foreign key to this
2. Profile      profiles, attributes
3. The queue    who has seen whom, and what they did
4. Listings     flats + lister accounts
5. Chat         threads, messages, requests, blocks, reports
6. Events       analytics, versioned, with a retention policy
```

### Schema ledger

| # | Decision | Summary | Status |
|---|---|---|---|
| S1 | [UUIDv7 primary keys, clients may mint](#s1--uuidv7-primary-keys) | Non-enumerable, index-friendly, retry-safe offline writes | Settled |
| S2 | The users table | Columns, verification state, revocation, deletion | Next |
| S3 | Profiles and the attribute model | Rapid-fire answers — columns, rows or JSONB | Pending |
| S4 | The queue | unseen → seen → accepted/rejected, reject counts, suppression | Pending |
| S5 | Listings | Lister accounts kept separate from user accounts | Pending |
| S6 | Chat | Threads, messages, message requests, blocks, reports | Pending |
| S7 | Analytics events | event_version, plus DPDP-compliant retention | Pending |

---

## S1 · UUIDv7 primary keys

**Decision:** Every table uses `id uuid primary key` holding a **UUIDv7**, with **no database default**. The API mints it; for offline-capable writes the client mints it instead and the API validates it.

### Why not the obvious choice

A sequential `bigint` is smaller and faster and needs no library. Three things outweigh that here.

|   | `bigint` identity | `uuid` v4 | `uuid` v7 |
|---|---|---|---|
| Bytes | 8 | 16 | 16 |
| Who can generate it | Postgres only, at INSERT | anyone, anywhere | anyone, anywhere |
| Insert locality | perfect | none | near-perfect |
| Guessable | yes | no | no |
| What it leaks | user count + signup order | nothing | approximate signup time |

- **Enumerability — the one that matters most for this product.** With a sequential id, `/users/1024` implies `1023` and `1025` exist. Any endpoint taking a user id becomes a walkable list of every woman on the platform. That needs no bug — only a `for` loop. Authorization should stop it, and will; but on a safety product, defence in depth means not handing out the map in the first place.
- **Insert locality — why “UUIDs are slow” is only half true.** A Postgres index is a sorted B-tree, so where a new key lands depends on its value. A sequential key always lands on the rightmost page, which stays hot in RAM. A *random* v4 lands on a different page every time — once the index outgrows RAM that is a random disk read plus a dirty page per insert. **v7 puts a 48-bit millisecond timestamp in the high bits**, so new ids sort to the end: v4’s opacity with `bigint`’s locality. Invisible at 20k users; very visible on a 144M-row events table.
- **Client-generated ids — the one that pays off in month 4.** If ids are uuids, the phone can mint the real, permanent id before the server ever sees the row. With `bigint` the database must assign it, so the app renders a *temporary* message, waits, then rewrites every reference to it — reply threading, read receipts, cache keys — and a retried POST creates a duplicate.

### Where the id comes from

Three layers could generate it. We use them in this priority order:

```
1. The client, if it can          ← phone or browser, for offline-capable writes
2. The API, if the client didn’t   ← Drizzle $defaultFn
3. The database                    ← never
```

> [!note] Why the database is excluded
>
> Supabase hosted runs **Postgres 17**; the native `uuidv7()` function only arrived in Postgres 18. But even once it lands, we would not use it as a column default — a `DEFAULT uuidv7()` means the id exists only *after* the INSERT commits, so the phone can never know it in advance. Offline-first would be dead on arrival.
>
> So the column is declared with no default and filled by whichever layer first knows the row should exist. Generating in app code works identically on 17 and 18, which also removes the upgrade from the critical path.

Chat message — client mints

```
// offline, user taps send
id = uuid7()
// render immediately, queue

// network returns, 40s later
POST /threads/88/messages
{ "id": "019abc4f-…",
  "body": "when can I visit?" }

// API: Zod validates it IS a v7
INSERT … ON CONFLICT (id)
  DO NOTHING   ← retry-safe
```

Signup — API mints

```
POST /auth/session
{ "firebaseIdToken": "…" }

// nothing to mint with on the
// client — the row cannot exist
// until Firebase verifies

id: uuid('id').primaryKey()
  .$defaultFn(() => uuidv7())

// returns the id to the client
{ "id": "019abc50-…" }
```

Same column, same type, no database default. Only the endpoint’s Zod schema differs — whether it accepts an `id` field in the request body at all.

### Two objections, answered

- “Two clients could generate the same id”
  Not in practice
  A UUIDv7 carries a 48-bit millisecond timestamp plus **at least 62 bits of randomness**. A collision needs two devices to pick the same 62-bit number *inside the same millisecond*. At a million writes per millisecond — roughly 10,000× our peak — that is about 1 in 10 million. And if it did happen nothing breaks: it is a *primary key*, so the second INSERT fails loudly.
- “A client could send someone else’s id and overwrite their row”
  Structurally impossible
  `INSERT` with a duplicate primary key **errors** — it does not overwrite. Overwriting requires `UPDATE`, and we never update a row by a client-supplied id without `WHERE user_id = <id from the verified JWT>`. The worst a malicious client achieves by guessing an id is making *their own* insert fail.

### The three real traps

| Trap | What goes wrong | Guard |
|---|---|---|
| Spoofed timestamp | Client sends a v7 prefixed with year 2099. Index locality is destroyed and anything sorting by id is wrong. | Zod: embedded timestamp within ±5 min of the server clock. |
| Sorting by id | You assume ids sort chronologically, then a client with a skewed clock reorders a chat thread. | **Never sort by the uuid.** Every table gets `created_at timestamptz not null default now()` — server clock — and that is what ordering uses. |
| Id squatting | Attacker pre-inserts rows at ids you will later want. | Irrelevant — ids are random, they cannot predict yours. |

> [!warning] Standing rule
>
> The timestamp inside a UUIDv7 is an **optimisation for Postgres, not data**. It is never read, never displayed and never ordered by. `created_at` is the only chronology the application trusts.

### Which tables let the client mint

Not all of them. The rule: **only rows the client creates as a self-contained action it could perform offline.**

| Table | Minted by | Why |
|---|---|---|
| `messages` | client | Offline send, retry-safe, instant render |
| `swipes` | client | User can swipe with no signal; queue and flush |
| `reports` | client | Must work on a dying connection — safety-critical |
| `blocks` | client | Same — safety-critical |
| `users` | API | Cannot exist before Firebase verifies the token |
| `profiles` | API | Derived from `users` |
| `listings` | API | Needs a server-side R2 presign first anyway |

### What it costs

- **+8 B** Per row, per foreign key, per index entry
- **160 KB** Total overhead on `users` at 20k — noise
- **~1 GB** Extra index on a 144M-row events table — real, revisited at S7

- bigint
  primary key + a separate public slug
  Rejected
  Best storage profile and nothing enumerable leaves the API — but it means two identifiers per row forever, every join and every response has to pick the right one, and it still cannot mint ids offline. The 8 bytes are not worth a permanent second id.

> [!tip] Revisit when
>
> A single table passes roughly 500M rows and its index size becomes the binding constraint. That table — almost certainly `analytics_events` — can switch to `bigint` in isolation without touching anything else, because nothing ever holds a foreign key to a log line.

---

## § · Credentials

The goal isn’t “nothing visible in the browser.” Some values are public by design and cannot be hidden. The goal is nothing *dangerous* visible in the browser.

> [!danger] The Firebase web apiKey is not a secret
>
> It ships in the browser bundle by necessity and Google documents it as public. It’s an *identifier* — “this request is for the Roomsie project” — not a password. Security comes from the authorized-domains allowlist, the fact that a valid token still requires a real Google sign-in, and our API verifying every token.

| Credential | Class | Lives in |
|---|---|---|
| Firebase web config | **[Public]** | Browser bundle |
| google-services.json / plist | **[Public]** | Shipped in mobile apps |
| Supabase URL + anon key | **[Public]** | Browser — Realtime only |
| Sentry DSN | **[Public]** | Browser |
| Supabase service_role key | **[Critical]** | apps/api only |
| Postgres connection string | **[Critical]** | apps/api only |
| R2 access key + secret | **[Critical]** | apps/api only |
| Firebase Admin service account | **[Critical]** | apps/api only |
| Deploy tokens | **[Critical]** | CI secret store |

> [!tip] The one that ends the company
>
> The Supabase `service_role` key bypasses Row Level Security entirely. Leaking it is full database compromise — every profile, message and verification selfie. It never leaves `apps/api`.

### Two hard rules

- Anything named `NEXT_PUBLIC_*` is **compiled into the browser bundle**. That prefix is a public declaration. Never put a secret behind it.
- Secrets exist only in `apps/api`’s environment. They never enter `apps/web` — not in a config file, not in an env var, not via an import.

### Handling — where leaks actually happen

Through people and process, far more often than through code.

- `.env*` gitignored; a committed `.env.example` documents every key with dummy values.
- Real values in the provider’s env store and CI secrets — **never in Slack or WhatsApp.** With four people, a shared vault is worth the setup time.
- `gitleaks` as a pre-commit hook — catches the paste-into-the-wrong-file mistake before it’s permanent git history.
- `Authorization` headers redacted in API logs. Logging a token is logging a password.
- Rotate anything ever pasted into a chat, a screenshot or a shared laptop — before launch.

---

## → · Still open

> [!danger] The frontier is empty
>
> Every architectural decision is settled and recorded. Nothing is silently assumed.

### Carried forward

| Item | Where |
|---|---|
| Naming transform for the token generator | Blocked on `npx untitledui@latest tailwind` — read the real theme.css |
| Rebrand: Brand ramp is still Untitled UI blue, fonts still Inter | Decision 11 · brand must stay distinguishable from `error` |
| Event retention & deletion policy (DPDP) | Decision 12 · design with the schema, not after |
| Playwright E2E on critical paths | Decision 13 · after the UI stabilises |
| Product requirements — PRD.md is deprecated | Requirement claims in Decisions 07, 09, 12 need revalidating |

Next: schema design, then building the base by hand — one piece at a time.
