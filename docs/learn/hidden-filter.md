# The hidden religion and community filter

**In one line:** a religion or a community preference that a searcher states removes or reorders the people in the results, and nobody sees that the filter exists.

## What it is

- **Two lists:** religion (Hindu, Muslim, Jain and more) and community, by region or language (Gujarati, Marathi, Tamil and more). There is no caste value ([PD3c](../decisions/pd-03c-exclusionary-preferences.md)).
- **The preference of the searcher** goes into two **hidden slots** of Form A: `religionPreference` and `communityPreference`. Each has the values and a weight.
- **"Only"** (a dealbreaker) removes the people who stated a different value. **"Preferably"**, and an unclear weight, add one point to the order, never to "Best match" or "Didn't say", and remove nobody.
- **The own values of a person** come only from what the person states in the own chat ("I'm Jain"). The profile does not ask them. A saved value shows there with "Remove it", which clears both at once. A person who stated nothing always stays in the results, with no label (PC-31).

## How it fits our project

| Part | Where |
|---|---|
| The two lists, the hidden slots and the profile fields | `packages/contract/src/profiles.ts`, `form-a.ts` |
| The extractor: the preference and the own values of a turn | `apps/api/src/assistant/handlers/extractor/` |
| The own values on the goal and on the profile | `apps/api/src/goals/store.ts`, `apps/api/src/profiles/own-values.ts` |
| The filter and the point of the order | `identitySql()` in `apps/api/src/profiles/match.ts` |
| "Remove it" on the profile | `apps/web/components/profile/profile-editor.tsx` |

- **Hidden from everyone.** The reply never names the slots: they are not in the list of the slots that the assistant talks about. A card, a person page and the results never send the values of a person.
- **The newer statement wins.** A statement in the chat replaces the field, and a change of the field replaces the chat. The chat never asks which one to keep, because the question would show the filter. Each typed turn keeps the hidden preference that it stated, as the log of PD3c.
- **A visitor** keeps the own values on the goal, with the time of each statement. A new profile takes the latest stated values of the goals of the person, by that time.
- **The gate.** As with each value of the extractor, a value below `ASSISTANT_MIN_PROBABILITY` does not count. A weight below it is `unclear`.

## The choice we made

- Record stated preferences, never infer them, and the one exception to "never suggest": [PD3c](../decisions/pd-03c-exclusionary-preferences.md).
- Listings never filter on it: [PD3d](../decisions/pd-03d-listing-identity-restrictions.md).
- The hint of the fields tells the purpose, as the DPDP Act asks: the spec of T-58.

## Gotchas

- **"I eat Jain food" is a food answer, not a religion.** The prompt of the extractor says so. A name, a diet, an area or a festival never gives a value.
- **A Postgres enum is not text.** The filter compares `column::text` with the list of the preference.
- **ORDER BY cannot use an alias inside an expression.** The order adds the point of the preference to the expression of the met preferences, not to the alias `prefs_met`.

## Tickets

- T-58: the hidden filter, the own values and the two optional fields.
- T-17: when it moves a visitor goal to an account with a profile, the own values of the goal go to the profile.
