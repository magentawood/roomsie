# Search and the login gate

**Date:** 2026-09-20 · **Status:** decided · **Closes:** hole 2, decision PD6b

---

## Where the login gate actually sits

A user can browse with **no** login. Login is necessary for only two things:

1. To see the full details of one listing.
2. To contact a person.

All the steps before these two are public:

| Step | Login needed |
|---|---|
| Landing page | No |
| Full-screen chat | No |
| Split view, chat and listings | No |
| Scroll and filter the results | No |
| Open the details of one listing | **Yes** |
| Send a message to a person or a lister | **Yes** |

Thus, there is no longer a conflict between SEO and the login gate. Area pages can be public and indexed. The reason is that the results grid had no gate from the start.

---

## What a visitor from Google gets

The visitor goes directly to the split view.

- The listings panel opens with the filters of the page applied. For example, a visit to "Flats in Powai" opens the grid with the Powai filter.
- The chat opens with **no history**. It is a new conversation.
- But the **form is not empty.** The area and intent slots get their values from the page where the visitor arrived.

**The form state and the chat history are different things.** The transcript starts empty. The form starts with some values. Thus, the assistant does not start with a cold question. It first confirms the values that it knows: "You were looking at Powai. What is your budget?"

This removes the two slowest turns of the interview.

---

## The reframe on listing pages

A gate on the listing *detail* costs much less than it seems to cost. The reason is that **individual listing pages were at no time the SEO asset.**

There are three reasons:

1. They are thin. They show a rent, an area, and some amenities.
2. They change frequently. roomsie listings expire after 30 days. Thus, they cause 404s and link decay, and Google demotes pages with these problems.
3. When they rank, their data is not current. The flat is not available.

The portals also do not rank on individual flats. They rank on **area pages**. Thus, the gate is on a thing that would not bring you traffic.

---

## The plan: three public layers, none of them the product

### Layer 1 — Area and intent pages. The main asset.

These pages are public and server-rendered. They use **aggregate data only**. There is one page for each area and each intent.

Examples: "Flatmates in Powai", "Rooms for rent in Bandra East", "Flat sharing in Andheri West".

The page contains these blocks:

| Block | Source |
|---|---|
| Median budget of the people who search here | Aggregate of the active seekers |
| Number of people who search this month | Count, rounded |
| Usual move-in window | Aggregate |
| Rent bands, for each room type | Aggregate of the listings |
| Usual lifestyle mix in the area | Aggregate of the nine axes |
| Nearby areas that people also search | Co-occurrence |
| Commute and area description | Written one time, evergreen |

**This data is the moat.** No other company has it. Unique data is what ranks. The portals can publish rent averages. But they cannot publish what people who search Powai actually want in a flatmate. The reason is that the portals at no time ask this question.

**Privacy rule.** Show aggregates only, with a minimum count for each cell. If fewer than 20 active users or listings are in a cell, do not show the number. Show a band. Without this rule, a small cell shows data about one person.

**Freshness rule.** These pages update each month, and at no time do they give a 404. Unlike a listing, they continue through market cycles.

### Layer 1b — Filter pages

Filter pages use the same mechanism as Layer 1, but they are narrower. Examples: "2 BHK in Andheri West", "Rooms under 15000 in Powai". Each page opens the split view with its filters set.

Make these pages from real search demand. Do not make them from all possible filter combinations. Thousands of almost empty permutation pages cause the thin-content problem again.

### Layer 2 — Editorial pages. The top of the funnel.

Most rental search volume is informational, not transactional. People first search how to do it. Then they search what is available.

Targets:

- How to find a flatmate in Mumbai
- Rental agreement checklist for Maharashtra
- Deposit norms
- Police verification
- Powai against Andheri for young professionals
- What to ask before you move in with a stranger

This content is evergreen and cheap. It sends users to Layer 1 through internal links.

**Use `roomsie.com/blog`, not `blogs.roomsie.com`.** Google thinks of a subdomain as a site that is not fully connected to the primary domain. Thus, the ranking strength of a blog subdomain does not fully go to the primary domain. A subdirectory keeps all the content on one domain. Also, the singular "blog" is the usual convention.

It is important to make this decision correctly at the start. If you move the blog after the start, you must redirect all the articles.

### Layer 3 — The landing page and brand.

This layer is in the plan. It contains the hero, the narrative, and the call to action into the chat.

---

## What every public page does

All public pages end in the same location: the chat.

**Each page also starts the interview warm.** A visitor who arrives on "Flatmates in Powai" told you their area and their intent. The chat opens with these two slots filled. The assistant confirms them and does not start with a cold question.

This warm start has more value than the page view. It removes the two slowest turns of the interview.

---

## The gated-indexing route, and why not to use it

Google does support the indexing of content that users cannot see. The method is structured data: `isAccessibleForFree: false` plus a `hasPart` block with a `cssSelector` that marks the gated section, on `CreativeWork` or `NewsArticle`.

There are two reasons not to use this route:

1. **An error makes it cloaking.** If Googlebot gets content that users cannot see, this is a spam violation. The only exception is when the markup declares it correctly. The penalty is demotion or removal from the index.
2. **It would get you indexed on the incorrect pages.** The section above shows that listing pages are thin and change frequently. If Google indexes these pages, you get almost no benefit.

Keep this route in reserve. It is the correct tool if roomsie ever publishes long-form gated content.

---

## The new cost this creates

At this time, the interview runs **before login**. This has two results.

**Anonymous state.** The form exists before there is a user row. Thus, it needs an anonymous session id. At login, this state has to merge into the user record. The schema ledger's S1 to S7 do not include this state. You must add it.

**Anyone can spend your inference budget.** An unauthenticated chat is open to all people. A person can spend your money when they talk to it. Bots will find it. Before launch, these items are necessary:

- A rate limit for each device and each network, not for each user, because there is no user
- A maximum number of turns in an anonymous session before the chat asks for login
- A cheaper model or a shorter context for anonymous turns
- A hard daily spend ceiling, with a defined behaviour when the spend gets to the ceiling

Decision PD9 tracks these protections.

---

## Sequencing

Layer 1 needs users, and at launch there are no users. Thus:

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
