# PD16 — Profiles: fields, adults only, profiles for a son or daughter, and visibility

**Status:** Settled · **Date:** 2026-10-24 · **Deciders:** n3rxv, for the founders

## Context

- The "Profile and settings" screen of the designs ([PD14](pd-14-v0-is-the-figma-designs.md)) shows the fields of a profile.
- "Who's moving" has the answer "Looking for my son or daughter". A parent signs in, and a different person moves.
- No record set a minimum age. Age was optional in the schema and in the designs.
- DPDP gives a data principal the right to consent. It has extra rules for children under 18.

## Decision

**In one line:** roomsie is for adults; a parent can run the card of an adult child; a card is visible when its required fields are complete.

- **Fields.** Full name, age, job role (the role only, never the company), commute address, a free-text bio ("What I want the others to know"), and the Form A fields of PD15. Gender waits for F-13 (PC-30).
- **Adults only.** roomsie is for people of 18 or more. Age is required. The terms page states the rule.
- **A profile for a son or daughter.** A parent can make a full profile, with name, age and photos, for a son or daughter of 18 or more. The card goes live on the word of the parent. It always shows "Managed by a parent". The parent sends and gets the messages.
- **A child under 18.** The parent searches and contacts listings only. The child gets no card.
- **Visibility.** A card becomes visible when its required fields are complete: name, age, who is moving, areas and budget. Settings has a "Hide my card" switch.
- **Photos.** A maximum of four, and a photo is optional. A card with no photo shows initials.

## Rationale

- The designs set the fields (PD14).
- An adults-only product keeps minors away from strangers, and keeps the DPDP rules for children out of matching.
- Parents in Mumbai often find the room of a son or daughter.
- Automatic visibility gives the most cards on launch day. The "You're discoverable" banner and the "Hide my card" switch tell the user, and give control.

## Alternatives rejected

- **The parent searches listings only, and the child gets no card.** The product team wants the full card.
- **The child confirms before the card goes live.** The product team does not want the wait.
- **No minimum age.** A minor could make a card and get messages from adults.
- **A "Publish" button.** It is not in the designs, and it gives fewer cards at launch.

## Consequences

- **A DPDP risk that we accept:** we show the name, age and photos of an adult who did not consent. The adult can ask us to delete the card through the grievance contact (T-23b). A complaint is possible.
- The designer adds a required mark to Age, and the "Hide my card" switch.
- A phone no longer gates visibility (verification.md). PC-05 decides how we collect a phone.
- F-13 decides how sign-in checks the age (PC-34), and what free text can say (PC-37).

## Revisit when

- A complaint comes from a son or daughter about a card that a parent made.
- DigiLocker verification (T-46) can check age.

## Sources

- [PD14](pd-14-v0-is-the-figma-designs.md), [PD15](pd-15-form-a-contract.md), [PD6b](pd-06b-login-gate-and-search.md), [PD8](pd-08-verification.md)
- The Product file: Profile and settings
