# Product calls: assistant and limits

**Task:** F-14 · **Status:** open · **Updated:** 2026-10-04

The product team (founder and product) settles these calls. Engineers do not.

## How to run this session

- Ask the questions in rounds. Each round holds the questions that have answers to all their prerequisites.
- Ask one question at a time. Read the recommendation aloud, then decide.
- Record each answer in the named PD record. Then delete the question from this file.
- These calls are soft. Until an answer arrives, the build uses a default in config, not in code (T-21, T-38 "Done when").
- Do not ask again what a record decides. For example, [PD9](../decisions/pd-09-pre-login-limits.md) decides five typed turns and chips-only at the ceiling.

## Round 1

### PC-09 · Supported languages

❓ Which languages and scripts do we promise? Do we promise them in the screens, in the assistant, or in the two?

- **Today:** the composer mirrors the language and script of the user (`docs/decisions/pd-07-models.md:94`, `docs/team-plan.json`). The eval set has English, Hinglish and Marathi (`docs/team-plan.json`). No doc gives the language of the screens.
- **Options:** a) English only, everywhere. b) Screens in English. The assistant reads and replies in English, Hindi, Marathi and Hinglish. It uses Latin or Devanagari script. c) Option b, and screens in Hindi too.
- **Blocks:** T-13, T-34, M-03, T-27 (soft: the default is option b).
- **Record:** [PD7](../decisions/pd-07-models.md)

➡️ **Recommended:** b. PD7 chose the models for Hinglish, and PD10 tests each band in Hindi, Marathi and Hinglish.

### PC-10 · The daily spend ceiling amount

❓ What is the daily model-spend ceiling in rupees? What are the first values for the rate limits?

- **Today:** no value. PD9 settles the mechanism, not the numbers (`docs/decisions/pd-09-pre-login-limits.md:27-39`). F-03 gives only a monthly example of ₹20,000 (`docs/team-plan.json`). The alert starts at 70% of the ceiling. Web searches count in it (`docs/team-plan.json`).
- **Options:** a) ₹300 a day. b) ₹500 a day. c) ₹1,000 a day. For the rate limits: strict values, or large values that we make tighter from the logs.
- **Blocks:** T-21, T-29 (soft: config values).
- **Record:** [PD9](../decisions/pd-09-pre-login-limits.md)

➡️ **Recommended:** b, with large rate limits. ₹500 pays for 250 to 500 interviews a day at ₹1 to ₹2 each (PD5). Thirty days at ₹500 stay below the F-03 example. Many Indian mobile users share one IP address. PD9 says that a limit which blocks human users is worse than the abuse.

### PC-13 · Do web-search answers look different

❓ Must an answer from a web search look different from an answer from our articles?

- **Today:** no value. Article answers give the name of the article (`docs/team-plan.json`). Signed-in users get web answers. Visitors get a hedged answer (`docs/decisions/pd-07a-agent-architecture.md:35-39`).
- **Options:** a) No difference. b) A short label, "From a web search", and the source link. c) Option b, and a different colour for the answer.
- **Blocks:** T-38 (soft: the default is option b).
- **Record:** [PD7a](../decisions/pd-07a-agent-architecture.md)

➡️ **Recommended:** b. The user must know the source of each answer. Article answers name their source.

### PC-15 · Band 2b hand-off destination and scripted lines

❓ For law, tax and safety questions with no article, where do we send the user? Who writes the fixed lines: off-topic, sensitive, sign-in wall and spend ceiling?

- **Today:** a sample off-topic line exists (`docs/scope-policy.md:98`). The sample 2b reply sends the user to "a lawyer" (`docs/scope-policy.md:57`). The docs name no other destination.
- **Options:** a) "A lawyer" for all 2b questions. b) One official source for each topic. A lawyer for one agreement or dispute. c) A roomsie help contact.
- **Blocks:** T-13, T-34, T-38 (soft: the sample lines are the default).
- **Record:** [PD10](../decisions/pd-10-scope-bands.md)

➡️ **Recommended:** b, and the founder writes the lines with marketing. PD10 forbids a bare refusal. A named source is a useful answer. Marketing writes the corpus.

### PC-16 · The PD3c public policy page at launch

❓ Does the page "What roomsie filters on, and why" ship on 12 October? Who writes it?

- **Today:** PD3c requires the page (`docs/decisions/pd-03c-exclusionary-preferences.md:33`). No task holds it. T-23b has only /privacy, /terms and /grievance (`docs/team-plan.json`).
- **Options:** a) Ship it at launch, next to the legal pages. b) Ship it in v1.
- **Blocks:** T-23b (it needs a fourth page) and F-07 (the text).
- **Record:** [PD3c](../decisions/pd-03c-exclusionary-preferences.md)

➡️ **Recommended:** a, and the founder writes it. PD3c says that silence looks worse than a stated position. The page is a short text.

## Round 2

Ask this round when PC-07 (where a user sees Form B) has an answer. PC-07 is in [intake-and-profile.md](intake-and-profile.md) (F-11).

### PC-17 · Vulnerable disclosures: storage and resources

❓ A user tells the assistant about violence, divorce, job loss or distress. What does the assistant say, and which resources does it show? Must the observer refuse to store it?

- **Today:** only `docs/assistant-risks.md` has rules, and it is not a record. It says: acknowledge briefly, do not ask more, do not keep a matching attribute (`docs/assistant-risks.md:48-50`). The observer stores each quoted personal detail, with no exclusion (`docs/decisions/pd-07a-agent-architecture.md:31-34`). No resource list exists.
- **Options:** a) The observer stores no observation for a disclosure. b) It stores a hidden observation. The match does not use it. c) It stores a usual observation.
- **Blocks:** T-36, T-34 sensitive band (soft: the default is option a).
- **Record:** [PD10](../decisions/pd-10-scope-bands.md)

➡️ **Recommended:** a, and a short list of national helplines, for example 112 (emergency) and Tele-MANAS 14416 (mental health). Make sure that each number is correct before launch. assistant-risks.md section 4.4 forbids a matching attribute. The typed turn stays in `chat_turns` and goes with account deletion.

## Round 3

Ask this round when these calls have answers: PC-03 and PC-29 in [intake-and-profile.md](intake-and-profile.md) (F-11), PC-23 in [matching-rules.md](matching-rules.md) (F-12), and PC-30 in [connect-and-trust.md](connect-and-trust.md) (F-13).

### PC-39 · The interview script after the chips

❓ After intent, area and budget, in which order does the assistant ask the other questions? Which open questions does it ask? Is there a progress indicator? Does it ever use market defaults?

- **Today:** no order. The open questions are in `docs/ai-agent-design.md:101-106`. The `default` source exists but nothing uses it (`docs/ai-agent-design.md:54`). "Show progress" is in `docs/assistant-risks.md:76`.
- **Options:** a) Move date, room type, the nine axes, then the open questions during the results. b) The open questions first, then the axes. Progress: a step count, or nothing. Defaults: none, or with a label.
- **Blocks:** T-09 scripted next question, T-13 (soft: the default is option a).
- **Record:** [PD6c](../decisions/pd-06c-interface-holes.md)

➡️ **Recommended:** a, with a step count and no market defaults. Move date and two dealbreakers gate the match score (`docs/ai-agent-design.md:80-92`). The chips show results before these questions. Thus, defaults add nothing.
