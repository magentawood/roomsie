# The conversational agent: failure modes and guardrails

**Date:** 2026-09-20 · **Status:** working document, feeds decision PD6
**Scope:** all the ways that the roomsie assistant can fail, and what to do about each one.

---

## 1. Verdict on the four concerns raised

| Concern | Verdict |
|---|---|
| Form alongside the chat, conflicts need confirmation | Right |
| The model is stochastic, so we cannot list its mistakes | Right as a fact. Wrong as a frame. |
| The model needs a confidence level before it answers | Right goal, wrong mechanism |
| Chat makes users tired, so offer tap suggestions | Right, and more than convenience |

---

## 2. The decision that removes most of the risk

**The model is never the source of truth. The form is.** Never ask the model to know anything.

Three jobs, different trust levels:

| Job | What it does | Can it invent things? |
|---|---|---|
| **Extract** | User words into form slot values | No. Only an enum or a number. |
| **Converse** | Ask the next question, explain, push back, acknowledge | Free text, but no facts about inventory |
| **Retrieve** | Find matching listings and people | Not the model. SQL on the database. |

- The recommendation never goes through model generation. It shows on the cards from the prototype.
- **Rule:** generated prose may never give a fact about a specific listing, person, price, area or availability. These facts show only on cards, with data from the database.
- The assistant refers to the card. It does not describe it.

---

## 3. The four concerns, in detail

### 3.1 The form alongside the chat

Slot filling with a structured state object for the full session:

```
slot: {
  key:        "smoke",
  value:      "no",
  source:     "stated" | "inferred" | "default" | "empty",
  evidence:   "I really can't be around cigarette smoke",
  turn:       7,
  confirmed:  true,
  weight:     "must" | "nice" | null
}
```

| `source` | Meaning | Rule |
|---|---|---|
| stated | The user said it | Fill silently. |
| inferred | The model got it from a related statement | Never fill silently. Propose it: "Should I make that a dealbreaker?" |
| default | A market default, only to show the first results | Always label it visibly. The user can always override it. |
| empty | Unknown | The interview is not complete. |

**Conflicts.** When a new turn contradicts a filled slot, do not overwrite it and do not silently keep the previous value. Ask the user which value to use. Log all conflicts. A high conflict rate on one slot shows a question with bad words, not inconsistent users.

**The form is also the resumption mechanism.** A user who comes back (for example, three days after) continues from the form, not from a transcript replay.

### 3.2 Stochastic, and what that actually implies

| Surface | Risk | Fence |
|---|---|---|
| Slot extraction | Wrong enum value | Constrained decoding to the enum. Zod validates. An invalid extraction causes a retry, not a value. |
| Numbers (budget, dates) | Misparses "20k" or "next month end" | The model finds the span, then code parses it deterministically. Never let the model do arithmetic or date maths. |
| Recommendation | Invents a listing | SQL retrieval, card output |
| Free text | Wrong or strange text | Scope rules and the refusal list in section 5 |
| Tone | Differs between sessions | Version and pin the system prompt. Treat it as code. |

ADR 0013 gives CI a five-minute budget and a deterministic testing philosophy. Thus, evaluation is a separate suite, outside the PR gate. It uses a fixed set of recorded conversations, and scores slot-extraction accuracy, not string equality. Budget it as its own work item.

### 3.3 Confidence: right goal, wrong mechanism

1. **The empty slot is the confidence signal.**
2. **Token probability on the extracted span has much better calibration.** For a constrained choice (for example, four enum values), the probability mass on the selected value is a usable threshold. Below it, ask, and do not fill.
3. **Never let inference fill a slot.**
4. **A completeness gate, not a confidence gate, ends the interview.** Define the minimum slot set, and show no results until it is full. This rule is deterministic and readable by all.

**The minimum slot set before the first recommendation** (a proposal, for discussion):

| Required | Why |
|---|---|
| Intent | Sets the market side to search |
| Budget | Hard filter |
| Areas | Hard filter |
| Move date | Hard filter |
| At least 2 dealbreakers | Minimum for a useful ranking |
| Identity of the asker as a person or a spot holder | Sets their feed |

