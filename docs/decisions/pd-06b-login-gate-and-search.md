# PD6b — Where the login gate sits, and search

**Status:** Settled · **Date:** 2026-09-20 · **Deciders:** Yash

## Context

PD6 puts a full-screen chat with no skip before the split view. Search traffic
arrives on a page, not in the chat, and breaks this rule (hole 2, PD6c).

## Decision

A user must log in for **only two things**:

| Step | Login needed |
|---|---|
| Landing page, full-screen chat, split view | No |
| Scroll and filter the results | No |
| Open the details of one listing or person | **Yes** |
| Send a message to a person or a lister | **Yes** |

Search engines index the **area pages and the filter pages**:

- A visitor from search goes directly to the split view, with the filters of
  the page applied.
- The chat opens with **no history**. But the **form is not empty**: the area
  and intent slots get their values from the page.
- The assistant first confirms the values that it knows. It does not start
  with a cold question.

Three public layers, none of them the product:

1. **Area and intent pages.** The primary asset. Public, server-rendered,
   **aggregate data only**. If fewer than 20 active users or listings are in a
   cell, show a band, not the number. The pages update each month and never
   give a 404.
   - **1b Filter pages.** The same mechanism as layer 1, but narrower. Make
     them from actual search demand, not from all filter combinations.
2. **Editorial pages.** They link to the area pages. The blog is at
   `roomsie.com/blog`, not `blogs.roomsie.com`.
3. **The landing page and brand.** This layer is already in the plan: the
   hero, the narrative, and the call to action into the chat.

We do not use the gated-indexing route (`isAccessibleForFree: false` with
`hasPart`). We keep it in reserve.

## Rationale

- **No conflict remains.** The results grid had no gate from the start. Browse,
  chat and the split view are public, so the no-skip rule and SEO agree.
- **Listing pages were never the SEO asset.** They are thin: a rent, an area,
  some amenities. They change frequently and expire in 30 days. Expired pages
  cause 404s and link decay, and Google demotes them. When they rank, their data
  is not current. The portals also rank on area pages, not on flats. Thus, the gate
  is on a thing that would not bring traffic.
- **Aggregate area data is the moat.** No other company has it, and unique
  data ranks. The portals never ask what people who search Powai want in a
  flatmate. Area pages continue through market cycles.
- **The privacy rule** stops a small cell that shows data about one person.
- **Filter pages from demand only.** Thousands of almost empty permutation
  pages cause the thin-content problem again.
- **A warm start has more value than the page view.** A visitor on "Flatmates
  in Powai" told you their area and intent. This removes the two slowest turns
  of the interview.
- **Editorial content** is evergreen and cheap.
- **A subdirectory, not a subdomain.** Google treats a subdomain as a site that
  is not fully connected to the primary domain. Thus, its rank strength does
  not fully go to the primary domain. "blog" is the usual convention. A move
  after launch needs a redirect for each article.
- **Gated indexing is a risk.** An error makes it cloaking, which is a spam
  violation. The penalty is demotion or removal from the index. It would also
  put the incorrect pages in the index.

## Consequences

- The interview runs before login. The form needs an anonymous session id. At
  login, the form merges into the user record. S1 to S7 do not include this
  state.
- Anyone can spend the inference budget, and bots will find an open chat. The
  cost risk is volume and abuse, not unit cost. PD9 owns the controls:
  - rate limits for each device and network, because there is no user
  - an anonymous turn cap
  - a daily spend ceiling.
- Measure: the rank of each area page, chat starts from an area page, slots
  filled on arrival, and interview completion warm against cold.
- Area-page numbers need users, and at launch there are none.
- Superseded: the 2026-09-20 plan shipped area pages with area facts at launch.
  The 2026-09-23 launch plan moves SEO area pages to v1. The blog goes live as
  the alternative.

## Alternatives rejected

- **Index individual listing pages.**
- **Structured-data gated indexing.** Cloaking risk, and the incorrect pages.
- **A blog subdomain.** It does not pass full rank strength.

## Revisit when

roomsie publishes long-form gated content.

## Sources

- [CONTEXT.md](../../CONTEXT.md), PD6b row
- [product-base.md](../product-base.md), section 08
- [seo-with-gated-products.md](../seo-with-gated-products.md)
- [interface-shape.md](../interface-shape.md), hole 2
- [cost-and-team.md](../cost-and-team.md), "Where the real risk is"
- [launch-plan.md](../launch-plan.md), "What moves to after launch"
