# ADR 0009 — Hosting and region

**Status:** Accepted · **Date:** 2026-09-11 · **Deciders:** Yash

## Context

- `apps/api` (ADR 0003) is a long-running Node process.
- `apps/web` is a Next.js app.
- Supabase manages Postgres (ADR 0005).
- All users are in one Indian city.

## Decision

**In one line:** Postgres, `apps/api` and the `apps/web` functions all run in Mumbai: Supabase `ap-south-1`, AWS Lightsail containers `ap-south-1` and Vercel `bom1`.

| Component | Where |
|---|---|
| Postgres (Supabase) | **Mumbai — `ap-south-1`** |
| `apps/api` | **AWS Lightsail containers — `ap-south-1` (Mumbai)** |
| `apps/web` | **Vercel — functions pinned to `bom1` (Mumbai)** |

## Rationale

### 1. Region, and why it outranks the vendor

Each API request makes several round trips to Postgres. Thus, the largest
latency is not user→API. It is **API→database**.

| Setup | API→DB for each query | Endpoint with 5 queries |
|---|---|---|
| API Mumbai · DB Mumbai | ~1ms | ~5ms |
| API Singapore · DB Singapore | ~1ms | ~5ms |
| **API Singapore · DB Mumbai** | ~55ms | **~275ms wasted** |

- The failure mode is not the incorrect city. It is **an API and a database in
  different regions**.
- We chose Mumbai because all users are in one Indian city. One region serves
  all the audience, with no multi-region complexity.
- **The Postgres region is the choice that is not easy to change. Compute
  follows it.** To move `apps/api` to a different host takes an afternoon. To
  move a Supabase project to a different region is a dump-and-restore, with
  downtime.
- Fly.io, Render and Railway accept no new machines in India. Vercel does
  offer `bom1`. Lightsail containers run in `ap-south-1`, the AWS region of
  Supabase. Thus, latency alone does not make Lightsail different from Vercel.

### 2. Runtime — the argument that actually decided it

| | Lightsail container | Vercel |
|---|---|---|
| Model | Always-on container | Function instances (Fluid reuse) |
| Cold starts | None | Fewer, not zero |
| Max duration | No limit | 300s (800s paid) |
| Persistent worker | Run it | None: Cron + queue |
| DB connections | Long-lived pool | Supabase pooler |
| Fastify | Native | Adapter |
| Portability | Runs anywhere | Vercel-shaped code |
| Cost | ~$7/mo fixed | For each invocation |

Serverless functions have **no shared memory between requests**. Thus, no
function can buffer, batch, throttle or cache data across requests. This is the
whole con of serverless. All else follows. Three items
in our spec conflict with this limit.

**Analytics ingestion.** This item is the decisive one. The spec (§3.1) flushes a per-card lifecycle on each decision:

| | |
|---|---|
| Sessions/month at 5k WAU | ~65,000 |
| Events for each session | ~150–200 |
| **Events/month** | **~10–13M** |
| Flushes for each session (from the spec) | ~50–80 |
| **HTTP requests only for analytics** | **~4.2M/month** |

- **Long-running process:** an in-memory buffer batches inserts of ~500 and
  sends them through one connection that stays open. A traffic spike causes
  more concurrent requests to the same process, but the database gets the same
  stable batched writes.
- **Serverless:** each flush is an isolated invocation. A spike makes the
  function scale to many instances. Each instance needs a connection, and all
  the connections arrive at the pooler at the same time. Then the pooler queues
  them, and the query latency increases. Thus, the swipe stack, the core
  interaction, stutters. The fix is architectural, and we discover the problem
  under load.

**Rate limiting.** The spec (§8.2) limit is ~10 new conversations for each user each day. A
long-running process keeps a counter in the process. Serverless needs a round
trip to an external store each time a user sends a message.

**Auto-suspend on report threshold.** This function needs a process that
monitors continuously. On serverless, it becomes Cron → function → queue →
function, and duration limits control its shape.

### 3. Where serverless is genuinely better, and we use it there

We do not reject serverless. For read-heavy, cacheable and stateless work,
serverless is better than a single long-running machine:

| Workload | Requests/month | Cacheable | Best fit |
|---|---|---|---|
| Listings grid | ~500k | ✅ CDN | Serverless |
| Profile detail | ~300k | ✅ mostly | Serverless |
| Swipe queue | ~325k | ❌ personalised | Either |
| Analytics firehose | ~4.2M | ❌ write | Long-running |
| Rate limits | for each message | ❌ stateful | Long-running |
| Background jobs | continuous | ❌ daemon | Long-running |

ADR 0007 already divides the work along this line. Vercel server-renders the
public pages, and the CDN caches them. All write-heavy work goes behind
`apps/api`.

### 4. Vendor risk versus coupling risk

- **The artefact that we deploy is a Docker container.** It runs with no
  change on Lightsail, Fly, Railway, Render or a VPS.
- **This portability already paid.** The first choice was Fly.io `bom`. In
  October 2026, Fly accepted no new machines in `bom`, and the same image moved
  to Lightsail in one ticket (T-04).
- **Vercel is a safe company,** but it produces code that runs on no other
  platform.

**The safer vendor carries the riskier coupling.** Of the two risks, only
coupling costs engineering time, because portability is the thing that lets you
respond to vendor risk at all. This is the same posture as ADR 0001.

## Consequences

- `apps/api` needs a `Dockerfile` and a deploy workflow. When it does not
  operate correctly, a person reads the container logs. This is the deliberate ops
  learning that ADR 0001 deferred.
- At first, there is a single machine. If it stops, we are down until it starts
  again. Before launch, we accept this. Subsequently, to run two machines is
  a one-line config change.
- Lightsail has no secret store. Each deployment carries the API secrets from
  the CI secret store ([ADR-0016](0016-credentials-and-secrets.md)).
- You must explicitly pin the Vercel function region to `bom1`. If you do not,
  SSR calls cross regions, and they silently bring back the 55ms problem.
- You must create the Supabase project in `ap-south-1` at the start. A
  subsequent change of region causes downtime.

## Alternatives rejected

- **Vercel `bom1` as a separate project.** Same region and almost zero setup.
  Rejected because of the no-shared-memory problem: buffering, rate limiting
  and background jobs each need one more service (Supavisor, Upstash, QStash),
  and Fastify needs an adapter. Thus, we need more vendors, hours and money to
  assemble again what one process gives free.
- **Railway / Render in Singapore.** A long-running process with push-to-deploy
  simplicity, from vendors that continue to focus on general app hosting.
  Rejected because of the region: the user latency is ~50–70ms, not ~10–20ms,
  and this is permanent.
- **Fly.io `sin` with Supabase and Vercel also in Singapore.** API and database
  stay together, but each user request gets the same ~50–70ms. Rejected for the
  same reason.
- **Google Cloud Run in Mumbai.** A CPU that is always on costs ~$50/month.
  Rejected because of the budget ([PD5](pd-05-team-and-budget.md)).

## Revisit when

- The reliability or the price of Lightsail becomes a problem.
- The traffic justifies more than one machine.

Superseded (2026-09-20): the product has no swipe stack or swipe queue. It starts with the assistant ([PD6](pd-06-interface-shape.md)). The region and hosting choice does not change.

Superseded (2026-10-06): Fly.io `bom` for `apps/api`. Fly accepts no new machines in `bom`, so the API moved to Lightsail in `ap-south-1` (T-04).
