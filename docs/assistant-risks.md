# The assistant: risks and mitigations

**Date:** 2026-09-30 · **Status:** working document, feeds decision PD6
**Purpose:** Risks of the assistant and their mitigations; split from ai-agent-design.md.

---

## 4. The risks not raised

### 4.1 Exclusionary preferences — decision PD3c

Record and filter on all stated preferences, including community and religion: [PD3c](decisions/pd-03c-exclusionary-preferences.md).

#### The legal position, stated accurately

[PD3c](decisions/pd-03c-exclusionary-preferences.md), Context.

#### The exposure that remains

Press and platform risk, not legal risk; published listings are a separate case ([PD3c](decisions/pd-03c-exclusionary-preferences.md), [PD3d](decisions/pd-03d-listing-identity-restrictions.md)).

#### Mitigations still compatible with the decision

Seven mitigations, never infer to state it publicly: [PD3c](decisions/pd-03c-exclusionary-preferences.md).

#### Related, and still open

Gender preferences after women-only was removed: [PD1](decisions/pd-01-audience.md), [PD8](decisions/pd-08-verification.md), [PD3c](decisions/pd-03c-exclusionary-preferences.md).

### 4.2 Prompt injection through user-generated content

The assistant will read third-party text: listing descriptions, profile prompts, chat messages, and broker text if roomsie adds brokers. All of it can contain instructions. Third-party text is data, and SQL ranks ([PD10](decisions/pd-10-scope-bands.md)).

- Before the model sees listing text, remove or escape instruction-like patterns. Flag them for review.
- The text of one listing can affect a summary sentence, and nothing else.

### 4.3 Language

Language mix and example: [PD7](decisions/pd-07-models.md).

- Language affects slot extraction accuracy, chips, refusal behaviour and all eval sets ([PD10](decisions/pd-10-scope-bands.md)).
- Decide the supported languages explicitly.

### 4.4 Vulnerable disclosures

Decide the disclosure behaviour deliberately, not in production:

- Acknowledge it briefly. Do not ask more.
- Do not keep it as a matching attribute, or show it in a profile.
- Where applicable, show a related resource.

Users below 18 must not get to the matching surfaces at all.

Why: [PD10](decisions/pd-10-scope-bands.md)

### 4.5 Advice the assistant must not give

Users will ask about deposits, notice periods, agreement clauses, police verification, rent control and if broker commission is legal. The boundary is band 2b ([PD10](decisions/pd-10-scope-bands.md)): law is corpus-only, never improvised. If no article applies, hand off. Advice on one dispute no, review of one agreement no. Put the handoff in the system prompt and the eval set.

### 4.6 Cost and latency

This can quietly stop the model. Budget: [PD5](decisions/pd-05-team-and-budget.md). Caps: [PD9](decisions/pd-09-pre-login-limits.md). Transcript in context: [PD7a](decisions/pd-07a-agent-architecture.md). Before you build, you must have measured latency per turn. The API boundary has no streaming, and the contract is request-response.

### 4.7 Data residency and DPDP

Residency, provider terms and deletion: [PD7](decisions/pd-07-models.md), [ADR 0012](decisions/0012-analytics-event-store.md). Account deletion must purge transcripts. Design this in from the start.

### 4.8 Gaming and misuse

The model does not rank, and must not imply that it can. Off-topic and prompt-leak handling: [PD10](decisions/pd-10-scope-bands.md). Fake interviews to collect listings or broker contacts: no response yet.

### 4.9 Ending the interview

No defined end is the most probable reason for abandonment. The completeness gate in [section 3.3](ai-agent-design.md#33-confidence-right-goal-wrong-mechanism) controls when the match score shows. It does not end the interview ([PD6c](decisions/pd-06c-interface-holes.md)).

- Show progress.
- Always let the user skip to results with the slots filled so far. Label these results as not complete.
- Never trap a user in a conversation to complete a form.

Why: [PD6c](decisions/pd-06c-interface-holes.md), [PD5](decisions/pd-05-team-and-budget.md)