All other slots are optional. The assistant can collect them during browsing.

### 3.4 Suggestion chips

Chips are genuine, and worth the work. **The real cost is anchoring.** Thus: **suggestions on closed questions, never on open ones.**

- Closed: the nine lifestyle axes. Offer chips.
- Open: the questions that give the product its reason to exist. No chips. Ask these with no suggestions:
  - Why the last flatshare ended
  - What would make you leave a flat
  - Who else is frequently in the flat, and how frequently
  - What a usual weekday evening at home looks like
- Free text is always available adjacent to the chips. The chips never replace it.
- The suggestion generator is not a second model call on each turn. For a closed question, make the chips from the slot definition.
- Call the model for suggestions only on the small number of turns where the answer space is genuinely open.

---

## 4. The risks not raised

### 4.1 Exclusionary preferences — decision PD3c

**Decision (2026-09-20): roomsie records all preferences that the user states, which include community and religion, and filters on them.**

#### The legal position, stated accurately

- India has no general law against discrimination in private housing. Thus, a private person may select a flatmate by community. A platform that records it is not clearly unlawful.
- **The DPDP Act 2023 has no sensitive-data category.** A religion preference has the same obligations as a budget, not more.
- **Outside India, that is not correct.** Under GDPR, religion is special category data, and needs an Article 9 condition. This applies on EU expansion, and during diligence by an investor who applies GDPR standards to the full book.

#### The exposure that remains

1. **The risk is press and platform risk, not legal risk.**
2. **Published listings are different from private preferences.** A roomsie listing that says "no Muslims" is an advertisement. Most press and future regulatory exposure is on listings. Decide the two cases independently. We decided only the private-filter case.
3. **The data connects to a person.** We keep each stated exclusion against a named, phone-verified user. It is discoverable, and a DPDP access request can export it. It shares a database with the analytics corpus. ADR 0012 makes that corpus the future training data.

#### Mitigations still compatible with the decision

| # | Mitigation | Rule |
|---|---|---|
| 1 | **Never infer** | Record only explicit statements. Never get a community preference from a name, diet, area or a festival mentioned casually. |
| 2 | **Never suggest** | No chips, proposals or questions about these preferences. Record them only when the user raises them. |
| 3 | **Keep the ranking model clean** | When learned ranking replaces the current heuristic score, remove these attributes and their proxies from the features. |
| 4 | **Filter server-side** | The excluded party is never told, and never sees the filter. The exclusion removes query rows. It is not a visible badge. |
| 5 | **Decide the listing side independently** | Can a published listing show an identity restriction? Open, tracked as PD3d. |
| 6 | **Log all stated exclusions, and make them available again** | Log each with its turn. |
| 7 | **State it publicly** | A policy page: what roomsie filters on, and why. |

#### Related, and still open

We removed women-only (PD1). Gender-based preferences come through the interview, and PD3c records them. Is that sufficient for the trust story? This is open, and belongs with PD8.

### 4.2 Prompt injection through user-generated content

The assistant will read third-party text: listing descriptions, profile prompts, chat messages, and broker text if roomsie adds brokers. All of it can contain instructions.

- Never put third-party text in the same channel as instructions. It is data.
- The assistant does not rank. SQL ranks.
- Before the model sees listing text, remove or escape instruction-like patterns. Flag them for review.
- The text of one listing can affect a summary sentence, and nothing else.

### 4.3 Language

- Expect Hindi, Marathi and English, with much code-switching in one sentence, in Latin and Devanagari script. The extractor must process usual utterances such as "Main Powai mein 20k tak ka room dhoond raha hoon".
- Language affects slot extraction accuracy, chips, refusal behaviour and all eval sets.
- Decide the supported languages explicitly.
- Make the eval corpus in the actual language mix, not clean English.

### 4.4 Vulnerable disclosures

Decide the disclosure behaviour deliberately, not in production:

- Acknowledge it briefly. Do not ask more.
- Do not keep it as a matching attribute, or show it in a profile.
- Where applicable, show a related resource.

