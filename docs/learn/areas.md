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

## The choice we made

- The ten groups, the sub-areas and where Mumbai ends: [PD2](../decisions/pd-02-launch-market.md).
- The rules of the build: the [spec](../specs/sub-areas.md).

## Gotchas

- A listing from before the sub-areas can have a whole group. It stays live, but its next edit must pick a sub-area: the API gives 422, and `missing` holds `areaSlug`.
- The match query must use the expansion. A plain array overlap misses Versova for a seeker who picked Andheri West.
- The seed numbers the areas in the order of its list. Put a new place where it belongs, not at the end.

## Tickets

- [T-56 Sub-areas API](../plan/tasks/T-56%20Sub-areas%20API.md)
- [T-57 Sub-area pickers](../plan/tasks/T-57%20Sub-area%20pickers.md)
