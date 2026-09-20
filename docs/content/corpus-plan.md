# The corpus: 30 articles

**Date:** 2026-09-20 · **Owner:** marketing · **Status:** ready to write

These do three jobs at once:

1. **Feed the Advisor.** Band 2b questions are corpus-only. Without these, the
   assistant hands off instead of answering. See `docs/scope-policy.md`.
2. **Rank in search.** Most rental search volume is informational. See
   `docs/seo-with-gated-products.md`.
3. **Fill the gap before there are users.** They need no product and no data,
   so they can be written now.

Published at `roomsie.com/blog`, not a subdomain.

---

## Priority 1 — write these ten first

These answer the questions the Advisor is most likely to be asked and least
able to improvise. Without them it hands off on the questions that matter most.

| # | Article | Serves |
|---|---|---|
| 1 | Leave and licence in Maharashtra, and why it is not a lease | 2b |
| 2 | Registering a rent agreement in Maharashtra: cost, process, who pays | 2b |
| 3 | Stamp duty on a Mumbai rent agreement, and how it is worked out | 2b |
| 4 | Getting your deposit back: what the agreement needs to say | 2b |
| 5 | What a landlord can and cannot deduct from a deposit | 2b |
| 6 | Notice periods: what is standard and what is actually enforceable | 2b |
| 7 | Police verification for tenants in Mumbai | 2b |
| 8 | Society NOC, and how a building can block your tenancy | 2b |
| 9 | Brokerage in Mumbai: what is normal, who pays, what is negotiable | 2b |
| 10 | What a Mumbai deposit actually costs, by area | 2a / 2b |

## Priority 2 — money and the practical stuff

| # | Article | Serves |
|---|---|---|
| 11 | The real cost of moving into a flatshare: the full list | 2a |
| 12 | Maintenance charges: who pays and what they cover | 2a |
| 13 | How flatmates split bills without falling out | 2a |
| 14 | What to check on a flat visit: a twenty-minute walkthrough | 2a |
| 15 | Red flags in a rental listing | 2a |
| 16 | How to spot a fake listing or a bait and switch | 2a |
| 17 | Your first week in a new flat: what to sort immediately | 2a |
| 18 | Renting in Mumbai as a single person or as a group | 2b |
| 19 | What to do if the landlord wants you out early | 2b |
| 20 | Furnished, semi-furnished, unfurnished: what you actually get | 2a |

## Priority 3 — flatmates, which is where you win

**Nobody covers this properly.** The portals write about property. These are
the articles only roomsie has a reason to write, they rank on queries with
almost no competition, and they are the ones people send to a friend.

| # | Article | Serves |
|---|---|---|
| 21 | The conversations to have before you sign with someone | 2a |
| 22 | How to talk about money with a prospective flatmate | 2a |
| 23 | What actually breaks flatshares: guests, cleaning, noise, money | 2a |
| 24 | Living with someone whose hours are the opposite of yours | 2a |
| 25 | Sharing a kitchen when you eat differently | 2a |
| 26 | When a flatmate leaves early: what happens to the deposit | 2b |
| 27 | How to leave a flatshare well | 2a |

## Priority 4 — Mumbai, three to start

Editorial pieces, separate from the programmatic area pages built on aggregate
data. Write three, see which ranks, then decide whether to write twenty.

| # | Article | Serves |
|---|---|---|
| 28 | Powai for renters: commute, rent bands, who lives there | 2a |
| 29 | Andheri West or Bandra East: an honest comparison | 2a |
| 30 | Where to look in Mumbai on a ₹20,000 budget | 2a |

---

## Writing them so they do not read as machine-written

**The honest position: a model should not write the draft.** It can check
grammar. It cannot produce the specifics that make writing read as human,
because it does not have them.

### What makes these read human

**Real numbers and real places.** Not "deposits can be substantial" but "a 1BHK
in Chandivali quoted us ₹1.2 lakh deposit in August, and the broker came down
to ₹90,000 when we said we'd pay eleven months up front." Specificity is the
single strongest signal.

**Someone actually asked this.** Base each article on three to five real
conversations. Ask renters, ask brokers, ask people who have just moved. The
questions they ask in their own words become the headings.

**An opinion.** Say brokerage above one month is not worth paying, and say why.
Neutral hedged coverage of every side is the most recognisable machine tell
there is.

**One thing only a local knows.** Per article. That societies near Powai often
ask for the company ID of every occupant. That the registration office queue is
shorter before eleven. These cannot be generated.

**A named author.** A byline, a photo, a line about who they are. Reads human,
and search engines reward demonstrated first-hand experience.

### The tells to avoid

- Openings like "In today's fast-paced world" or "Finding a flat can be
  daunting"
- Words like delve, navigate, robust, seamless, leverage, crucial
- "It's important to note that"
- Every section the same length, every list three items long
- A closing paragraph that restates the opening
- Perfectly parallel headings
- No opinion anywhere
- Em dashes everywhere

### The process that works

1. Interview three to five people who have lived the topic. Record it.
2. Write a messy first draft from those notes, in one sitting, by hand.
3. Leave the untidy bits. A digression about a bad viewing is what makes it
   readable.
4. Use a model only to fix grammar and catch errors, never to restructure.
5. Have someone who has rented in Mumbai read it and mark anything that does
   not match their experience.

---

## Writing them so the Advisor can use them

Two readers: a person and a retrieval system. The second imposes constraints
the first does not mind.

**Headings are questions, in the words people use.** "How much deposit will I
be asked for in Mumbai?" retrieves better than "Deposit considerations", and
reads better too.

**Every section stands alone.** No "as we covered above". A retrieved chunk
arrives with no context, so a section that depends on an earlier one is useless
once retrieved.

**State the answer before the explanation.** Two to three months, usually
negotiable, then the detail. A retrieved chunk that buries the answer in
paragraph four will be cut off before it reaches it.

**Date anything that changes.** Stamp duty rates, deposit norms, registration
fees. Put the date in the text, not only in the metadata, so a stale answer is
visible as stale.

**One topic per article.** An article covering deposits and notice periods
retrieves badly for both.

---

## After launch, the log writes the plan

Every band 2 question gets logged, flagged for whether it fell through to model
knowledge. That log, sorted by frequency, is the content plan from then on.

These thirty are the guess you make before you have the log. Expect a third of
them to be wrong about what people ask, and replace those from real demand.
