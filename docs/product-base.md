# What roomsie does, and *why*

What roomsie does, and why, at a glance. Each decision's full record is its PD file.

roomsie is the AI-native pivot of femmeflats. An assistant interviews you. Then it shows the people that fit.
v0 is flatmate matching only, open to all genders, in three Mumbai neighbourhoods.
The public launch is on 12 October. The fallback is 14 October.
The team is 5 engineers at 2 hours a day, 2 marketing people and 1 designer. roomsie is self-funded.

### The ledger

<!-- ledger:start -->
| ID | Decision | Status | In one line |
|---|---|---|---|
| [PD0](decisions/pd-00-v0-scope.md) | v0 is flatmate matching only | Settled | v0 is flatmate matching only, with no property listing objects: a person with a spare room is a person card. |
| [PD1](decisions/pd-01-audience.md) | Open to all genders | Settled | roomsie is open to all genders and drops the women-only promise of femmeflats. |
| [PD2](decisions/pd-02-launch-market.md) | Mumbai first | Settled | roomsie launches in Mumbai, only in the three neighbourhoods with the most seeded profiles, and all other visitors join a waitlist. |
| [PD3](decisions/pd-03-listing-supply.md) | Where listing supply comes from at launch | Deferred | Deferred until the broker interviews: the working hypothesis is that brokers list free and pay only for a qualified introduction. |
| [PD3a](decisions/pd-03a-flatmate-matching.md) | Flatmate matching design | Open (active track) | Open: the flatmate matching design, an active track that the team works on in parallel with PD3. |
| [PD3b](decisions/pd-03b-interview-vs-chips.md) | What the AI interview adds over the chip filters | Settled | Both: the assistant interview runs with the chip filters, and the structured form, not the model, is the source of truth. |
| [PD3c](decisions/pd-03c-exclusionary-preferences.md) | Record stated exclusionary preferences | Settled | roomsie records all preferences that the user states, which include community and religion, and filters on them, but never infers or suggests them. |
| [PD3d](decisions/pd-03d-listing-identity-restrictions.md) | Identity restrictions in published listings | Open | Open: if a published listing can show an identity restriction in the text that people see. |
| [PD4](decisions/pd-04-monetisation.md) | Monetisation model and pricing | Pending | Pending: v0 is free, and the v1 working hypothesis is that brokers list free and pay only for an introduction to a matched seeker. |
| [PD5](decisions/pd-05-team-and-budget.md) | Team and budget | Settled | The self-funded team is 5 engineers at 2 hours a day, 2 marketing and 1 designer, with five cost levers and no vector store. |
| [PD6](decisions/pd-06-interface-shape.md) | Interview first, then split view | Settled for desktop | On desktop, "Start looking" opens a full-screen chat with no skip, and the view splits into chat and listings after 2 to 3 inputs. |
| [PD6a](decisions/pd-06a-mobile-split-view.md) | Mobile pattern for the split view | Provisional | Provisional: on mobile, the chat is a bar below the listings, and its size never changes while the user types or reads. |
| [PD6b](decisions/pd-06b-login-gate-and-search.md) | Where the login gate sits, and search | Settled | A user must log in only to open one listing or person, or to send a message, and search engines index area and filter pages. |
| [PD6c](decisions/pd-06c-interface-holes.md) | The panel follows the form | Settled. Four holes closed, one provisional | The panel is a pure function of the form: it updates when the form changes, not when a chat turn happens. |
| [PD7](decisions/pd-07-models.md) | Models: DeepSeek for all roles, Gemini as fallback | Settled | DeepSeek V4.1 Flash serves all roles, the Gemini Flash-Lite tier is the fallback on failure or invalid output, and we dropped Sarvam. |
| [PD7a](decisions/pd-07a-agent-architecture.md) | Agent architecture: a router with small handlers | Settled | A router sends each turn to the smallest handler that can serve it, and all of it ships at launch. |
| [PD8](decisions/pd-08-verification.md) | Verification: DigiLocker, not Aadhaar copies | Settled with one change | Verification uses DigiLocker through a registered KYC provider, with a non-Aadhaar government ID as the manual fallback, and we store the result, never the document. |
| [PD9](decisions/pd-09-pre-login-limits.md) | Abuse and cost limits on the pre-login chat | Settled | The pre-login chat uses a turn cap of 5 free-text turns and rate limits, with a global daily spend ceiling as the backstop. |
| [PD10](decisions/pd-10-scope-bands.md) | Five scope bands for the assistant | Settled | The router puts each question in one of five scope bands by the cost of an incorrect answer, and band 2b is corpus only. |
| [PD11](decisions/pd-11-launch.md) | Public launch on 12 October | Settled. The date moved on 2026-09-26. | The public launch is on Monday 12 October, with Wednesday 14 October as the fallback, and the go/no-go list is the quality bar. |
| [PD12](decisions/pd-12-team-plan.md) | Team plan: five lanes, two phases | Settled. Cut again on 2026-09-25. | Five engineering lanes work in two phases, and designs D-02, D-03 and D-04 must be complete by the end of Wednesday 30 September. |
| [PD13](decisions/pd-13-databases-and-backups.md) | Databases and backups | Settled, as an exception | The main and analytics databases are on two free Supabase accounts, with a nightly dump of the two databases to R2. |
<!-- ledger:end -->
