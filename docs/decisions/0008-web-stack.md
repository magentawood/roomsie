# ADR 0008 — apps/web stack

**Status:** Accepted · **Date:** 2026-09-10 · **Deciders:** Yash

## Context

The work in `~/Desktop/femmeflats-design/femmeflats` already has a landing
page, login, signup and browse screens. That work uses this stack:

```
next 16.3.3 · react 19.2.8 · tailwindcss v4 · typescript · app router
@fontsource/inter · @fontsource/playfair-display
```

That work is real and already paid for. A new decision about the styles would
discard it for no benefit.

## Decision

| Concern | Choice |
|---|---|
| Framework | Next.js 16, App Router |
| UI runtime | React 19 |
| Styling | **Tailwind CSS v4**, from the work that exists |
| Client data fetching | **TanStack Query** (authed app only) |
| Rendering split | Per ADR 0007 |

We port the pages from `femmeflats-design` into `apps/web`. We do not build
them again from `create-next-app`. The public server-rendered pages fetch data
on the Next server.

## Rationale for TanStack Query

The reasons are boilerplate and correctness, not the cache. The cache is a side
effect, and people give it too much importance.

Without TanStack Query, each fetch is ~15 lines of `useState`/`useEffect`,
including a cancellation guard. Without that guard, a response can arrive after
`id` changes and replace the new data with stale data.

**In a swipe stack, `id` changes at intervals of one or two seconds.** Thus, this
race is the primary interaction in the product, not an edge case. The user sees
it as "sometimes the wrong profile appears", a symptom that is expensive to
diagnose.

With TanStack Query, the same fetch is ~3 lines, and TanStack Query handles the
race.

| | |
|---|---|
| Expected components that fetch data in the authed app | ~30–40 |
| Lines that we save | ~400 |
| Possible race conditions that we remove | ~30–40 |
| Time to learn it | 1–2 hours (`useQuery`, `useMutation`, `invalidateQueries`) |
| Point where the savings and the cost are equal | ~5th endpoint |

TanStack Query also gives two functions that the product specially needs:

- **Prefetch of the next N cards**, so that the stack shows the cards
  immediately and does not stutter.
- **Optimistic accept/reject**, with automatic rollback.

**Where it costs us:** the query-key design and the invalidation strategy.
Careless work here gives stale-data bugs. Budget a small number of hours for it.

**Reversibility note:** different from ADRs 0001–0007, this decision is
genuinely reversible. But the cost is not the same in the two directions: to
adopt it at this time is almost free, and to migrate 40 components subsequently
is not. Thus, we adopt it at this time.

## Alternatives rejected

- **Plain `fetch` + `useState`.** It adds no dependency. But ~40 components
  must have hand-written loading state, there is no prefetch, and the developer
  must remember the cancellation guard each time.
- **SWR.** It is lighter, and it has good integration with Next. But its
  support for mutations and optimistic updates is weaker, and swipe
  accept/reject needs exactly this support.

## Revisit when

We do not expect to revisit this decision. The code that exists pins the styles
and the framework, and the data layer is reversible if it is unsatisfactory.
