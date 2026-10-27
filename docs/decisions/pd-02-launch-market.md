# PD2 — Mumbai first

**Status:** Settled. Changed on 2026-10-27. · **Date:** 2026-09-19 · **Deciders:** Yash; n3rxv for the founders on 2026-10-27

## Context

roomsie must choose one launch market. The infrastructure region is `ap-south-1` / `bom` / `bom1`.

## Decision

**In one line:** roomsie launches in all of Mumbai, in the nine area groups of the designs, and each visitor from outside Mumbai joins a waitlist.

- **The launch market is Mumbai.**
- **Each area is live.** The areas are the nine area groups of the designs: Andheri–Goregaon, Bandra–Santacruz, Powai–Vikhroli, Lower Parel–Worli, South Mumbai, Malad–Borivali, Chembur–Ghatkopar, Thane and Navi Mumbai. A search in each of them shows its results.
- **Outside Mumbai, a waitlist.** A search for a place outside the nine area groups shows "Roomsie is only in Mumbai for now" and the waitlist form.
- **Areas to seed first.** Marketing seeds some area groups first, so that the first searches there have full panels (F-06). These areas are a seeding plan, not a gate.

## Rationale

- Mumbai agrees with the current infrastructure region (`ap-south-1` / `bom` / `bom1`). The region is the same as the stack.
- Mumbai has the highest rents.
- Mumbai has the most acute need for flatshares.
- A person who rents in Mumbai searches across its areas. A closed area loses a real visitor, and a thin panel can still offer the suggested posts of [PD6c](pd-06c-interface-holes.md).

## Alternatives rejected

- **Three launch area groups, and a waitlist for the other six.** A closed area loses a real visitor, and marketing can seed some areas first without a gate (2026-10-27).
- **All of the city with no area groups.** The designs use the nine area groups ([PD14](pd-14-v0-is-the-figma-designs.md)).

## Consequences

- Brokers control most of the supply.
- Visitors from outside Mumbai go to a waitlist. The waitlist tells marketing where to open next.
- An area with few seeded profiles shows a thin panel.

Superseded (2026-10-24): three neighbourhoods. The designs use the nine area groups ([PD14](pd-14-v0-is-the-figma-designs.md)).

Superseded (2026-10-27): three launch area groups, and a waitlist for the other area groups. Each Mumbai area is live.

## Revisit when

- Seeding shows many thin panels in an area group that marketing cannot reach.
- A city outside Mumbai has a long waitlist.

## Sources

- [CONTEXT.md](../../CONTEXT.md): "Decisions taken in this session" table, row PD2, and its "Why" callout
- [product-base.md](../product-base.md): section 02 and its "Why" callout
- The decision of the user on 2026-10-27, in the session of T-44: "for Mumbai we are mapping each and every area"
