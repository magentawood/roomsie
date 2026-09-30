# PD2 — Mumbai first

**Status:** Settled · **Deciders:** Yash

## Context

roomsie must choose one launch market. The infrastructure region is `ap-south-1` / `bom` / `bom1`.

## Decision

**In one line:** roomsie launches in Mumbai, only in the three neighbourhoods with the most seeded profiles, and all other visitors join a waitlist.

- **The launch market is Mumbai.**
- Launch in the three Mumbai neighbourhoods that have the most seeded profiles.
- Do not launch in all of the city.

**Density is more important than coverage:**

- A visitor from a launch area sees a full panel.
- All other visitors join a waitlist for their area.
- The waitlist tells marketing where to seed next.

## Rationale

- Mumbai agrees with the current infrastructure region (`ap-south-1` / `bom` / `bom1`). The region is the same as the stack.
- Mumbai has the highest rents.
- Mumbai has the most acute need for flatshares.

## Consequences

- Brokers control most of the supply.
- Visitors from outside the launch areas go to a waitlist.

## Sources

- [CONTEXT.md](../../CONTEXT.md): "Decisions taken in this session" table, row PD2, and its "Why" callout
- [product-base.md](../product-base.md): section 02 and its "Why" callout
