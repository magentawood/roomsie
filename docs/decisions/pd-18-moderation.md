# PD18 — Moderation: report reasons, hiding and response times

**Status:** Settled. The moderator (F-08) confirms it. · **Date:** 2026-10-25 · **Deciders:** n3rxv, for the founders

## Context

- A public launch needs a way out for each user, and a named moderator (PD11).
- `reports.reason` was free text, and F-08 needs rules for suspension and response times.
- PD17 adds shared contact details as a new kind of abuse.

## Decision

**In one line:** Seven fixed report reasons. A safety report, or reports from two people, hide a profile at once. Reviews take 4 or 24 hours.

- **Report reasons:** fake profile, broker or spam, harassment, discriminatory text, under 18, shared contact details, and other (with a note).
- **Hide at once:** a report of harassment or under 18, or reports from two different people, hide the profile until the moderator reviews it.
- **Response times:** the moderator reviews a safety report (harassment, under 18) in 4 hours, and other reports in 24 hours.
- **Suspension:** the moderator decides it, after a review.
- **Free text:** the moderator also warns the person who wrote it (PD3d).

## Rationale

- The system hides a harasser fast. One report from a grudge cannot remove a person without a review.
- Fixed reasons let the moderator sort the queue by risk.

## Alternatives rejected

- **24 hours for each report, and no automatic hiding.** A harasser stays visible for a day.
- **Free-text reasons only.** The queue cannot sort by risk.

## Consequences

- A 4-hour response needs a person who checks reports often, also in the evening.

## Revisit when

- The moderator cannot keep the 4-hour response.
- Two reports from people who know each other hide good profiles.

## Sources

- The F-13 grill ([#105](https://github.com/magentawood/roomsie/issues/105))
- [PD11](pd-11-launch.md), [PD17](pd-17-connect-and-contact.md), [PD3d](pd-03d-listing-identity-restrictions.md)
