# Model selection

**Date:** 2026-09-20 · **Status:** method agreed, choice pending an eval
**Decision:** D7

**Constraint removed:** data residency is not a requirement. Inference may run
anywhere. This simplifies the decision considerably and supersedes the caution
carried over from ADR 0012.

---

## Three corrections to the shortlist

**Qwen 2.3 does not exist.** The current line is Qwen 3.x. Qwen3.6 shipped in
April 2026 under Apache licence, supports tool calling and JSON-schema
structured output, and the Qwen 3 family was trained across 119 languages.
Qwen3.5-397B covers 201. Being Apache-licensed means it is self-hostable later
if that ever matters.

**Groq is not a model, it is an inference provider.** It serves open-weight
models on its own hardware, very fast. So "Groq" is a decision about *where*
Qwen or another open model runs, not a decision about *which* model.

**DeepSeek V4 Flash has been superseded.** V4.1 Flash shipped on 10 September
2026 with a new API route and lower prices.

---

## Prices, as of now

| Model | Input per 1M | Output per 1M |
|---|---|---|
| Gemini 2.5 Flash-Lite | $0.10 | $0.40 |
| Gemini 3.1 Flash-Lite | $0.25 | $1.50 |
| Gemini 3.5 Flash-Lite | $0.30 | $2.50 |
| DeepSeek V4.1 Flash, off-peak | $0.15 | $0.60 |
| DeepSeek V4.1 Flash, cache hit | ~$0.006 | — |

**DeepSeek prices by clock.** Peak is 01:00 to 04:00 and 06:00 to 10:00 UTC,
Monday to Friday. In IST that is 06:30 to 09:30 and 11:30 to 15:30. So peak
covers the Indian working day but **not** the Indian evening, which is when
people are most likely to hunt for a flat. That works in your favour, but it is
a real operational wrinkle: the same interview costs different amounts
depending on the hour.

**Cache discount matters more than headline price.** Your system prompt is
fixed and large, and it is sent on every call. A 98% cache discount applies to
exactly that part. Design for caching from the start.

---

## What this actually costs you

Order of magnitude, for a completed interview:

| | |
|---|---|
| Model calls per interview | 8 to 12 |
| Small-model calls | most of them |
| Composer calls | 3 to 4 |
| Cost per completed interview | **roughly ₹1 to ₹2** |
| 1,000 interviews a month | **roughly ₹1,000 to ₹2,000** |

That is 12 to 25 dollars a month at a thousand interviews. Real, but not
frightening next to a 50 to 80 dollar base.

**So price is not the deciding factor.** The gap between the cheapest and the
dearest option on this list is noise at your volume. Choosing on price is
optimising the wrong variable.

**The budget risk remains abuse, not legitimate use.** The chat runs before
login. A bot talking to it all night costs more than a thousand real users.
D9 is the control that matters.

---

## The thing that should actually decide it

**Hinglish.** Your users will type "mujhe Powai mein 20k tak ka room chahiye,
non-veg okay hai" and the extractor has to get every slot right.

Two findings from current research make this the deciding constraint:

1. **Small open models are about 13 points worse on Hinglish than on English.**
   Code-mixing consistently degrades performance, and more mixing makes it
   worse.
2. **Indic-tuned models parse code-mixed input more reliably but have seen far
   fewer tool-calling examples.** So they are better at understanding and worse
   at producing the structured output your extractor needs.

That is a direct tension and it sits exactly on your highest-volume call.

### The finding that threatens the design

**Small models "abstain almost never."**

The whole architecture rests on the empty slot being the confidence signal. If
the extractor always picks *some* enum value rather than saying it does not
know, that signal is gone and the assistant starts filling slots with guesses.
This is the failure mode to guard hardest against.

Three guards:

1. **Put an explicit "unclear" value in every enum.** Do not rely on the model
   volunteering uncertainty. Give it a slot to put it in.
2. **Gate on token probability, not on the model's opinion.** Below the
   threshold, ask instead of filling.
3. **Make abstention rate a first-class eval metric.** Measure how often the
   extractor correctly declines on deliberately ambiguous input. A model that
   never abstains fails, however good its accuracy looks.

---

## The method

Do not pick from a leaderboard. Pick from your own eval.

