# What roomsie does, and *why*

What roomsie does, and why, at a glance. Each decision's full record is its PD file.

roomsie is the AI-native pivot of femmeflats. An assistant interviews you. Then it shows the flats, rooms and people that fit.
v0 is the product in the Figma designs (PD14): flats, rooms, PGs and flatmates, open to all genders, in the nine Mumbai area groups (PD2).
The public launch is on 12 October. The fallback is 14 October.
The team is 5 engineers at 2 hours a day, 2 marketing people and 1 designer. roomsie is self-funded.

### The ledger

<!-- ledger:start -->
| ID | Decision | Status | In one line |
|---|---|---|---|
| [PD0](decisions/pd-00-v0-scope.md) | v0 is flatmate matching only | Superseded by PD14 on 2026-10-24 | v0 is flatmate matching only, with no property listing objects: a person with a spare room is a person card. |
| [PD1](decisions/pd-01-audience.md) | Open to all genders | Settled | roomsie is open to all genders and drops the women-only promise of femmeflats. |
| [PD2](decisions/pd-02-launch-market.md) | Mumbai first | Settled. Changed on 2026-10-27. | roomsie launches in all of Mumbai, in the nine area groups of the designs, and each visitor from outside Mumbai joins a waitlist. |
| [PD3](decisions/pd-03-listing-supply.md) | Where listing supply comes from at launch | Deferred | Deferred until the broker interviews: the working hypothesis is that brokers list free and pay only for a qualified introduction. |
| [PD3a](decisions/pd-03a-flatmate-matching.md) | Matching: who sees what, the filters and the order | Settled | Each place type sees its own kind; must-haves filter both ways between people; gaps rank lower; a plain "Best match" label marks full fits. |
| [PD3b](decisions/pd-03b-interview-vs-chips.md) | What the AI interview adds over the chip filters | Settled | Both: the assistant interview runs with the chip filters, and the structured form, not the model, is the source of truth. |
| [PD3c](decisions/pd-03c-exclusionary-preferences.md) | Record stated exclusionary preferences | Settled. Changed on 2026-10-25. | roomsie records all preferences that the user states, which include community and religion, and filters on them, but never infers or suggests them. |
| [PD3d](decisions/pd-03d-listing-identity-restrictions.md) | Identity restrictions in published listings | Settled. Changed on 2026-10-25. | A listing shows its "Who is welcome" and "Who can move in" choices, and free text cannot restrict by community, religion or caste. |
| [PD4](decisions/pd-04-monetisation.md) | Monetisation model and pricing | Pending | Pending: v0 is free, and the v1 working hypothesis is that brokers list free and pay only for an introduction to a matched seeker. |
| [PD5](decisions/pd-05-team-and-budget.md) | Team and budget | Settled | The self-funded team is 5 engineers at 2 hours a day, 2 marketing and 1 designer, with five cost levers and no vector store. |
| [PD6](decisions/pd-06-interface-shape.md) | Interview first, then split view | Settled for desktop | On desktop, "Start looking" opens a full-screen chat with no skip, and the view splits into chat and listings after 2 to 3 inputs. |
| [PD6a](decisions/pd-06a-mobile-split-view.md) | Mobile pattern for the split view | Provisional | Provisional: on mobile, the chat is a bar below the listings, and its size never changes while the user types or reads. |
| [PD6b](decisions/pd-06b-login-gate-and-search.md) | Where the login gate sits, and search | Settled. Changed on 2026-10-25. | A user must log in only to open one listing or person, or to send a message, and search engines index area and filter pages. |
| [PD6c](decisions/pd-06c-interface-holes.md) | The panel follows the form | Settled. Four holes closed, one provisional. Changed on 2026-10-27. | The panel is a pure function of the form: it updates when the form changes, not when a chat turn happens. |
| [PD7](decisions/pd-07-models.md) | Models: DeepSeek for all roles, Gemini as fallback | Settled. Changed on 2026-10-25. | DeepSeek V4.1 Flash serves all roles, the Gemini Flash-Lite tier is the fallback on failure or invalid output, and we dropped Sarvam. |
| [PD7a](decisions/pd-07a-agent-architecture.md) | Agent architecture: a router with small handlers | Settled. Changed on 2026-10-24. | A router sends each turn to the smallest handler that can serve it, and all of it ships at launch. |
| [PD8](decisions/pd-08-verification.md) | Verification: an ID check in v0, DigiLocker in v1, never Aadhaar copies | Settled with one change. Changed on 2026-10-26. | In v0, a person compares a selfie with a non-Aadhaar government ID; DigiLocker comes in v1; we store the result, never the document. |
| [PD9](decisions/pd-09-pre-login-limits.md) | Abuse and cost limits on the pre-login chat | Settled. Changed on 2026-10-26. | The pre-login chat uses a turn cap of 5 free-text turns and rate limits, with a global daily spend ceiling as the backstop. |
| [PD10](decisions/pd-10-scope-bands.md) | Five scope bands for the assistant | Settled | The router puts each question in one of five scope bands by the cost of an incorrect answer, and band 2b is corpus only. |
| [PD11](decisions/pd-11-launch.md) | Public launch on 12 October | Settled. The date moved on 2026-09-26. Changed on 2026-10-27. | The public launch is on Monday 12 October, with Wednesday 14 October as the fallback, and the go/no-go list is the quality bar. |
| [PD12](decisions/pd-12-team-plan.md) | Team plan: design-free waves, then screens | Settled. Cut again on 2026-09-25. Changed on 2026-10-03. The designs arrived on 2026-10-24. | All design-free work comes first, in waves, and the screens come when designs D-02, D-03 and D-04 arrive. |
| [PD13](decisions/pd-13-databases-and-backups.md) | Databases and backups | Settled, as an exception. Changed on 2026-10-04. | The main and analytics databases are two free projects in one Supabase account, with a nightly dump of both to R2. |
| [PD14](decisions/pd-14-v0-is-the-figma-designs.md) | v0 is the product in the Figma designs | Settled. Changed on 2026-10-26. | v0 is the product that the Figma designs show, with listings from owners, flatmates, PG operators and brokers; this replaces PD0. |
| [PD15](decisions/pd-15-form-a-contract.md) | Form A contract: intent, room type, lifestyle and who's moving | Settled. Changed on 2026-10-26. | A seeker's intent is one of five place types, and Form A adds room type, who is moving, eight lifestyle answers and seven must-haves. |
| [PD16](decisions/pd-16-profiles.md) | Profiles: fields, adults only, profiles for a son or daughter, and visibility | Settled. Changed on 2026-10-25. | roomsie is for adults; a parent can run the card of an adult child; a card is visible when its required fields are complete. |
| [PD17](decisions/pd-17-connect-and-contact.md) | Connect and contact: message requests, no phone numbers in public | Settled. Changed on 2026-10-27. | People talk only in roomsie, through message requests; the system masks each phone number in public and in a request, and two people who connected can share numbers in their chat. |
| [PD18](decisions/pd-18-moderation.md) | Moderation: report reasons, hiding and response times | Settled. The moderator (F-08) confirms it. Changed on 2026-10-26. | Seven fixed report reasons. A safety report, or reports from two people, hide a profile or a listing at once. Reviews take 4 or 24 hours. |
| [PD19](decisions/pd-19-retention.md) | Retention: how long roomsie keeps each kind of data | Settled. The privacy drafter (F-07) confirms it. Changed on 2026-10-26. | Visitor data goes after 30 days, raw events after 12 months, the ID photo and the selfie right after the review, and account data at deletion. |
<!-- ledger:end -->
