# ADR 0009 — Hosting and region

**Status:** Accepted · **Date:** 2026-09-11 · **Deciders:** Yash

## Context

`apps/api` (ADR 0003) is a long-running Node process. `apps/web` is a Next.js
app. Supabase manages Postgres (ADR 0005). All users are in one Indian city.

## Decision

| Component | Where |
|---|---|
| Postgres (Supabase) | **Mumbai — `ap-south-1`** |
| `apps/api` | **Fly.io — `bom` (Mumbai)** |
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

The failure mode is not the incorrect city. It is **an API and a database in
different regions**. We chose Mumbai because all users are in one Indian city.
Thus, one region serves all the audience, with no multi-region complexity.

**The Postgres region is the choice that is not easy to change. Compute
follows it.** To move `apps/api` to a different host takes an afternoon. To
move a Supabase project to a different region is a dump-and-restore, with
downtime.

Of the candidate hosts, only Fly.io has an Indian region. Render has no Indian
region. Railway has no confirmed Indian region. Vercel does offer `bom1`. Thus,
latency alone does not make Fly different from Vercel.

### 2. Runtime — the argument that actually decided it

Serverless functions have **no shared memory between requests**. Thus, no
function can buffer, batch, throttle or cache data across requests. Each
request is an island. Three items in our spec conflict with this limit.

**Analytics ingestion.** This item is the decisive one:

| | |
|---|---|
| Sessions/month at 5k WAU | ~65,000 |
| Events for each session | ~150–200 |
| **Events/month** | **~10–13M** |
| Flushes for each session (from the spec) | ~50–80 |
| **HTTP requests only for analytics** | **~4.2M/month** |

On a long-running process, an in-memory buffer batches inserts of ~500. It
sends them through one connection that stays open. A traffic spike causes more
concurrent requests to the same process. But the database gets the same stable
batched writes.

On serverless, each flush is an isolated invocation. A spike makes the function
scale to many instances. Each instance needs a connection, and all the
connections arrive at the pooler at the same time. Then the pooler queues them,
and the query latency increases. Thus, the swipe stack stutters, and the swipe
stack is the core interaction. The fix is architectural, and we discover the
problem under load.

**Rate limiting.** The limit is ~10 new conversations for each user each day. A
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
`apps/api`. Thus, we use each tool where it is actually good.

### 4. Vendor risk versus coupling risk

| | Fly.io | Vercel |
|---|---|---|
| Revenue | $11.2M (2024) | $340M ARR (Feb 2026) |
| Employees | ~60 | ~1,011 |
| Customers | 37,000 | 1M+ monthly Next.js devs |
| Latest round | $25M Series D, Aug 2026 | Series F, Sept 2025, $9.3B |

In its Series D statements, Fly reports that agent-native customers are
approximately two-thirds of the revenue from its largest customers. These
customers grow ~12× year on year. Fly changes into an AI-agent infrastructure
company. The part of its attention for general web hosting decreases. That is a
real risk.

But the artefact that we deploy is a **Docker container**. If Fly is not
satisfactory, the same image runs with no change on Railway, Render, AWS or a
VPS. This move is the work of an afternoon. Vercel is the much safer company.
But Vercel produces code that runs on no other platform.

**The safer vendor carries the riskier coupling.** Of the two risks, only
coupling costs engineering time. The reason is that portability is the thing
that lets you respond to vendor risk at all. This is the same posture as ADR
0001.

## Consequences

- `apps/api` needs a `Dockerfile` and `fly.toml`. When it does not operate
  correctly, a person reads the container logs. This is the deliberate ops
  learning that ADR 0001 deferred.
- At first, there is a single machine. If it stops, we are down until it starts
  again. Before launch, we accept this. Subsequently, to run two machines is
  a one-line config change.
- You must explicitly pin the Vercel function region to `bom1`. If you do not,
  SSR calls cross regions, and they silently bring back the 55ms problem.
- You must create the Supabase project in `ap-south-1` at the start. A
  subsequent change of region causes downtime.

## Alternatives rejected

- **Vercel `bom1` as a separate project.** It has the same region, almost zero
  setup, and the safest vendor. We rejected it because of the no-shared-memory
  problem. Buffering, rate limiting and background jobs each need one more
  service (Supavisor, Upstash, QStash). Also, Fastify needs an adapter. Thus,
  we need more vendors, hours and money to assemble again what one process
  gives free.
- **Railway / Render in Singapore.** These give a long-running process with
  push-to-deploy simplicity. Their vendors continue to focus on general app hosting.
  We rejected them because of the region. The user latency is ~50–70ms, not
  ~10–20ms, and this is permanent.

## Revisit when

Revisit this decision when the reliability or the direction of Fly becomes a
problem. Then the container moves to Railway, Render or AWS in an afternoon.
Also revisit it when the traffic justifies more than one machine. That change
is a config change, not a decision.
