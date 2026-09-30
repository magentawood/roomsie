# Supply, brokers and duplicate listings

**Date:** 2026-09-19 · **Status:** research note, feeds decision PD3

This note examines three claims about the Indian rental market. Then it examines
the problem of duplicate listings. At the end, it gives a proposed model for
brokers and for users.

This note uses ASD-STE100 Simplified Technical English.

---

## Claim 1 — only a small fraction of properties reach online platforms

**Verdict: probably correct, but not proven. Do not put a number in the pitch.**

- No public source gives a clear value for the online part of the total rental supply.
- All sources describe the market as unorganised and fragmented. They give no numbers for it.
- The one usage number is from NoBroker's own blog. It says that 43% of renters in Mumbai use online portals to find a home.
- That number measures demand behaviour, not supply coverage. The source has an interest in the result.

Safe facts:

- The market has no Multiple Listing Service. India has no central database of available property.
- Attempts to make one exist, but they stayed small.

**Next step:** treat the claim as a hypothesis. Measure it in Mumbai during the pilot. Count the listings that a set of brokers hold, and compare them with the listings that they publish online.

> [!note]- Why
> - Only two facts are safe to state.
> - Listings of India started in December 2015.
> - MyBroker runs a verified broker community.

## Claim 2 — the no-broker platforms carry brokers, and charge like brokers

**Verdict: the first half is correct. The second half is half true.**

- Duplicates and reposts occur on all high-volume rental platforms.
- The price comparison is weaker than it seems.

| Item | Amount |
|---|---|
| NoBroker owner plans | ₹3,399 to ₹10,999 plus 18% GST |
| NoBroker tenant plan | ₹999 for 45 days |
| NoBroker property management | 8% of monthly rent |
| 99acres broker packages | from approximately ₹3,149 each month |
| 99acres reported broker spend | ₹4,000 to ₹60,000 each month |
| Traditional Mumbai brokerage | approximately one month of rent, sometimes more |

- The top owner plan costs less than one month of Mumbai rent. Thus, the fee is lower than brokerage.
- At the top tier, the fee has the same order of magnitude as brokerage.

**The important difference is the time when you pay.**

| Model | Fee type |
|---|---|
| Brokerage | Success fee |
| Platform subscription | Not a success fee |

- Payment to search, not on success, is the real defect in the incumbent model.
- Users report that they paid for a plan, and then got no visits and no leads.
- NoBroker, FY24: ₹803 crore of operating revenue, an increase of 32% from ₹609 crore. Subscriptions were 99% of income. The loss was ₹411 crore.
- The business grows when it sells more searches, not when more people move.

> [!note]- Why
> - The real difference is more useful than the claim.
> - Brokers do operate on these platforms. Reports describe broker reposts.
> - Reports also describe brokers who say that they are owners, to collect leads.
> - The important difference is not the amount.
> - You pay the broker when you sign a lease.
> - With a subscription, you pay to search. You pay if you find a home, and you pay if you do not.
> - This defect explains the complaints. It also explains the accounts of NoBroker.

## Claim 3 — the same property appears many times

**Verdict: correct.**

- The cause is the open listing. In India, an owner does not sign an agreement with only one broker.
- No rule stops brokers who publish the same flat.

Other factors:

1. Brokers repost to refresh the timestamp and stay high in the results.
2. Some brokers publish a flat that they do not actually control, to collect leads.
3. Platforms reward listing volume.

**Is this problem worth a solution? Yes, but not as a data cleaning task.**

- The cause is structural.
- A platform that charges for listing slots will always attract duplicates.

> [!note]- Why
> - The problem has a clear cause.
> - The owner tells five brokers. Then each broker has a correct reason to publish the same flat.
> - No Multiple Listing Service exists to enforce one listing for one property.
> - Three things make the problem worse.
> - Platforms reward listing volume because listing volume is what they sell.
> - In the United States, the Multiple Listing Service rejects a second entry for the same property.
> - There, a person who enters a listing without a written agreement must pay a fine. India has no control of this type.
> - Deduplication treats the symptom.
> - Each duplicate is one more chance to win the lead.

---

## The proposed model

### The core move: stop selling search, start selling a qualified introduction

- roomsie has one asset that the incumbents do not have: the assistant interviews the user.
- After the interview, the user is a qualified seeker.
- **Listing is free and unlimited for brokers.**
- **The broker pays only for the introduction.**
- roomsie charges when the assistant sends a matched, interviewed seeker who agrees to an introduction.
- **The user pays nothing to search.**

> [!note]- Why
> - At the end of the interview, roomsie knows the intent, the budget, the areas, the move date and the dealbreakers.
> - A qualified seeker is worth much more to a broker than a listing slot.
> - roomsie can make a qualified seeker at a low cost, because the interview is the product.
> - Free listing pulls in the scattered supply. It removes the reason to hold inventory back.
> - This model is the opposite of the incumbent model. The incumbent sells access to a search.
> - The incumbent gets money when nobody moves. roomsie gets money closer to the move.

### Why this fixes duplicates instead of fighting them

- If listing is free, duplicates increase.
- Resolve the duplicates into one property. Match on building, unit, rent, photos and layout.
- Show the user **one** property card.
- Behind that card, keep the set of brokers who offer the property.
- When the user asks for an introduction, route it to one broker.
- Choose the broker on response time, on accuracy of the listing, and on the fee that the broker will accept.
- The incumbents cannot easily copy this structure.

> [!note]- Why
> - More duplicates are not a problem, because roomsie does not sell listing slots.
> - Then the duplicate is not a defect. It becomes competition for the introduction.
> - The broker who answers fastest and describes the flat honestly wins the lead.
> - The revenue of the incumbents depends on the sale of the listing slot that creates the duplicate.

### What each side gets

- The broker gets a reason to keep listings accurate.

> [!note]- Why
> - Accuracy wins the routing.
> - The broker pays no monthly subscription.
> - The broker gets seekers who already stated a budget, an area, a date and their dealbreakers.
> - The user pays no fee for the introduction.
> - The user gets an assistant that read all the listings and asked what the user actually needs.

### The honest risks

| # | Risk | Response | Status |
|---|---|---|---|
| 1 | **Off-platform leakage.** When the broker has the phone number, the deal can close outside roomsie. | Charge at the introduction, not at the close of the deal. Keep numbers hidden until the introduction. | The prototype already hides the numbers. |
| 2 | **Brokers may not pay for each lead.** | Test the price during the Mumbai pilot, before you build billing. | — |
| 3 | **A free listing tier attracts junk.** | Broker verification becomes load-bearing. | The prototype has no broker verification at all today. |
| 4 | **Deduplication is hard without addresses.** | Deduplication needs a property identity of some type. This need conflicts with the current privacy design. roomsie must resolve this conflict. | The prototype deliberately never collects the address. |
| 5 | **Brokers break the all-genders trust story differently.** | roomsie dropped the women-only promise. Thus, roomsie must rebuild the safety argument. | — |

> [!note]- Why
> - Risk 1: if roomsie charges at the introduction, roomsie already has the fee.
> - Risk 2: Indian brokers expect subscriptions and free listing.
> - Risk 5: brokers have the lowest trust of all actors in the market.

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
