# Hinglish performance: DeepSeek, Sarvam, and the rest

**Date:** 2026-09-20 · **Status:** research report, input to decision PD7
**Question:** What is the performance of DeepSeek with Hinglish? Should Sarvam be on the shortlist?

---

## The headline

**There are three findings. The list puts them in order of how much each should change your plan.**

1. **Hinglish is the easiest of your hard cases, not the hardest.** The test
   used seven languages. Of these, Hinglish had the *smallest* decrease from
   English, **6.87%**. The average Indic decrease was **9.00%**. The reason:
   romanised English tokens align directly with schema elements. Marathi was
   one of the worst, at **9.63%**, and you launch in Mumbai. Thus, Marathi is
   the risk, not Hinglish.
2. **DeepSeek is the strongest of the open contenders on Indic input,** but it
   is an English-and-Chinese model. On Hinglish, its score was seven points
   higher than Llama 3.3 70B.
3. **Sarvam has a place on the list, but for the composer, not the extractor.**
   This is the opposite of the obvious assumption. Section 4 gives the reason.

---

## 1. DeepSeek on Indic input: the evidence

### IndicDB, a 6,245-task multilingual text-to-SQL benchmark

IndicDB tested four models as supplied, with no task-specific fine-tuning, in
seven languages. The table gives execution accuracy, zero-shot with evidence:

| Model | English | Hindi | Marathi | Telugu | **Hinglish** |
|---|---|---|---|---|---|
| Llama 3.3 70B | 73.31% | 61.27% | 57.14% | 47.65% | **63.69%** |
| Qwen3 8B | 57.97% | 42.44% | 52.97% | 45.46% | **53.98%** |
| **DeepSeek V3.2** | 74.93% | 67.73% | 64.06% | 61.65% | **70.89%** |
| MiniMax M2.7 | 76.91% | 67.13% | 63.34% | 57.72% | **70.83%** |

**What the table shows:**

- DeepSeek V3.2 has the **best Hinglish score in the set**, 70.89%. This is only a
  fraction more than MiniMax and **seven points more than Llama 3.3 70B**.
- More important, DeepSeek has the **narrowest spread across languages**. Its
  worst language, Telugu at 61.65%, is 13 points less than its English. For
  Llama, the worst language is 26 points less. A narrow spread gives
  predictable behaviour. For extraction, predictable behaviour is more
  important than a peak score.
- Qwen3 8B is clearly the weakest here. If you think about Qwen for the
  extractor because of its price, this is the evidence against it.

### The other Indic evidence on DeepSeek

- **IndicParam** is a low-resource Indian language benchmark. On it, DeepSeek
  3.2 "comes quite close to GPT-5 and even beats it for some languages". GPT-5
  had the highest average, 45%.
- But the **base model is English and Chinese centric**. DeepSeek-V3 was
  "pretrained on a multilingual corpus with English and Chinese constituting
  the majority". Also, R1's "multilingual performance is poor outside of
  English and Chinese".

**How these agree:** DeepSeek is weak on Indic *relative to its own English*.
It is strong on Indic *relative to other models you would actually consider*.
To select between candidates, the second comparison is the one that matters.

### Three caveats that matter

1. **The benchmark is text-to-SQL, not slot extraction.** It is a good proxy.
   Both tasks change natural language into constrained structured output for
   a fixed schema. But it is not the same task.
2. **The tested model is V3.2, not V4.1 Flash.** You would deploy a model that
   is much smaller and cheaper than the measured model, a 671B
   mixture-of-experts. This evidence **does not cover** Flash-tier performance
   on Hinglish.
3. **DeepSeek is not in Indi-RomCoM at all.** Indi-RomCoM is the benchmark
   that is nearest to your real use case. Refer to section 3.

---

## 2. The free win hiding in this data

IndicDB found that structured evidence in the prompt gave gains of **+24% to
+27%** across languages. The largest gains were in **Marathi (+27.5%)**, Tamil
(+27.3%) and Telugu (+25.7%).

**Apply this directly.** Put these items explicitly in the extractor prompt:

- The enum definitions
- The Mumbai area list
- The accepted number and date forms

