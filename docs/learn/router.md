# The router

**In one line:** the router labels each typed message of the chat with its kinds and its scope band, so the turn does only the work that the message needs.

## What it is

- The **router** is one small model call for each typed message. It starts at the same time as the extractor ([PD7a](../decisions/pd-07a-agent-architecture.md)).
- Its **label** has the **kinds** (filter details, personal context, a question), the **band** ([PD10](../decisions/pd-10-scope-bands.md)), the **register** (the language and the script, for the reply writer of T-13), and two flags: `danger` and `community`.
- The band selects the first line of the reply:

| Band | The reply | Form A |
|---|---|---|
| Core | The normal reply | The extractor fills it, unless the message is only a question |
| General or consequential (band 2) | "Good question. I can't answer that one yet, but I've noted it.", then the question | Only when the message also has filter details |
| Out of scope | "That one's outside what I can help with. Back to it: …" | Not changed |
| Adversarial | "Let's get back to your search.", then the question | Not changed |
| Sensitive | A short acknowledgement. With `danger`, also 112 and Tele-MANAS 14416 | The extractor fills it |

- `community` marks a stated community or religion preference. The label is the log that [PD3c](../decisions/pd-03c-exclusionary-preferences.md) asks for. T-58 adds the filter.

## How it fits our project

| Part | Where |
|---|---|
| The prompt, the classifier and the label | `apps/api/src/assistant/handlers/router/` |
| The two calls at the same time, and when the extractor answer applies | `apps/api/src/assistant/assistant.ts` |
| The line of each band | `apps/api/src/assistant/handlers/reply/` |
| The answer, the label and the `turn_routed` event | `packages/contract/src/goals.ts`, `events.ts` |

- **A sure band only.** DeepSeek gives the probability of each token. A band below `ROUTER_MIN_PROBABILITY` (0.8) makes the turn core, and the label keeps no kinds and no flags. Gemini gives no probabilities, so its band passes. When no model answers, the turn is core too. `routerBand` keeps the band that the router gave. A sure band keeps `danger`, `community` and the question kind only when each passes the threshold too.
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
- T-58: the hidden community filter. T-36, T-38 and T-13: the observer, the advisor and the reply writer that use the label.
