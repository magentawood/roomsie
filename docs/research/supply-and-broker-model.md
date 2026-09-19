# Supply, brokers and duplicate listings

**Date:** 2026-09-19 · **Status:** research note, feeds decision D3

This note checks three claims about the Indian rental market. It then examines
the duplicate listing problem. It ends with a proposed model for brokers and
for users.

Written in ASD-STE100 Simplified Technical English.

---

## Claim 1 — only a small fraction of properties reach online platforms

**Verdict: probably true, but not proven. Do not put a number in the pitch.**

No public source gives a clean split of online supply against total rental
supply. Sources agree that the market is unorganised and fragmented. They do
not quantify it.

The one usage figure available comes from NoBroker's own blog. It says 43% of
renters in Mumbai use online portals to find a home. That measures demand
behaviour, not supply coverage. It is also a self-interested source.

Two facts are safe to state:

- The market has no Multiple Listing Service. India has no central database of
  available property.
- Attempts to build one exist but stayed small. Listings of India started in
  December 2015. MyBroker runs a verified broker community.

Treat the claim as a hypothesis. Measure it in Mumbai during the pilot. Count
the listings a set of brokers hold against the listings they publish online.

## Claim 2 — the no-broker platforms carry brokers, and charge like brokers

**Verdict: the first half is true. The second half is half true, and the real
difference is more useful than the claim.**

Brokers do operate on these platforms. Reports describe broker reposts, and
brokers who present themselves as owners to collect leads. Duplicates and
reposts occur on every high-volume rental platform.

The pricing comparison is weaker than it looks.

| Item | Amount |
|---|---|
| NoBroker owner plans | ₹3,399 to ₹10,999 plus 18% GST |
| NoBroker tenant plan | ₹999 for 45 days |
| NoBroker property management | 8% of monthly rent |
| 99acres broker packages | from about ₹3,149 per month |
| 99acres reported broker spend | ₹4,000 to ₹60,000 per month |
| Traditional Mumbai brokerage | about one month of rent, sometimes more |

The top owner plan is less than one month of Mumbai rent. So the fee is lower
than brokerage. It is the same order of magnitude at the top tier.

**The important difference is not the amount. It is when you pay.**

Brokerage is a success fee. The broker gets paid when you sign a lease.
A platform subscription is not a success fee. You pay to search. You pay
whether or not you find a home.

This is the real defect in the incumbent model. It explains the complaints.
Users report that they paid for a plan and then got no visits and no leads.

It also explains the accounts. NoBroker took ₹803 crore of operating revenue
in FY24, up 32% from ₹609 crore. Subscriptions were 99% of income. The loss
was ₹411 crore. The business grows by selling more searches, not more moves.

## Claim 3 — the same property appears many times

**Verdict: true, and it has a clear cause.**

The cause is the open listing. An owner in India does not sign one broker. The
owner tells five brokers. Every broker then has a valid reason to publish the
same flat. No rule stops them, because no Multiple Listing Service exists to
enforce one listing for one property.

Three things then make it worse:

1. Brokers repost to refresh the timestamp and stay high in the results.
2. Some brokers publish a flat they do not actually control, to collect leads.
3. Platforms reward listing volume, because listing volume is what they sell.

Compare the United States. There, the Multiple Listing Service rejects a second
entry for the same property, and entering a listing without a written agreement
carries a fine. India has no such control.

**Is it a problem worth solving? Yes, but not as a data cleaning task.**

Deduplication treats the symptom. The cause is structural. A platform that
charges for listing slots will always attract duplicates, because each
duplicate is a separate chance to win the lead.

---

## The proposed model

### The core move: stop selling search, start selling a qualified introduction

roomsie has one asset the incumbents do not have. The assistant interviews the
user. At the end of the interview roomsie knows the intent, the budget, the
areas, the move date and the dealbreakers. That is a qualified seeker.

A qualified seeker is worth much more to a broker than a listing slot. It is
also cheap for roomsie to produce, because the interview is the product.

So:

- **Listing is free and unlimited for brokers.** This pulls in the scattered
  supply. It removes the reason to hold inventory back.
- **The broker pays for the introduction.** roomsie charges when the assistant
  sends a matched, interviewed seeker who agrees to be introduced.
- **The user pays nothing to search.** The user never pays to be shown a flat.