Users below 18 must not get to the matching surfaces at all.

### 4.5 Advice the assistant must not give

Users will ask about deposits, notice periods, agreement clauses, police verification, rent control and if broker commission is legal. Define the boundary at this time: general information yes, advice on one dispute no, review of one agreement no. Put the refusal in the system prompt and the eval set.

### 4.6 Cost and latency

This can quietly stop the model. The infrastructure budget is approximately fifty to eighty dollars a month for everything. Before you build, you must have:

- A token budget per conversation, and what occurs at that budget
- A daily cap per user, and a different abuse cap
- Decide: after the form is full, does a summary of earlier turns replace the raw transcript?
- Measured latency per turn. The API boundary has no streaming, and the contract is request-response.

### 4.7 Data residency and DPDP

The interview is personal data. ADR 0012 rejected a third-party analytics vendor. Transcripts to an external inference provider need an explicit decision that answers the ADR 0012 reasoning and does not go around it. Open questions:

- Where does inference run? Do transcripts leave India?
- Does the provider keep transcripts, or train on them?
- What does account deletion do to a transcript that we sent?

Account deletion must purge transcripts. Design this in from the start.

### 4.8 Gaming and misuse

| Misuse | Response |
|---|---|
| Requests for a higher rank | The model does not rank, so it cannot. It must not imply that it can. |
| roomsie as a free general-purpose chatbot | Define the scope boundary and a polite redirect. Rate-limit off-topic turns. |
| Attempts to see the system prompt | Assume it will leak. Put nothing secret in it. |
| Fake interviews to collect listings or broker contacts | — |

### 4.9 Ending the interview

No defined end is the most probable reason for abandonment. The completeness gate in section 3.3 ends the interview.

- Show progress.
- Always let the user skip to results with the slots filled so far. Label these results as not complete.
- Never trap a user in a conversation to complete a form.

---

## 5. The guardrail architecture, assembled

| Layer | Guardrails |
|---|---|
| **1 — Input** | Rate limits for each user and session. Language detection. Injection screening on all third-party text. Chips on closed questions. |
| **2 — Extraction** | Constrained decoding to an enum or typed value. Zod validation at the boundary (standing rule 2). Code parses numbers and dates, never the model. Below the probability threshold, ask. Inference never fills a slot silently. |
| **3 — Generation** | System prompt versioned like code. Hard scope boundary. Refusal list: protected attributes, explicit exclusion requests, legal advice, factual claims about inventory items. No prose facts about a listing. |
| **4 — Output** | Recommendations only as cards from SQL results. Each generated turn checked for claims about a specific entity. Conflicts shown to the user, not resolved silently. Everything logged with the slot state at that turn. |

---

## 6. What to test

| Category | What is measured |
|---|---|
| Slot extraction | Per-slot accuracy on a labelled corpus, with code-switched input |
| Assumption | Rate of inferred values that fill a slot unconfirmed. Target zero. |
| Conflict handling | Contradictions shown, not silently overwritten |
| Grounding | Rate of generated prose facts about a specific listing. Target zero. |
| Injection | Adversarial listing text corpus. None of it changes behaviour. |
| Discrimination | Explicit exclusion requests refused. Protected attributes never inferred. Proxies never suggested. |
| Scope | Legal advice and off-topic requests redirected |
| Completeness | Ends at the gate, not before and not much after |
| Length and cost | Turns and tokens to completion, as a distribution, not only the mean |
| Language | All categories above, in Hindi, Marathi and code-switched input |

When real interviews exist, build the corpus from them. Until then, write it by hand. It is the highest-value artefact in this layer.

---

## 7. Open questions this document does not settle

1. Which model, and where it runs (section 4.7). Decision PD7.
2. Is the interview the only entry, or can a user skip it and browse the grid? Decision PD6.
3. After the interview, does the assistant stay during browsing and chat, or fully hand off?
4. Does the assistant ever speak to the other side of a match for the user? This was option 4 in the value question, not selected. It changes the architecture significantly.
5. Where the slot state is in the schema. It is not in the ledger's S1 to S7.
