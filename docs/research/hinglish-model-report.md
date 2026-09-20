# Hinglish performance: DeepSeek, Sarvam, and the rest

**Date:** 2026-09-20 · **Status:** research report, feeds decision D7
**Question:** how well does DeepSeek handle Hinglish, and should Sarvam be on
the shortlist?

---

## The headline

**Three findings, in order of how much they should change your plan.**

1. **Hinglish is the easiest of your hard cases, not the hardest.** Across seven
   languages, Hinglish showed the *smallest* drop from English at **6.87%**,
   against a **9.00%** average Indic gap. Romanised English tokens align
   directly with schema elements. Marathi was among the worst at **9.63%**, and
   you are launching in Mumbai. So worry about Marathi, not Hinglish.
2. **DeepSeek is the strongest of the open contenders on Indic input,** despite
   being an English-and-Chinese model. It beat Llama 3.3 70B on Hinglish by
   seven points.
3. **Sarvam belongs on the list, but for the composer, not the extractor.**
   That is the inverse of the obvious assumption, and section 4 explains why.

---

## 1. DeepSeek on Indic input: the evidence

### IndicDB, a 6,245-task multilingual text-to-SQL benchmark

Four models off the shelf, no task-specific fine-tuning, seven languages.
Zero-shot with evidence, execution accuracy:

| Model | English | Hindi | Marathi | Telugu | **Hinglish** |
|---|---|---|---|---|---|
| Llama 3.3 70B | 73.31% | 61.27% | 57.14% | 47.65% | **63.69%** |
| Qwen3 8B | 57.97% | 42.44% | 52.97% | 45.46% | **53.98%** |
| **DeepSeek V3.2** | 74.93% | 67.73% | 64.06% | 61.65% | **70.89%** |
| MiniMax M2.7 | 76.91% | 67.13% | 63.34% | 57.72% | **70.83%** |

**What this says:**

- DeepSeek V3.2 posts the **best Hinglish score in the set**, 70.89%, a
  fraction ahead of MiniMax and **seven points ahead of Llama 3.3 70B**.
- More importantly, DeepSeek has the **narrowest spread across languages**. Its
  worst language, Telugu at 61.65%, is 13 points off its English. Llama's worst
  is 26 points off. Narrow spread means predictable behaviour, which matters
  more than a peak score when the model is doing extraction.
- Qwen3 8B is clearly the weakest here. If you were considering Qwen for the
  extractor on price, this is the evidence against it.

### The other Indic evidence on DeepSeek

- On **IndicParam**, a low-resource Indian language benchmark, DeepSeek 3.2
  "comes quite close to GPT-5 and even beats it for some languages". GPT-5 led
  at 45% average.
- Against that: the **base model is English and Chinese centric**. DeepSeek-V3
  was "pretrained on a multilingual corpus with English and Chinese
  constituting the majority", and R1's "multilingual performance is poor
  outside of English and Chinese".

**Reconcile those.** DeepSeek is weak on Indic *relative to its own English*,
and strong on Indic *relative to other models you would actually consider*. For
picking between candidates, the second comparison is the one that matters.

### Three caveats that matter

1. **The benchmark is text-to-SQL, not slot extraction.** It is a good proxy,
   since both take natural language and produce constrained structured output
   against a fixed schema. It is not the same task.
2. **The tested model is V3.2, not V4.1 Flash.** You would deploy a much
   smaller, cheaper model than the 671B mixture-of-experts that was measured.
   Flash-tier performance on Hinglish is **not covered by this evidence**.
3. **DeepSeek does not appear in Indi-RomCoM at all,** which is the benchmark
   closest to your real use case. See section 3.

---

## 2. The free win hiding in this data

IndicDB found that adding structured evidence to the prompt produced gains of
**+24% to +27%** across languages, strongest in **Marathi (+27.5%)**, Tamil
(+27.3%) and Telugu (+25.7%).

