# PD3c — Record stated exclusionary preferences

**Status:** Settled · **Date:** 2026-09-20 · **Deciders:** Yash

## Context

A user can state a preference about the community or the religion of a flatmate. roomsie must decide if it records and filters on it.

The legal position:

- India has no general law against discrimination in private housing. Thus, a private person may select a flatmate by community. A platform that records it is not clearly unlawful.
- Article 15 of the Constitution applies to the State, not to private persons.
- The Anti-Discrimination and Equality Bill of 2016 did not become law.
- The DPDP Act 2023 has no sensitive-data category. A religion preference has the same obligations as a budget, not more. Thus, the DPDP compliance load is lower than people usually think.
- Outside India, that is not correct. Under GDPR Article 9, religion is special category data. This applies on EU expansion, and during diligence by an investor who applies GDPR standards to the full book.

## Decision

roomsie records all preferences that the user states, which include community and religion. roomsie filters on them.

These mitigations stay with the decision:

| # | Mitigation | Rule |
|---|---|---|
| 1 | Never infer | Record only explicit statements. Never get a community preference from a name, a diet, an area or a festival. |
| 2 | Never suggest | No chips, proposals or questions about these preferences. Record them only when the user raises them. |
| 3 | Keep the ranking model clean | When learned ranking replaces the current heuristic score, remove these attributes and their proxies from the features. |
| 4 | Filter server-side | The excluded party is never told, and never sees the filter. The exclusion removes query rows. It is not a badge that people can see. |
| 5 | Decide the listing side independently | Tracked as PD3d. |
| 6 | Log all stated exclusions, and make them available again | Log each with its turn. |
| 7 | State it publicly | A policy page: what roomsie filters on, and why. |

## Rationale

- It is the user's home.
- The Mumbai market works in this way at this time.
- The mitigations do not cancel PD3c. They limit PD3c to what the user actually asked for.
- Never infer: if we infer a value, we make a preference. If we record a stated value, we serve a preference.
- Never suggest: this rule also follows from `ai-agent-design.md` section 3.4, which prevents suggestions on open questions.
- Out of all learned ranking: a stated filter is a hard constraint that the user selected. A learned weight is a preference that the system makes for itself, and nobody asked for it.
- Filter server-side: the system does not tell a person that it excluded them.
- Log each exclusion: someone can question this in the future. Then the difference between "we recorded what users told us" and "we cannot say where this came from" is the full defence.
- State it publicly: a policy page is much better than a question about it in the future. Silence looks worse than a stated position.

## Consequences

- The risk is press and platform risk, not legal risk. The realistic bad result is a news story about a housing app that filters by religion, not a court case.
- Housing discrimination in India is a current subject in the media. A conversational product makes a more vivid story than a checkbox.
- The data connects to a person. We keep each stated exclusion against a named, phone-verified user. It is discoverable, and a DPDP access request can export it.
- The data shares a database with the analytics corpus. ADR 0012 makes that corpus the future training data.
- `community` is one of the nine provisional axes in `seed-axes.ts`, because PD3c says so. If someone revisits PD3c, the removal of `community` is one line.
- PD3c locks design review item 1.8: we never offer these preferences as chips.
- Still open, with PD8: gender-based preferences come through the interview, and PD3c records them. Is that sufficient for the trust story? When we removed women-only (PD1), we removed a safety story, but the safety problem stays.

## Sources

- [CONTEXT.md, PD3c row](../../CONTEXT.md)
- [product-base.md, section 05 and its Why callout](../product-base.md)
- [ai-agent-design.md, section 4.1 and its Why callouts](../ai-agent-design.md)
- [build-journal.md, the nine provisional names](../build-journal.md)
- [design-review.md, item 1.8](../design-review.md)
