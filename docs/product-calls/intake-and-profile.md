# Product calls: intake, Form A and profile data

**Task:** F-11 · **Status:** open · **Updated:** 2026-10-04

## How to run this session

- Ask the questions in rounds. Start a round when the rounds before it have answers.
- Ask one question at a time.
- Write each answer in the named record. Then delete the question from this file.
- Do not ask again about a settled record, for example PD0, PD3b, PD3c, PD6c or PD7a.

## Round 1

### PC-02 · Which intent cards ship

❓ Which of the four prototype intent cards ship on 12 October?

- **Today:** T-08 names the four prototype cards (`docs/team-plan.json`). The schema uses a different set: `has_flat`, `wants_flat`, `wants_room`, `open`, `unclear` (`apps/api/src/db/schema.ts:28`).
- **Options:** a) all four cards b) hide "just a flat" and "I'm renting out a flat" c) three person cards that map to the schema enum
- **Blocks:** T-06, T-08, T-09, T-14, T-16a, T-16b, M-06
- **Record:** [PD0](../decisions/pd-00-v0-scope.md), its "Open" item

➡️ **Recommended:** c) "I have a room to share" (`has_flat`), "I need a room" (`wants_room`) and "Find flatmates to rent a flat together" (`wants_flat`). PD0 rules out property listings, so "just a flat" goes. A person with a spare room is a person card. The enum does not change.

### PC-03 · The lifestyle axes and their answers

❓ Which lifestyle questions does the assistant ask, and which answers does each allow?

- **Today:** `seed-axes.ts:28-83` seeds nine axes, which include `community`. T-08 lists a different nine (`docs/team-plan.json`).
- **Options:** a) the seeded nine b) the T-08 nine c) the seeded list without `community`
- **Blocks:** T-08, T-12, T-14, T-16a, T-16b, T-27, M-03, M-06
- **Record:** new PD (Form A contract)

➡️ **Recommended:** c) Ship eight axes with their seeded answers. [PD3c](../decisions/pd-03c-exclusionary-preferences.md) forbids questions or chips about community, so `community` cannot be an asked axis. No record requires the number nine.

### PC-04 · Prefer or dealbreaker, or a scale

❓ Does each lifestyle answer have two weights, "prefer" and "dealbreaker"? Or do people score their preferences?

- **Today:** two weights, `prefer` and `dealbreaker` (`apps/api/src/db/schema.ts:37`).
- **Options:** a) two weights b) a weight from 1 to 5 c) a ranked list
- **Blocks:** T-06, T-14, T-16a, T-16b, M-06
- **Record:** [PD3a](../decisions/pd-03a-flatmate-matching.md)

➡️ **Recommended:** a) Two weights. The code uses them, and a chip can show them. A scale needs a migration.

### PC-07 · Where a user sees and corrects Form B notes

❓ Where does a user see and correct the observer notes about them at launch?

- **Today:** PD7a says the user can see and edit Form B. No screen task holds it. T-16b covers only Form A and photos (`docs/team-plan.json`).
- **Options:** a) a notes list on the profile b) in the chat only c) nowhere at launch
- **Blocks:** T-16b, T-35, T-36, D-03
- **Record:** [PD7a](../decisions/pd-07a-agent-architecture.md)

➡️ **Recommended:** a) A list on the profile screen, with the quote and an edit and a delete for each note. PD7a relies on this view for DPDP access and correction.

### PC-21 · Area names and the top-six chips

❓ Which Mumbai areas do we list, at what detail? Which six show as chips?

- **After:** PC-01, the three launch areas (task F-06)
- **Today:** the `areas` table is empty. Its slugs are permanent URLs (`apps/api/src/db/schema.ts:142-150`).
- **Options:** a) large areas ("Andheri") b) local areas ("Andheri West", "Andheri East") c) a mix
- **Blocks:** T-09, T-12, T-22a, M-01, M-03
- **Record:** [PD2](../decisions/pd-02-launch-market.md)

➡️ **Recommended:** b) Use local areas. The chips are the three launch areas and their three nearest neighbours. A slug is permanent. If we divide an area after launch, its URLs break.

## Round 2

### PC-18 · What a person with a room states

