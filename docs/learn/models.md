# The model wrapper

**In one line:** each call of the API to a language model goes through one module, which asks DeepSeek first, asks Gemini when DeepSeek fails or while the Gemini switch is on, and records the tokens of each attempt.

## What it is

- A **model** is a language model of a vendor. The API sends it a system prompt and the messages of the chat, and it answers with text.
- A **role** is the job of a call: the router, the extractor, the observer, the composer or the Advisor ([PD7a](../decisions/pd-07a-agent-architecture.md)).
- The **fallback** is the second model. The API asks it when the first model gives no valid answer.
- **Tokens** are the units that a vendor counts and bills. **Cached tokens** are the start of a prompt that the vendor saw before. They cost much less.

## How it fits our project

```
a role (T-12, T-13, …) ──▶ models.json() or models.text() ──▶ DeepSeek (deepseek-flash)
                                     │                         │ each failure
                                     │                         ▼
                                     │                  Gemini (gemini-3.5-flash-lite)
                                     └──▶ the event model_called, and one log line for each attempt
```

- **One module:** `apps/api/src/models/`. No other code calls a model ([PD7](../decisions/pd-07-models.md), [ADR-0014](../decisions/0014-error-tracking.md)). It sends the chat request of the OpenAI format with `fetch`, because both vendors accept it.
- **Three kinds of call:** `models.json({ req, role, system, messages, schema, session })` asks in the JSON mode of the vendor and parses the answer with the Zod `schema`. `models.scored({ … })` does the same, and also gives the probability of each token, for the gate of the extractor ([the assistant turn](assistant-turn.md)). `models.text({ … })` gives text. A call can have `deadlineMs`: the time for all its attempts together, as the composer has ([the composer](composer.md)).
- **The fallback:** each failure of DeepSeek goes to Gemini: a timeout, a lost connection, a 5xx or a 4xx. The module also reports a 4xx from DeepSeek, because a person must fix a bad key or an empty balance. An answer that fails the schema goes to DeepSeek one more time, then to Gemini. When Gemini also fails, the module reports the error and throws `ModelUnavailable`. The role then selects what the user sees.
- **The record:** each attempt writes the analytics event `model_called` with the role, the model, the tokens in, the cached tokens, the tokens out, the time, the fallback, the outcome and the session. The sum of the tokens of one session gives the cost of one interview ([PD5](../decisions/pd-05-team-and-budget.md)). The event has no text.
- **The settings:** `DEEPSEEK_API_KEY` and `GEMINI_API_KEY`. Without both, the API calls no model. `MODEL_PRIMARY`, `MODEL_FALLBACK` and `MODEL_TIMEOUT_MS` have defaults. A model name that starts with `deepseek-` goes to DeepSeek, and a name that starts with `gemini-` goes to Gemini. With a name of a different vendor, the API does not start.
- **The Gemini switch:** on `/admin/ai`, a moderator turns on "Use Gemini for all calls" when DeepSeek is down or slow. Each call reads the switch, so a flip acts on the next call with no deploy. While it is on, each call goes to the fallback model: one more try on an invalid answer, and no second vendor. A failed read of the switch counts as off. Each flip goes in a log and to the team in Telegram (T-65, [PD7](../decisions/pd-07-models.md)).
- **The numbers of `/admin/ai`:** the calls of today in IST and of the last 15 minutes, from the events `model_called` and `turn_routed`. Each attempt is one call, so a DeepSeek failure that Gemini saves is two calls, one failed. The live check of the keys does not count, but its spend counts in the spend of today. A slow or failed read of the analytics database gives no numbers, and the switch still shows.
- **The live check:** a moderator sends `POST /v1/admin/model-check`. The API asks each model one short question, with no fallback, and shows which model answered, the tokens and the time.

## The choice we made

- DeepSeek V4.1 Flash for all roles, and the Gemini Flash-Lite tier as the fallback: [PD7](../decisions/pd-07-models.md).
- A record in the analytics database, and a check route for moderators: [#186](https://github.com/magentawood/roomsie/pull/186).

## Gotchas

- Put the fixed system prompt in `system`, and the changing text in `messages`. The cache of each vendor works only on a start of the prompt that does not change.
- In the JSON mode, the prompt must contain the word "json" and show the shape of the answer. If not, a vendor can refuse the call.
- A bad key or an empty balance of DeepSeek does not stop the chat, because Gemini answers. Read the reports, and use the check route after each deploy.
- DeepSeek costs more from 06:30 to 09:30 and from 11:30 to 15:30 IST, from Monday to Friday ([model selection](../model-selection.md)).
- Only DeepSeek gets the field `logprobs`. Gemini refuses it, so a scored call to Gemini gives `tokens: null`.
- In the tests, stub the global `fetch` with `fakeVendors()` of `apps/api/test/vendors.ts`.

## Tickets

- T-11: [#186](https://github.com/magentawood/roomsie/pull/186), 2026-11-02. The module, the fallback, the event and the check route.
- T-12: [#189](https://github.com/magentawood/roomsie/pull/189), 2026-11-02. The scored call, with the token probabilities of DeepSeek.
