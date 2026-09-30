# PD3 — Where listing supply comes from at launch

**Status:** Deferred · **Deciders:** Yash

## Context

- In Mumbai, brokers control most of the supply (PD2).
- India has no Multiple Listing Service, and no central database of available property.
- Owners give the same flat to many brokers. Thus, the same property appears many times.
- NoBroker FY24: ₹803 crore of revenue, 99% from subscriptions. The loss was ₹411 crore.
- PD4 (pricing) follows PD3.

## Decision

**Deferred until the broker interviews.** It is not in v0.

**Working hypothesis:** brokers list free, and roomsie charges for a qualified introduction.

- **Listing is free and unlimited for brokers.**
- **The broker pays only for the introduction.** roomsie charges when the assistant sends a matched, interviewed seeker. The seeker must agree to the introduction.
- **The user pays nothing to search.**
- roomsie would merge duplicates into one property card. Behind that card, the brokers would compete for the introduction.

We will validate the hypothesis with calls to Mumbai brokers.

## Rationale

**Incumbents sell search, so they get money when nobody moves.**

- Payment to search, not on success, is the real defect in the incumbent model. You pay the broker when you sign a lease. With a subscription, you pay to search.
- Users report that they paid for a plan, and then got no visits and no leads.
- The incumbent business grows when it sells more searches. It does not grow when more people move. roomsie gets money closer to the move.

**The interview makes a qualified seeker.**

- At the end of the interview, roomsie knows the intent, the budget, the areas, the move date and the dealbreakers.
- A qualified seeker is worth much more to a broker than a listing slot.
- roomsie can make a qualified seeker at a low cost, because the interview is the product.
- Free listing pulls in the scattered supply. It removes the reason to hold inventory back.

**Duplicates become competition.**

- Duplicate listings come from the structure of the market. Deduplication treats the symptom.
- A platform that charges for listing slots will always attract duplicates.
- roomsie does not sell listing slots. Thus, more duplicates are not a problem.
- Resolve duplicates into one property. Match on building, unit, rent, photos and layout. Show the user **one** property card.
- Route each introduction to one broker. Choose the broker on response time, accuracy of the listing, and the fee that the broker will accept.
- The broker who answers fastest and describes the flat honestly wins the lead. Thus, the broker gets a reason to keep listings accurate.
- The revenue of the incumbents depends on the listing slot that creates the duplicate. Thus, they cannot easily copy this structure.

## Consequences

- The broker pays no monthly subscription. The broker gets seekers who stated a budget, an area, a date and their dealbreakers.
- The user pays no fee for the introduction.
- The broker work (PD3 and PD4) is out of v0 (PD0). It stays blocked on the calls. No work waits on it.
- Listing and broker verification are out of v0. They come back with PD3.
- The broker calls from marketing are the work with the highest value today.

**Risks:**

| # | Risk | Response |
|---|---|---|
| 1 | Off-platform leakage | Charge at the introduction, not at the close of the deal. Keep numbers hidden until the introduction. The prototype hides the numbers at this time. |
| 2 | Brokers may not pay for each lead. Indian brokers expect subscriptions and free listing. | Test the price during the Mumbai pilot, before you build billing. |
| 3 | A free listing tier attracts junk. | Broker verification becomes load-bearing. The prototype has no broker verification. |
| 4 | Deduplication is hard without addresses. | Deduplication needs a property identity. This conflicts with the privacy design. The prototype never collects the address. roomsie must resolve this conflict. |
| 5 | Brokers break the all-genders trust story differently. Brokers have the lowest trust of all actors in the market. | roomsie must rebuild the safety argument. |

- Do not put a number in the pitch for the online share of supply. Treat it as a hypothesis. Measure it in Mumbai during the pilot.

## Revisit when

The broker calls from marketing are complete.

## Sources

- [CONTEXT.md](../../CONTEXT.md): "Open decisions" table, rows PD3 and PD4
- [product-base.md](../product-base.md): section 14, "Unproven" and "Why" callouts, and "Still open"
- [supply-and-broker-model.md](../research/supply-and-broker-model.md): claims 1 to 3, "The proposed model", "The honest risks", and all "Why" callouts
- [verification.md](../verification.md): "The v0 scope decision" and "What verified gates in v0"
- [cost-and-team.md](../cost-and-team.md): "The 2 marketing people can start now"
