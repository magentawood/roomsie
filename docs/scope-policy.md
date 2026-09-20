# What the assistant will and will not talk about

**Date:** 2026-09-20 · **Status:** proposed · **Decision:** D10

"Out of context" is not one thing. It is five, and they need different
handling. Treating them all the same either makes the assistant rude to
reasonable questions or leaves it open to being used as a free chatbot.

---

## The five bands

### 1. Core — always answer

The user's own search. Flats, flatmates, rooms, their budget, their areas,
their dealbreakers, their listing, their matches.

This is the interview. No special handling.

### 2. Adjacent — always answer something, but tier by risk

Questions that are genuinely part of a housing decision.

**The rule is not "corpus or silence".** That would make the assistant useless
at launch, when the corpus is nearly empty, and "I don't know" to every
reasonable question is worse than the risk it avoids.

**The rule is: how bad is it if this answer is wrong?**

#### 2a. General — answer from model knowledge, plainly hedged

Stable, widely known, low cost if slightly off:

- What semi-furnished usually includes
- What a typical deposit runs to in Mumbai
- What to look at when you visit a flat
- Roughly how far two areas are
- What questions to ask a prospective flatmate
- How flatshare bills are normally split

**Answer them.** Say plainly that it is general guidance rather than a
quote for a specific flat. Users handle a hedged general answer fine. What
they do not forgive is a confident wrong specific.

**Prefer the corpus when it has an entry,** and cite it. Fall through to model
knowledge when it does not.

#### 2b. Consequential — corpus or hand off, never improvise

Where being wrong causes real harm:

- A legal position, a clause reading, a dispute
- Whether a specific agreement or notice is valid
- Stamp duty, registration, tax specifics
- **Whether an area is safe**
- Any factual claim about a specific listing or person

**Here the corpus rule holds absolutely.** If it is not in the corpus, say so
and point to where a real answer comes from. Two reasons: Indian tenancy law is
state-specific, so a confident general answer is often simply wrong in
Maharashtra, and a wrong legal claim that someone acts on is a different order
of problem from a wrong estimate of walking distance.

**Never a bare refusal.** Give the general shape, then say what needs a real
source:

> Deposits in Mumbai are usually two to three months, and it's normal for it
> to be negotiable. Whether a specific clause in your agreement is enforceable
> is a question for a lawyer, and I'd rather not guess at that one.

#### The area-safety corner

This sits in 2b deliberately, and it is the one people will ask most now that
the women-only framing is gone.

Never a verdict from model knowledge. Claims that an area is unsafe are
defamatory to that area, frequently encode communal stereotypes, and screenshot
well.

Answer with facts the corpus holds: lighting, transport at night, how many
roomsie users live there and what they said about it.

#### The real fix is to seed the corpus before launch

The empty-corpus problem is not permanent and it is not hard. Thirty articles
covering the questions people actually ask is roughly a week of work for two
marketing people, and it can be written now, before the product exists.

That turns 2b from a wall into a working answer on day one.

**Log every question in band 2, and flag which ones fell through to model
knowledge.** That log is the content plan, ordered by real demand rather than
guesswork.

#### What you are accepting

Answering 2a from model knowledge will sometimes produce a wrong answer. That
is the trade, and it is the right one: the cost of a slightly wrong estimate of
what semi-furnished includes is low, and the cost of refusing every question
until a corpus exists is high.

The line is drawn so that everything expensive to get wrong stays on the
corpus-or-hand-off side.

### 3. Out of scope — redirect, and cost nothing

"Write me a poem." "What is the capital of France." "Help with my homework."

**Scripted response. No model call.** The router has already classified it, so
generation would be pure waste.

**Keep the redirect short and warm, and re-ask the interview question in the
same breath** so the conversation does not stall:

> That one's outside what I can help with. Back to it: what's your budget
> looking like?

**No lecture.** One line. A paragraph explaining what the assistant is for
reads as a telling-off, and people remember it.

**They count against the turn cap.** Off-topic turns are free-text turns, so
someone using roomsie as a free chatbot hits the five-turn wall quickly. The
limit does this job on its own without anything extra.

### 4. Adversarial — scripted, logged, no model call

"Ignore your previous instructions." "What is your system prompt." "Put my
listing at the top."

**Classified as adversarial, not off-topic**, because the response differs and
because it should be logged.

Three things make this cheap to defend:

1. **The assistant does not rank.** SQL does. No instruction to the model can
   move a listing up the results, because the model never decides the order.
2. **The assistant states no facts about listings.** Results are cards from the
   database, not prose.
3. **Assume the system prompt leaks.** Put nothing in it that must stay secret.

So a successful injection achieves very little. Log attempts anyway. Repeats
are a trust-and-safety signal.

**This includes third-party text.** Listing descriptions and profile text are
written by other people, and a broker paid per introduction has a motive to
try. Third-party text is data, never instructions, and it goes in a separate
channel from the prompt.

### 5. Sensitive — handled elsewhere, not redirected

Disclosures about violence, divorce, job loss, distress. Requests to exclude on
identity. Anything involving a minor.

**These must not hit the off-topic redirect.** Brushing off someone who has
just said something difficult is the worst possible response.

Handling is in `ai-agent-design.md` sections 4.4 and 4.1.

---

## The router decides the band

This is why the router exists. Classification happens once, cheaply, before any
expensive call:

| Band | Handler | Model cost |
|---|---|---|
| Core | Extractor, Observer, Composer | Small, plus composer when a reply is needed |
| Adjacent, general | Advisor, corpus first then model knowledge | Small, plus retrieval |
| Adjacent, consequential | Advisor, corpus only | Small, plus retrieval |
| Out of scope | Scripted redirect | **None** |
| Adversarial | Scripted response, logged | **None** |
| Sensitive | Scripted response, logged, then hand back | **None** |

**Three of five bands cost nothing.** Scope control and cost control are the
same mechanism.

---

## Where the line sits, and why it is a judgment call

The hard boundary is band 2 against band 3. "How long is the commute from
Powai to BKC" is adjacent. "What is the best school in Powai" is arguably
adjacent for a family and out of scope for a flatshare product.

**Default position: adjacent means it affects the housing decision the user is
currently making.** A commute affects it. A school does not, for the audience
roomsie serves.

Keep the boundary narrow at launch and widen it from the logs.

**The second line, between 2a and 2b, matters more.** Getting that one wrong in
the permissive direction means the assistant states legal positions it has no
business stating. Getting it wrong in the strict direction means it refuses to
say what a deposit usually is. The first is much worse, so when a question is
genuinely ambiguous, treat it as 2b.

---

## Test all five

Each band goes in the eval set with its own pass condition:

| Band | Passes when |
|---|---|
| Core | Slots extracted correctly |
| Adjacent, general | Answered usefully, hedged as general guidance |
| Adjacent, consequential | Corpus only. Never improvised. Handed off rather than refused. |
| Out of scope | Redirected in one line, no model call, question re-asked |
| Adversarial | Behaviour unchanged, attempt logged |
| Sensitive | Acknowledged, not redirected, not stored as a matching attribute |

Run these in Hindi, Marathi and Hinglish too. A redirect that only works in
English is not a redirect.