**Apply this directly.** Put the enum definitions, the Mumbai area list and the
accepted number and date forms explicitly in the extractor prompt. Do not
assume the model knows that Chandivali is a Powai sub-area or that "bees hazaar"
is 20,000.

This costs a cached prompt block and buys roughly a quarter more accuracy on
exactly the language you are weakest in. It is the cheapest improvement
available in this whole document.

---

## 3. Indi-RomCoM: the benchmark that matches your product

This one tests **romanised code-mixed instructions**, which is literally what
your users will type. It measures performance at four mixing levels.

| Model | English | 25% mixed | 50% mixed | 75% mixed | Gap at 75% |
|---|---|---|---|---|---|
| Claude Opus 4.6 | 68.7% | 63.4% | 61.9% | 61.2% | 7.5pp |
| **Sarvam-30B** | **64.2%** | 59.8% | 57.3% | **56.1%** | **8.1pp** |
| Gemini 3.5 Flash | 61.4% | 56.2% | 54.8% | 54.1% | 7.3pp |
| Llama 3.1 70B | 54.6% | 51.5% | 50.6% | 50.5% | 4.0pp |
| Qwen3.5 9B | 49.7% | 44.3% | 43.6% | 43.3% | 6.4pp |
| Airavata-7B | 38.6% | 36.4% | 33.6% | 32.9% | 5.7pp |

**DeepSeek was not evaluated.** That is a genuine hole in the evidence.

### Reading this correctly

- **Sarvam-30B beats Gemini 3.5 Flash in absolute terms** at every mixing
  level, and by two points at heavy mixing.
- **But Sarvam degrades slightly more**, 8.1 points against Gemini's 7.3. Its
  advantage is a higher starting point, not better resistance to code-mixing.
- A 30B Indic model beating a frontier Flash model on this task is a real
  result and the reason Sarvam deserves to be on your list.

### The metric that decides the split

**Register Defection Rate** measures how often a model replies in English
despite being addressed in code-mixed language.

| Model class | Defection rate |
|---|---|
| Indic-tuned (Sarvam, Airavata) | **16.5% to 26.1%** |
| Gemini | 44.5% |
| Llama 3.1 8B | 99.7% |
| Qwen2.5 1.5B | 99.8% |

The paper is blunt: most open models "defect overwhelmingly into English under
RCM input... regardless of scale."

**This is the finding that reorganises the decision, and it is easy to
misread.**

Register defection is about **output prose**. It does not touch the extractor,
because the extractor's output is a JSON enum, not a sentence. A model that
"defects to English" while emitting `{"area": "powai"}` has done nothing wrong.

It matters enormously for the **composer**, which writes what the user reads. A
user who types Hinglish and gets a stiff English paragraph back has just been
told the product is not really for them.

---

## 4. So where does Sarvam fit?

**Answer: the composer. Not the extractor.** This is the opposite of the
obvious assumption.

### The case for Sarvam on the composer

- **Best-in-class register matching.** 16.5% to 26.1% defection against
  Gemini's 44.5%.
- **Trained for exactly this.** Sarvam-105B was trained on native script,
  romanised Latin script **and code-mixed input** for the ten most-spoken
  Indian languages.
- **The composer runs rarely,** so its latency and cost matter least.
- **Very cheap.** Blended roughly $0.03 to $0.04 per million tokens.
- **Apache 2.0**, on AIKosh and Hugging Face, so self-hosting stays possible.
- Trained in India under the IndiaAI Mission, which is a marketing line worth
  something in this market.

### The case against Sarvam on the extractor

**Latency.** Reported time to first token is **13.85 seconds for Sarvam 30B**
and **22.24 seconds for 105B**. Output speed is fine afterwards, 167 and 99
tokens per second.

If those numbers hold, Sarvam is **disqualified from the extractor**, which
sits directly in the interaction loop and must return before the panel can
move. Nobody waits fourteen seconds for a filter to apply.

**Verify this before acting on it.** A time to first token that high usually
indicates provider capacity or cold start rather than the model itself. Test it
yourself on a warm endpoint. If it drops under two seconds, reconsider the
extractor too.