Do not assume that the model knows that Chandivali is a Powai sub-area. Do not
assume that it knows that "bees hazaar" is 20,000.

The cost is a cached prompt block. The result is approximately a quarter more
accuracy on exactly your weakest language. It is the cheapest improvement in
this full document.

---

## 3. Indi-RomCoM: the benchmark that matches your product

Indi-RomCoM tests **romanised code-mixed instructions**. Your users will type
literally this. It measures performance at four mixing levels.

| Model | English | 25% mixed | 50% mixed | 75% mixed | Gap at 75% |
|---|---|---|---|---|---|
| Claude Opus 4.6 | 68.7% | 63.4% | 61.9% | 61.2% | 7.5pp |
| **Sarvam-30B** | **64.2%** | 59.8% | 57.3% | **56.1%** | **8.1pp** |
| Gemini 3.5 Flash | 61.4% | 56.2% | 54.8% | 54.1% | 7.3pp |
| Llama 3.1 70B | 54.6% | 51.5% | 50.6% | 50.5% | 4.0pp |
| Qwen3.5 9B | 49.7% | 44.3% | 43.6% | 43.3% | 6.4pp |
| Airavata-7B | 38.6% | 36.4% | 33.6% | 32.9% | 5.7pp |

**Indi-RomCoM did not evaluate DeepSeek.** This is a genuine hole in the
evidence.

### Reading this correctly

- **Sarvam-30B has higher absolute scores than Gemini 3.5 Flash** at all
  mixing levels. At heavy mixing, it is two points higher.
- **But the Sarvam score decreases by a small quantity more**, 8.1 points against 7.3 for Gemini.
  Its advantage is a higher start point, not better resistance to code-mixing.
- A 30B Indic model is better than a frontier Flash model on this task. This
  is a real result. It is the reason that Sarvam has a place on your list.

### The metric that decides the split

**Register Defection Rate** measures how frequently a model replies in English
when the input is in code-mixed language.

| Model class | Defection rate |
|---|---|
| Indic-tuned (Sarvam, Airavata) | **16.5% to 26.1%** |
| Gemini | 44.5% |
| Llama 3.1 8B | 99.7% |
| Qwen2.5 1.5B | 99.8% |

The paper is blunt. It says that most open models "defect overwhelmingly into
English under RCM input... regardless of scale."

**This finding changes the structure of the decision. It is also easy to
misread.**

Register defection applies to **output prose**. It has no effect on the
extractor, because the extractor output is a JSON enum, not a sentence. A
model can "defect to English" when it gives `{"area": "powai"}`. That model
did nothing incorrect.

But register defection is extremely important for the **composer**, because the
composer writes the text that the user reads. A user types Hinglish and gets
a stiff English paragraph. That tells the user that the product is not really
for them.

---

## 4. So where does Sarvam fit?

**Answer: the composer. Not the extractor.** This is the opposite of the
obvious assumption.

### The case for Sarvam on the composer

- **Best-in-class register matching.** Its defection is 16.5% to 26.1%,
  against 44.5% for Gemini.
- **Trained for exactly this task.** Sarvam trained Sarvam-105B on native script,
  romanised Latin script **and code-mixed input**. The training covered the ten
  most-spoken Indian languages.
- **The composer runs rarely.** Thus, its latency and cost have the minimum
  importance.
- **Very cheap.** The blended price is approximately $0.03 to $0.04 per
  million tokens.
- **Apache 2.0**, on AIKosh and Hugging Face. Thus, you can self-host it.
- Sarvam trained its models in India, as part of the IndiaAI Mission. In this market, that
  is a marketing line with some value.

### The case against Sarvam on the extractor

**Latency.** The reported time to first token is **13.85 seconds for Sarvam
30B** and **22.24 seconds for 105B**. After the first token, the output speed
is satisfactory: 167 and 99 tokens per second.

If those numbers are correct, they **disqualify Sarvam from the extractor**.
The extractor is directly in the interaction loop. It must return before the
panel can move. Nobody waits fourteen seconds for a filter to apply.

**Verify this before you act on it.** A time to first token that high usually
shows provider capacity or cold start, not the model itself. Do your own test
on a warm endpoint. If it decreases to less than two seconds, think about
Sarvam for the extractor again.

