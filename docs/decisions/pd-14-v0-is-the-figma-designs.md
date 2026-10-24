# PD14 — v0 is the product in the Figma designs

**Status:** Settled · **Date:** 2026-10-24 · **Deciders:** n3rxv, for the founders

## Context

- The designs arrived on 24 October. They are in three Figma files in "Roomsie's team":
  - **Product:** the page "Product screens", with four flows: 01 Entry and onboarding, 02 Search in chat, 03 Profile and settings, 04 Listing flow and my listings.
  - **Website:** the section "Final screens" is the master landing page, at desktop, tablet and mobile widths. The "Website" page of the Product file is a copy. Do not build from the copy.
  - **Roomsie design system (extended):** an Untitled UI kit (ADR-0011). Figtree type, a black and grey brand, and the Tailwind status colours.
- The designs show more than PD0 allowed. Flow 04 lets owners, flatmates, PG operators and brokers list a place. The results show five card kinds: flatmate, room in a flat, owner flat, PG or hostel, and broker flat.
- The designs also show in-app messages and a DigiLocker step. The plan had both after v0.

## Decision

**In one line:** v0 is the product that the three Figma files show, with listings from owners, flatmates, PG operators and brokers; this replaces PD0.

- **The Figma designs set the scope of v0.** If a doc or a task disagrees with the designs, the designs win. Change the doc or the task.
- **v0 has listing objects.** A lister selects one of four kinds: a room in my flat, a whole flat or house that I own, a PG or hostel that I run, or "I'm a broker".
- **v0 has in-app messages and DigiLocker verification,** as the designs show them.
- **These do not change:** v0 is free for users, open to all genders, and in Mumbai. The login gate stays as in PD6b.
- **Brokers list free in v0.** v0 has no payments. The broker price stays open in PD4.
- **A screen that the plan needs and the designs do not have is drafted from the patterns of the designs.** The drafts are on the page "Drafts · Missing screens (Claude)" of the Product file. The designer reviews them before a build task uses them.

## Rationale

- The designs are complete for four flows. The team builds what they show.
- One source for the scope stops the conflicts between the plan and the designs.

## Alternatives rejected

- **Keep PD0, and move flow 04 and the property cards to v1.** The product team wants the launch to be the product in the designs.

## Consequences

- PD0 is superseded.
- PD3 is no longer only a hypothesis. Listers supply the places at launch. Its risks 3 to 5 are now launch risks: junk listings, duplicates, and the trust in brokers.
- Listing, broker and DigiLocker verification come into v0. PD8 gives the method.
- The product calls that rested on PD0 are open again. The designs answer many of them. F-11 asks them again with the designs.
- T-41 to T-50 add the tasks for listings, messages, DigiLocker and the screens that had no task. T-08, T-14 and T-15 now include listings.
- The launch date is now open for selection in PD11 (PD12).

## Revisit when

- The designer changes a flow, or removes a screen.
- The broker calls from marketing are complete. Then decide the broker price in PD4.

## Sources

- [PD0](pd-00-v0-scope.md), [PD3](pd-03-listing-supply.md), [PD4](pd-04-monetisation.md), [PD8](pd-08-verification.md), [PD12](pd-12-team-plan.md)
- [extensibility.md](../extensibility.md)
