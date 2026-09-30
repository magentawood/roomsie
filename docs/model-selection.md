# Model selection

**Date:** 2026-09-20 · **Status:** method agreed, choice waits for an eval
**Decision:** PD7

**Constraint removed:** data residency is not a requirement. Inference can run
in all locations. This makes the decision much simpler. It also supersedes the
caution that came from ADR 0012.

---

## Three corrections to the shortlist

**Qwen 2.3 does not exist.** The current line is Qwen 3.x. Qwen3.6 shipped in
April 2026 with an Apache licence. It supports tool calling and JSON-schema
structured output.

The training data for the Qwen 3 family has 119 languages.
Qwen3.5-397B covers 201. The Apache licence lets you self-host Qwen
subsequently, if that is ever important.

**Groq is not a model. It is an inference provider.** It serves open-weight
models very fast on its own hardware. Thus, "Groq" is a decision about *where*
Qwen or a different open model runs. It is not a decision about *which* model.

**DeepSeek V4.1 Flash supersedes DeepSeek V4 Flash.** V4.1 Flash shipped on 10
September 2026. It has a new API route and lower prices.

---

## Prices, as of now

| Model | Input per 1M | Output per 1M |
|---|---|---|
| Gemini 2.5 Flash-Lite | $0.10 | $0.40 |
| Gemini 3.1 Flash-Lite | $0.25 | $1.50 |
| Gemini 3.5 Flash-Lite | $0.30 | $2.50 |
| DeepSeek V4.1 Flash, off-peak | $0.15 | $0.60 |
| DeepSeek V4.1 Flash, cache hit | ~$0.006 | — |

**DeepSeek prices change with the clock.** Peak is 01:00 to 04:00 and 06:00 to
10:00 UTC, Monday to Friday. In IST, peak is 06:30 to 09:30 and 11:30 to 15:30.
Thus, peak includes the Indian work day but **not** the Indian evening.

People
are most likely to look for a flat in the evening. This is good for you. But it
is a real complication for operations: the same interview has different costs
at different hours.

**Cache discount matters more than headline price.** Your system prompt does not
change, and it is large. All calls send it. A 98% cache discount applies to that
fixed part only. Design for caching from the start.

---

## What this actually costs you

Order of magnitude, for one completed interview:

| | |
|---|---|
| Model calls per interview | 8 to 12 |
| Small-model calls | most of them |
| Composer calls | 3 to 4 |
| Cost per completed interview | **roughly ₹1 to ₹2** |
| 1,000 interviews a month | **roughly ₹1,000 to ₹2,000** |

At a thousand interviews, the cost is 12 to 25 dollars a month. This cost is
real. But next to a 50 to 80 dollar base, it is not a cause for concern.

**Thus, price does not decide the choice.** At your volume, the difference
between the cheapest and the most expensive option on this list is noise. If you
choose on price, you optimise the incorrect factor.

**The budget risk remains abuse, not legitimate use.** The chat runs before
login. A bot that talks to the chat all night costs more than a thousand real
users. PD9 is the control that matters.

---

## The thing that should actually decide it

**Hinglish.** Your users will type "mujhe Powai mein 20k tak ka room chahiye,
non-veg okay hai". The extractor must fill all slots correctly.

Two findings from current research make Hinglish the constraint that decides the
choice:

1. **Small open models are about 13 points worse on Hinglish than on English.**
   Code-mixing consistently decreases performance. More code-mixing makes
   performance worse.
2. **Indic-tuned models parse code-mixed input more reliably. But their training
   had far fewer tool-calling examples.** Thus, they understand the input
   better. But their structured output, which your extractor needs, is
   worse.

This is a direct conflict, and it is on your highest-volume call.

### The finding that threatens the design

**Small models "abstain almost never."**

The full architecture depends on one rule: the empty slot is the confidence
signal. The extractor can always pick *some* enum value, and not say that it
does not know. If it does this, you lose that signal. Then the assistant starts
to fill slots with guesses. This failure mode needs the strongest guards.

There are three guards:

1. **Put an explicit "unclear" value in all enums.** Do not expect the model to
   tell you that it is not sure. Give it a slot for its uncertainty.
2. **Gate on token probability, not on the model's opinion.** If the probability
   is below the threshold, ask. Do not fill the slot.
3. **Make abstention rate a first-class eval metric.** Give input that is
   ambiguous on purpose to the extractor. Measure how frequently it correctly
   declines. A model that does not abstain at all fails. This is correct also
   when its accuracy looks very good.

---

## The method

Do not pick from a leaderboard. Pick from your own eval.