This inverts the incumbent model. The incumbent sells access to a search. It
gets paid when nobody moves. roomsie gets paid closer to the move.

### Why this fixes duplicates instead of fighting them

If listing is free, duplicates increase. That is fine, because roomsie does not
sell listing slots.

Resolve the duplicates into one property. Match on building, unit, rent,
photos and layout. Show the user **one** property card.

Behind that card, hold the set of brokers who offer it. When the user asks for
an introduction, route it to one broker. Choose on response time, on accuracy
of the listing, and on the fee the broker will accept.

The duplicate then stops being a defect. It becomes competition for the
introduction. The user sees one clean result. The broker who answers fastest
and describes the flat honestly wins the lead.

This is a structure the incumbents cannot copy easily. Their revenue depends on
selling the listing slot that creates the duplicate.

### What each side gets

**The broker gets:**

- Free, unlimited listing. No monthly subscription.
- Seekers who already stated a budget, an area, a date and their dealbreakers.
- Payment only when a real introduction occurs.
- A reason to keep listings accurate, because accuracy wins the routing.

**The user gets:**

- One card for one flat. No duplicate results.
- No fee to search, and no fee to be introduced.
- An assistant that has read every listing and asked what they actually need.

### The honest risks

1. **Off-platform leakage.** Once the broker has the phone number, the deal can
   close outside roomsie. Charge at introduction, not at closing, so the fee is
   already collected. Keep numbers hidden until the introduction, which the
   prototype already does.
2. **Brokers may not pay per lead.** Indian brokers are used to subscriptions
   and to free listing. Test the price during the Mumbai pilot before building
   billing.
3. **A free listing tier attracts junk.** Verification of the broker becomes
   load-bearing. The prototype has no broker verification at all today.
4. **Deduplication is hard without addresses.** The prototype deliberately never
   collects the address. Deduplication needs a property identity of some kind.
   This conflicts with the current privacy design and must be resolved.
5. **Brokers break the all-genders trust story differently.** roomsie dropped
   the women-only promise, so the safety argument must be rebuilt, and brokers
   are the least trusted actors in the market.

---

## Sources

- [NoBroker owner and tenant plans](https://www.nobroker.in/forum/what-is-the-difference-between-the-nobroker-tenant-plans/)
- [NoBroker property management, 8% of rent](https://www.nobroker.in/blog/nobroker-launches-property-management-services/)
- [Broker commission rates in India](https://www.nobroker.in/forum/what-is-the-going-broker-fees-is-it-one-month/)
- [NoBroker FY24 revenue ₹803 Cr, loss ₹411 Cr](https://entrackr.com/fintrackr/nobroker-reports-rs-803-cr-revenue-in-fy24-but-57-expenses-remain-unexplained-9063969)
- [NoBroker loss and expense detail](https://investmentguruindia.com/newsdetail/real-estate-platform-nobroker-clocks-rs-411-crore-loss-in-fy24-expenses-rise195066)
- [NoBroker business model, subscriptions 99% of income](https://startuptalky.com/nobroker-business-model/)
- [99acres and MagicBricks broker package pricing](https://closingfox.com/for-business-owners/99acres-vs-magicbricks-vs-housing/)
- [MagicBricks subscription model](https://www.markhub24.com/post/magicbricks-subscription-model-for-listings)
- [Broker reposts and duplicate listings on rental platforms](https://www.nestriqo.com/blog/nobroker-owner-listings-review)
- [Complaints about paid plans and no leads](https://www.consumercomplaints.in/nobroker-b115732)
- [Multiple Listing Service rules against duplicate entries](https://support.canopymls.com/kb/article/74-duplicate-listings/)
- [Open listings and bait-and-switch by agents](https://www.brickunderground.com/rent/are-duplicate-listings-on-search-sites-normal)
- [Only one agent may list on the MLS](https://www.homelight.com/blog/can-two-realtors-list-the-same-property/)
- [India has no central broker database; MLS attempts](https://www.newswire.com/news/launch-of-multiple-listing-services-in-indian-real-estate-industry-7475000)
- [Indian rental market described as unorganised](https://www.forbes.com/sites/ranisingh/2016/05/28/indias-20-billion-unorganised-residential-rental-market-and-a-tech-start-up-disruptor/)
- [Portal usage share among renters, NoBroker's own data](https://www.nobroker.in/blog/indian-rental-habits-and-trends/)
