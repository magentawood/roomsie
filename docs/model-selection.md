# Model selection

**Date:** 2026-09-20 · **Status:** method agreed, choice waits for an eval
**Decision:** PD7

**Constraint removed:** data residency is not a requirement. Inference can run
in all locations. This supersedes the caution that came from ADR 0012.

Why: [PD7](decisions/pd-07-models.md)

---

## Three corrections to the shortlist

- **Qwen 2.3 does not exist.** The current line is Qwen 3.x.
  - Qwen3.6 shipped in April 2026 with an Apache licence. It supports tool calling and JSON-schema structured output.
  - The training data for the Qwen 3 family has 119 languages. Qwen3.5-397B covers 201.
  - The Apache licence lets you self-host Qwen subsequently, if that is ever important.
- **Groq is not a model. It is an inference provider.** "Groq" is a decision about *where* Qwen or a different open model runs. It is not a decision about *which* model.
- **DeepSeek V4.1 Flash supersedes DeepSeek V4 Flash.** V4.1 Flash shipped on 10 September 2026. It has a new API route and lower prices.

---

## Prices, as of now

| Model | Input per 1M | Output per 1M |
|---|---|---|
| Gemini 2.5 Flash-Lite | $0.10 | $0.40 |
| Gemini 3.1 Flash-Lite | $0.25 | $1.50 |
| Gemini 3.5 Flash-Lite | $0.30 | $2.50 |
| DeepSeek V4.1 Flash, off-peak | $0.15 | $0.60 |
| DeepSeek V4.1 Flash, cache hit | ~$0.006 | — |

- **DeepSeek prices change with the clock.** Peak is 01:00 to 04:00 and 06:00 to 10:00 UTC, Monday to Friday.
- In IST, peak is 06:30 to 09:30 and 11:30 to 15:30.
- Thus, the same interview has different costs at different hours.
- **Cache discount matters more than headline price.** A 98% cache discount applies to the fixed system prompt only.
- Design for caching from the start.

Why: [PD7](decisions/pd-07-models.md)

---

## What this actually costs you

Order of magnitude, for one completed interview:

| | |
|---|---|
| Model calls per interview | 8 to 12 |
| Composer calls | 3 to 4 |
| Cost per completed interview | **roughly ₹1 to ₹2** |
| 1,000 interviews a month | **roughly ₹1,000 to ₹2,000** |
| Base | 50 to 80 dollars a month |

- **Price does not decide the choice.**
- **The budget risk remains abuse, not legitimate use.** The chat runs before login.
- PD9 is the control that matters.

Why: [PD7](decisions/pd-07-models.md), [PD9](decisions/pd-09-pre-login-limits.md), [PD5](decisions/pd-05-team-and-budget.md)

---

## The thing that should actually decide it

- **Hinglish** decides the choice. The extractor must fill all slots correctly on Hinglish input.
- **Small open models are about 13 points worse on Hinglish than on English.** Code-mixing consistently decreases performance. More code-mixing makes performance worse.
- **Indic-tuned models parse code-mixed input more reliably. But their training had far fewer tool-calling examples.** Thus, their structured output, which your extractor needs, is worse.
- This conflict is on your highest-volume call.

Why: [PD7](decisions/pd-07-models.md)

### The finding that threatens the design

- **Small models "abstain almost never."**
- The full architecture depends on one rule: the empty slot is the confidence signal.
- This failure mode needs the strongest guards:
  1. **Put an explicit "unclear" value in all enums.**
  2. **Gate on token probability, not on the model's opinion.** If the probability is below the threshold, ask. Do not fill the slot.
  3. **Make abstention rate a first-class eval metric.** Give input that is ambiguous on purpose to the extractor. Measure how frequently it correctly declines.
- A model that does not abstain at all fails. This is correct also when its accuracy looks very good.

Why: [PD7](decisions/pd-07-models.md), [PD3b](decisions/pd-03b-interview-vs-chips.md)

---

## The method

Do not pick from a leaderboard. Pick from your own eval.

1. **Build the eval set first.**
   - Use 200 to 300 utterances in the language mix of your users: English, Hindi, Marathi, Romanised Hinglish, Devanagari.
   - Include Mumbai place names, Indian number forms ("20k", "bees hazaar", "20,000") and Indian date forms.
   - Label each utterance with the correct slot values.
   - **Include ambiguous cases. For these cases, the correct answer is "unclear".**
