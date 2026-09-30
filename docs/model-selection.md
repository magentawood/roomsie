# Model selection

**Date:** 2026-09-20 · **Status:** method agreed, choice waits for an eval
**Decision:** PD7

**Constraint removed:** data residency is not a requirement. Inference can run
in all locations. This supersedes the caution that came from ADR 0012.

> [!note]- Why
> - This makes the decision much simpler.

---

## Three corrections to the shortlist

- **Qwen 2.3 does not exist.** The current line is Qwen 3.x.
  - Qwen3.6 shipped in April 2026 with an Apache licence. It supports tool calling and JSON-schema structured output.
  - The training data for the Qwen 3 family has 119 languages. Qwen3.5-397B covers 201.
  - The Apache licence lets you self-host Qwen subsequently, if that is ever important.
- **Groq is not a model. It is an inference provider.** "Groq" is a decision about *where* Qwen or a different open model runs. It is not a decision about *which* model.
- **DeepSeek V4.1 Flash supersedes DeepSeek V4 Flash.** V4.1 Flash shipped on 10 September 2026. It has a new API route and lower prices.

> [!note]- Why
> - Groq serves open-weight models very fast on its own hardware.

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

> [!note]- Why
> - Peak includes the Indian work day but **not** the Indian evening.
> - People are most likely to look for a flat in the evening. This is good for you.
> - But the clock prices are a complication for operations.
> - Your system prompt does not change, and it is large. All calls send it.

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

> [!note]- Why
> - Most of the model calls are small-model calls.
> - At a thousand interviews, the cost is 12 to 25 dollars a month. This cost is real. But next to the base, it is not a cause for concern.
> - At your volume, the difference between the cheapest and the most expensive option on this list is noise.
> - If you choose on price, you optimise the incorrect factor.
> - A bot that talks to the chat all night costs more than a thousand human users.

---

## The thing that should actually decide it

- **Hinglish** decides the choice. The extractor must fill all slots correctly on Hinglish input.
- **Small open models are about 13 points worse on Hinglish than on English.** Code-mixing consistently decreases performance. More code-mixing makes performance worse.
- **Indic-tuned models parse code-mixed input more reliably. But their training had far fewer tool-calling examples.** Thus, their structured output, which your extractor needs, is worse.
- This conflict is on your highest-volume call.

> [!note]- Why
> - Your users will type "mujhe Powai mein 20k tak ka room chahiye, non-veg okay hai".
> - Two findings from current research make Hinglish the constraint that decides the choice.
> - The two findings are in direct conflict.

### The finding that threatens the design

- **Small models "abstain almost never."**
- The full architecture depends on one rule: the empty slot is the confidence signal.
- This failure mode needs the strongest guards:
  1. **Put an explicit "unclear" value in all enums.**
  2. **Gate on token probability, not on the model's opinion.** If the probability is below the threshold, ask. Do not fill the slot.
  3. **Make abstention rate a first-class eval metric.** Give input that is ambiguous on purpose to the extractor. Measure how frequently it correctly declines.
- A model that does not abstain at all fails. This is correct also when its accuracy looks very good.

> [!note]- Why
> - The extractor can always pick *some* enum value, and not say that it does not know. Then you lose the confidence signal.
> - Then the assistant starts to fill slots with guesses.
> - The model does not tell you that it is not sure. The "unclear" value gives it a slot for its uncertainty.

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

> [!note]- Why
> - The router, extractor and observer have one set of needs. The composer has a different set.
> - The current architecture decouples the roles.
> - With one module, a vendor swap costs a config change. This is important because this list will be different in six months.
> - The eval set is not overhead. It is the same artefact that tells you if a prompt change helped.
> - It is also the only honest answer to "which model".

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

> [!note]- Why
> - A user who types "mujhe Powai mein room chahiye" can easily get a formal English paragraph as the reply. This is a small thing. But it tells the user that the product is not really for them.
> - A prompt-level mitigation is weaker than a model-level mitigation.
> - The router classifies each turn.
> - To measure register match, type Hinglish, then measure the reply. If you do not measure it, it becomes worse and nobody sees it.
> - Extraction has no register problem, because a JSON enum has no register.

### A benefit of the pairing that was not the reason for it

- DeepSeek is a Chinese company.
- India's DPDP Act permits cross-border transfer, but not to countries that the government notifies as restricted. The government has not notified such a list.
- If the government ever notifies a list, a Chinese inference provider is a plausible entry.
- This is worth a note, but not worth a plan.
- **Also note:** DPDP obligations follow the data, not the server.
- Before you send text from actual users, examine the retention terms and training terms of DeepSeek. Make sure that account deletion propagates.

> [!note]- Why
> - Gemini is the integrated fallback from the start. Thus, such a restriction becomes a config change, not a migration.
> - If you process interview transcripts in a different country, the obligations stay.

### What "fallback" has to mean

The three uses of "fallback" need different code:

| Trigger | Behaviour |
|---|---|
| **Failure** — timeout, 5xx, rate limit | Retry one time on Gemini. Automatic. |
| **Invalid output** — structured output fails Zod | Retry one time on the same model. Then retry on Gemini. Automatic. |
| **Cost or load** — DeepSeek peak hours, 11:30 to 15:30 IST | Route by clock. Optional. At these volumes, it is probably not worth the complexity. |

- **Quality is not a fallback trigger.** The eval set and the choice of the primary model settle quality differences. The system does not settle them at request time.
- The wrapper holds the timeout, the retry, the fallback and the token accounting for each model.

> [!note]- Why
> - No reliable runtime signal shows that an answer had low quality.
> - The wrapper does the work. Both vendors are behind one internal module.
> - ADR 0014 uses the same pattern for error reporting. Application code calls the interface.

---

## Earlier lean, superseded by the decision above

## My provisional lean, to be overturned by the eval

- The router task is a five-way classification.
- If DeepSeek V4.1 Flash passes the Hinglish eval, use it.

> [!note]- History
> | Role | Lean | Why |
> |---|---|---|
> | Router | The cheapest model that classifies reliably | Do not spend too much. |
> | Extractor and Observer | Gemini Flash-Lite tier | Strong multilingual coverage, mature structured output, latency-optimised. The Hinglish risk is the risk that matters. Google has the strongest Indic coverage of the three. |
> | Composer | A good model, vendor open | It does not run frequently. You can see quality here and in no other role. |
> | Advisor | Same as composer, plus retrieval | It is grounded. Thus, raw model knowledge is less important. |
>
> - **DeepSeek V4.1 Flash is the value option.** Its cache discount is genuinely large. You can manage the peak-hour pricing, because your traffic should be mostly in the Indian evening.
> - **Qwen3.6 is the option that keeps a door open.** Its Apache licence lets you host it on your own servers subsequently. While data residency is not a requirement, that door has small value. Thus, do not decrease quality today to keep it.

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
