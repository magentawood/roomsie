# How Roomsie is built, and why

*Architecture record · v0.1*

This record gives fourteen settled architecture decisions. At this time, we design the schema on these decisions. For each decision, the record gives our choice, the data for it, and the options that we rejected. Thus, nobody has to argue a decision again from memory.

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
| 08 | [Next 16 · Tailwind v4 · TanStack Query](#08--the-web-stack) | We port the design work that exists | Settled |
| 09 | [Fly.io Mumbai · Vercel · Supabase ap-south-1](#09--hosting--region) | The region is sticky, and compute follows it | Settled |
| 10 | [pnpm workspaces + Turborepo](#10--monorepo-tooling) | Strict dependencies, zero-config remote caching | Settled |
| 11 | [Untitled UI · theme.css generated from Figma](#11--design-system-and-the-token-pipeline) | Figma is the source of truth, in one direction | Settled |
| 12 | [Analytics in our own Postgres](#12--analytics-events) | No vendor. The schema is the part that must be correct | Settled |
| 13 | [CI gate & testing baseline](#13--ci-gate-and-testing) | Test where the expensive bugs are | Settled |
| 14 | [Sentry SDK → GlitchTip](#14--error-tracking) | GlitchTip now, Crashlytics for web when it is available | Settled |

### The budget that decides everything

Four people at two hours a day for a month give approximately 200 real hours. The v1 scope has much UI work. Thus, the division of hours is not negotiable. We measured each decision in this record against the backend part.

| Item | Value |
|---|---|
| Frontend | 120–140h |
| Backend + infra | 60–80h |

We answered each “should we build this ourselves?” question against the second bar.

### The principle underneath

Most small teams spend their runway on “Build for scale from the start”. The cost of rework is not the same for all things. Thus, at the start, we spend only on the things that become part of each client and each stored row.

> [!success] Cheap to change later
>
> - Hosting provider, server size, region
> - CDN
> - The cloud that we use
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

Clients hold a Firebase ID token and send requests to `apps/api`. They never open a database connection. They never subscribe to a Postgres table, and they never learn a column name.

### Standing rules

- Our own **users.id** is the primary key in all tables. The Firebase UID is a plain `auth_provider_id` column.
- A **Zod schema parses** each byte that comes into the API from outside. It does this before other code touches the byte.
- We generate and commit the **OpenAPI document** from day one. All clients generate their code from this contract.
- Image bytes **never go through the API**. Clients upload them directly to R2 through presigned URLs.
- Verification selfies are in a **separate, non-public bucket** with short retention.
- Realtime is **broadcast only**. No client subscribes to a table.
- Next.js has no business logic. Route handlers are only for OAuth callbacks, image proxying and webhooks.

---

## 01 · Rent the infrastructure, own the application

**Decision:** A provider operates Postgres, storage and the CDN. We write each migration, query and endpoint ourselves, by hand.

We use no application code that a vendor generates. We run no `apt install`.

It is good to want control of operations. But “ops” has two different meanings, and at this time, only one of them is worth the cost.

| Layer | What it is | Cost to reclaim later |
|---|---|---|
| Infrastructure ops | Provisioning, Postgres tuning, backups, TLS, pooling, monitoring, patching | **[Low]** a weekend |
| Application ops | Schema, migrations, API, deploys, observability | **[High]** a rewrite |

A move from managed Postgres to your own Postgres is a dump and a restore. The database stays the same. But if a vendor owns your business logic or your data access patterns, you must do a rewrite to remove the vendor. **Thus, we buy control of the application and rent the machines.**

> [!danger] Worth saying plainly
>
> At 20k users in one city, there is no scaling problem at this time. One small Postgres instance is sufficient, with a large margin. The scaling lessons are real. But you would learn them against a load that does not exist.

- Run our own VPS + Postgres from day one
  Rejected
  A realistic cost is 40–60 person-hours before the first feature ships, from a ~200 hour budget. After that, it has a continuous cost. It buys control of the layer that is the cheapest to reclaim.

---

## 02 · Clients talk to our API, never to the database

**Decision:** All application reads and writes go through an HTTP API that we write. Clients never hold a database connection.

We rent exactly three pieces that are genuinely infrastructure: the OAuth flow, storage + CDN, and the websocket transport. RLS stays on below the API as defence in depth. It is not the primary lock.

This decision determines if the KMP apps in month four are a port or a rewrite.

- A · Direct-to-database (BaaS)
  Rejected
  Clients query Postgres directly. RLS policies are the only security layer. This gives the fastest v1. But the business rules divide between SQL policies and three clients, and each client depends on the shapes of your tables. If you rename a column, iOS breaks.
- B · Own API for absolutely everything
  Rejected
  This gives maximum portability. But you must build OAuth token handling, upload pipelines and websocket infrastructure by hand. That is 30–40 hours from a 60–80 hour budget. You spend these hours on problems that other people solved before, and that do not make the product different.
- C · Own the logic, rent the plumbing **(chosen)**
  Chosen
  Our API owns each read and write that has business logic. The platform gives only OAuth, storage and the chat socket.

### The argument that settled it

**RLS cannot express parts of the spec at all.** These items all need server-side code:

- the queue ranking score
- the exclusion of profiles that the user saw before
- the three-rejects-then-suppress-90-days rule
- chat rate limits
- first-message contact-detail stripping.

Thus, a backend exists for all the options. The only question is when we admit it. We can admit it at this time. Or we can find it in week three, after we built half of a backend by accident.

---

## 03 · The API is its own deployable

**Decision:** One repository has two artefacts: `apps/web` and `apps/api`. Each artefact builds and deploys independently.

The API is a separate *deployable*. It is not a separate *repository*.

The cheap way to build the API is as route handlers in Next.js. This gives one project, one deploy, no CORS and no network hop. For a solo project that ships only a website, that is correct. There are four reasons why it is not correct for us.

- **It lets us enforce Decision 02. Without it, Decision 02 is only an aspiration.** In the Next app, each Server Component can get the database with one import. Under deadline pressure, a person queries the database directly because it works. Then that rule is only in the web client. Nobody can go around a network boundary by accident.
- **The runtime model fits.** On serverless, each of these items needs a workaround: background jobs (auto-suspend on report threshold, ghost-profile decay at 30/60 days, analytics aggregation), scheduled work and a persistent connection pool. A long-running service simply has them.
- **Deploy coupling.** With one deployable, a CSS change also deploys the API again. Shipped mobile apps depend on that API, and we cannot force an update of these apps.
- **Four part-time people parallelise better** across two deployables with a contract between them than across one codebase.

- **~4h** CORS, token propagation, two local processes
- **1–5ms** Extra SSR hop, in-region

We pay a small number of hours at this time. In return, the boundary holds, also when there is pressure, for the next two years.

---

## 04 · TypeScript, Fastify, Zod

**Decision:** `apps/api` is TypeScript on Node. It uses Fastify for HTTP, and Zod for runtime validation at each external boundary.

We generate the OpenAPI document from those schemas. This document is the single source of truth for all clients.

### Language

Some team members prefer JavaScript, and some prefer Java. Yash is Android/Kotlin. At 20k users, each candidate has much more capacity than necessary. Only a load test would show a difference between them. Thus, the binding constraint is hours, not throughput.

| Option | For | Against |
|---|---|---|
| TypeScript | Two devs know it. Single-toolchain monorepo. Strongest AI assistance. Fastest to an endpoint. | Types do not exist at runtime. Thus, validation must be a discipline. |
| Kotlin + Ktor | Yash’s strongest language. One language for server→Android→KMP. Shared DTOs. | Polyglot monorepo (Gradle + pnpm). Two devs must learn it. Smaller server ecosystem. |
| Java + Spring | Most mature ecosystem. Runtime type safety. Big hiring pool. | 3–4× the code for each endpoint. Heavy runtime. Slow rebuilds. |

> [!danger] Why not Kotlin, honestly
>
> The real advantage of Kotlin is that it shares DTOs directly with the KMP module. We **can recover this advantage in the future** through OpenAPI codegen. We cannot recover the month that the team spends to learn Kotlin. You cannot buy back a month.

### Framework

The design of Fastify is for exactly the long-running Node process that Decision 03 chose. Fastify ships first-party plugins for CORS, rate limiting, JWT, multipart uploads and OpenAPI generation. The spec requires all of these.

The primary advantages of Hono are edge-runtime portability (not relevant here) and TypeScript-only RPC typing. **Kotlin cannot consume that typing.** Thus, it could push out the real OpenAPI spec that mobile needs. Express is out of date. In practice, it is in maintenance.

### Why Zod is mandatory, not optional

In Kotlin, types are real at runtime. In TypeScript, the compiler erases types at compile time. `as SomeType` is a promise that you make to the compiler. It is not a check.

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
> A schema parses each byte that comes into the API from outside, before anything else touches it. This includes request bodies, query params, webhooks and third-party responses. If you skip this step, the safety of TypeScript is only theatre.

---

## 05 · Supabase, Firebase, Cloudflare R2

**Decision:** Postgres + Realtime on Supabase · Google sign-in on Firebase · object storage on Cloudflare R2

The cost is approximately `$50–80/month` at launch scale.

After Decisions 01–03, we need exactly four commodity services and nothing more: Postgres, OAuth, storage + CDN, and a websocket transport. We use no query APIs, no generated clients and no logic that a vendor holds.

### Identity — the cost is not the argument

| Item | Value |
|---|---|
| WorkOS | $0 |
| Supabase | $25 |
| Firebase | $275 |
| Clerk | $1,800 |
| Auth0 | $500–3k |

The table gives the monthly cost at 100,000 MAU. This is five times our stated ceiling. Firebase is free below 50k.

| MAU | Firebase | Supabase | Clerk | WorkOS |
|---|---|---|---|---|
| 20k **[target]** | $0 | $0 | ~$200 | $0 |
| 50k | $0 | $0 | ~$800 | $0 |
| 100k | ~$275 | ~$25 | ~$1,800 | $0 |
| 1M | ~$4,415 | ~$2,950 | ~$19,000 | $0 |

Above the 50k free MAU, Firebase uses graduated prices: `$0.0055`/MAU to 100k, and `$0.0046` to 1M. Graduated means that each rate applies only in its band. Thus, 100k MAU costs `50k free + 50k × $0.0055 = $275`.

> [!danger] So we chose on mobile, not price
>
> At 20–50k MAU, only Clerk and Auth0 are not free. The real difference today is that this product will be mainly a phone app. The Firebase Android/iOS SDKs and its Credential Manager / One Tap integration give exactly the zero-typing sign-in that the spec asks for.
>
> WorkOS was attractive at free-to-1M. But it is web-first and B2B-first. On mobile, you must connect the OAuth/PKCE flows with your own code. That is a real cost in month four. We would pay it to avoid a bill that we will not see for years.

### Storage — here the cost *is* the argument

A swipe app causes very large egress. Our model at 20k users gives these values:

- **45 GB** Stored — profiles, listings, selfies
- **700 GB** Egressed per month
- **14 : 1** Egress to storage ratio

| Item | Value |
|---|---|
| Cloudflare R2 | $10–30 |
| DO Spaces | ~$70 |
| Supabase | $210–615 |
| AWS S3 | ~$632 |

The table gives the monthly cost at 200k users, with 500 GB stored and 7 TB egressed. On all providers, storage costs less than $12. The remainder is egress.

**R2 charges nothing for egress.** When we reach 200k users, this is worth approximately $600/month. That is more than all the other infrastructure line items together. Also, R2 is S3-compatible. Thus, the exit is a bucket copy and an endpoint change.

> [!tip] Wasabi ruled out on policy, not price
>
> Wasabi says “no egress fees”. But this claim has a fair-use expectation: monthly downloads stay *below* the stored volume. At 14× the stored volume, we would be in violation from month one. Wasabi sets its prices for backup and archive, not for media serving.

### Realtime — broadcast, never postgres_changes

In the popular mode of Supabase Realtime, clients subscribe to changes on a *table*. That would silently destroy Decision 02. With `broadcast`, our API writes the message and applies the rules. Then it publishes to a channel. Clients subscribe to channels, never to tables. The feature and the cost are the same, and the boundary is not broken.

Capacity: Pro includes 500 concurrent connections. Each 1,000 more connections cost $10. Budget $10–20/month more.

### Where the lock-in actually is

| Piece | Lock-in | Exit |
|---|---|---|
| Postgres | **[None]** | pg_dump, restore, change connection string |
| Storage | **[Low]** | S3-compatible. Copy the bucket, change the endpoint. |
| Realtime | **[Low]** | The transport is behind our API. Clients see no change. |
| Identity | **[Medium]** | One-column backfill + silent re-login — *only because of Rule 1* |

> [!warning] The five-minute decision that saves weeks
>
> You cannot `pg_dump` an OAuth relationship. Thus, we store the Firebase UID as a plain `auth_provider_id` column. All other tables have a foreign key to *our* `users.id`.
>
> With that rule, a change of provider needs two things. We link one column again, and users tap Google one more time. Without that rule, the ID of the provider is in each foreign key in the database.

---

## 06 · Drizzle as the database layer

**Decision:** We use Drizzle, only in `apps/api`. The TypeScript schema is the single source of truth for the full database.

> [!note] Not like Room
>
> In Room, each phone has its own SQLite file. Here, there is exactly **one** Postgres database. The schema file describes its real, complete structure: all tables, columns, indexes and foreign keys. It is not a client view or a subset.

```
schema.ts  →  drizzle-kit generate  →  0003_add_verified_flag.sql  →  Postgres
```

- **Portability.** Migrations are plain SQL that each Postgres accepts. If we leave Drizzle or Supabase, the schema history moves with us, with no loss.
- **It teaches SQL. It does not replace SQL.** The query builder shows the SQL structure and does not hide it. Prisma would teach you Prisma.
- **The hardest query stays typed.** The ranking score must run in Postgres. Drizzle supports raw SQL with a typed result. In Prisma, that is an untyped `$queryRaw` escape hatch.
- **Compile-time safety is much more important here than usual.** Four people edit one schema at two hours a day. If a person renames a column, the build breaks and lists all the affected queries. Without this, the failure occurs in production, in an untested endpoint, on a Tuesday.

### Adoption — mid-2026

| ORM | 30-day downloads | Weekly trend |
|---|---|---|
| Prisma | 55.3M | 3.8M → 4.3M |
| Drizzle | 48.1M | 2.9M → 5.1M |
| TypeORM | 19.3M | goes down |

Drizzle overtook Prisma on weekly downloads in Q4 2025, and the gap continues to increase. Production users include Replit, Sentry, Databricks and Figma. Astro DB uses Drizzle as its base, and Hono ships it as the default. In March 2026, Drizzle got the support of a company. This removed the primary objection from before.

| Cost / benefit | Hours |
|---|---|
| Learning cost | −2 to −3 |
| Migration tooling not hand-rolled | +4 to +6 |
| Row mapping across ~100 queries | +5 to +8 |
| Schema drift caught at compile time | unpriced — the primary one |
| Net | ~15–25 hours saved |

---

## 07 · Hybrid rendering, Bearer tokens, instant revocation

**Decision:** The rendering of a page depends on if the page needs SEO. Identity goes as `Authorization: Bearer` on all surfaces.

| Surface | Rendering | Identity |
|---|---|---|
| Landing, listings | Next renders it on the server, and calls the API server-to-server | None — public data |
| Stack, liked, chat, settings | Client-rendered in the browser | `Bearer <ID token>` |

Listings are the organic-search surface. The authenticated app has no SEO value at all. Nobody googles the chat inbox of a different person.

### Why Bearer and not session cookies

A cookie path would work only on the web, because **mobile clients cannot use cookies**. Then we would have two authentication code paths to build, test and keep in sync forever. Decision 02 exists to prevent exactly this divergence.

| Token | Lifetime | Who sees it |
|---|---|---|
| ID token (JWT) | ~1 hour **[fixed]** | Goes to our API with each request |
| Refresh token | Long-lived | Stays on the device. **Our API never sees it.** |

The API verifies the JWT signature against the cached public keys of Google. It does this locally, with no database lookup and no call to Firebase.

### Why we don’t shorten the 1-hour TTL

Firebase sets the TTL, and we cannot configure it. But the more useful point is this: **it is the incorrect lever.**

A short TTL is a defence against a stolen token, and attackers steal tokens through XSS. An attacker who can run JavaScript gets new tokens for as long as the tab is open. Or the attacker takes the refresh token and mints new tokens. A 5-minute TTL causes the attacker almost no problem. But it costs 12× the refresh traffic and a class of expired-mid-request edge cases.

> [!danger] What we build instead — instant revocation
>
> It needs one column, three lines of middleware and approximately one hour of work.

```
users.tokens_valid_after   timestamptz  not null  default now()

// after verifying the JWT signature
if (decoded.iat * 1000 < user.tokens_valid_after.getTime())
  throw unauthorized()   // every token issued before this moment is dead
```

When we set that column to `now()`, all sessions of the user end immediately, on all devices. Suspend, ban, log-out-everywhere and compromise response are all the same one-line write. The spec requires auto-suspend when an account crosses the report-rate threshold, and that needs exactly this column.

---

## 08 · The web stack

**Decision:** Next 16 App Router · React 19 · Tailwind v4 · TanStack Query

We port the pages that exist in `femmeflats-design`. We do not build them again.

Code that exists already decided the styling: a landing page, login, signup and a browse screen on Tailwind v4. If we argue this decision again, we would discard real work for no benefit.

### TanStack Query — caching is not the reason

Caching is a side effect, and people give it too much importance. The reason is boilerplate and correctness.

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
> Without the guard, a response can arrive after `id` changes. Then it writes the data of the previous id in place of the data of the current id. In a swipe stack, **id changes every second or two**. Thus, this race is the primary interaction in the product, not an edge case. The symptom is “sometimes the wrong profile appears”, and that is expensive to diagnose.

| Fetching components across the authed app | ~30–40 |
|---|---|
| Lines saved | ~400 |
| Race-condition opportunities removed | ~30–40 |
| Learning cost | 1–2 hours |
| Break-even | ~5th endpoint |

It also gives two things that the product specially needs:

- **prefetching the next N cards**, so that the stack feels instant
- **optimistic accept/reject** with automatic rollback.

---

## 09 · Hosting & region

**Decision:** Supabase `ap-south-1` · `apps/api` on Fly.io Mumbai · `apps/web` on Vercel pinned to `bom1`

The Postgres region is the sticky choice, and compute follows it. A move of `apps/api` to a different host takes an afternoon. A move of a Supabase project to a different region is a dump-and-restore with downtime.

### Region matters more than the vendor

Each API request makes a number of round trips to Postgres. Thus, the largest latency is not user→API. It is **API→database**.

| Setup | API→DB per query | Endpoint with 5 queries |
|---|---|---|
| API Mumbai · DB Mumbai | ~1ms | ~5ms |
| API Singapore · DB Singapore | ~1ms | ~5ms |
| API Singapore · DB Mumbai | ~55ms | ~275ms wasted |

The failure mode is not an incorrect city. It is **an API and a database in different regions.** Of the obvious hosts, only Fly.io has an Indian region. Render has no Indian region, and Railway has no confirmed Indian region. Vercel does offer `bom1` (Mumbai). Thus, latency alone does not make a difference between Fly and Vercel.

### Fly.io vs Vercel — the runtime

|   | Fly.io (bom) | Vercel (bom1) |
|---|---|---|
| Runtime model | Always-on container | Function instances, reused through Fluid |
| Cold starts | None | Fewer, but not zero |
| Max duration | Unlimited | 300s default · 800s paid |
| Persistent worker | Run one | None — Cron + queue |
| DB connections | Real long-lived pool | Needs the Supabase pooler |
| Fastify fit | Its design target | Needs an adapter |
| Portability | A container runs on all hosts | Vercel-shaped code |
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
> The Series D messaging of Fly says this. In its largest customers, agent-native customers are at this time ~two-thirds of revenue. They grow ~12× year on year. The plain meaning is that Fly changes into an AI-agent infrastructure company. General web hosting gets a smaller share of its attention.
>
> But ask what the lock-in would be. On Fly, you deploy a **Docker container**. If Fly disappoints, the same image runs on Railway, Render or AWS with no change. That move takes an afternoon.
>
> Vercel is the much safer company. But it produces code that runs on no other platform. **The safer vendor gives the riskier coupling.**

### The argument that actually decided it

> [!danger] Serverless functions have no shared memory between requests
>
> Thus, you cannot buffer, batch, throttle or cache anything *across* requests. Each request is an island. That is the full disadvantage. All other problems follow from it.

An example is analytics ingestion. The spec (§3.1) defines it as a per-card lifecycle, with a flush on each decision:

- **65k** Sessions per month at 5k weekly actives
- **~12M** Events per month
- **~4.2M** HTTP requests for analytics alone

On a long-running process, an in-memory buffer batches inserts of ~500 through one persistent connection. A traffic spike gives more concurrent requests to the same process. The database continues to get the same stable writes.

On serverless, each flush is an isolated invocation. A launch-night spike scales to many instances. Each instance needs a connection, and all of them arrive at the pooler at the same time. The pooler queues them, and latency increases. Then the swipe stack, which is the core interaction, stutters. The fix is architectural, and you find the problem at 2am, when the load is high.

There are two more collisions:

- **rate limiting**: §8.2 sets a daily limit on new conversations. This is a counter in the process, against an external round trip on each message send.
- **auto-suspend on report threshold**: this needs a process that monitors continuously.

### But serverless wins the other half — so we use it there

| Workload | Req/month | Cacheable | Best fit |
|---|---|---|---|
| Listings grid | ~500k | ✅ CDN | **[Serverless]** |
| Profile detail | ~300k | ✅ mostly | **[Serverless]** |
| Swipe queue | ~325k | ❌ personalised | **[Either]** |
| Analytics firehose | ~4.2M | ❌ write | **[Long-running]** |
| Rate limits | per message | ❌ stateful | **[Long-running]** |
| Background jobs | continuous | ❌ daemon | **[Long-running]** |

Serverless is *good* at grids and lists, and Decision 07 already put them on serverless. Public pages render on Vercel and cache at the edge. All write-heavy work is behind `apps/api` on Fly. We use each tool where it is actually good.

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

npm and yarn flatten all dependencies into one hoisted `node_modules`. Thus, `apps/web` can import a package that only `apps/api` declared. This works on a laptop and fails in CI. pnpm makes sure that a package can import only what it declares. With four people and two artefacts that deploy independently, a design that removes that bug class is worth the work.

### Why Turborepo over Nx

Both are task runners on the same workspace. Thus, the difference is small. Two things decided it. First, `apps/web` deploys to Vercel, which automatically detects Turborepo and gives **remote caching with zero configuration**. The team and CI share a build cache for free.

Second, Turborepo is one config file. At this time, the team already must learn Fastify, Zod, Drizzle, TanStack Query, Fly.io and Docker.

> [!note] Nx’s real advantage is `affected`, not generators
>
> Nx makes a project graph from the actual imports. Thus, it runs only what a change could break. That is important at twenty packages with a fifteen-minute CI run. At four packages, `turbo build` with caching finishes in either case.
>
> Also, the migration is cheap: delete `turbo.json`, run `nx init` and update some scripts. It takes approximately half a day. If we adopt a heavier tool at this time to avoid that migration, we invert the principle that all other parts of this document apply.

Terminology note: Nx deprecated the difference between package-based and integrated repos. Inferred tasks (“Project Crystal”) replaced it. At this time, incremental plugin adoption is simply how Nx works. Thus, there is no reason to choose a repo style at the start as a hedge.

---

## 11 · Design system and the token pipeline

**Decision:** Roomsie DS = customised Untitled UI. Figma is the single source of truth. We generate all of `theme.css` from the export.

Untitled UI Figma kit ↔ Untitled UI React (React Aria) · `@untitledui/icons` · light-first, the same as the library.

We do not design a token system, because Untitled UI already did this. The export has **691 variables across 7 collections**. The variables have tiers, light/dark modes and namespaces for Tailwind v4. The remaining work is to rebrand values, not to build structure.

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

The docs of the bridge say that values flow **Figma → export only**. If you edit an exported file, nothing changes in Figma, and the next export replaces the file. There is no round trip. If code needs a token that Figma does not have, the path is `DS-GAP` → designer adds it → re-export.

> [!warning] Why not the DTCG file
>
> The bridge also writes `tokens.dtcg.json`, and DTCG is the industry-standard interchange format. But it is **lossy in exactly the way that is important here**. `$value` has only the default mode of the collection. The other modes are deep in `$extensions["com.figma"].modes`.
>
> Light mode and dark mode are each first-class. Thus, a standard build would silently drop one of them. Also, we would read the Figma extension block by hand in all cases. That removes the only real advantage of DTCG.

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

You can see the primitive → semantic tier in the CSS. If you recolour one primitive, the change cascades to all places. DevTools shows the chain. If we flattened to hex, only Figma would document that structure.

> [!tip] The trap that makes this work or break
>
> Plain `@theme` compiles the utility to `color: var(--color-text-primary)`. Thus, when `.dark-mode` reassigns that token, the utility uses the new value. `@theme inline` puts the value in directly as `color: var(--color-neutral-900)`, and the reassignment has **no effect**.
>
> Thus: use **plain `@theme`**, and **dark mode reassigns the semantic token, never the primitive.** That agrees with how Figma already models it. Semantic variables have per-mode aliases, and primitives do not change with the mode.

### Generating wholesale needs a guard

The file is a pure build artefact. Thus, a naming divergence would silently break Untitled UI React components, and it would not cause an error. For this reason, the generator ends with a verification pass. The pass collects each `var(--…)` that the Untitled UI React source references. It **hard-fails the build** if the generated file does not define one of them. Thus, a silent visual break becomes a loud build error.

> [!note] Blocked on one command
>
> `token-map.md` proposes `--color-bg-primary` → utility `bg-primary`. But stock Tailwind v4 would generate `bg-bg-primary`. To get the shorter names, Untitled UI must define custom utilities, and its docs do not say how.
>
> Run `npx untitledui@latest tailwind`. Then read the real `theme.css`. Its names win. We settled all the other items above.

Remaining customisation: at this time, the Brand ramp is Untitled UI blue, and the fonts are Inter. When Brand changes to a rose/red hue, brand and `error` must stay clearly different. On a safety product, Block, Report and destructive confirmations cannot look like primary actions.

---

## 12 · Analytics events

**Decision:** All events go to a separate, append-only Postgres instance that we own. We use no third-party analytics vendor.

Partitioned monthly · buffered batched writes from `apps/api` · schema versioned in `packages/contract`.

- **~12M** Events per month at 5k weekly actives
- **~5/sec** Average write rate
- **$25** Per month, vs ~$390 for PostHog

> [!danger] The schema is expensive; the store is not
>
> When fifty million rows have a field name, a change to that name needs a migration and causes a gap in the history. If we move those rows to ClickHouse in the future, that is an export and an import. Thus, we define the schema one time, with versions, in `packages/contract`. Each row has an `event_version`. That is the part that must be correct today.

### Why not specialist tooling

For Postgres, ~5 writes/sec is a usual load. `apps/api` is a long-running process (Decision 09). Thus, it buffers and batches the writes, and Postgres gets some large inserts, not a firehose. ClickHouse and Tinybird are the correct answer at approximately ten times this scale.

| Option | Cost/month | Verdict |
|---|---|---|
| Own Postgres | ~$25 | **[Chosen]** |
| Tinybird | ~$99 | **[Overkill now]** |
| ClickHouse Cloud | $67+ | **[Overkill now]** |
| PostHog | ~$390 | **[Rejected]** |

### Why a separate instance, not a separate table

We keep analytics off the primary database for resource isolation. Write bursts must not compete for IOPS or connections with a user who waits on the swipe stack. A different schema in the same instance would not give that isolation.

### Data sovereignty

This platform holds verified profiles, locations, budgets and behavioural traces of women who search for housing. The behavioural stream is sensitive by itself: it shows who looked at whom, and for how long. For this product specifically, the defensible position is to keep the stream in our own infrastructure, not to send it to a vendor.

> [!warning] What owning the data costs you
>
> **You build your own dashboards.** Funnels, D7/D30 retention, activation and accept rate are queries and UI that we write. This is real work, and we accept it deliberately. We can also defer it, because events collect from day one, also when nothing reads them.
>
> **Deletion becomes your problem.** Events reference `users.id`. Thus, they are personal data for the DPDP Act of India. Account deletion must purge or pseudonymise the event history of the user. Raw events need a defined retention window.
>
> Design this with the schema, not after the schema. It is the one genuinely more difficult part when you own the data and do not rent it.

We also need automated partition creation. Without it, inserts fail at a month boundary. We also need rollup tables that a background job builds, and apps/api already has background jobs.

---

## 13 · CI gate and testing

**Decision:** Typecheck · lint · build · unit tests · API integration tests · generated-file check · token check · gitleaks

We write unit tests together with the code, not in a subsequent phase. We deferred Playwright E2E.

Two constraints decide this. **CI must finish in approximately five minutes.** After that time, people do not wait, and they merge on hope. Also, each test is an hour that we do not spend on features, from approximately 200 hours. Thus, the question is not how much testing is good in general. The question is where the expensive bugs actually are.

| Rule | Failure mode |
|---|---|
| Verification gates participation | An unverified account starts a chat. This is a product-promise failure, not a bug. |
| `tokens_valid_after` revocation | A suspended account stays logged in |
| Chat rate limits | The daily new-conversation cap silently does nothing |
| Queue exclusion & suppression | Users see the same faces again and again. The product feels broken. |

All of them are server-side and deterministic, and they are genuinely difficult to check by eye. But a snapshot test on a card component is almost worthless while the design changes each week.

> [!danger] Integration tests run against a real Postgres, not mocks
>
> The queue rules are mostly SQL. A mocked database would test nothing that ships.

> [!note] Deferred: Playwright on critical paths
>
> The path is signup → verification → swipe → first message. This test is genuinely valuable, and it finds integration breaks that nothing else sees. We deferred it because E2E is slow to write, and it breaks easily while the UI changes each week. It costs 15–20 hours at this time, plus maintenance, from a 200-hour launch budget. Examine it again when the UI is stable, before a regression can get to real users.

---

## 14 · Error tracking

**Decision:** Instrument with the Sentry SDK. Now, point the DSN at self-hosted GlitchTip. Later, change one variable to switch to paid Sentry.

In month 4, Firebase Crashlytics handles Android and iOS. It is free, and we already use Firebase.

### Why not just use Vercel’s logs

There are two structural gaps. They are not preferences. First, Vercel sees only `apps/web`. It cannot see the API on Fly, where the business logic is.

Second, Vercel logs what runs on *Vercel’s servers*. The authenticated app is client-rendered. Thus, a React crash in the swipe stack or a fetch that fails never touches a Vercel server, and it **never appears**. That is most of the breakage that users see.

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
> GlitchTip implements the Sentry protocol. Thus, we instrument with the Sentry SDK, and the destination is a **DSN — a URL, not a vendor commitment**. When we move to paid Sentry, we change one environment variable.

| Option | Cost | Why not |
|---|---|---|
| GlitchTip self-hosted | ~$5/mo | **[Chosen]** — unlimited users, data stays ours |
| Sentry free tier | $0 | The binding limit is **1 user**, not the 5k errors. We are four. |
| Sentry Team | $26/mo | Best product. It costs a third of the infra budget. Deferred, not rejected. |
| Crashlytics for web | free | **Private preview** since I/O 2026 — cannot carry a launch |

> [!note] Planned: move to Crashlytics for web when it reaches GA
>
> It will be free. We already use Firebase, and Crashlytics also handles Android and iOS. Its base is Google Cloud’s Observability Suite, so it puts client and server errors in one place. Thus, all three clients will use one free tool, and we can retire the GlitchTip instance that we operate.
>
> ⚠️ **That migration is not the one-variable switch.** GlitchTip uses the Sentry protocol. Crashlytics is the Firebase JS SDK, which is a fully different integration. Thus, from day one, we put error reporting in a thin internal module: a single `reportError(err, context)` that application code calls. Then an SDK swap touches one file in each app, not all call sites.

> [!warning] Two things to get right
>
> **PII scrubbing through `beforeSend` is mandatory.** Send no message bodies, no phone numbers and no accurate locations, and redact `Authorization`. This is less urgent while the data stays on our own GlitchTip. But it must be correct before the DSN ever points at a vendor.
>
> **Error tracking runs on the infrastructure that it monitors.** If Fly has a problem, GlitchTip can be down exactly when we need it. We know this and accept it. It is one more reason why the DSN switch must stay trivial.

---

## § · Schema design

The fourteen decisions above settle *what we build on*. This section settles *what the data looks like*. The data is the most expensive thing in the system to change. The reason is that it goes into all tables, all API responses and all generated Kotlin data classes. Eventually, it also goes into the local cache on 20,000 phones.

The order below is a dependency chain, not a preference. Each step needs a decision on the step above it first.

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
| S5 | Listings | Lister accounts separate from user accounts | Pending |
| S6 | Chat | Threads, messages, message requests, blocks, reports | Pending |
| S7 | Analytics events | event_version, plus DPDP-compliant retention | Pending |

---

## S1 · UUIDv7 primary keys

**Decision:** All tables use `id uuid primary key`, which holds a **UUIDv7**, with **no database default**. The API mints the id. For offline-capable writes, the client mints it, and the API validates it.

### Why not the obvious choice

A sequential `bigint` is smaller and faster, and it needs no library. But here, three things are more important.

|   | `bigint` identity | `uuid` v4 | `uuid` v7 |
|---|---|---|---|
| Bytes | 8 | 16 | 16 |
| Who can generate it | Postgres only, at INSERT | anyone, anywhere | anyone, anywhere |
| Insert locality | perfect | none | near-perfect |
| Guessable | yes | no | no |
| What it leaks | user count + signup order | nothing | approximate signup time |

- **Enumerability — the most important item for this product.** With a sequential id, `/users/1024` shows that `1023` and `1025` exist. Then each endpoint that takes a user id becomes a list that a person can walk. This list has all the women on the platform. That needs no bug, only a `for` loop. Authorization should stop it, and it will. But on a safety product, defence in depth means that we do not give out the map at all.
- **Insert locality — why “UUIDs are slow” is only half correct.** A Postgres index is a sorted B-tree. Thus, the value of a new key decides where it goes. A sequential key always goes on the rightmost page, which stays hot in RAM. A *random* v4 goes on a different page each time. When the index becomes larger than RAM, each insert causes a random disk read and a dirty page.

  **v7 puts a 48-bit millisecond timestamp in the high bits**. Thus, new ids sort to the end. This gives the opacity of v4 with the locality of `bigint`. You cannot see the effect at 20k users, but you can see it clearly on a 144M-row events table.
- **Client-generated ids — the item that pays off in month 4.** If ids are uuids, the phone can mint the real, permanent id before the server ever sees the row. With `bigint`, the database must assign the id. Thus, the app renders a *temporary* message and waits. Then it rewrites all references to the message: reply threading, read receipts and cache keys. Also, a retried POST creates a duplicate.

### Where the id comes from

Three layers could generate it. We use them in this priority order:

```
1. The client, if it can          ← phone or browser, for offline-capable writes
2. The API, if the client didn’t   ← Drizzle $defaultFn
3. The database                    ← never
```

> [!note] Why the database is excluded
>
> Supabase hosted runs **Postgres 17**. The native `uuidv7()` function came only in Postgres 18. But when it is available, we would not use it as a column default. With a `DEFAULT uuidv7()`, the id exists only *after* the INSERT commits. Thus, the phone can never know it in advance. Offline-first would be dead on arrival.
>
> Thus, we declare the column with no default. The first layer that knows that the row should exist fills the column. Generation in app code works the same on 17 and 18. This also removes the upgrade from the critical path.

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

The column and the type are the same, and there is no database default. Only the Zod schema of the endpoint is different: it accepts or does not accept an `id` field in the request body at all.

### Two objections, answered

- “Two clients could generate the same id”
  Not in practice
  A UUIDv7 has a 48-bit millisecond timestamp and **at least 62 bits of randomness**. For a collision, two devices must pick the same 62-bit number *in the same millisecond*. At a million writes per millisecond, approximately 10,000× our peak, the chance is approximately 1 in 10 million. If a collision does occur, nothing breaks. The id is a *primary key*, so the second INSERT fails loudly.
- “A client could send someone else’s id and overwrite their row”
  Structurally impossible
  `INSERT` with a duplicate primary key **gives an error**. It does not replace the row. To replace a row, you need `UPDATE`. We never update a row by a client-supplied id without `WHERE user_id = <id from the verified JWT>`. If a malicious client guesses an id, the worst result is that *its own* insert fails.

### The three real traps

| Trap | What goes wrong | Guard |
|---|---|---|
| Spoofed timestamp | A client sends a v7 with the year 2099 as its prefix. This destroys index locality, and all sorts by id are incorrect. | Zod: embedded timestamp within ±5 min of the server clock. |
| Sorting by id | You think that ids sort in time order. Then a client with a skewed clock changes the order of a chat thread. | **Never sort by the uuid.** All tables get `created_at timestamptz not null default now()`, from the server clock. Ordering uses that column. |
| Id squatting | An attacker inserts rows in advance at ids that you will want in the future. | Not a problem. Ids are random, so the attacker cannot predict yours. |

> [!warning] Standing rule
>
> The timestamp in a UUIDv7 is an **optimisation for Postgres, not data**. The application never reads it, never shows it and never orders by it. `created_at` is the only chronology that the application trusts.

### Which tables let the client mint

Not all tables. The rule is: **only rows that the client creates as a self-contained action that it could do offline.**

| Table | Minted by | Why |
|---|---|---|
| `messages` | client | Offline send, retry-safe, instant render |
| `swipes` | client | The user can swipe with no signal. Queue and flush. |
| `reports` | client | Must work on a connection that is about to fail. Safety-critical. |
| `blocks` | client | Same. Safety-critical. |
| `users` | API | Cannot exist before Firebase verifies the token |
| `profiles` | API | Derived from `users` |
| `listings` | API | Also needs a server-side R2 presign first |

### What it costs

- **+8 B** Per row, per foreign key, per index entry
- **160 KB** Total overhead on `users` at 20k — noise
- **~1 GB** Extra index on a 144M-row events table — real, and we examine it again at S7

- bigint
  primary key + a separate public slug
  Rejected
  This gives the best storage profile, and nothing enumerable leaves the API. But each row has two identifiers forever, and each join and each response must pick the correct one. Also, it cannot mint ids offline. The 8 bytes are not worth a permanent second id.

> [!tip] Revisit when
>
> One table grows to more than approximately 500M rows, and its index size becomes the binding constraint. That table is almost certainly `analytics_events`. It can change to `bigint` by itself, with no change to other tables, because nothing ever holds a foreign key to a log line.

---

## § · Credentials

The goal is not “nothing visible in the browser.” Some values are public by design, and we cannot hide them. The goal is that the browser shows nothing *dangerous*.

> [!danger] The Firebase web apiKey is not a secret
>
> It must ship in the browser bundle, and Google documents it as public. It is an *identifier* (“this request is for the Roomsie project”), not a password. Security comes from these three items:
>
> - the authorized-domains allowlist
> - a token that our API accepts also needs a real Google sign-in
> - our API verifies each token.

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
> The Supabase `service_role` key bypasses Row Level Security fully. A leak of this key is a full database compromise: all profiles, messages and verification selfies. It never leaves `apps/api`.

### Two hard rules

- The build **compiles all items named `NEXT_PUBLIC_*` into the browser bundle**. That prefix is a public declaration. Never put a secret behind it.
- Secrets exist only in the environment of `apps/api`. They never go into `apps/web`: not in a config file, not in an env var and not through an import.

### Handling — where leaks actually happen

Leaks occur through people and process much more frequently than through code.

- Git ignores `.env*`. A committed `.env.example` documents each key with dummy values.
- Real values are in the env store of the provider and in CI secrets, **never in Slack or WhatsApp.** With four people, a shared vault is worth the setup time.
- `gitleaks` runs as a pre-commit hook. It finds the paste-into-the-wrong-file mistake before it becomes permanent git history.
- API logs redact `Authorization` headers. To log a token is to log a password.
- Before launch, rotate all values that anybody ever pasted into a chat, a screenshot or a shared laptop.

---

## → · Still open

> [!danger] The frontier is empty
>
> We settled and recorded all architectural decisions. We assume nothing silently.

### Carried forward

| Item | Where |
|---|---|
| Naming transform for the token generator | Blocked on `npx untitledui@latest tailwind`. Read the real theme.css. |
| Rebrand: at this time, the Brand ramp is Untitled UI blue and the fonts are Inter | Decision 11 · brand must stay different from `error` |
| Event retention & deletion policy (DPDP) | Decision 12 · design with the schema, not after |
| Playwright E2E on critical paths | Decision 13 · after the UI is stable |
| Product requirements — we deprecated PRD.md | Requirement claims in Decisions 07, 09, 12 need validation again |

Next: schema design. Then we build the base by hand, one piece at a time.
