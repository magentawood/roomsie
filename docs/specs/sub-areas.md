# Spec: Sub-areas

**Status:** approved (2026-10-27) · **Grill:** 2026-10-27 · **Plan:** [T-56](../plan/tasks/T-56%20Sub-areas%20API.md), [T-57](../plan/tasks/T-57%20Sub-area%20pickers.md)

## Goal

Today a listing and a profile pick one of nine area groups, for example Andheri–Goregaon. Renters and brokers in Mumbai use smaller names: Andheri West, Versova, Ghodbunder Road. Each group gets the sub-areas of the Mumbai rental market. A lister picks the exact sub-area. A seeker picks a whole group or the sub-areas in it.

## User stories

1. As a lister, I want to pick the exact sub-area of my place, so that seekers see "Versova, Andheri West".
2. As a seeker, I want to pick a whole group or only some sub-areas, so that I see only places where I want to live.
3. As a seeker, I want to find an area by the name that I use, such as "Lokhandwala" or "Kandivli".
4. As a renter in Dadar, Mira Road or Mumbra, I want my area to be live.

## Decisions

- **Ten area groups:** the nine groups of the designs, and Dadar–Sion (Dadar West, Dadar East, Mahim, Matunga, Sion, Wadala), after Lower Parel–Worli. Why: [PD2](../decisions/pd-02-launch-market.md).
- **The list:** the broker list of the user, with the missing places from the rental portals (NoBroker, Square Yards, 99acres, 2026-10-27). It has 10 groups, 90 sub-areas and 19 pockets. The seed is the only home of the list.
- **East and West** are two sub-areas where the portals list them separately, for example Malad West and Malad East. The other name "Malad" leads to both.
- **Pockets:**
  - A pocket is a sub-area inside a sub-area, for example Versova in Andheri West.
  - A pick of a sub-area includes its pockets. A pick of a group includes all its sub-areas and pockets.
  - Thane West is the parent of 11 Thane pockets. There are three levels at most.
- **Picks:** a listing picks a sub-area or a pocket. A profile picks groups, sub-areas or pockets, at most 20.
- **Match:** two picks match when they are the same area, or when one includes the other.
- **Borderline places:**
  - Vile Parle and Juhu go in Bandra–Santacruz.
  - Kurla goes in Chembur–Ghatkopar.
  - Mulund goes in Powai–Vikhroli.
  - Mahalaxmi goes in Lower Parel–Worli.
  - Oshiwara goes in Andheri West.
- **Live:** the BMC area; Mira–Bhayandar (in Malad–Borivali); the Thane Municipal Corporation, with Mumbra–Diva; and Navi Mumbai, with the Panvel nodes and Ulwe.
- **Waitlist:** Vasai–Virar, Kalyan–Dombivli, Bhiwandi, Ulhasnagar, Ambernath, Badlapur, Karjat and Uran. Why: PD2.
- **Other names:** the spellings and landmarks that renters use, such as "Kandivli" and "GB Road".
- **One table:** the areas table holds the groups, the sub-areas and the pockets, each with its parent. The nine group slugs do not change, so the current listings and profiles stay valid.
- **The launch-area column:** T-56 drops the unused launch-area column and its index. This is the second step that PR #162 announced.
- **Old listings:** a live listing with a group as its area stays live. Its next edit must pick a sub-area.
- **T-22a (changed):**
  - Its item "The API tells if a place is in the nine Mumbai area groups" changes to "The API tells if a place is in a Mumbai area group, by its name or another name".
  - T-22a waits for T-56.

## Rules

- A slug is lowercase, with hyphens, and permanent. A sub-area slug is its place name, for example `andheri-west` or `thane-west`.
- The areas API gives each area with its slug, its name, its parent and its other names, in the order of the designs. It needs no sign-in.
- The API refuses a listing area that is a group, and an area that is not in the table.
- The web shows the sub-area on each card and detail. A pocket shows with its parent: "Versova, Andheri West".
- We design the web pickers on our Figma drafts page first, with our tokens. We check them at 390 px and 1440 px.

## Modules and seams

| Module | Interface changes? | Seam for the tests |
|---|---|---|
| Areas catalogue: schema, seed, migration | yes: parent, other names, no launch-area column | the migration test, on real rows |
| Areas API and contract | yes: parent, other names | the areas API test |
| Listings API | no: the area check is stricter | the listings API tests |
| Profiles API | no: more areas | the profiles API tests |
| Match query | no | a unit test of the area expansion (one new seam) |
| Web: the listing Where step | yes | the listing-steps unit test, and a browser check |
| Web: the area picker of the profile editor | yes | the profile-form unit test, and a browser check |
| Web: cards and details | no | the place-detail unit test |

**Model test:** the areas API test.

## Acceptance criteria

- [ ] The areas API gives 10 groups, 90 sub-areas and 19 pockets, each with its parent and its other names, in order (areas API test).
- [ ] A listing cannot go live with a group as its area. It can go live with a sub-area or a pocket (listings API test).
- [ ] A profile saves a group, a sub-area and a pocket together, up to 20 areas (profiles API test).
- [ ] The area expansion makes these matches (unit test):
  - a group matches its sub-areas and pockets;
  - a sub-area matches its pockets;
  - two pockets of the same sub-area do not match.
- [ ] After the migration, each listing and profile keeps its area (migration test).
- [ ] The Where step shows the sub-areas of the selected group, with the pockets under their parent (browser check).
- [ ] The profile editor picks "All of" a group or some of its sub-areas, and finds an area by another name (browser check).
- [ ] Cards and details show "Versova, Andheri West" (place-detail unit test).

## Out of scope

- The area pages for SEO, and a city prefix in their URLs.
- The place lookup and the waitlist screen (T-22a, T-22b).
- The chip flow and the area slot of the assistant (T-09 and the assistant tasks).
- Kalyan–Dombivli as a group.
- A map or a pin for each area.
- Seeding per sub-area (F-06).

## Tickets

- **T-56 Sub-areas API** (P3, 6 h). Blockers: PR #162. Done when:
  - The areas API gives the ten groups with their sub-areas, pockets and other names.
  - A listing goes live only with a sub-area or a pocket.
  - A profile picks groups, sub-areas and pockets, and a group matches all its sub-areas.
  - The unused launch-area column and its index are gone.
- **T-57 Sub-area pickers** (P3, 8 h). Blockers: T-56. Done when:
  - The Where step of a listing picks a sub-area or a pocket of the group, as on our drafts page.
  - The profile editor picks a whole group or its sub-areas, and finds an area by another name.
  - Cards and details show the sub-area, and a pocket with its parent.
