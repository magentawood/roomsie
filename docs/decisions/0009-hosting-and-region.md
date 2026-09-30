# ADR 0009 — Hosting and region

**Status:** Accepted · **Date:** 2026-09-11 · **Deciders:** Yash

## Context

`apps/api` (ADR 0003) is a long-running Node process. `apps/web` is a Next.js
app. Postgres is managed by Supabase (ADR 0005). All users are in one Indian
city.

## Decision

| Component | Where |
|---|---|
| Postgres (Supabase) | **Mumbai — `ap-south-1`** |
| `apps/api` | **Fly.io — `bom` (Mumbai)** |
| `apps/web` | **Vercel — functions pinned to `bom1` (Mumbai)** |

## Rationale

### 1. Region, and why it outranks the vendor

Every API request makes several round trips to Postgres, so the dominating
latency is not user→API, it is **API→database**.

| Setup | API→DB per query | Endpoint doing 5 queries |
|---|---|---|
| API Mumbai · DB Mumbai | ~1ms | ~5ms |
| API Singapore · DB Singapore | ~1ms | ~5ms |
| **API Singapore · DB Mumbai** | ~55ms | **~275ms wasted** |

The failure mode is not picking the wrong city — it is **splitting API and
database across regions**. Mumbai was chosen because every user is in one Indian
city, so a single region serves the entire audience with no multi-region
complexity.

**Postgres region is the sticky choice; compute follows it.** Moving `apps/api`
between hosts is an afternoon. Moving a Supabase project between regions is a
dump-and-restore with downtime.

Of the candidate hosts, only Fly.io has an Indian region. Render has none;
Railway has none confirmed. Vercel does offer `bom1`, so latency alone does not
separate Fly from Vercel.

### 2. Runtime — the argument that actually decided it

Serverless functions have **no shared memory between requests**. Nothing can be
buffered, batched, throttled or cached across requests; every request is an
island. Three places in our spec collide with that:

**Analytics ingestion** — the decisive one:

| | |
|---|---|
| Sessions/month at 5k WAU | ~65,000 |
| Events per session | ~150–200 |
| **Events/month** | **~10–13M** |
| Flushes per session (per spec) | ~50–80 |
| **HTTP requests for analytics alone** | **~4.2M/month** |

On a long-running process: an in-memory buffer batches inserts of ~500 over one
persistent connection. A traffic spike means more concurrent requests to the
same process; the database sees the same steady batched writes.

On serverless: every flush is an isolated invocation. A spike scales out to many
instances, each needing a connection, all arriving at the pooler at once. The
pooler queues, query latency climbs, and the swipe stack — the core interaction
— stutters. The fix is architectural, discovered under load.

**Rate limiting** — ~10 new conversations per user per day. A counter
in process, versus an external store round trip on every message send.

**Auto-suspend on report threshold** — wants a process continuously
watching. On serverless it becomes Cron → function → queue → function, shaped by
duration limits.

### 3. Where serverless is genuinely better, and we use it there

This is not a rejection of serverless. Read-heavy, cacheable, stateless work
suits it better than a single long-running machine:

| Workload | Requests/month | Cacheable | Best fit |
|---|---|---|---|
| Listings grid | ~500k | ✅ CDN | Serverless |
| Profile detail | ~300k | ✅ mostly | Serverless |
| Swipe queue | ~325k | ❌ personalised | Either |
| Analytics firehose | ~4.2M | ❌ write | Long-running |
| Rate limits | per message | ❌ stateful | Long-running |
| Background jobs | continuous | ❌ daemon | Long-running |

ADR 0007 already splits along this line: public pages server-rendered on Vercel
and CDN-cached, everything write-heavy behind `apps/api`. Each tool is used
where it is actually good.

### 4. Vendor risk versus coupling risk

| | Fly.io | Vercel |
|---|---|---|
| Revenue | $11.2M (2024) | $340M ARR (Feb 2026) |
| Employees | ~60 | ~1,011 |
| Customers | 37,000 | 1M+ monthly Next.js devs |
| Latest round | $25M Series D, Aug 2026 | Series F, Sept 2025, $9.3B |

Fly's Series D messaging reports agent-native customers at roughly two-thirds of
revenue among its largest, growing ~12× year on year. Fly is becoming an
AI-agent infrastructure company; general web hosting is a shrinking share of its
attention. That is a real risk.

But the artefact we deploy is a **Docker container**. If Fly disappoints, the
same image runs on Railway, Render, AWS or a VPS unchanged — an afternoon's
work. Vercel is the far safer company but produces code that runs nowhere else.

**The safer vendor carries the riskier coupling.** Of the two, only coupling
costs engineering time, because portability is what lets you respond to vendor
risk at all. Same posture as ADR 0001.

## Consequences

- `apps/api` needs a `Dockerfile` and `fly.toml`, and someone reads container
  logs when it misbehaves. This is the deliberate ops learning ADR 0001 deferred.
- Single machine initially: if it goes down we are down until it restarts.
  Acceptable pre-launch; running two machines later is a one-line config change.
- Vercel function region must be explicitly pinned to `bom1`, or SSR calls cross
  regions and silently reintroduce the 55ms problem.
- Supabase project must be created in `ap-south-1` at the start — changing it
  later means downtime.

## Alternatives rejected

- **Vercel `bom1` as a separate project.** Same region, near-zero setup, safest
  vendor. Rejected on the no-shared-memory problem: buffering, rate limiting and
  background jobs each need an additional service (Supavisor, Upstash, QStash),
  and Fastify needs an adapter. More vendors, hours and spend to reassemble what
  one process gives free.
- **Railway / Render in Singapore.** Long-running process with push-to-deploy
  simplicity and a vendor still focused on general app hosting. Rejected on
  region: ~50–70ms user latency instead of ~10–20ms, permanently.

## Revisit when

Fly's reliability or direction becomes a problem — at which point the container
moves to Railway, Render or AWS in an afternoon. Or when traffic justifies more
than one machine, which is a config change rather than a decision.