1. **Build the eval set first.** Use 200 to 300 utterances in the language mix
   of your users: English, Hindi, Marathi, Romanised Hinglish, Devanagari.
   Include Mumbai place names, Indian number forms ("20k", "bees hazaar",
   "20,000") and Indian date forms. Label each utterance with the correct slot
   values. **Include ambiguous cases. For these cases, the correct answer is
   "unclear".**
2. **Run all candidates against the eval set.** The candidates are Gemini
   Flash-Lite tier, DeepSeek V4.1 Flash, and Qwen3.6 through a fast provider.
   Score extraction accuracy, abstention accuracy, structured-output validity,
   and latency.
3. **Pick a model for each role independently.** The router, extractor and
   observer have one set of needs. The composer has a different set. The roles
   do not have to use the same vendor. The current architecture decouples them.
4. **Hide the vendor behind one module.** Use the same pattern as the
   `reportError` wrapper in ADR 0014. Application code calls your interface. It
   does not call a vendor SDK. Then a vendor swap costs a config change. This is
   important because this list will be different in six months.

The eval set is not overhead. It is the same artefact that tells you if a prompt
change helped. It is also the only honest answer to "which model".

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

**Register matching.** Sarvam was the only candidate that reliably replies in
the register of the message to it. Measured defection to English: Sarvam 16.5%
to 26.1%, Gemini 44.5%. There are no tests of DeepSeek for this.

Thus, a user who types "mujhe Powai mein room chahiye" can easily get a formal
English paragraph as the reply. This is a small thing. But it tells the user
that the product is not really for them.

**The mitigation is prompt-level. It is weaker than a model-level mitigation:**

1. Instruct the composer explicitly to mirror the user's language and script.
2. Detect the user's register in the router. The router already
   classifies the turn. Give the register to the composer as an input. Do not let the
   composer infer it.
3. **Make register match a first-class eval metric.** Type Hinglish, then
   measure the reply. If you do not measure register match, it becomes worse
   and nobody sees it.

This problem affects only the composer and the advisor. It does not affect
extraction, because a JSON enum has no register.

### A benefit of the pairing that was not the reason for it

DeepSeek is a Chinese company. India's DPDP Act permits cross-border transfer,
but not to countries that the government notifies as restricted. The government
has not notified such a list. If the government ever notifies a list, a Chinese
inference provider is a plausible entry.

Gemini is the integrated fallback from the start. Thus, such a restriction
becomes a config change, not a migration. This is worth a note, but not worth a
plan.

**Also note:** DPDP obligations follow the data, not the server. If you process
interview transcripts in a different country, the obligations stay. Before you
send real user text, examine the retention terms and training terms of DeepSeek.
Make sure that account deletion propagates.

### What "fallback" has to mean

We use the name "fallback" for three different things. They need different
code:

| Trigger | Behaviour |
|---|---|
| **Failure** — timeout, 5xx, rate limit | Retry one time on Gemini. Automatic. |
| **Invalid output** — structured output fails Zod | Retry one time on the same model. Then retry on Gemini. Automatic. |
| **Cost or load** — DeepSeek peak hours, 11:30 to 15:30 IST | Route by clock. Optional. At these volumes, it is probably not worth the complexity. |

**Quality is not a fallback trigger.** No reliable runtime signal shows that an
answer had low quality. The eval set and the choice of the primary model settle
quality differences. The system does not settle them at request time.

**The wrapper does the work.** Both vendors are behind one internal module. ADR
0014 uses the same pattern for error reporting. Application code calls the
interface. The module holds the timeout, the retry, the fallback and the token
accounting for each model.

---

## Earlier lean, superseded by the decision above

## My provisional lean, to be overturned by the eval

| Role | Lean | Why |
|---|---|---|
| Router | The cheapest model that classifies reliably | The task is a five-way classification. Do not spend too much. |
| Extractor and Observer | Gemini Flash-Lite tier | Strong multilingual coverage, mature structured output, latency-optimised. The Hinglish risk is the real one, and Google has the strongest Indic coverage of the three. |
| Composer | A good model, vendor open | It does not run frequently. Quality is visible here and in no other role. |
| Advisor | Same as composer, plus retrieval | It is grounded. Thus, raw model knowledge is less important. |

**DeepSeek V4.1 Flash is the value option.** Its cache discount is genuinely
large. If it passes the Hinglish eval, use it. You can manage the peak-hour
pricing, because your traffic should be mostly in the Indian evening.

**Qwen3.6 is the option that keeps a door open.** Its Apache licence lets you
host it on your own servers subsequently. While data residency is not a
requirement, that door has small value. Thus, do not decrease quality today to
keep it.

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
