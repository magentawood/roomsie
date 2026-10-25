# Model hosting and where user text goes

**In one line:** each chat message goes to a model provider, and the provider decides where the text is stored and if it trains on it; roomsie sends user text to the DeepSeek API.

## What it is

The assistant calls a model for each turn. The text of the user leaves our servers and goes to the **provider** of the model. The terms of the provider decide three things:

- **Where** the provider stores the text (the country).
- **If** the provider trains its models on the text.
- **How long** the provider keeps the text.

An open-weight model, such as DeepSeek, can run at more than one provider. The model is the same, but the terms are different.

## How it fits our project

The options on 2026-10-25, for the main model of [PD7](../decisions/pd-07-models.md):

| Provider | Model | Storage | Training | Cost of 1,000 turns (estimate) |
|---|---|---|---|---|
| DeepSeek API | V4.1 Flash | China, no fixed period | Yes, unless we opt out by email | About $0.80 off-peak with caching, about $3.40 at peak |
| Gemini paid tier | 2.5 Flash-Lite | Google, no India promise | No | About $1.10 |
| Amazon Bedrock, Mumbai | DeepSeek V3.2 only | India | No | About $7.70 |

The estimate takes about 8,000 input tokens and 800 output tokens for each turn. T-11 logs the real numbers.

## The choice we made

- User text goes to the DeepSeek API. The team opts out of training by email. The privacy policy names the storage in China: [PD7](../decisions/pd-07-models.md).

## Gotchas

- **Peak hours cost two times more.** DeepSeek charges the peak rate on weekdays, 06:30 to 09:30 and 11:30 to 15:30 IST.
- **The cache matters.** The fixed system prompt is a cache hit, at about $0.003 for each million tokens.
- **Prices and terms change.** Check them again before a new provider or model.
- **The opt-out is an email,** not a setting. F-07 sends it before launch.

## Tickets

- F-13: [#132](https://github.com/magentawood/roomsie/pull/132), 2026-10-25. The DeepSeek terms, and the cost of three providers.
