# The admin home

**In one line:** `/admin` opens on one scorecard for each subject that the person can open, with live numbers, and each card opens its pages.

## What it is

- A **subject** is one part of the admin: Moderation, ID checks, People and listings, AI pipeline, Product numbers and Site content. Each subject has its pages, with tabs.
- A **scorecard** shows the numbers of one subject and a mark for late work. "Open" goes to its pages.
- **Late** work is past its review time: a safety report after 4 hours, another report after 24 hours ([PD18](../decisions/pd-18-moderation.md)), and an ID check after 24 hours ([PD8](../decisions/pd-08-verification.md)).

## How it fits our project

```
GET /v1/admin/home ──▶ the roles of the person
                        ├── moderator ──▶ Moderation, People and listings, AI pipeline, Site content
                        └── ID reviewer ──▶ ID checks
```

| Subject | Numbers | Pages |
|---|---|---|
| Moderation | open reports, late safety reports, other late reports, the oldest report, feedback of the last 7 days | `/admin/reports`, `/admin/feedback` |
| ID checks | checks that wait, late checks, the oldest check, checks verified in the last 7 days | `/admin/id-checks` |
| People and listings | the people with a card and the new ones of today, the live listings, the cards and listings hidden for review, the suspended accounts | `/admin/people`, `/admin/listings` ([Moderation](moderation.md)) |
| AI pipeline | the spend of today against the daily amount, the failed calls and the calls of the fallback today, and the Gemini switch | `/admin/ai`, `/admin/ai/turns`, `/admin/ai/turns/[key]`, `/admin/ai/log` ([The model wrapper](models.md), [Traces of the model calls](traces.md)) |
| Site content | invites and the invite gate, quotes, site details that are set | `/admin/invites`, `/admin/quotes`, `/admin/site` |

- The API sends only the cards of the roles of the person. A person with both roles gets each card.
- The numbers count reports, not the items of the queue: the queue has one item for each person or listing, with all its open reports.
- The feedback list also gives the count of each face of the last 7 days.
- T-66 adds the card of Product numbers, with its pages. The tab Turns of the AI pipeline came with T-64 ([Traces of the model calls](traces.md)).
- The AI pipeline reads the raw events of today, not a rollup: an exception to `database.md` that the spec of T-65 records. The page slows down at about 250,000 events a day.

## The choice we made

- The home, the subjects and the access: the spec [Admin panel](../specs/admin-panel.md).
- The review times: [PD18](../decisions/pd-18-moderation.md) and [PD8](../decisions/pd-08-verification.md).

## Gotchas

- **The late times are settings:** `REPORT_SAFETY_LATE_HOURS`, `REPORT_LATE_HOURS` and `ID_CHECK_LATE_HOURS`. A web text does not repeat their values, and the promises to users change only with PD18 and PD8 ([web.md](../standards/web.md)).
- **The web decides the access from `/v1/me`, not from the home.** In the deploy minutes, the new web can call the old API. Then the home shows an error, not "not found".
- **A new subject does not break an open tab.** The web reads the home with `adminHomeView`, which drops a card of a subject that its bundle does not know ([api.md](../standards/api.md)).
- **The ID checks stay with the ID reviewers.** A moderator who is not a reviewer gets "not found" at `/admin/id-checks` ([PD8](../decisions/pd-08-verification.md)).

## Tickets

- T-62: [#227](https://github.com/magentawood/roomsie/pull/227), 2026-11-04. The home of scorecards, and the six pages of today in subjects with tabs.
- T-63: [#230](https://github.com/magentawood/roomsie/pull/230), 2026-11-05. The card of People and listings.
