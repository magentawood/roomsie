# Search and the login gate

**Date:** 2026-09-20 · **Status:** decided · **Closes:** hole 2, decision D6b

---

## Where the login gate actually sits

Login is **not** required to browse. It is required for two things only:

1. Seeing the full details of one listing.
2. Contacting anyone.

Everything before that is public:

| Step | Login needed |
|---|---|
| Landing page | No |
| Full-screen chat | No |
| Split view, chat and listings | No |
| Scrolling and filtering results | No |
| Opening one listing's details | **Yes** |
| Messaging a person or a lister | **Yes** |

So the earlier conflict disappears. Area pages can be public and indexed,
because the results grid was never gated in the first place.

---

## What a visitor from Google gets

They land straight in the split view.

- The listings panel opens with the page's filters already applied. A visit to
  "Flats in Powai" opens the grid filtered to Powai.
- The chat opens with **no history**. It is a fresh conversation.
- But the **form is not empty.** The area and intent slots are filled from the
  page they arrived on.

**Form state and chat history are different things.** The transcript starts
blank. The form starts partly filled. The assistant opens by confirming what it
already knows rather than asking cold: "You were looking at Powai. What is your
budget?"

That removes the two slowest turns of the interview.

---

## The reframe on listing pages

Gating the listing *detail* costs far less than it appears, because
**individual listing pages were never the SEO asset.**

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

### Layer 1b — Filter pages

Same mechanism, narrower. "2 BHK in Andheri West", "Rooms under 15000 in
Powai". Each opens the split view with those filters set.

Build these from real search demand, not from every possible filter
combination. Thousands of near-empty permutation pages is the thin-content
problem all over again.

### Layer 2 — Editorial pages. The top of the funnel.

Most rental search volume is informational, not transactional. People search
how to do this before they search what is available.

Targets: how to find a flatmate in Mumbai, rental agreement checklist for
Maharashtra, deposit norms, police verification, Powai against Andheri for
young professionals, what to ask before moving in with a stranger.

Evergreen, cheap, and it feeds Layer 1 through internal links.

**Use `roomsie.com/blog`, not `blogs.roomsie.com`.** Google treats a subdomain
as a partly separate site, so ranking strength built on a blog subdomain does
not pass cleanly to the main domain. A subdirectory keeps it all on one domain.
Singular "blog" is also the convention. This is worth getting right at the
start, because moving it later means redirecting every article.

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

## The new cost this creates

The interview now runs **before login**. That has two consequences.

**Anonymous state.** The form exists before there is a user row. It needs an
anonymous session id, and that state has to merge into the user record on
login. This is not in the schema ledger's S1 to S7 and needs adding.

**Anyone can spend your inference budget.** An unauthenticated chat is open to
the world. Someone can burn money by talking to it, and bots will find it.
Needed before launch:

- Rate limit per device and per network, not per user, because there is no user
- A cap on turns in an anonymous session before login is asked for
- A cheaper model or a shorter context for anonymous turns
- A hard daily spend ceiling with a defined behaviour when it is hit

Tracked as decision D9.

---

## Sequencing

Layer 1 needs users, and at launch there are none. So:

| When | What |
|---|---|
| Launch | Landing page, editorial pages, area pages with area facts only |
| Once there are users | Add the aggregate numbers to the area pages |

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
