# Spec: Admin panel

**Status:** approved (2026-11-04) · **Grill:** 2026-11-04 · **Plan:** [D-07](../plan/tasks/D-07%20Admin%20designs.md) to [T-66](../plan/tasks/T-66%20Product%20numbers.md)

## Goal

Today the admin is six narrow pages with a row of buttons. Nobody on the team can see the model calls, the spend, the funnel, or a person or a listing without a report. The new admin panel opens on a home of scorecards, grouped by subject. Each card shows the live numbers of its subject and opens it. Three new subjects come in: the AI pipeline, people and listings, and the product numbers.

## User stories

1. As a moderator, I want the home to show the open work of each subject, so that I see what is late first.
2. As a moderator, I want to find a person or a listing and act on it, so that I can stop a scam without a report.
3. As the team, I want to follow one turn of the assistant through each model call, so that I can find where it broke.
4. As the team, I want one switch that sends all model calls to Gemini, so that a DeepSeek outage does not wait for a deploy.
5. As the team, I want the funnel of the launch in one place, so that we see where people stop.

## Decisions

- **The home:** scorecards grouped by subject, not a sidebar. Each card shows one or two numbers, a mark when something is late, and opens its subject.
- **Six subjects:**
  - Moderation: reports and feedback.
  - ID checks.
  - People and listings.
  - AI pipeline.
  - Product numbers.
  - Site content: invites, quotes and site details.
- **Access as today:** a moderator opens each subject but ID checks. An ID reviewer opens ID checks. The home shows only the cards that the person can open. Why: [PD8](../decisions/pd-08-verification.md).
- **Traces:** the API saves the prompt and the raw answer of each model call, and keeps them for 30 days. After that, only the numbers of the call stay. Why: PD20 (new).
- **Masks in traces:** each religion or community word in a trace shows as "[hidden]". A slot of religion or community shows "set", not its value. Why: [PD3c](../decisions/pd-03c-exclusionary-preferences.md).
- **No names in traces:** a trace shows a session code, not a name or an email, and it has no link to a card. Each open of a trace goes in an audit log.
- **People and listings:** a moderator sees the card as users see it, the sign-in email, the reports, the hidden state, the verified state, the date of joining and the last activity. A moderator can hide, unhide or suspend a person, and remove a listing. The screen never shows gender, religion or community. Why: [PD18](../decisions/pd-18-moderation.md).
- **AI settings:** the AI pipeline shows the model settings, the daily amount and the limits, read-only. One switch, "Use Gemini for all calls", changes the live calls with no deploy. Each flip goes in a log with the person and the time. Why: [PD7](../decisions/pd-07-models.md).
- **Product numbers:** the funnel from the analytics events, for today, 7 days and 30 days, each against the period before. Why: [ADR-0012](../decisions/0012-analytics-event-store.md).
- **Sizes:** each screen at 1440 px. The home, the reports, the ID checks and the Gemini switch also at 390 px.
- **The look:** the roomsie design system and the patterns of the designs. The designs are on the drafts page of the Product file, as new sections below section 35. Why: [PD14](../decisions/pd-14-v0-is-the-figma-designs.md).
- **When:** the designs and the build are before the launch on 8 November.

## Rules

- A person with no admin role gets the not-found page for each admin address.
- The API checks the role of each admin route. The web hides a card only for the layout.
- A trace is deleted 30 days after its call. An account deletion deletes the traces of its goals at once.
- The Gemini switch acts on the next model call, with no restart.
- The numbers of the funnel come only from the analytics events. No product table gives a number of the funnel.

## Modules and seams

| Module | Interface changes? | Seam for the tests |
|---|---|---|
| The admin pages of the web | yes: a home, three new subjects, a new layout | none: the review checks the designs |
| The contract | yes: the schemas of the home, the traces, the people and listings, the numbers and the switch | the API route tests |
| The moderation module of the API | yes: search, detail and actions for people and listings | the route test of the admin |
| The model wrapper | yes: it saves a trace for each call and reads the switch | the test of the model wrapper |
| A new traces module | new: save, mask, read, log the views, delete after 30 days | its route test |
| A new admin settings module | new: the Gemini switch and its log | its route test |
| The analytics module | yes: the reads of the funnel | the analytics test |
| The schema | yes: the traces, the trace views and the settings | the schema test |

**Model test:** the route test of the admin, which signs in a moderator and a person with no role, and checks each route for both.

## Acceptance criteria

- [ ] The drafts page has the sections of the admin panel, at 1440 px and at 390 px as the sizes rule tells. (review)
- [ ] The home shows only the cards that the person can open, with live numbers. (admin route test)
- [ ] A person with no role gets a not-found for each admin route. (admin route test)
- [ ] Each model call saves a trace with its prompt and its answer, and religion and community words are masked. (model wrapper test)
- [ ] A trace older than 30 days is gone, and an account deletion deletes its traces. (traces test)
- [ ] Each open of a trace is in the audit log, and the trace has no name or email. (traces test)
- [ ] A moderator can find a person by name or email, and a listing by its area or its lister. (admin route test)
- [ ] Hide, unhide, suspend and remove work, and the person view has no gender, religion or community. (admin route test)
- [ ] The Gemini switch sends the next call to Gemini, and the flip is in the log. (model wrapper test)
- [ ] The funnel numbers agree with the events of a test database. (analytics test)
- [ ] The privacy text of F-07 and the retention table of PD19 name the traces. (review)

## Out of scope

- An editor for the blog. A merged PR publishes an article ([articles](../learn/articles.md)).
- Controls for the model per role, the daily amount, the limits and the prompts. They stay settings of the server.
- A role for the tech team. Access stays as today.
- New charts of the analytics database for marketing. Looker Studio stays.
- Messages between users. No admin screen shows them.

## Tickets

- [D-07 Admin designs](../plan/tasks/D-07%20Admin%20designs.md): no blocker.
- [T-62 Admin home](../plan/tasks/T-62%20Admin%20home.md): blocked by D-07.
- [T-63 People and listings](../plan/tasks/T-63%20Admin%20people%20and%20listings.md): blocked by T-62.
- [T-64 Model traces](../plan/tasks/T-64%20Model%20traces.md): blocked by T-62.
- [T-65 AI numbers and the switch](../plan/tasks/T-65%20AI%20numbers%20and%20switch.md): blocked by T-62.
- [T-66 Product numbers](../plan/tasks/T-66%20Product%20numbers.md): blocked by T-62.