### Two honest caveats on Sarvam

1. **The 90% pairwise win claim comes from Sarvam's own benchmark.**
   Independent evidence, Indi-RomCoM, gives a more modest result. Sarvam is
   better than Gemini 3.5 Flash, but less good than Claude Opus 4.6.
2. **Independent commentary notes that Indic evaluation suites "remain anchored to native scripts, leaving code-mixed validation absent from official evaluation loops."** Thus, published Indic scores in general,
   Sarvam's scores included, are not sufficient tests of the thing that
   you actually need.

---

## 5. What this means for roomsie

### Revised lean, by role

| Role | Lean | Reason |
|---|---|---|
| **Router** | The cheapest model that classifies reliably | Five-way classification. The language is almost not important. |
| **Extractor** | **DeepSeek V4.1 Flash or Gemini Flash-Lite** | Best measured Hinglish structured output, and a narrow spread across languages. Register defection is not important here. Latency excludes Sarvam, unless a test shows otherwise. |
| **Observer** | Same as the extractor | The task has the same shape. |
| **Composer** | **Sarvam** | Register matching is the full job, and Sarvam is first by a wide margin. It runs rarely, so its latency and cost are acceptable. |
| **Advisor** | A good general model with retrieval | The advisor is grounded, so raw language ability is less important. |

**A mixed-vendor setup is satisfactory.** The architecture already disconnects these
roles from each other, and the wrapper module lets you replace each one.

### Three things to add to the eval set

1. **Marathi, with a heavy weight.** Its decrease is worse than Hinglish
   (9.63% against 6.87%), and you launch in Mumbai. This is the real risk.
   It is not the risk that you asked about.
2. **Register defection as a composer metric.** Type Hinglish. Then measure
   if the reply comes back in the same register. Gemini fails this test 44.5%
   of the time.
3. **Mixing-level gradient.** Test at 25%, 50% and 75% mixing, not only
   "Hinglish". The decrease is not linear, and your users are at all points
   of the range.

### The gap you cannot close from published work

**Nobody has benchmarked a Flash-tier model, V4.1 Flash included, on romanised
code-mixed slot extraction.** The measured DeepSeek result is for a 671B model
on a different task.

This is not a reason to avoid V4.1 Flash. It is the reason for your own eval
set. It is also the reason to make the eval set before you select the model,
not after.

---

## Sources

- [IndicDB: multilingual text-to-SQL across Indic languages](https://arxiv.org/html/2604.13686) — the per-model Hinglish table, the 6.87% Hinglish gap, the 9.00% average, and the +24% to +27% structured-evidence gain
- [Indi-RomCoM: romanised code-mixed instruction benchmark](https://arxiv.org/html/2606.30790) — the mixing-gradient table, the Sarvam-30B and Gemini 3.5 Flash figures, and Register Defection Rate
- [DeepSeek-V3 technical report](https://arxiv.org/html/2412.19437v1) — the pretraining corpus is mostly English and Chinese
- [DeepSeek R1 multilingual limitations](https://www.plainconcepts.com/deepseek-r1/)
- [IndicParam: DeepSeek 3.2 against GPT-5 on low-resource Indic](https://arxiv.org/pdf/2512.00333)
- [Sarvam 30B and 105B open-sourcing](https://www.sarvam.ai/blogs/sarvam-30b-105b) — training on native, romanised and code-mixed input
- [Sarvam-105B overview, IndiaAI Mission, Apache 2.0](https://www.buildfastwithai.com/blogs/sarvam-105b-india-s-open-source-llm-for-22-indian-languages-2026)
- [Sarvam pricing and latency on Artificial Analysis](https://artificialanalysis.ai/providers/sarvam)
- [Benchmarks don't tell the full story of Sarvam AI](https://analyticsindiamag.com/ai-startups/benchmarks-dont-tell-the-full-story-of-sarvam-ai)
- [CodeMixBench: code-mixing degrades performance](https://arxiv.org/html/2505.05063v1)
- [Function calling and latency benchmark for Indian voice agents](https://caller.digital/blog/llm-benchmark-indian-voice-agents-function-calling-latency-2026)
