# PD4 — Monetisation model and pricing

**Status:** Pending · **Deciders:** Yash

## Context

PD4 follows PD3, which decides where listing supply comes from at launch. The team deferred PD3 until the broker interviews.

The incumbent model:

- NoBroker, FY24: ₹803 crore of operating revenue. Subscriptions were 99% of income. The loss was ₹411 crore.
- NoBroker owner plans cost ₹3,399 to ₹10,999 plus 18% GST. The tenant plan costs ₹999 for 45 days.
- 99acres broker packages start at approximately ₹3,149 each month.
- Traditional Mumbai brokerage is approximately one month of rent, sometimes more.
- You pay the broker when you sign a lease. With a subscription, you pay to search. You pay if you find a home, and you pay if you do not.
- Users report that they paid for a plan, and then got no visits and no leads.

Duplicate listings come from the structure of the market. Owners give the same flat to many brokers, and India has no shared listing service.

## Decision

**In one line:** Pending: v0 is free, and the v1 working hypothesis is that brokers list free and pay only for an introduction to a matched seeker.

No decision at this time. **v0 is free.** There is no monetisation in two weeks. PD4 moves to v1.

The working hypothesis:

- Brokers list for free, with no limit.
- Brokers pay only when the assistant sends them a seeker that it interviewed and matched, and who agrees to an introduction.
- Users never pay to search.
- roomsie merges duplicates into one card. Behind that card, the brokers compete for the introduction.

## Rationale

- **Incumbents sell search, so they get money when nobody moves.** roomsie gets money closer to the move.
- There is nothing to charge for in v0.
- At the end of the interview, roomsie knows the intent, the budget, the areas, the move date and the dealbreakers.
- A qualified seeker is worth much more to a broker than a listing slot.
- roomsie can make a qualified seeker at a low cost, because the interview is the product.
- Free listing pulls in the scattered supply. It removes the reason to hold inventory back.
- roomsie does not sell listing slots. Thus, a duplicate is not a defect. It becomes competition for the introduction.
- The broker who answers fastest and describes the flat honestly wins the lead. Thus, the broker gets a reason to keep listings accurate.
- Charge at the introduction, not at the close of the deal. Then roomsie has the fee before the deal can close outside roomsie.

## Consequences

- The hypothesis is unproven. It waits for the broker calls from marketing. It is not in v0.
- PD0 moves the broker work (PD3 and PD4) out of v0. It stays blocked on the calls. No work waits on it.
- Brokers may not pay for each lead, because Indian brokers expect subscriptions and free listing. Test the price during the Mumbai pilot, before you build billing.
- Keep phone numbers hidden until the introduction.
- A free listing tier attracts junk. Thus, broker verification becomes load-bearing.
- `product-base.md` keeps "Brokers and monetisation" in its "Still open" list as **[Testing]**.

## Revisit when

The marketing calls to Mumbai brokers test the model of free listings and paid introductions.

## Sources

- [CONTEXT.md, PD3 and PD4 rows, and the "Ready to start now" table](../../CONTEXT.md)
- [product-base.md, section 14 and its Why callout, and the "Still open" table](../product-base.md)
- [launch-plan.md, Assumptions](../archive/2026-09-launch-plan.md)
- [verification.md, the v0 scope decision](../verification.md)
- [research/supply-and-broker-model.md, Claim 1, Claim 3, the proposed model and the honest risks](../research/supply-and-broker-model.md)