### Two honest caveats on Sarvam

1. **The 90% pairwise win claim is Sarvam's own benchmark.** Independent
   evidence, Indi-RomCoM, shows a more modest picture: better than Gemini 3.5
   Flash, behind Claude Opus 4.6.
2. **Independent commentary notes that Indic evaluation suites "remain anchored
   to native scripts, leaving code-mixed validation absent from official
   evaluation loops."** So published Indic scores generally, Sarvam's included,
   under-test the thing you actually need.

---

## 5. What this means for roomsie

### Revised lean, by role

| Role | Lean | Reason |
|---|---|---|
| **Router** | Cheapest that classifies reliably | Five-way classification. Language barely matters. |
| **Extractor** | **DeepSeek V4.1 Flash or Gemini Flash-Lite** | Best measured Hinglish structured output and narrow cross-language spread. Register defection is irrelevant here. Latency rules Sarvam out unless disproved. |
| **Observer** | Same as extractor | Same shape of task. |
| **Composer** | **Sarvam** | Register matching is the whole job, and Sarvam leads by a wide margin. Runs rarely, so latency and cost are tolerable. |
| **Advisor** | Good general model plus retrieval | Grounded, so raw language ability matters less. |

**A mixed-vendor setup is fine.** The architecture already decouples these
roles, and the wrapper module makes each swappable.

### Three things to add to the eval set

1. **Marathi, weighted heavily.** It degrades worse than Hinglish (9.63%
   against 6.87%) and you are launching in Mumbai. This is the real risk and
   it is not the one you asked about.
2. **Register defection as a composer metric.** Type Hinglish, measure whether
   the reply comes back in the same register. Gemini fails this 44.5% of the
   time.
3. **Mixing-level gradient.** Test at 25%, 50% and 75% mixing, not just
   "Hinglish". Degradation is not linear and your users sit across the range.

### The gap you cannot close from published work

**Nobody has benchmarked V4.1 Flash, or any Flash-tier model, on romanised
code-mixed slot extraction.** The measured DeepSeek result is a 671B model on a
different task.

That is not a reason to avoid it. It is the reason your own eval set exists,
and why it should be built before the model is chosen rather than after.

---

## Sources

- [IndicDB: multilingual text-to-SQL across Indic languages](https://arxiv.org/html/2604.13686) — the per-model Hinglish table, the 6.87% Hinglish gap, the 9.00% average, and the +24% to +27% structured-evidence gain
- [Indi-RomCoM: romanised code-mixed instruction benchmark](https://arxiv.org/html/2606.30790) — the mixing-gradient table, Sarvam-30B and Gemini 3.5 Flash figures, and Register Defection Rate
- [DeepSeek-V3 technical report](https://arxiv.org/html/2412.19437v1) — pretraining corpus majority English and Chinese
- [DeepSeek R1 multilingual limitations](https://www.plainconcepts.com/deepseek-r1/)
- [IndicParam: DeepSeek 3.2 against GPT-5 on low-resource Indic](https://arxiv.org/pdf/2512.00333)
- [Sarvam 30B and 105B open-sourcing](https://www.sarvam.ai/blogs/sarvam-30b-105b) — training on native, romanised and code-mixed input
- [Sarvam-105B overview, IndiaAI Mission, Apache 2.0](https://www.buildfastwithai.com/blogs/sarvam-105b-india-s-open-source-llm-for-22-indian-languages-2026)
- [Sarvam pricing and latency on Artificial Analysis](https://artificialanalysis.ai/providers/sarvam)
- [Benchmarks don't tell the full story of Sarvam AI](https://analyticsindiamag.com/ai-startups/benchmarks-dont-tell-the-full-story-of-sarvam-ai)
- [CodeMixBench: code-mixing degrades performance](https://arxiv.org/html/2505.05063v1)
- [Function calling and latency benchmark for Indian voice agents](https://caller.digital/blog/llm-benchmark-indian-voice-agents-function-calling-latency-2026)
