# PD3a — Matching: who sees what, the filters and the order

**Status:** Settled · **Date:** 2026-10-25 · **Deciders:** n3rxv, for the founders

## Context

- PD15 gives a seeker one of five place types, and puts the dealbreakers on seven must-haves. PD14 puts listings into v0.
- The designs show no score number. Results sort by "Best Matches".
- Seeded profiles will have gaps, and PD11 needs a full panel in each launch area.

## Decision

**In one line:** Each place type sees its own kind; must-haves filter both ways between people; gaps rank lower; a plain "Best match" label marks full fits.

**Who sees what (PC-20)**

| The seeker wants | The seeker sees |
|---|---|
| `room` | room-in-a-flat listings |
| `pg` | PG listings |
| `whole_flat` | owner flats and broker flats |
| `flatmates` | other `flatmates` seekers |
| `unclear` | nothing, until the assistant asks |

A chip widens a search by one kind, for example "Show some PGs too".

**What each must-have checks (PC-47)**

| Must-have | On a person | On a listing |
|---|---|---|
| Veg kitchen | Food is Veg. Jain is a different category. | The kitchen is "Veg Only" |
| Non-smokers | Smoking is Non-smoker | "No Smoking" |
| No alcohol at home | Drinks is "None at home" | "No Alcohol at home" |
| Tidy flatmates | Tidiness is Very tidy or Tidy enough | Does not apply |
| Couple friendly | Does not apply | "Who is welcome" has Couples |

Women only and Men only wait for F-13 (PC-30).

**Filters**

- **Between people, the dealbreakers are mutual (PC-24).**
- **A listing filters on "Who is welcome" (PD15) and on the searcher's must-haves.** Its house rules show on the card.
- **A gap does not hide a card (PC-25).** A card with an unanswered dealbreaker shows below the full matches, with the label "Didn't say: …".
- **Budget (PC-26).** The query compares the budget with the rent. A listing passes if one of its rents fits. For a PG and a "private" seeker, only the Single rent counts. A rent up to 10% over the budget passes, and ranks below the rents in the budget. The budgets of two `flatmates` seekers must overlap. Maintenance and deposit do not filter.
- **Move date (PC-26).** It passes in a window of 30 days before or after. An empty move date passes.

**Order and label (PC-23, PC-33, PC-28)**

- The "Best Matches" order:
  1. Full matches.
  2. In budget.
  3. The most preferences met.
  4. Form B notes, as a tie-break.
  5. The nearest move date.
  6. Newest.
- A "Best match" label shows when the searcher stated three or more preferences and the card meets all of them. There is no score number and no sentence.

## Rationale

- A strict mapping reads as most people in Mumbai mean it.
- Mutual dealbreakers between people stop connect requests that the other person will decline. A house rule is the promise of the lister. The seeker decides.
- A hidden gap empties the panel, and a label stays honest.
- With one or two preferences, a score is noise. A label is true and simple.

## Alternatives rejected

- **Wider results by default.** It mixes in results that the person did not ask for. The chips of the designs do this on request.
- **A loose mapping.** An egg-eater meets a strict veg household.
- **Mutual for listings too.** "Smokes" does not mean "smokes indoors". Good matches disappear.
- **Hide a card with a gap.** Seeded profiles disappear at launch.
- **No budget leeway.** The filter hides a ₹15,500 room from an "Under ₹15k" seeker.
- **A score number, or a sentence beside the label.** A number reads 70% for no preference met. The product team wants a plain label.
- **Form B neither shown nor ranked.** The product team wants the context of the chat in the order.

## Consequences

- A Form B note that is not correct can move a card down (PD7a).

## Revisit when

- F-13 decides PC-30 (gender).
- The launch shows many empty panels, or many declined connect requests.

## Sources

- The F-12 grill ([#104](https://github.com/magentawood/roomsie/issues/104)), and the Product file: results, cards and "No relevant results"
- [PD15](pd-15-form-a-contract.md), [PD14](pd-14-v0-is-the-figma-designs.md), [PD11](pd-11-launch.md)
