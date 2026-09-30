# The assistant: guardrails and eval

**Date:** 2026-09-30 · **Status:** working document, feeds decision PD6
**Purpose:** Guardrails and eval for the assistant; split from ai-agent-design.md.

---

## 5. The guardrail architecture, assembled

| Layer | Guardrails |
|---|---|
| **1 — Input** | Rate limits ([PD9](decisions/pd-09-pre-login-limits.md)). Language detection. Injection screening ([section 4.2](assistant-risks.md#42-prompt-injection-through-user-generated-content)). Chips on closed questions ([section 3.4](ai-agent-design.md#34-suggestion-chips)). |
| **2 — Extraction** | Sections [3.2](ai-agent-design.md#32-stochastic-and-what-that-actually-implies) and [3.3](ai-agent-design.md#33-confidence-right-goal-wrong-mechanism). Zod validation at the boundary (standing rule 2). |
| **3 — Generation** | System prompt versioned like code. Hard scope boundary ([PD10](decisions/pd-10-scope-bands.md)). Refusal list: protected attributes, factual claims about inventory items. Law is corpus-only. If no article applies, hand off. Never a bare refusal ([PD10](decisions/pd-10-scope-bands.md), band 2b). Stated exclusions are recorded and filtered, never inferred or suggested ([PD3c](decisions/pd-03c-exclusionary-preferences.md)). |
| **4 — Output** | Cards from SQL results only ([section 2](ai-agent-design.md#2-the-decision-that-removes-most-of-the-risk)). Each generated turn checked for claims about a specific entity. Conflicts shown to the user ([section 3.1](ai-agent-design.md#31-the-form-alongside-the-chat)). Everything logged with the slot state at that turn. |

---

## 6. What to test

| Category | What is measured |
|---|---|
| Slot extraction | Per-slot accuracy on a labelled corpus, with code-switched input |
| Assumption | Rate of inferred values that fill a slot unconfirmed. Target zero. |
| Conflict handling | Contradictions shown, not silently overwritten |
| Grounding | Rate of generated prose facts about a specific listing. Target zero. |
| Injection | Adversarial listing text corpus. None of it changes behaviour. |
| Discrimination | Stated exclusions recorded and filtered, never inferred or suggested ([PD3c](decisions/pd-03c-exclusionary-preferences.md)). Protected attributes never inferred. Proxies never suggested. |
| Scope | Legal questions answered from the corpus or handed off ([PD10](decisions/pd-10-scope-bands.md), band 2b). Off-topic requests redirected. |
| Completeness | The match score shows when the minimum slot set is full, not before ([PD6c](decisions/pd-06c-interface-holes.md)) |
| Length and cost | Turns and tokens to completion, as a distribution, not only the mean |
| Language | All categories above, in Hindi, Marathi and code-switched input |

When real interviews exist, build the corpus from them. Until then, write it by hand. It is the highest-value artefact in this layer.

Why: [PD5](decisions/pd-05-team-and-budget.md)
