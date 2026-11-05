# The router

**In one line:** the router labels each typed message of the chat with its kinds and its scope band, so the turn does only the work that the message needs.

## What it is

- The **router** is one small model call for each typed message. It starts at the same time as the extractor ([PD7a](../decisions/pd-07a-agent-architecture.md)).
- Its **label** has the **kinds** (filter details, personal context, a question), the **band** ([PD10](../decisions/pd-10-scope-bands.md)), the **register** (the language and the script of the reply: see [The composer](composer.md)), and three flags: `danger`, `community` and `notes`.
- The band selects the first line of the reply. Each line is in the language of the person:

| Band | The reply | Form A |
|---|---|---|
| Core | The normal reply | The extractor fills it, unless the message is only a question |
| General (band 2a) | "Good question. I can't answer that one yet, but I've noted it.", then the question | Only when the message also has filter details |
| Consequential (band 2b) | A hand-off line that names a lawyer or a CA, the IGR Maharashtra site, and a visit after dark, then the question | Only when the message also has filter details |
| Out of scope | "That one's outside what I can help with. Back to it: …" | Not changed |
| Adversarial | "Let's get back to your search.", then the question | Not changed |
| Sensitive | A short acknowledgement. With `danger`, also 112 and Tele-MANAS 14416 | The extractor fills it |

- `notes` marks the question "what do you know about me?". A scripted line answers it, and the web shows the notes ([Form B notes](form-b-notes.md)).
- `community` marks a stated community or religion preference. The label is the log that [PD3c](../decisions/pd-03c-exclusionary-preferences.md) asks for. T-58 adds the filter.

## How it fits our project

| Part | Where |
|---|---|
| The prompt, the classifier and the label | `apps/api/src/assistant/handlers/router/` |
| The two calls at the same time, and when the extractor answer applies | `apps/api/src/assistant/assistant.ts` |
| The line of each band | `apps/api/src/assistant/handlers/reply/`, and the texts in `apps/api/src/assistant/lines.json` |
| The answer, the label and the `turn_routed` event | `packages/contract/src/goals.ts`, `events.ts` |

- **A sure band only.** DeepSeek gives the probability of each token. A band below `ROUTER_MIN_PROBABILITY` (0.8) makes the turn core, and the label keeps no kinds and no flags. In the eval of T-61, each threshold from 0.5 to 0.95 gave the same scores, so the value stays 0.8 ([the eval of the composer](../research/eval-2026-11-composer.md)). Gemini gives no probabilities, so its band passes. When no model answers, the turn is core too. `routerBand` keeps the band that the router gave. A sure band keeps `danger`, `community`, `notes` and the question kind only when each passes the threshold too.
- **The label stays with the message.** It goes on the typed turn of the person, so account deletion removes it. The `turn_routed` event has only the band.
- **The adapter.** The router calls one classifier. A different model, such as Jev, is a different classifier, and the turn does not change ([extensibility.md](../extensibility.md)).

## The choice we made

- Two calls at the same time, not one call with the two jobs: [PD7a](../decisions/pd-07a-agent-architecture.md).
- The bands and their cost: [PD10](../decisions/pd-10-scope-bands.md). The lines and the rules for each band: the spec of T-34.

## Gotchas

- **An off-topic message still costs two calls.** The extractor starts before the label comes, and the turn drops its answer.
- **The fake vendors of the tests know a router call by its prompt.** A test that gives the router no replies gets a sure core label. `requests.router` holds the calls of the router.
- **To read the flagged messages,** query the typed turns: `select text from chat_turns where role = 'user' and parts->>'band' = 'adversarial'`.

## Tickets

- T-34: the router, the bands and the label.
- T-61: [#229](https://github.com/magentawood/roomsie/pull/229), 2026-11-05. The eval of the other bands and the value of the threshold.
- T-58: the hidden community filter. T-36, T-38 and T-13: the observer, the advisor and the reply writer that use the label.
