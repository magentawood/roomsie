# Areas, sub-areas and pockets

**In one line:** the areas table holds three levels (area groups, sub-areas and pockets), and a pick of an area includes each area under it.

## What it is

- An **area group** is a big part of Mumbai on the designs, for example Andheri–Goregaon. There are ten.
- A **sub-area** is a place name that renters and brokers use, for example Andheri West or Versova.
- A **pocket** is a sub-area inside a sub-area, for example Lokhandwala in Andheri West, or Ghodbunder Road in Thane West.
- **Other names** are the spellings and landmarks that renters type, for example "Kandivli" or "GB Road". One other name can lead to two areas: "Andheri" leads to Andheri West and Andheri East.

## How it fits our project

```
Andheri–Goregaon            (group: parent is null)
├── Andheri West            (sub-area)
│   ├── Lokhandwala         (pocket)
│   └── Versova             (pocket)
└── Andheri East
```

- One table holds the three levels. Each area has a `parent_slug`, and a group has none. A slug never changes, because listings, profiles and later the area pages link it.
- `GET /v1/areas` gives each area with its slug, name, parent and other names. The order is the order of the designs: each group, then its sub-areas, and each sub-area then its pockets.
- The seed in the API code is the only home of the list. To add a place, add it to the seed. The deploy runs the seed.
- A listing has one sub-area or pocket, never a whole group.
- A profile picks groups, sub-areas or pockets.
- Two picks match when they are the same area, or when one includes the other. The match query expands the picks of the seeker. It adds each area above and below a pick. Then it looks for profiles that picked one of them. Thus "Andheri West" finds Versova and the whole group, but Versova does not find Lokhandwala.

## In the web

- **The label:** a card or a detail shows the sub-area. A pocket shows with its parent, for example "Versova, Andheri West".
- **The Where step** of a listing has three chip rows: the area group, the sub-area, and the pocket. The pocket row shows only for a sub-area that has pockets, and the lister can skip it.
- **The profile editor** shows the picks as tags, a search, and the ten groups as rows that open. The wider pick wins: "All of" a group removes the picks under it, and the chips under it show checked and off.
- **The search** ignores case, spaces and punctuation, and it matches the other names. Thus "kandivli" finds Kandivali East.
- Section 23 of the drafts page in Figma shows each screen.

## Places outside Mumbai

A visitor can ask for a place where Roomsie is not live, for example Vasai or Pune. That place goes to the waitlist (PD2).

- **The list:** the contract package holds the waitlist places, each with its name and its other names, for example "Virar" and "Bangalore". The list is not a table, because no row links to a waitlist place.
- **The match:** the assistant finds these names with the same match as the Mumbai names, so Devanagari names and Marathi endings also work. A test makes sure that no waitlist name is also a Mumbai name.
- **Only a place to live:** the check reads only the place words that the extractor model copies. Thus, "shifting from Pune, need a PG in Powai" gives Powai, and Pune does not go to the waitlist.
- **The goal keeps them:** the goal and each turn reply give `outsidePlaces`, with each outside place of any turn of the chat. The web shows the waitlist screen or the waitlist line from it (T-22b).
- **The waitlist:** `POST /v1/goals/:id/waitlist` saves an email with a place that the chat named. The rules for the entries of a chat are in [the limits of the chat](chat-limits.md).

```
"room in Powai or Vasai"  →  form.areas = [powai]   outsidePlaces = [vasai-virar]
"room in Bandraa" (typo)  →  no area, no outside place: the assistant asks again
```

## The choice we made

- The ten groups, the sub-areas and where Mumbai ends: [PD2](../decisions/pd-02-launch-market.md).
- The rules of the build: the [spec](../specs/sub-areas.md).
- The waitlist places and the waitlist route: the spec in the [T-22a task note](../plan/tasks/T-22a%20Waitlist%20API.md), [#204](https://github.com/magentawood/roomsie/pull/204).

## Gotchas

- A listing from before the sub-areas can have a whole group. It stays live, but its next edit must pick a sub-area: the API gives 422, and `missing` holds `areaSlug`.
- The match query must use the expansion. A plain array overlap misses Versova for a seeker who picked Andheri West.
- The seed numbers the areas in the order of its list. Put a new place where it belongs, not at the end.
- A new waitlist name must not be a Mumbai name. For example, "Naigaon" is a Mumbai name in Parel, so it cannot be an other name of Vasai–Virar. The areas test fails for such a name.
- A slug of a waitlist place stays in the goals that named it. To remove a place from the list, also change those goals in a migration.

## Tickets

- [T-56 Sub-areas API](../plan/tasks/T-56%20Sub-areas%20API.md)
- [T-57 Sub-area pickers](../plan/tasks/T-57%20Sub-area%20pickers.md)
- [T-22a Waitlist API](../plan/tasks/T-22a%20Waitlist%20API.md): [#204](https://github.com/magentawood/roomsie/pull/204), 2026-11-03. The places outside Mumbai and the waitlist.
