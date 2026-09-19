# ADR 0008 — apps/web stack

**Status:** Accepted · **Date:** 2026-09-10 · **Deciders:** Yash

## Context

Existing work in `~/Desktop/femmeflats-design/femmeflats` already contains a
landing page, login, signup and browse screens built on:

```
next 16.3.3 · react 19.2.8 · tailwindcss v4 · typescript · app router
@fontsource/inter · @fontsource/playfair-display
```

That is real work already paid for. Re-litigating styling would discard it for
no benefit.

## Decision

| Concern | Choice |
|---|---|
| Framework | Next.js 16, App Router |
| UI runtime | React 19 |
| Styling | **Tailwind CSS v4** — carried over from existing work |
| Client data fetching | **TanStack Query** (authed app only) |
| Rendering split | Per ADR 0007 |

Existing pages from `femmeflats-design` are ported into `apps/web` rather than
rebuilt from `create-next-app`.

**TanStack Query is used only in the client-rendered authed app.** The public
server-rendered pages fetch on the Next server and do not use it.

## Rationale for TanStack Query

Caching is not the reason — that is a side effect people over-index on. The
reason is boilerplate and correctness.

Without it, every fetch is ~15 lines of `useState`/`useEffect` including a
cancellation guard. Without that guard, a response that lands after `id` has
changed overwrites fresh data with stale data. **In a swipe stack `id` changes
every second or two**, so this race is the main interaction in the product, not
an edge case — and it presents as "sometimes the wrong profile appears," which
is expensive to diagnose.

With it, the same fetch is ~3 lines and the race is handled.

| | |
|---|---|
| Fetching components expected across the authed app | ~30–40 |
| Lines saved | ~400 |
| Race-condition opportunities removed | ~30–40 |
| Learning cost | 1–2 hours (`useQuery`, `useMutation`, `invalidateQueries`) |
| Break-even | ~5th endpoint |

It also gives two things the product specifically needs: **prefetching the next
N cards** so the stack feels instant rather than stuttering, and **optimistic
accept/reject** with automatic rollback.

**Where it costs us:** query-key design and invalidation strategy. Sloppiness
there produces stale-data bugs. Budget a few hours.

**Reversibility note:** unlike ADRs 0001–0007 this decision is genuinely
reversible, but asymmetrically — adopting now is nearly free, migrating 40
existing components later is not. Hence adopting now.

## Alternatives rejected

- **Plain `fetch` + `useState`** — no dependency, but hand-written loading state
  in ~40 components, no prefetch, and the cancellation guard must be remembered
  every time.
- **SWR** — lighter and well integrated with Next, but weaker mutation and
  optimistic-update support, which is exactly what swipe accept/reject needs.

## Revisit when

Not expected. Styling and framework are pinned by existing code; the data layer
is reversible if it proves a poor fit.
