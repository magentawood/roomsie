# PD2 — Mumbai first

**Status:** Settled. Changed on 2026-10-27. · **Date:** 2026-09-19 · **Deciders:** Yash; n3rxv for the founders on 2026-10-27

## Context

roomsie must choose one launch market. The infrastructure region is `ap-south-1` / `bom` / `bom1`.

## Decision

**In one line:** Roomsie launches in all of Mumbai, in ten area groups and their sub-areas, and each visitor from outside Mumbai joins a waitlist.

- **The launch market is Mumbai.**
- **Each area is live.** The ten area groups are the nine of the designs and Dadar–Sion: Andheri–Goregaon, Bandra–Santacruz, Powai–Vikhroli, Lower Parel–Worli, Dadar–Sion, South Mumbai, Malad–Borivali, Chembur–Ghatkopar, Thane and Navi Mumbai. A search in each of them shows its results.
- **Sub-areas.** Each group has the sub-areas that renters and brokers use. The list is the broker list of the founders, with the places that the rental portals list, and the seed holds it ([T-56](../plan/tasks/T-56%20Sub-areas%20API.md)).
  - East and West are two sub-areas where the portals list them separately, for example Malad West and Malad East.
  - A pocket is a sub-area inside a sub-area, for example Versova in Andheri West.
  - A pick of an area includes the areas under it.
- **Where Mumbai ends.** These places are live: the BMC area, Mira–Bhayandar, the Thane Municipal Corporation, and Navi Mumbai with the Panvel nodes and Ulwe. A search for a place outside them, for example Vasai–Virar, Kalyan–Dombivli or Bhiwandi, shows "Roomsie is only in Mumbai for now" and the waitlist form.
- **Areas to seed first.** Marketing seeds some area groups first, so that the first searches there have full panels (F-06). These areas are a seeding plan, not a gate.

## Rationale

- Mumbai agrees with the current infrastructure region (`ap-south-1` / `bom` / `bom1`). The region is the same as the stack.
- Mumbai has the highest rents.
- Mumbai has the most acute need for flatshares.
- A person who rents in Mumbai searches across its areas. A closed area loses a real visitor, and a thin panel can still offer the suggested posts of [PD6c](pd-06c-interface-holes.md).
- Renters and brokers name a sub-area, not a group. Rents differ between the sides of a station: Bandra West and Bandra East are two markets.
- Dadar, Mahim, Matunga, Sion and Wadala are one central rental market, and no group of the designs has them.
- Mira Road is one stop past Dahisar, and NoBroker and 99acres file it under Mumbai. Mumbra and Diva are in the Thane Municipal Corporation, so the whole corporation is live.

## Alternatives rejected

- **Three launch area groups, and a waitlist for the other six.** A closed area loses a real visitor, and marketing can seed some areas first without a gate (2026-10-27).
- **All of the city with no area groups.** The designs use the area groups ([PD14](pd-14-v0-is-the-figma-designs.md)).
- **Dadar to Wadala in Lower Parel–Worli.** A renter from Dadar or Sion does not tap "Lower Parel–Worli", and its rents are much higher (2026-10-27).
- **One sub-area for each place, as in the broker list.** A card says "Bandra" for two different markets (2026-10-27).
- **Pockets as other names of their sub-area.** A seeker cannot pick "only Hiranandani Gardens", and Versova leaves the broker list (2026-10-27).
- **Mira–Bhayandar on the waitlist.** It has over 1,300 rental listings on Square Yards, one stop past Dahisar (2026-10-27).

## Consequences

- Brokers control most of the supply.
- Visitors from outside Mumbai go to a waitlist. The waitlist tells marketing where to open next.
- An area with few seeded profiles shows a thin panel.
- A listing in a whole area group from before the sub-areas stays live. Its next edit picks a sub-area.

Superseded (2026-10-24): three neighbourhoods. The designs use the nine area groups ([PD14](pd-14-v0-is-the-figma-designs.md)).

Superseded (2026-10-27): three launch area groups, and a waitlist for the other area groups. Each Mumbai area is live.

Superseded (2026-10-27): the nine area groups with no sub-areas. There are ten groups, with sub-areas and pockets.

## Revisit when

- Seeding shows many thin panels in an area group that marketing cannot reach.
- A city outside Mumbai has a long waitlist.
- Kalyan–Dombivli or Vasai–Virar has a long waitlist. Each can become a group.

## Sources

- [CONTEXT.md](../../CONTEXT.md): "Decisions taken in this session" table, row PD2, and its "Why" callout
- [product-base.md](../product-base.md): section 02 and its "Why" callout
- The decision of the user on 2026-10-27, in the session of T-44: "for Mumbai we are mapping each and every area"
- The decisions of the user on 2026-10-27 in the grill of the sub-areas ([spec](../specs/sub-areas.md)), from the broker list of the founders and a research of the rental portals