1. **Build the eval set first.** 200 to 300 utterances in the real mix: English,
   Hindi, Marathi, Romanised Hinglish, Devanagari. Mumbai place names, Indian
   number forms ("20k", "bees hazaar", "20,000"), Indian date forms. Label each
   with the correct slot values. **Include ambiguous cases whose correct answer
   is "unclear".**
2. **Run every candidate against it.** Gemini Flash-Lite tier, DeepSeek V4.1
   Flash, Qwen3.6 via a fast provider. Score extraction accuracy, abstention
   accuracy, structured-output validity, and latency.
3. **Pick separately for each role.** The router, extractor and observer have
   one set of needs. The composer has another. They do not have to be the same
   vendor, and the architecture already decouples them.
4. **Hide the vendor behind one module.** Same pattern as the `reportError`
   wrapper in ADR 0014. Application code calls your interface, never a vendor
   SDK. Swapping then costs a config change, which matters because this list
   will look different in six months.

This eval set is not overhead. It is the same artefact that tells you whether a
prompt change helped, and it is the only honest answer to "which model".

---

## Decision: DeepSeek primary, Gemini fallback

**Taken 2026-09-20. Sarvam is dropped.**

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
the register it was addressed in. Measured defection to English: Sarvam 16.5%
to 26.1%, Gemini 44.5%. DeepSeek is untested on this.

So a user who types "mujhe Powai mein room chahiye" may well get a stiff
English paragraph back. That is a small thing that tells someone the product is
not really for them.

**The mitigation is prompt-level, and weaker than a model-level one:**

1. Instruct the composer explicitly to mirror the user's language and script.
2. Detect the user's register in the router, which already classifies the turn,
   and pass it to the composer as an input rather than leaving it to be
   inferred.
3. **Make register match a first-class eval metric.** Type Hinglish, measure
   what comes back. Without measuring it, this degrades silently.

This only affects the composer and the advisor. Extraction is unaffected,
because a JSON enum has no register.

### A benefit of the pairing that was not the reason for it

DeepSeek is a Chinese company. India's DPDP Act permits cross-border transfer
except to countries the government notifies as restricted. No such list has
been notified. If one ever is, a Chinese inference provider is a plausible
entry.

Having Gemini already integrated as a fallback means that becomes a config
change rather than a migration. Worth noting, not worth planning around.

**Also note:** DPDP obligations follow the data, not the server. Processing
interview transcripts abroad does not remove them. Check DeepSeek's retention
and training terms before sending real user text, and make sure account
deletion propagates.

### What "fallback" has to mean

Three different things get called fallback, and they need different code:

| Trigger | Behaviour |
|---|---|
| **Failure** — timeout, 5xx, rate limit | Retry once on Gemini. Automatic. |
| **Invalid output** — structured output fails Zod | Retry once on the same model, then Gemini. Automatic. |
| **Cost or load** — DeepSeek peak hours, 11:30 to 15:30 IST | Route by clock. Optional, and probably not worth the complexity at these volumes. |

**Quality is not a fallback trigger.** There is no reliable runtime signal that
an answer was poor. Quality differences are settled by the eval set and by
which model is primary, not at request time.

**The wrapper does the work.** Both vendors sit behind one internal module, the
same pattern ADR 0014 uses for error reporting. Application code calls the
interface. It holds the timeout, the retry, the fallback and the per-model
token accounting.

---

## Earlier lean, superseded by the decision above

## My provisional lean, to be overturned by the eval

| Role | Lean | Why |
|---|---|---|
| Router | Cheapest thing that classifies reliably | It is a five-way classification. Do not overspend. |
| Extractor and Observer | Gemini Flash-Lite tier | Strong multilingual coverage, mature structured output, latency-optimised. The Hinglish risk is the real one and Google's Indic coverage is the strongest of the three. |
| Composer | A good model, vendor open | Runs rarely. Quality shows here and nowhere else. |
| Advisor | Same as composer, plus retrieval | Grounded, so raw model knowledge matters less |

**DeepSeek V4.1 Flash is the value option** and the cache discount is genuinely
large. If it clears the Hinglish eval, take it. The peak-hour pricing is
manageable because your traffic should skew to the Indian evening.

**Qwen3.6 is the option that keeps a door open,** because Apache licensing
means you could host it yourself later. That door is worth little while data
residency is not a requirement, so do not pay for it in quality today.

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
