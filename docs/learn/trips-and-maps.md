# Trips and maps

**In one line:** when a question asks how far a place is, code measures the trip from the stations, the lines and the places of Mumbai, the advisor says the numbers, and the chat shows the trip on a map.

## What it is

- **A trip** goes from a card to the place that the question names, as "how far is this listing from Mithibai College?". With no card, it goes between two places that the question names, as "distance between Andheri West and Powai". Each card gets its own trip, at most four.
- **A question about a distance** has a word such as "how far", "distance", "commute", "km", "kitna door", "किती वेळ" or "दूर" (`asksDistance`). A 2b or sensitive turn gets no trip.
- **The numbers** of a trip:
  - **the straight line**, from the two points;
  - **the road**: 1.4 times the straight line, at 25 km/h on a fast hour and 15 km/h on a slow hour;
  - **the train**: the fastest way on the lines, from a station 3 km or less from each end. A slow local train takes 2.8 minutes for each stop, a metro 2 and the monorail 3. A change is a walk between two stations 600 m or less apart, plus a wait of 5 minutes. The ends are a walk up to 1.5 km, else an auto. A train that is slower than the slow road is left out.
- **How far** in words: near up to 3 km, not far up to 8 km, then far (`howFarOf`). So no model calls a trip of 14 km close.
- **The places** are 179 colleges, offices, hospitals, malls and landmarks, each with its short names ("MGM", "VESIT", "Nair hospital"), plus each station and area.
- **A place that the map lacks**, as "Bombay Scottish School": the **locator**, a small model call, names each place of the question and picks the area that holds it. Code puts the place at the point of that area ("Bombay Scottish School, Mahim") and measures from there. It starts with the router, so the reply seldom waits. A place outside Mumbai, Thane and Navi Mumbai gets no trip.
- **With no trip**, the advisor says where the place is and the area of each card, with no distance and no time: a guessed number was wrong ("2 km" from Goregaon West to MGM in Kamothe).
- **The point of a card** is its station, when the name that the lister gave is a known station, else the point of its area.
- **The advisor** gets the names, the numbers and the route as one sentence (`tripFacts`), never the points. It says them as they are. With more cards, only the closest one keeps its route, so the answer stays short.
- **The map** under the reply shows each start, the place, the path of the train or a dashed straight line, and the numbers: "Far · 9.9 km away · by road 35–55 min · by train about 43 min". "Directions" opens the trip in Google Maps for the times of this hour. A reload shows the same map, because the reply keeps its trips.

## How it fits our project

| Part | Where |
|---|---|
| The stations, the lines, the places and the areas | `apps/api/src/geo/mumbai.json`, built by `python3 tools/build-geo.py` from Wikidata (CC0) |
| The places in a question, the trips and the routes | `apps/api/src/geo/geo.ts`, with tests in `apps/api/test/geo.test.ts` |
| The trips of a turn | `tripsOf()` and `tripFactsFor()` in `apps/api/src/assistant/assistant.ts` |
| The locator: its prompt and its call | `apps/api/src/assistant/handlers/locator/` |
| The shapes | `trip`, `tripFacts`, `howFarOf()` and `routeOf()` in `packages/contract/src/trips.ts` |
| The map | `TripMap` in `apps/web/components/chat/trip-map.tsx`, and `tripLine()` in `apps/web/lib/trips.ts` |
| The eval of the answers | `pnpm eval:advice -- --model <model>` in `apps/api`, with the report in `apps/api/eval/runs/` |

- **The map** is MapLibre with the "positron" tiles of OpenFreeMap: free, with no key, from OpenStreetMap data, with its credit on the map. It loads only when a reply has a trip.
- **The security policy** of the web (`apps/web/proxy.ts`) lets `https://tiles.openfreemap.org` in for images and requests, and blob workers for MapLibre.

## The choice we made

- Code measures each number, so an answer says real distances and real lines: the founders, 2026-11-11, and [PD10](../decisions/pd-10-scope-bands.md). The first eval: [advice-eval-2026-11.md](../research/advice-eval-2026-11.md).
- A longer list of places, and the locator for each place that the list lacks: the founders, 2026-11-11, and [PD7a](../decisions/pd-07a-agent-architecture.md).

## Gotchas

- **The data is a copy.** A new metro line or a moved college needs `python3 tools/build-geo.py` and a commit of the new file. Wikidata merges Parel into Prabhadevi on the Central line, so the route names Prabhadevi.
- **A place that Wikidata has with no point**, or a name that its search could mix up, takes the point of the station next to it (`NEAR_STATION` in the script), as Ruia College at Matunga Road. A place far from a station takes the point of its area (`NEAR_AREA`).
- **A short name of many places is no alias.** "Podar" alone would match "Podar International School" too. The locator takes a place of the map only for its whole name (`placeNamed`).
- **The times are estimates** from the stops and the speeds above, not a timetable. The map sends the person to Google Maps for the exact time.
