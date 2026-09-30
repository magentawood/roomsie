# PD0 — v0 is flatmate matching only

**Status:** Settled · **Deciders:** Yash

## Context

roomsie is the AI-native pivot of femmeflats. The V3 prototype shows flats and flatmates in one card grid. The broker model (PD3) and the monetisation model (PD4) wait on calls to Mumbai brokers. The team must decide what v0 contains.

## Decision

**In one line:** v0 is flatmate matching only, with no property listing objects: a person with a spare room is a person card.

- **v0 is flatmate matching only.**
- Property listings are not objects of their own. v0 has no property listing objects.
- A person with a spare room is a person card, not a listing.

| In v0 | After v0 |
|---|---|
| Flatmate matching, which includes people with a room to share | Property listings, brokers, payments |

## Rationale

- PD0 removes supply, brokers and money from v0.
- Thus, the cold start is a problem on one side only. Cold start has one side of a marketplace, not two.
- PD0 moves the broker work out of v0.
- The SEO area pages use people data. Thus, they continue to work.

## Consequences

- The broker work (PD3 and PD4) moves out of v0. It stays blocked on the calls. No work waits on it.
- Listing and broker verification are out of v0. They come back with PD3.
- The post-a-listing wizard from the V3 prototype is out of v0.
- The SEO area pages continue to work.
- Cold start is easier.
- In v0, each card in the results panel is a person, never a listing.
- **Open:** which intent cards ship in v0. Two of the four intent cards in the prototype are about property: "just a flat" and "I'm renting out a flat". This item conflicts with PD0. Either we hide the two property cards for launch, or they go to a location that does not exist at this time. The designer must tell the team which cards ship on 12 October.

## Sources

- [CONTEXT.md](../../CONTEXT.md): "Open decisions" table, row PD0, and its "Why" callout
- [product-base.md](../product-base.md): section 03 and its "Why" callout, and "Still open"
- [verification.md](../verification.md): "The v0 scope decision" and its "Why" callout, and "What verified gates in v0"
- [design-review.md](../design-review.md): items 1.2 and 4.3
