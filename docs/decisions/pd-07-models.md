# PD7 — Models: DeepSeek for all roles, Gemini as fallback

**Status:** Settled · **Date:** 2026-09-20 · **Deciders:** Yash

## Context

The router design (PD7a) needs a small fast model and a good model. Users mix
Hindi, Marathi and English in Latin and Devanagari script: "mujhe Powai mein
20k tak ka room chahiye". The candidates: Gemini Flash-Lite tier, DeepSeek V4.1
Flash, Qwen3.6 and Sarvam.

Data residency is **not** a requirement. Inference can run in all locations.
This supersedes the caution from ADR 0012. This makes the decision much
simpler.

## Decision

**In one line:** DeepSeek V4.1 Flash serves all roles, the Gemini Flash-Lite tier is the fallback on failure or invalid output, and we dropped Sarvam.

| Role | Model |
|---|---|
| Router, extractor, observer, composer | DeepSeek V4.1 Flash |
| Advisor | DeepSeek V4.1 Flash, plus retrieval |
| **Fallback, all roles** | **Gemini Flash-Lite tier** |

- **We dropped Sarvam.**
- Web search is off by default. The advisor turns on the DeepSeek `web_search`
  tool. Only the Anthropic-compatible endpoint of DeepSeek has it. The fallback
  is Google Search grounding in Gemini.
- Both vendors sit behind one internal module (the ADR 0014 pattern). The
  wrapper holds the timeout, retry, fallback and token accounting.

**What "fallback" means:**

| Trigger | Behaviour |
|---|---|
| Failure: timeout, 5xx, rate limit | Retry one time on Gemini. Automatic. |
| Invalid output: fails Zod | Retry one time on the same model, then on Gemini. |
| Cost or load: DeepSeek peak, 11:30 to 15:30 IST | Route by clock. Optional, and probably not worth it. |

**Quality is not a fallback trigger.** No reliable runtime signal shows low
quality. The eval set and the primary model settle quality.

## Rationale

- **We chose the model for how correctly it reads Hinglish, not for price.**
  Two findings from current research make Hinglish the constraint that decides
  the choice. The two findings are in direct conflict:
  - Small open models are about 13 points worse on Hinglish than on English.
  - Indic-tuned models parse code-mixed input more reliably. But their
    structured output, which the extractor needs, is worse.
- **Each role has different needs.**
  - Router: the cheapest model that classifies reliably. Do not spend too much.
  - Composer: a good model. It does not run frequently. You can see quality
    here and in no other role.
  - Advisor: the same as the composer, plus retrieval. Retrieval grounds its
    answers. Thus, raw model knowledge is less important.
- **Price is noise at this volume.** One completed interview costs **₹1–2**
  (8 to 12 calls), against a base of 50 to 80 dollars a month. The budget
  risk is abuse, not legitimate use (PD9).
- **DeepSeek is the strongest open contender on Indic input.** On IndicDB,
  DeepSeek V3.2 had the best Hinglish score (70.89%) and the narrowest spread
  across languages. A narrow spread gives predictable extraction.
- **Hinglish is not the hard case.** Hinglish had the smallest decrease from
  English, **6.87%**. Marathi had one of the largest, **9.63%**. Marathi is the
  language risk.
- **Sarvam and the extractor.** The reported time to first token is 13.85
  seconds (30B). If those numbers are correct, they disqualify Sarvam from the
  extractor, which is in the loop. Verify this before you act on it: do your
  own test on a warm endpoint.
- **A side benefit, not the reason.** The DPDP Act permits cross-border
  transfer, but not to countries that the government notifies as restricted.
  No list exists. If one comes, a Chinese provider is a plausible entry. With Gemini in
  place from the start, this becomes a config change, not a migration.
- **Cache discount matters more than headline price.** Each call sends the
  large fixed system prompt. DeepSeek V4.1 Flash is the value option: its
  cache discount is genuinely large.
- **Peak-hour pricing is manageable.** Peak includes the Indian work day but
  **not** the Indian evening. People are most likely to look for a flat in the
  evening, so our traffic should be mostly in the Indian evening. But the clock
  prices are a complication for operations.
- **One module for the two vendors.** With one module, a vendor swap costs a
  config change. This is important because this list will be different in six
  months.

## Consequences

**Cost of the drop: register matching.** Sarvam was the only candidate that
reliably replies in the register of the user. Measured defection to English:
Sarvam 16.5% to 26.1%, Gemini 44.5%, DeepSeek not tested. A formal English
reply to Hinglish tells the user that the product is not for them. The
mitigation is at prompt level, and weaker than a model-level fix:

1. Tell the composer to mirror the language and script of the user.
2. The router detects the register and gives it to the composer.
3. Register match is a first-class eval metric. To measure it, type
   Hinglish, then measure the reply. If you do not measure it, it becomes worse
   and nobody sees it.

Only the composer and the advisor have this problem. Extraction has no
register problem, because a JSON enum has no register.

**Abstention.** Small models almost never say "I don't know". The extractor
can always pick *some* enum value, and not say that it does not know. Then we
lose the confidence signal, and the assistant starts to fill slots with
guesses.

Thus, each enum has an `unclear` value, and the gate is token probability.
Token probability has much better calibration than a confidence score in
natural language. The eval measures abstention. A model that never abstains
fails.

**The eval set:** 200 to 300 utterances in the actual language mix, with
Mumbai places, Indian number and date forms, and ambiguous cases. Give Marathi
a heavy weight. Test at 25%, 50% and 75% code-mix levels. Put the enum
definitions, area list and number forms in the extractor instructions. IndicDB
gave **+24% to +27%** from structured evidence (Marathi +27.5%).

**Data:** the interview is more sensitive than all the data that the swipe
product collected. The cause is its free-text disclosures about the user's
life. One reason for ADR 0012 was to keep a behavioural stream in the control
of the company. To send interview transcripts to an external inference
provider is a larger version of the same action.

Thus, examine the DeepSeek retention and training terms before we send user
text. Account deletion must propagate. DPDP obligations follow the data, not
the server.

Superseded:

- The 2026-09-20 Hinglish report put Sarvam on the composer. PD7 dropped it.
- The decision replaces the provisional lean (Gemini on extractor and
  observer).

## Alternatives rejected

- **Qwen3.6:** its Apache licence keeps self-hosting open. With no residency
  need, that door has small value.
- **A choice on price or from a leaderboard.** Pick from our own eval.

## Revisit when

Jev access arrives. Change the router only if Jev beats DeepSeek on Hinglish
and Marathi.

## Sources

- [CONTEXT.md](../../CONTEXT.md), PD7 row
- [product-base.md](../product-base.md), section 10
- [model-selection.md](../model-selection.md)
- [research/hinglish-model-report.md](../research/hinglish-model-report.md)
- [ai-agent-design.md](../ai-agent-design.md), section 3.3
- [assistant-risks.md](../assistant-risks.md), sections 4.3 and 4.7
- [agent-architecture.md](../agent-architecture.md), "What this changes elsewhere"
- [team-plan.md](../team-plan.md), risk table
