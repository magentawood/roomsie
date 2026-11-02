# The composer

**In one line:** code plans each reply, and the composer writes the words of that plan in the language of the person, inside a deadline.

## What it is

- The **composer** is the model call that writes the words of a reply ([PD7a](../decisions/pd-07a-agent-architecture.md)). It is the last step of a core typed turn.
- The **plan** is the scripted reply of the reply writer. Code decides it: the acknowledgement, the conflicts, the next question, the chips and the asked slot. The composer cannot change these parts.
- The **register** is the language and the script of a message. The router gives it ([the router](router.md)). The reply writer changes it into one of five **reply languages**:

| Reply language | When |
|---|---|
| `en`: English | English, `other`, or no register |
| `hi-Latn`: Hinglish | Hindi or a mix, in Latin script or in two scripts |
| `hi`: Hindi | Hindi or a mix, in Devanagari only |
| `mr-Latn`: Marathi in Latin script | Marathi, in Latin script or in two scripts |
| `mr`: Marathi | Marathi, in Devanagari only |

- The **fixed lines** are the lines with no model: "send it again", the last line, and the line of each band. The hand-off line of a legal, tax or safety question is one of them. Each line has a text in each reply language.

## How it fits our project

```
runTurn() ── router + extractor ──▶ replyWriter(): the plan, with the fixed lines in the reply language
               core and not failed? ──▶ composer() ── models.json(), with a deadline ──▶ passesCheck()
                                           └─ late, failed, or not passed: the plan goes out as it is
```

| Part | Where |
|---|---|
| The composer, its prompt and its output check | `apps/api/src/assistant/handlers/composer/` |
| The fixed lines, and the reply language of a register | `apps/api/src/assistant/lines.json`, `lines.ts` |
| Where the composer runs | `apps/api/src/assistant/assistant.ts` |
| The last two turns, and the register of the last typed turn | `apps/api/src/goals/store.ts` |
| The input and the answer of the composer | `packages/contract/src/goals.ts` |

- **What the composer reads.** The plan, the filled slots of Form A, the Form B notes of the person, the last two turns and the new message. It never reads the full chat, a listing, a profile or a result ([assistant.md](../standards/assistant.md)).
- **Which turns.** Only a core typed turn that the extractor could read. A tap, and an off-topic, adversarial or sensitive turn, keep the scripted reply.
- **The deadline.** `COMPOSER_DEADLINE_MS` (2500) is the time for all the attempts of the call together. After it, no retry and no fallback start. The event `model_called` has the time of each attempt, so T-27 can tune the value.
- **The output check.** A text fails when it is longer than two times the plan (at least 300 characters), or has a phone number, an email address or a link. It also fails when it has a number that is not in the plan or the message. "₹20,000" lets "20k" through. A capital word inside a sentence must be in the plan. A capital word from the words of the person fails, also at the start of a sentence, unless the plan has it. This check stops "Rahul says …".
- **The language of a tap.** A tap has no text, so it uses the register of the last typed turn. A typed turn with no router label does the same.

## The choice we made

- Code plans and the model writes, the deadline, the fixed lines in a data file, and the hand-off line until T-38: the spec of T-13.
- The model and the register mitigation: [PD7](../decisions/pd-07-models.md). The bands and the hand-off: [PD10](../decisions/pd-10-scope-bands.md).

## Gotchas

- **The interview questions stay in English** after a tap or a fallback, as the chips. Only the fixed lines change language.
- **Devanagari has no capitals,** so the name check does not see a name in Devanagari. The prompt and the eval set of T-27 cover it.
- **A false rejection is safe.** The scripted reply goes out, in English with the fixed lines translated.
- **The fake vendors of the tests know a composer call by its prompt.** A test that gives no composer replies gets a failed composer, so the scripted reply goes out. `hang` makes a call wait until its signal aborts.
- **The fixed lines are drafts.** A native speaker checks each text before launch (PC-15 of F-14).

## Tickets

- T-13: the composer, the fixed lines in five languages, and the hand-off line.
- T-27: the eval of the register and the value of the deadline. T-38: the general picture of a 2b question from the articles.
