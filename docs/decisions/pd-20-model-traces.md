# PD20 — Traces of the model calls

**Status:** Settled. Confirmed by F-07. · **Date:** 2026-11-05 · **Deciders:** n3rxv, for the founders

## Context

- The assistant makes three to five model calls for each typed message (PD7a). When a reply is wrong, slow or in the wrong language, the team must see which call went wrong, with its prompt and its answer.
- The numbers of a call (the role, the model, the time, the tokens) are analytics events (ADR 0012). They have no text, so they cannot show why an answer was wrong.
- A prompt holds the words of a person. Some words state a religion or a community (PD3c).

## Decision

**In one line:** The API keeps the prompt and the raw answer of each model call of a goal for 30 days, with the religion and community words masked before the save, under a session code, and each open in an audit log.

- **What:** each attempt of a call: the messages, the raw answer, the role, the model, the outcome, the time and the tokens. Each different system prompt is kept one time.
- **The mask:** the API replaces each word of religion, and each community name that is not the name of a language, with "[hidden]" before the save. A slot of religion or community shows "set". The names of a language, such as Marathi, stay. The system prompts are code, so they keep their words.
- **No name:** a turn shows a session code from its goal, never a name, an email or a link to a card.
- **Who:** the moderators, on the AI pipeline. Each open of a turn goes in an audit log with the moderator and the time. The log has no end: it holds no text of a person.
- **How long:** 30 days after the call. A nightly job deletes the older traces. An account deletion deletes the traces of its goals at once (PD19).

## Rationale

- Thirty days cover the launch and the next fixes, and a short period keeps the words of people for a short time.
- A mask before the save means that no backup and no leak holds those words. The team cannot unmask them later, and that is the point.
- The names of a language stay because a mask cannot tell "I speak Marathi" from "Marathi only". The user accepted that a preference in a language name stays readable in a trace.
- A session code lets a moderator follow one chat without knowing who it is.
- The audit log shows each person who read the text of a chat.

## Alternatives rejected

- **Numbers only, no text.** The team cannot see why an answer was wrong.
- **The raw text, masked when a moderator opens it.** The words stay 30 days in the database and its backups.
- **A mask of the language names too.** It hides "I speak Marathi" and the language of the person, and a trace loses much of its use.
- **A delete at each new trace.** On a day with no chat, old traces stay past 30 days.

## Consequences

- The privacy text of F-07 names the traces, their period and their purpose.
- A trace can hold a community preference in a language name for 30 days.
- The mask word list misses a spelling that it does not name. A new spelling goes into the list in the contract.

## Revisit when

- The privacy drafter or a DPDP rule needs a different period or no text.
- A caste filter comes in: its words go into the mask (PD3c).

## Sources

- The spec [Admin panel](../specs/admin-panel.md), and the grill of T-64 ([#223](https://github.com/magentawood/roomsie/issues/223))
- [PD3c](pd-03c-exclusionary-preferences.md), [PD7a](pd-07a-agent-architecture.md), [PD19](pd-19-retention.md), [ADR 0012](0012-analytics-event-store.md)
