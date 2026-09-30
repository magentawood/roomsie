# Search and the login gate

**Date:** 2026-09-20 · **Status:** decided · **Closes:** hole 2, decision PD6b

---

## Where the login gate actually sits

A user can browse with **no** login. Login is necessary for only two things:

| Step | Login needed |
|---|---|
| Landing page | No |
| Full-screen chat | No |
| Split view, chat and listings | No |
| Scroll and filter the results | No |
| Open the details of one listing | **Yes** |
| Send a message to a person or a lister | **Yes** |

Area pages can be public and indexed.

Why: [PD6b](decisions/pd-06b-login-gate-and-search.md)

---

## What a visitor from Google gets

- The visitor goes directly to the split view.
- The listings panel opens with the filters of the page applied.
- The chat opens with **no history**.
- But the **form is not empty.** The area and intent slots get their values from the page where the visitor arrived.
- **The form state and the chat history are different things.**
- The assistant first confirms the values that it knows. It does not start with a cold question.

Why: [PD6b](decisions/pd-06b-login-gate-and-search.md)

---

## The reframe on listing pages

roomsie listings expire after 30 days.

Why: [PD6b](decisions/pd-06b-login-gate-and-search.md)

---

## The plan: three public layers, none of them the product

### Layer 1 — Area and intent pages. The main asset.

- Public and server-rendered
- **Aggregate data only**
- One page for each area and each intent

| Block | Source |
|---|---|
| Median budget of the people who search here | Aggregate of the active seekers |
| Number of people who search this month | Count, rounded |
| Usual move-in window | Aggregate |
| Rent bands, for each room type | Aggregate of the listings |
| Usual lifestyle mix in the area | Aggregate of the nine axes |
| Nearby areas that people also search | Co-occurrence |
| Commute and area description | Written one time, evergreen |

**Privacy rule.** Show aggregates only, with a minimum count for each cell. If fewer than 20 active users or listings are in a cell, do not show the number. Show a band.

**Freshness rule.** These pages update each month. They at no time give a 404.

Why: [PD6b](decisions/pd-06b-login-gate-and-search.md)

### Layer 1b — Filter pages

- The same mechanism as Layer 1, but narrower.
- Each page opens the split view with its filters set.
- Make these pages from actual search demand, not from all possible filter combinations.

Why: [PD6b](decisions/pd-06b-login-gate-and-search.md)

### Layer 2 — Editorial pages. The top of the funnel.

Targets:

- How to find a flatmate in Mumbai
- Rental agreement checklist for Maharashtra
- Deposit norms
- Police verification
- Powai against Andheri for young professionals
- What to ask before you move in with a stranger

These pages send users to Layer 1 through internal links.

**Use `roomsie.com/blog`, not `blogs.roomsie.com`.**

Why: [PD6b](decisions/pd-06b-login-gate-and-search.md)

### Layer 3 — The landing page and brand.

This layer is already in the plan: the hero, the narrative, and the call to action into the chat.

---

## What every public page does

- All public pages end in the same location: the chat.
- Each page also starts the interview warm.

Why: [PD6b](decisions/pd-06b-login-gate-and-search.md)

---

## The gated-indexing route, and why not to use it

- **Method:** structured data. `isAccessibleForFree: false` plus a `hasPart` block with a `cssSelector` that marks the gated section, on `CreativeWork` or `NewsArticle`.
- **Do not use this route.**
- Keep it in reserve. It is the correct tool if roomsie ever publishes long-form gated content.

Why: [PD6b](decisions/pd-06b-login-gate-and-search.md)

---

## The new cost this creates

At this time, the interview runs **before login**.

**Anonymous state:**

- The form exists before there is a user row. Thus, it needs an anonymous session id.
- At login, this state has to merge into the user record.
- The schema ledger's S1 to S7 do not include this state. You must add it.

**Anyone can spend your inference budget.** Before launch, these items are necessary:

- A rate limit for each device and each network, not for each user
- A maximum number of turns in an anonymous session before the chat asks for login
- A cheaper model or a shorter context for anonymous turns
- A hard daily spend ceiling, with a defined behaviour when the spend gets to the ceiling

Decision PD9 tracks these protections.

Why: [PD6b](decisions/pd-06b-login-gate-and-search.md), [PD9](decisions/pd-09-pre-login-limits.md)

---

## Sequencing

Layer 1 needs users, and at launch there are no users.

| When | What |
|---|---|
| Launch | Landing page, editorial pages, and area pages with area facts only |
| When there are users | Add the aggregate numbers to the area pages |

---

## Measure

| Metric | Why |
|---|---|
| Ranking position for each area page | Shows if the main asset works |
| Chat starts from an area page | The conversion that is important |
| Slots pre-filled on arrival | Shows if warm starts actually help |
| Interview completion, warm against cold | Shows if a pre-filled start converts better |

---

## Sources

- [Google structured data for paywalled content](https://developers.google.com/search/docs/appearance/structured-data/paywalled-content)
- [Cloaking risk without the markup](https://rankstudio.net/articles/en/paywalled-content-seo-cloaking)
- [Listing pages expire, create 404s and link decay](https://noseberry.com/blogs/seo/seo-for-property-listing-pages-why-most-real-estate-websites-lose-80-of-organic-traffic)
- [Neighbourhood pages are the cornerstone of real estate SEO](https://jefflenney.com/real-estate/seo-guide/)
