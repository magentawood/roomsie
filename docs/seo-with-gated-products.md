# SEO when both products are gated

**Date:** 2026-09-20 · **Status:** proposed · **Closes:** hole 2, decision D6b

Both products, flats and flatmates, sit behind login. Nothing about them is
public. This document sets out how roomsie still gets found in search.

---

## The reframe

Gating the listings costs far less than it appears, because **individual
listing pages were never the SEO asset.**

Three reasons:

1. They are thin. A rent, an area, a few amenities.
2. They churn. roomsie listings expire after 30 days. That means 404s and link
   decay, which Google demotes.
3. They are stale by the time they rank. The flat is gone.

The portals do not rank on individual flats either. They rank on **area
pages**. So the thing you are gating is not the thing that was going to bring
you traffic.

---

## The plan: three public layers, none of them the product

### Layer 1 — Area and intent pages. The main asset.

Public, server-rendered, built from **aggregate data only**. One page per area
per intent.

Examples: "Flatmates in Powai", "Rooms for rent in Bandra East", "Flat sharing
in Andheri West".

What goes on the page:

| Block | Source |
|---|---|
| Median budget of people searching here | Aggregate over active seekers |
| How many are searching this month | Count, rounded |
| Typical move-in window | Aggregate |
| Rent bands, by room type | Aggregate over listings |
| Common lifestyle mix in the area | Aggregate over the nine axes |
| Nearby areas people also search | Co-occurrence |
| Commute and area description | Written once, evergreen |

**This data is the moat.** Nobody else has it. Unique data is what ranks. The
portals can publish rent averages. They cannot publish what people searching
Powai actually want in a flatmate, because they never ask.

**Privacy rule.** Aggregates only, with a minimum count per cell. If fewer than
20 active users or listings fall in a cell, suppress the number and show a
band. Without that, a small cell leaks an individual.

**Freshness rule.** These pages update monthly and never 404. They survive
market cycles, unlike a listing.

### Layer 2 — Editorial pages. The top of the funnel.

Most rental search volume is informational, not transactional. People search
how to do this before they search what is available.

Targets: how to find a flatmate in Mumbai, rental agreement checklist for
Maharashtra, deposit norms, police verification, Powai against Andheri for
young professionals, what to ask before moving in with a stranger.

Evergreen, cheap, and it feeds Layer 1 through internal links.

### Layer 3 — The landing page and brand.

Already planned. Hero, narrative, the call to action into chat.

---

## What every public page does

Ends in the same place: the chat.

**And it starts the interview warm.** A visitor arriving on "Flatmates in
Powai" has already told you their area and their intent. The chat opens with
those two slots filled and confirms them rather than asking cold.

That is worth more than the page view. It removes the two slowest turns of the
interview.

---

## The gated-indexing route, and why not to use it

Google does support indexing content that users cannot see. The method is
structured data: `isAccessibleForFree: false` plus a `hasPart` block with a
`cssSelector` marking the gated section, on `CreativeWork` or `NewsArticle`.

Two reasons to leave it alone:

1. **Get it wrong and it is cloaking.** Serving Googlebot content users cannot
   see is a spam violation unless the markup declares it correctly. The penalty
   is demotion or removal from the index.
2. **It would get you indexed on the wrong pages.** The whole point above is
   that listing pages are thin and churning. Succeeding at indexing them wins
   little.

Keep it in reserve. It is the right tool if roomsie ever publishes long-form
gated content.

---

## Measure

| Metric | Why |
|---|---|
| Ranking position per area page | The main asset working or not |
| Chat starts from an area page | The conversion that matters |
| Slots pre-filled on arrival | Whether warm starts actually help |
| Interview completion, warm against cold | Whether a pre-filled start converts better |

---

## Sources

- [Google structured data for paywalled content](https://developers.google.com/search/docs/appearance/structured-data/paywalled-content)
- [Cloaking risk without the markup](https://rankstudio.net/articles/en/paywalled-content-seo-cloaking)
- [Listing pages expire, create 404s and link decay](https://noseberry.com/blogs/seo/seo-for-property-listing-pages-why-most-real-estate-websites-lose-80-of-organic-traffic)
- [Neighbourhood pages are the cornerstone of real estate SEO](https://jefflenney.com/real-estate/seo-guide/)