❓ What does a person with a room tell us about the room? Is it part of the person card or a listing of its own?

- **After:** PC-02
- **Today:** a `listings` table holds rent, deposit, date and photos (`apps/api/src/db/schema.ts:177-218`). The match query uses the budget of a `has_flat` person as the rent (`apps/api/src/match/query.ts:129-132`).
- **Options:** a) room fields on the profile b) a hidden `listings` row c) no room details at launch
- **Blocks:** T-06, T-15, T-16a, T-16b
- **Record:** [PD0](../decisions/pd-00-v0-scope.md)

➡️ **Recommended:** a) Rent, deposit, available-from date and room type go on the profile. PD0 says that a person with a spare room is a person card, not a listing.

## Round 3

### PC-19 · Profile fields beyond Form A

❓ Apart from name, age and work, what does a profile hold?

- **After:** PC-02, PC-18
- **Today:** `displayName`, `age` (optional) and `work` only (`apps/api/src/db/schema.ts:65-67`).
- **Options:** a) the current three b) add a free-text bio c) add languages and more work details
- **Blocks:** T-16a, T-16b, D-03, M-06
- **Record:** new PD (profile)

➡️ **Recommended:** a) Keep the three, and make age required. Do not add a bio at launch. Free text brings [PD3d](../decisions/pd-03d-listing-identity-restrictions.md), which is open, into v0. Gender is a different call (PC-30).

### PC-29 · Room type

❓ Is room type a Form A slot? If yes, which values does it allow?

- **After:** PC-02, PC-18
- **Today:** the enum is `private`, `shared`, `whole_flat`, `unclear` (`apps/api/src/db/schema.ts:29`). T-08 does not list room type.
- **Options:** a) a slot with all values b) a slot without `whole_flat` c) not a slot
- **Blocks:** T-06, T-08, T-12
- **Record:** new PD (Form A contract)

➡️ **Recommended:** b) Keep the slot with `private` and `shared`. The `wants_flat` intent says "a whole flat", and PD0 has no property objects.

## Round 4

### PC-32 · When a person becomes a discoverable card

❓ Does the chat form become a public card? What makes a profile `live`? Does a connect request need a live profile?

- **After:** PC-19, and PC-05, the contact that we show ([connect-and-trust.md](connect-and-trust.md))
- **Today:** profiles start as `draft` (`apps/api/src/db/schema.ts:84`). Discoverability needs a phone (`docs/verification.md:125`).
- **Options:** a) the chat form goes live by itself b) the user publishes after sign-in c) a team member approves each profile
- **Blocks:** T-16a, T-16b, T-17, T-18a
- **Record:** new PD (profile)

➡️ **Recommended:** b) The user taps "Publish" when the profile has name, age, intent, areas, budget and contact. A connect request needs a live profile. [PD6b](../decisions/pd-06b-login-gate-and-search.md) puts details and messages behind sign-in, so nothing goes public without consent.

### PC-40 · What the seeding form collects

❓ Does the seeding form ask the launch profile fields, axes and weights, so that seeded people match on launch day?

- **After:** PC-03, PC-04, PC-18, PC-19, PC-29, and PC-01 (task F-06)
- **Today:** M-01 needs only the consent text and the launch areas (`docs/team-plan.json`).
- **Options:** a) the full profile b) contact details only, then invite to the app c) a short subset
- **Blocks:** M-01, M-06
- **Record:** [PD11](../decisions/pd-11-launch.md)

➡️ **Recommended:** a) The full profile. The match query hides a candidate with no answer on a dealbreaker axis (`apps/api/src/match/query.ts:140-152`). Thin seeded profiles can empty the panel.

## Round 5

### PC-38 · Photos

❓ Is the maximum four photos? Must a profile have a photo to go live?

- **After:** PC-32
- **Today:** a maximum of four (`docs/team-plan.json`). No rule makes a photo necessary.
- **Options:** a) four, optional b) four, one required c) six, one required
- **Blocks:** T-16a, T-16b
- **Record:** new PD (profile)

➡️ **Recommended:** a) Four, optional, with initials in place of a photo. PD11 needs 150 seeded profiles. A required photo stops some people at sign-up.
