# PD3d — Identity restrictions in published listings

**Status:** Settled for the fields of the listing flow. Free text is open in PC-37. · **Date:** 2026-10-24 · **Deciders:** n3rxv, for the founders

## Context

PD3c settles the private-filter case. A user can state a community or religion preference, and roomsie filters on it for that user only.

A published listing is a different case. For example, a roomsie listing that says "no Muslims" is an advertisement.

- A seeker who privately filters the results for their own use is one position. A published listing is a different position.
- Most press exposure and future regulatory exposure is on listings.
- The realistic bad result is a news story about a housing app, not a court case.

## Decision

**In one line:** A listing shows the "Who is welcome" choices of the listing flow, and free text waits for PC-37.

- **A listing shows its "Who is welcome" choices:** students, working professionals, couples, families and bachelors. The listing flow says: "Seekers see it as your promise."
- The same choices filter the results of a seeker on the server (PD15).
- The listing flow has no community or religion choice.
- **"Who can move in" (men, women, any) waits for F-13 (PC-30).**
- **Free text waits for F-13 (PC-37).** A description or a bio can name a community.

PD3d is a different decision from PD3c. PD3c decided only the private-filter case.

## Rationale

- The designs show the choices on the listing (PD14).
- A seeker who is not welcome does not spend a call.
- An advertisement is a different position from a private filter.
- "Decide the listing side independently" is mitigation 5 of PD3c.

## Consequences

- A listing that says "Families only" is an advertisement. The public policy page of PD3c names this case.
- PC-37 decides the free text.

## Sources

- [CONTEXT.md, PD3c and PD3d rows, and the Why callout below the open decisions](../../CONTEXT.md)
- [product-base.md, section 05 "Still open" callout, and the "Still open" table](../product-base.md)
- [assistant-risks.md, section 4.1 "The exposure that remains", and mitigation 5](../assistant-risks.md)
