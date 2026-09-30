# The corpus: 30 articles

**Date:** 2026-09-20 · **Owner:** marketing · **Status:** ready to write

These articles do three jobs at the same time:

1. **Feed the Advisor.** The answers to band 2b questions come only from the
   corpus. Without these articles, the assistant hands off and does not answer.
   See `docs/scope-policy.md`.
2. **Rank in search.** Most rental search volume is informational. See
   `docs/seo-with-gated-products.md`.
3. **Fill the gap before there are users.** The articles need no product and no
   data. Thus, we can write them at this time.

We publish the articles at `roomsie.com/blog`, not on a subdomain.

---

## Priority 1 — write these ten first

These articles answer the questions that the Advisor will most probably get.
The Advisor is also least able to improvise answers to these questions. Without
these articles, the Advisor hands off on the most important questions.

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

**Nobody covers this subject properly.** The portals write about
property. Only roomsie has a reason to write these articles. They rank on
queries with almost no competition. They are also the articles that people
send to a friend.

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

These articles are editorial pieces. They are not part of the programmatic
area pages, which use aggregate data. Write three articles. Find which article
ranks. Only then, decide if you will write twenty.

| # | Article | Serves |
|---|---|---|
| 28 | Powai for renters: commute, rent bands, who lives there | 2a |
| 29 | Andheri West or Bandra East: an honest comparison | 2a |
| 30 | Where to look in Mumbai on a ₹20,000 budget | 2a |

---

## Writing them so they do not read as machine-written

**Our honest position: a model should not write the draft.** A model can
check grammar. But it cannot give the exact details that make text read as
human, because it does not have them.

### What makes these read human

**Real numbers and real places.** Do not write "deposits can be substantial".
Write "a 1BHK in Chandivali quoted us ₹1.2 lakh deposit in August, and the
broker came down to ₹90,000 when we said we'd pay eleven months up front."
Exact details are the single strongest signal.

**Someone actually asked this.** Base each article on three to five real
conversations. Ask renters. Ask brokers. Ask people who moved very recently.
The questions that they ask, in their own words, become the headings.

**An opinion.** For example, say that brokerage above one month is not worth
the cost. Then say why. Neutral, hedged text that gives equal space to all
sides is the most recognisable machine tell there is.

**One thing only a local knows.** Each article must have one such fact. For
example, societies near Powai frequently ask for the company ID of each
occupant. Or, the queue at the registration office is shorter before eleven. A
model cannot generate these facts.

**A named author.** Give a byline, a photo, and a line about who the author
is. This reads as human. Also, search engines reward demonstrated first-hand
experience.

### The tells to avoid

- Openings like "In today's fast-paced world" or "Finding a flat can be
  daunting"
- Words like delve, navigate, robust, seamless, leverage, crucial
- "It's important to note that"
- All sections with the same length, and all lists with three items
- A last paragraph that says the opening again
- Headings that are perfectly parallel
- No opinion anywhere in the article
- Em dashes everywhere

### The process that works

1. Interview three to five people who have lived the topic. Record the
   interviews.
2. Write a messy first draft from those notes. Write it by hand, in one
   session.
3. Keep the untidy parts. A digression about a bad visit to a flat is what makes the
   article readable.
4. Use a model only to fix grammar and find errors. Never use a model to change
   the structure.
5. Give the draft to a person who rented in Mumbai. This person marks all text
   that does not agree with their experience.

---

## Writing them so the Advisor can use them

Each article has two readers: a person and a retrieval system. The retrieval
system has constraints that are not important to the person.

**Headings are questions, in the words people use.** "How much deposit will I
be asked for in Mumbai?" retrieves better than "Deposit considerations". It
also reads better.

**Every section stands alone.** Do not write "as we covered above". A retrieved
chunk has no context. Thus, a section that needs an earlier section is useless
after retrieval.

**State the answer before the explanation.** For example, write "two to three
months, usually negotiable" first, then the details. If a retrieved chunk puts
the answer in paragraph four, the system will cut the chunk before the answer.

**Date anything that changes.** For example, date stamp duty rates, deposit
norms, and registration fees. Put the date in the text, not only in the
metadata. Then the reader can see when an answer is not current.

**One topic for each article.** An article about deposits and notice periods
gives bad retrieval results for the two topics.

---

## After launch, the log writes the plan

The system logs all band 2 questions. For each question, the log shows if the
answer came from model knowledge. From then on, the log, sorted by frequency,
is the content plan.

These thirty articles are our guess before we have the log. Expect a third of
them to be incorrect about what people ask. Replace those articles with articles
from real demand.