2. **Run all candidates against the eval set.**
   - The candidates are Gemini Flash-Lite tier, DeepSeek V4.1 Flash, and Qwen3.6 through a fast provider.
   - Score extraction accuracy, abstention accuracy, structured-output validity, and latency.
3. **Pick a model for each role independently.** The roles do not have to use the same vendor.
4. **Hide the vendor behind one module.** Use the same pattern as the `reportError` wrapper in ADR 0014. Application code calls your interface. It does not call a vendor SDK.

Why: [PD7](decisions/pd-07-models.md), [PD5](decisions/pd-05-team-and-budget.md)

---

## Decision: DeepSeek primary, Gemini fallback

**We took this decision on 2026-09-20. We dropped Sarvam.**

| Role | Model |
|---|---|
| Router | DeepSeek V4.1 Flash |
| Extractor | DeepSeek V4.1 Flash |
| Observer | DeepSeek V4.1 Flash |
| Composer | DeepSeek V4.1 Flash |
| Advisor | DeepSeek V4.1 Flash, plus retrieval |
| **Fallback, all roles** | **Gemini Flash-Lite tier** |

### What dropping Sarvam costs

- **Register matching.** Sarvam was the only candidate that reliably replies in the register of the message to it.
- Measured defection to English: Sarvam 16.5% to 26.1%, Gemini 44.5%. There are no tests of DeepSeek for this.
- **The mitigation is prompt-level:**
  1. Instruct the composer explicitly to mirror the user's language and script.
  2. Detect the user's register in the router. Give the register to the composer as an input. Do not let the composer infer it.
  3. **Make register match a first-class eval metric.**
- This problem affects only the composer and the advisor.

Why: [PD7](decisions/pd-07-models.md)

### A benefit of the pairing that was not the reason for it

- DeepSeek is a Chinese company.
- India's DPDP Act permits cross-border transfer, but not to countries that the government notifies as restricted. The government has not notified such a list.
- If the government ever notifies a list, a Chinese inference provider is a plausible entry.
- This is worth a note, but not worth a plan.
- **Also note:** DPDP obligations follow the data, not the server.
- Before you send text from actual users, examine the retention terms and training terms of DeepSeek. Make sure that account deletion propagates.

Why: [PD7](decisions/pd-07-models.md)

### What "fallback" has to mean

The three uses of "fallback" need different code:

| Trigger | Behaviour |
|---|---|
| **Failure** — timeout, 5xx, rate limit | Retry one time on Gemini. Automatic. |
| **Invalid output** — structured output fails Zod | Retry one time on the same model. Then retry on Gemini. Automatic. |
| **Cost or load** — DeepSeek peak hours, 11:30 to 15:30 IST | Route by clock. Optional. At these volumes, it is probably not worth the complexity. |

- **Quality is not a fallback trigger.** The eval set and the choice of the primary model settle quality differences. The system does not settle them at request time.
- The wrapper holds the timeout, the retry, the fallback and the token accounting for each model.

Why: [PD7](decisions/pd-07-models.md), [ADR 0014](decisions/0014-error-tracking.md)

---

## Earlier lean, superseded by the decision above

## My provisional lean, to be overturned by the eval

- The router task is a five-way classification.
- If DeepSeek V4.1 Flash passes the Hinglish eval, use it.

Why: [PD7](decisions/pd-07-models.md)

---

## Sources

- [DeepSeek V4.1 Flash pricing and peak hours](https://www.aipricing.guru/news/deepseek-v4-1-flash-api-pricing-september-2026/)
- [DeepSeek V4 Flash on OpenRouter](https://openrouter.ai/deepseek/deepseek-v4-flash)
- [Gemini 3.5 Flash Lite pricing](https://openrouter.ai/google/gemini-3.5-flash-lite)
- [Gemini 3.1 Flash Lite pricing and latency](https://openrouter.ai/google/gemini-3.1-flash-lite)
- [Qwen3.6 27B, tools and JSON schema](https://openrouter.ai/qwen/qwen3.6-27b)
- [Qwen release timeline](https://tongyis.com/updates/)
- [Small models on Hinglish, and abstention](https://caller.digital/blog/llm-benchmark-indian-voice-agents-function-calling-latency-2026)
- [CodeMixBench, code-mixing degrades performance](https://arxiv.org/html/2505.05063v1)
- [Indi-RomCoM, Romanised Indic-English benchmark](https://arxiv.org/pdf/2606.30790)
