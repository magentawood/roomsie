# How to work — no-designs plan

- Launch: **Monday 12 October**. Fallback: **Wednesday 14 October**.
- Work two hours each day, on all days, weekends included, from **Thursday 24 September**.
- **Quality comes before the date.** The quality bar is the go/no-go list in `docs/team-plan.md`.
- If a check fails, the date moves by a small number of days. We do not release below the bar.
- If your task will be late, tell the team.
- **We do not have designs at this time.**

> [!note]- Why
> - Do not decrease the quality to meet a date.
> - We made this plan for the condition that we have no designs.

---

## What we found

Of the 115 engineering hours in the first estimate, **80 needed no design**. The other **35 could not start without a design**.

| Lane | Total | Design-free | Blocked |
|---|---|---|---|
| V1 Platform | 24h | 24h | 0h |
| V2 Assistant | 24h | 24h | 0h |
| V4 Matching | 22h | 22h | 0h |
| V3 Visitor | 23h | 6h | **17h** |
| V5 People | 22h | 4h | **18h** |

Thus, we **cannot keep the initial verticals** for the first week.

**The fix:** in the design-free period, all engineers work from one shared pool of backend and infrastructure work. When the designs arrive, all five engineers change to screens at the same time.

> [!note]- Why
> - The blocked hours are not equal across the lanes.
> - The lack of designs has no effect on three lanes: V1, V2 and V4. Two lanes, V3 and V5, are almost fully blocked.
> - With the initial verticals, V3 and V5 would have no work while all the other engineers work.

---

## The two phases

- **Phase A · Thu 24 → Wed 30 Sep.** Design-free work. No person works on a screen.
- **Phase B · Thu 1 → Sat 10 Oct.** All 35 hours of screens, when designs exist. Also the router, observer, advisor, analytics database and backups.

- Each task has one owner from start to finish.
- No task in your list waits for a different person.
- The finish date is the same.

> [!note]- Why
> The principles from before stay the same.

---

## The one hard deadline

**Design must finish D-02, D-03 and D-04 by end of Wednesday 30 September.**

- The designs must be complete. "Mostly done" is not sufficient.
- All Phase A slots have work, but P4 and P5 each have one free slot on Sunday 27.
- **For each day after 30 September that a design is late, the launch is one day late.**
- D-01, the styling decision, must come before that date. D-02, D-03 and D-04 cannot start before D-01 is complete.

> [!note]- Why
> - The designs must be complete because five people must build from them on the morning of Thursday 1 October.
> - There is no spare time for a design that arrives late.

---

## The rules

1. **Work your list in order.**
2. **Do one task at a time.** Finish and merge a task before you start the next task.
3. **Open a pull request for each task.** Never push to `main`.
4. **Make one PR for each task.** Put the task ID in the PR title.
5. **Give your standup by 10 am:** tasks finished, current task, blockers.
6. **In the first week, merge on the day that you finish.**

> [!note]- Why
> - Rule 1: the order of your list is the schedule.
> - Rule 3: do not commit to `main` directly. Your work goes into the repo only as a PR.
> - Rule 6: other people wait for your work.

---

# Phase A · Thu 24 → Wed 30 Sep

## P1 · Platform

| Task | Hours | When |
|---|---|---|
| T-02 Scaffold the monorepo in this repo | 4 | Thu 24 → Fri 25 |
| T-05 Google sign-in and token checks in the API | 6 | Sat 26 → Mon 28 |
| T-04 Deploy web and API to Mumbai | 3 | Tue 29 → Wed 30 |
| T-07 Error reporting wrapper and Sentry | 1 | Wed 30 |

14 hours.

> [!note]- Why
> You start first.

## P2 · Assistant — the chatbot specialist

We do **not** re-cut your list.

| Task | Hours | When |
|---|---|---|
| T-08 Form A contract: slots and enums | 2 | Thu 24 |
| T-11 Model wrapper: DeepSeek with Gemini fallback | 4 | Fri 25 → Sat 26 |
| T-12 Extraction: free text to form slots | 6 | Sun 27 → Tue 29 |
| T-13 Reply writer with scope rules | 4 | Wed 30 → Thu 1 Oct |
| T-34 Router: sort each typed message and flag what we should not answer | 6 | Fri 2 → Sun 4 Oct |
| T-21 Five-turn cap, rate limits, spend ceiling | 5 | Mon 5 → Wed 7 Oct |
| T-27 Run the eval set and tune the prompt | 3 | Wed 7 → Thu 8 Oct |

30 hours, for the full period. **Do T-08 on day one.**

> [!note]- Why
> - Your lane needs no designs. Work through the two phases with no interruption.
> - Three people build against T-08.

## P3 · Data and trust — you

| Task | Hours | When |
|---|---|---|
| T-06 Database schema v1 | 8 | Thu 24 → Sun 27 |
| T-14 Match query API | 6 | Mon 28 → Wed 30 |

14 hours.

- Do T-06 alone, in four days. Do no other task until T-06 merges.
- All downstream work waits for T-06. If you have spare time, the most useful thing to do is to finish T-06 before its date.

## P4 · Content and moderation

| Task | Hours | When |
|---|---|---|
| T-23a Landing page ported from the prototype | 4 | Thu 24 → Fri 25 |
| T-23b Privacy, terms and grievance pages | 2 | Sat 26 |
| T-19 Report, block, suspend, and a saved moderation query | 5 | Mon 28 → Wed 30 |
| T-20 Account deletion | 3 | Wed 30 → Thu 1 Oct |

14 hours.

- The prototype at `docs/source/roomsie-prototype-V3.html` **is** your design for T-23a.
- Sunday 27 is a spare slot. Use it to read the ADRs or to help with M-03, the eval sentences.

> [!note]- Why
> - The prototype is the design, so T-23a is not blocked.
> - Sunday 27 is spare because T-19 needs the schema. The schema arrives on the evening of that day.

## P5 · Accounts and connections

| Task | Hours | When |
|---|---|---|
| M-03 Write the eval sentences | 4 | Thu 24 → Fri 25 |
| T-03 CI: typecheck, lint, build, secret scan | 2 | Sat 26 |
| T-24 Event logging table | 2 | Mon 28 |
| T-17 Carry anonymous chat into the account on sign-in | 2 | Tue 29 |
| T-18a Connect request and contact reveal API | 4 | Wed 30 → Thu 1 Oct |

14 hours.

- You do M-03 because P2 needs it for T-27.
- Sunday 27 is also a spare slot for you.

> [!note]- Why
> M-03 also needs no design and no code. It is the only task available to you on day one.

---

# Phase B · Thu 1 → Sat 10 Oct — screens and the assistant

| Person | Task | Hours | When (October) |
|---|---|---|---|
| **P1** | T-25 Uptime monitor and spend alerts | 2 | Thu 1 |
| | T-33 Invite-only gate until launch | 1 | Fri 2 |
| | T-39 Analytics in its own database, with scheduled jobs | 3 | Fri 2 → Sat 3 |
| | T-40 Nightly database backups to R2 | 2 | Sun 4 |
| | T-16 Profile create and edit, with photos | 8 | Mon 5 → Thu 8 |
| | T-22 Launch areas and waitlist | 3 | Fri 9 → Sat 10 |
| | T-29 Abuse test: 100 fake sessions | 1 | Sat 10 |
| **P3 (you)** | T-37 Articles table and full-text search | 3 | Thu 1 → Fri 2 |
| | T-15 Results panel, built against the contract | 6 | Fri 2 → Mon 5 |
| | T-18b Person detail and connect screens | 4 | Mon 5 → Wed 7 |
| | T-38 Advisor: articles first, then web search after sign-in | 7 | Wed 7 → Sat 10 |
| **P4** | T-35 Form B contract and table | 3 | Fri 2 → Sat 3 |
| | T-36 Observer: Form B from free text, with the quote check | 8 | Sat 3 → Wed 7 |
| **P5** | T-10 Chat screen and split view | 8 | Fri 2 → Mon 5 |
| | T-09 Chip flow for intent, area, budget | 6 | Tue 6 → Thu 8 |

- All lanes finish by Saturday 10 October.
- Spare hours: P4 about 9, P5 6, P2 4. If a person is late, P4, P5 and P2 are the first to do their work.
- P3 has no spare hours. If a task will take more time than planned, tell the team immediately.

> [!note]- Why
> - P3 owns T-15 and T-18b because they show the matches and people from the P3 schema and match query.
> - P3 owns the advisor, T-38, because it searches data that P3 owns.

---

## Everyone

- **Sunday 11 October** — bug fixing (A-01).
- **Monday 12 October** — launch (A-02).

---

## What this costs

- **We build all screens in Phase B.** Thus, UI problems show in the first week of October.
- **Phase A has almost no slack.**
- **One thing decides if the launch stays on 12 October: if the designs arrive on 30 September.**

> [!note]- Why
> - Usually, UI work is spread across the schedule, and problems show at the start. The late problems are the cost of no designs. They are not a mistake in the order of tasks.
> - During Phase A, no person owns a vertical from end to end. You get resilience, but you lose clean ownership.
> - P4 and P5 have Sunday 27 free because only three tasks in the full project can start before the schema and monorepo exist.
> - We arranged all other parts of this plan around the design date of 30 September.

# Index of every code

If you are new to the project, read this section first.

> [!note]- Why
> This section gives each task in plain words. The examples for each table are in a folded box below it.

## How a code is built

| Prefix | Means | Who |
|---|---|---|
| **T-** | Technical build task | The five engineers |
| **D-** | Design task | Design |
| **M-** | Marketing task | Content (M1) and Community (M2) |
| **F-** | Founder task | Founder |
| **A-** | All-hands task | Everyone |
| **CP** | Checkpoint — a date, not a task | Everyone |
| **P1–P5** | The five engineering lanes. The first plan called them V1–V5 | One engineer each |

- A letter at the end of a code (**T-18a**, **T-18b**) shows one task in two halves: backend and screen. Different people own the two halves.
- We removed or merged T-01, T-26, T-28, T-30 to T-32 and M-08 during the plan work. We never used a code again.
- We added T-34 to T-40 on 26 September.
- **⚑ marks the critical path.** If a ⚑ task is late, the launch date is late.

> [!note]- Why
> Gaps in the numbers are usual.

## The lanes and roles

| Code | Name | Covers |
|---|---|---|
| **P1** | Platform | The plumbing: the project, sign-in, deploy, monitoring. Then profiles, the waitlist, the analytics database and backups. |
| **P2** | Assistant | The brain: all that the AI understands and says, the AI limits, and the router that decides which part of the AI runs. |
| **P3** | Data and trust | The database and the matching. Then the results panel, person screens and the advisor. |
| **P4** | Content and moderation | The public and legal pages, reporting and deletion. Then the observer. |
| **P5** | Accounts and connections | CI, event logging, carrying a chat into an account, connecting two people. Then the chat screen and its chips. |
| **D** | Design | Draws each screen before the engineers build it. |
| **M1** | Content | Writes articles and launch posts to bring people in. |
| **M2** | Community | Finds the first real users and talks to brokers. |
| **F** | Founder | Money, legal, domain, naming people, and the final go/no-go decision. |

## Checkpoints

| Code | Name | Date | True by then |
|---|---|---|---|
| **CP0** | Kickoff | Fri 25 Sep | Everyone knows what they own. Accounts, billing and domain exist. The look is decided. |
| **CP1** | Foundation | Mon 28 Sep | Project, database, sign-in and AI wrapper are merged. Landing and legal pages are live. There are no product screens at this time. |
| **CP2** | Core loop live | Thu 1 Oct | It works from end to end on the real internet, with no UI: a sentence goes in, matches come out, and connecting works. Designs are finished. 100 people signed up. |
| **CP3** | Feature freeze, go/no-go | Sat 10 Oct | All screens and assistant handlers are merged, live behind the invite gate. An 8 pm meeting decides 12 or 14 October. |
| **CP4** | Launch | Mon 12 Oct | Open to the public. Fallback Wednesday 14 October. |
| **CP5** | First-week review | Mon 19 Oct | The team reads the numbers and decides what v1 should be. |

## T · Engineering tasks

| Code | Task | Owner | Issue |
|---|---|---|---|
| **T-02** ⚑ | **Scaffold the monorepo** — One folder for the website, server and shared code. All five people commit into it. | P1 | #10 |
| **T-03** | **CI: typecheck, lint, build, secret scan** — Checks each pull request automatically. | P5 | #24 |
| **T-04** | **Deploy web and API to Mumbai** — Real machines in Mumbai, so anyone on the internet can use the site. | P1 | #30 |
| **T-05** ⚑ | **Google sign-in and token checks** — Log in with Google. The server checks the user on each request. | P1 | #20 |
| **T-06** ⚑ | **Database schema v1** — The exact shape of all stored data: people, flats, messages, matches. *Example: the budget is a number like 25000, not text like "around 25k".* | P3 | #11 |
| **T-07** | **Error reporting wrapper and Sentry** — Sends each crash that a user gets to a dashboard automatically. | P1 | #28 |
| **T-08** ⚑ | **Form A contract: slots and enums** — The exact things that the assistant tries to learn, and the exact allowed answers. "intent" is one of the four prototype cards (a flat and flatmates, just a flat, just a flatmate, renting out a flat) or `unclear`. Nine lifestyle axes: smoking, alcohol, guests, pets, hours, tidiness, at home, daytime, kitchen. Everyone builds against this fixed list. | P2 | #6 |
| **T-09** ⚑ | **Chip flow for intent, area, budget** — Buttons under the chat. People tap and do not have to type. | P5 | #26 |
| **T-10** ⚑ | **Chat screen and split view** — The main screen: chat on one side, results on the other. | P5 | #12 |
| **T-11** ⚑ | **Model wrapper: DeepSeek with Gemini fallback** — One piece of code that talks to the AI. If DeepSeek is down, it silently changes to Gemini. | P2 | #15 |
| **T-12** ⚑ | **Extraction: free text to form slots** — Changes a typed sentence into tidy form slots. | P2 | #23 |
| **T-13** | **Reply writer with scope rules** — The assistant writes its answers and stays on the topic. | P2 | #33 |
| **T-14** ⚑ | **Match query API** — Takes what a person wants and returns the people who fit. | P3 | #27 |
| **T-15** ⚑ | **Results panel** — Shows matches as cards. In v0, each card is a person, never a property listing. | P3 | #16 |
| **T-16** ⚑ | **Profile create and edit, with photos** — A person says who they are and uploads photos. | P1 | #36 |
| **T-17** | **Carry anonymous chat into the account** — Keeps a chat from before sign-up when the person signs up. | P5 | #32 |
| **T-18a** ⚑ | **Connect request and contact reveal API** — The server side of a connect request. Shows phone numbers only when the two people agree. | P5 | #38 |
| **T-18b** ⚑ | **Person detail and connect screens** — Read the full profile of a person and send a connect request. | P3 | #44 |
| **T-19** | **Report, block, suspend, moderation query** — The safety tools. | P4 | #45 |
| **T-20** | **Account deletion** — Delete the account and data correctly: profile, photos and messages are really removed. Indian law requires this. | P4 | #46 |
| **T-21** | **Five-turn cap, rate limits, spend ceiling** — Stops abuse of the AI and a very large bill. | P2 | #41 |
| **T-22** | **Launch areas and waitlist** — Opens only the three chosen Mumbai areas. Collects emails from all other areas. | P1 | #47 |
| **T-23a** | **Landing page** — The public home page that explains roomsie. | P4 | #39 |
| **T-23b** | **Privacy, terms and grievance pages** — The legal pages that each Indian site must have. | P4 | #40 |
| **T-24** | **Event logging table** — Records what people actually do, to show what works. | P5 | #37 |
| **T-25** | **Uptime monitor and spend alerts** — Automatic warnings if the site stops or costs increase quickly. | P1 | #43 |
| **T-27** | **Run the eval set and tune the prompt** — Test the assistant on real sentences. Fix what it gets wrong. | P2 | #48 |
| **T-29** | **Abuse test: 100 fake sessions** — Attack our own site before strangers do. | P1 | #51 |
| **T-33** | **Invite-only gate until launch** — Keeps the public out until launch day. | P1 | #29 |
| **T-34** ⚑ | **Router: sort each typed message and flag what we should not answer** — One cheap model call decides what a message is. Thus, it decides which handlers run. *Example: "write my essay" gets a polite scripted line, with no model call, and is logged.* | P2 | — |
| **T-35** | **Form B contract and table** — What the observer records about a person, and where we store it. | P4 | — |
| **T-36** | **Observer: Form B from free text, with the quote check** — Records what chips cannot capture, only when it can quote the user. It discards a note with no exact quote. | P4 | — |
| **T-37** | **Articles table and full-text search** — Stores the roomsie articles and finds the correct passage. | P3 | — |
| **T-38** | **Advisor: articles first, then web search after sign-in** — Answers housing questions from our articles first, then from the web, for signed-in users only. It never answers "Is this clause in my agreement legal?" from the web. It hands that question off. | P3 | — |
| **T-39** | **Analytics in its own database, with scheduled jobs** — Keeps analytics writes off the main database. | P1 | — |
| **T-40** | **Nightly database backups to R2** — Copies the two databases each night. | P1 | — |

> [!example]- Examples
> - `T-02`: all five people open the same project, and each person works in their own part of it. There are not five different projects.
> - `T-03`: you open a PR at 11 pm. After two minutes, a green tick or a red cross tells you if you broke something. This includes a password that you pasted accidentally.
> - `T-04`: the site is no longer "works on my laptop". It becomes a public web address that loads fast in India.
> - `T-05`: you tap "Continue with Google" and pick your Gmail. Then you are in, with no password to invent.
> - `T-06`: a person has a name, age, budget and photos.
> - `T-07`: at 2 am, a person gets a broken page. You see which line has the error and how many people got it, but no person reported it.
> - `T-09`: you do not type a sentence. You tap "A flat and flatmates", "Powai", "₹15–20k".
> - `T-10`: you chat on the left. While the assistant learns what you want, people who fit appear on the right.
> - `T-11`: DeepSeek goes offline at 9 pm. Users do not see a problem, because Gemini answers.
> - `T-12`: "need a room near Powai, max 18k, moving next month, I don't smoke" becomes intent = a flat and flatmates, area = Powai, budget = 18,000, move date = October, smoking = no.
> - `T-13`: a person asks "what's the weather?". The assistant does not answer. It politely moves the conversation back to flats.
> - `T-14`: Powai, ₹18k, no smoking → the 12 people who fit best, best first.
> - `T-15`: the right column fills with person cards: name, area, budget, and a match score when we have sufficient data.
> - `T-16`: name, age, job, "I'm tidy and sleep early", and four photos of the room.
> - `T-17`: you chat for five minutes as a stranger, then you sign in. Your chat stays. It is not deleted.
> - `T-18a`: you tap Connect and they accept. Only then do the two of you see the number of the other person.
> - `T-18b`: when you tap a card, the full profile opens, with a Connect button at the bottom.
> - `T-19`: a person sends you a creepy message. You block them, and they disappear from your results. A moderator sees the report.
> - `T-21`: one visitor cannot send 10,000 messages overnight and cost you ₹80,000 in AI fees.
> - `T-22`: a person in Pune visits and sees "not here yet". They leave their email.
> - `T-23a`: the first page that a stranger sees, with the pitch and a "Start chatting" button.
> - `T-23b`: the Privacy Policy link in the footer, and a named grievance officer that people can contact.
> - `T-24`: count how many people start a chat but do not sign up, and where they stop.
> - `T-25`: a message at 3 am that says "site down" or "AI spend passed ₹5,000 today".
> - `T-27`: you give it 100 sentences. It reads "PG" as a full flat 30 times. You fix the wording and test again.
> - `T-29`: send 100 fake users to the chat at the same time. Make sure that the limits hold.
> - `T-33`: a person with no invite code sees a "coming soon" page, not the app.
> - `T-34`: "is semi-furnished normal in Powai?" goes to the advisor. "my ex basically lived there" goes to the observer.
> - `T-35`: guest frequency = "partner stays over most nights", with the words that the user typed as evidence.
> - `T-36`: "my ex basically lived there, that's what killed it" becomes a note about guests.
> - `T-37`: "deposit" finds the paragraph in the article on Mumbai deposits.
> - `T-38`: "what does semi-furnished usually include?" uses our article if we have one. If not, it uses a web search for signed-in users.
> - `T-39`: many "results shown" events at one time cannot make a profile save slow.
> - `T-40`: the free plan keeps no backups. Thus, a bad migration on day three is undone from the copy of last night. The data stays available.

## D · Design

| Code | Task | Issue |
|---|---|---|
| **D-01** | **Styling decision for launch** — Pick the colours, fonts and general feel one time, and never argue about them again. | #1 |
| **D-02** ⚑ | **Design the chat screens** — Before anyone builds them. | #7 |
| **D-03** | **Design results, profile and connect screens** — Match cards, profile pages and the connect flow. | #19 |
| **D-04** | **Design landing, wall and waitlist** — The public home page and the waitlist page. | #25 |
| **D-05** | **Design QA on the live build** — The built site must agree with the drawings. | #42 |
| **D-06** | **Launch visuals** — The images for the launch-day posts. | #52 |

> [!example]- Examples
> - `D-01`: roomsie looks clean and warm, not neon and loud.
> - `D-02`: a picture that shows the positions of the message bubbles, chips and results.
> - `D-05`: you see that a button on the live site is grey, but the design says purple.

## M · Marketing

| Code | Task | Role | Issue |
|---|---|---|---|
| **M-01** ⚑ | **Seeding form live, outreach starts** — A simple sign-up form, and tell people about it. | M2 | #14 |
| **M-02** | **Seeding target: 100 sign-ups** — 100 real people before launch. | M2 | #22 |
| **M-03** | **Write the eval sentences** — Realistic sentences to test the assistant. | P5 (normally M1) | #21 |
| **M-04** | **Interviews for articles 1 to 10** — Collect stories from real flat-hunters. | M1 | #13 |
| **M-05** | **Drafts of articles 1 to 10** — So Google sends people to roomsie. | M1 | #31 |
| **M-06** ⚑ | **Beta invites to seeded sign-ups** — Let the 100 seeded people in before the public. | M2 | #49 |
| **M-07** | **Draft launch posts** — Social posts for launch day, written before it. | M1 | #35 |
| **M-09** | **Broker calls** — Get real flats listed. | M2 | #55 |

> [!example]- Examples
> - `M-01`: share it in Mumbai flat-hunting WhatsApp groups.
> - `M-02`: day one must not be empty. Nobody joins a flatmate app that has zero flatmates on it.
> - `M-03`: "need a room in Chembur under 15k, veg only".
> - `M-05`: "What renting in Bandra actually costs in 2026".

## F · Founder

| Code | Task | Issue |
|---|---|---|
| **F-01** | **Kickoff: names on every role** — A real person against each vertical. | #2 |
| **F-02** | **Secure the domain** — Buy it before a different person does. | #3 |
| **F-03** | **Billing and hard spend caps** — *Example: limit the AI account to ₹20,000 a month, so a bug cannot quietly cost a lakh.* | #4 |
| **F-04** | **Create accounts in Mumbai regions** — Hosting and database accounts. | #5 |
| **F-05** ⚑ | **Consent text for the seeding form** — What we will do with their data. | #8 |
| **F-06** | **Pick the three launch areas** — Three Mumbai neighbourhoods. *Example: Bandra, Andheri and Powai, and no other areas at launch.* | #9 |
| **F-07** | **Draft privacy policy, terms, grievance contact** — The text for the legal pages. | #17 |
| **F-08** | **Name the moderator** — Who handles reports and abuse. | #34 |
| **F-09** | **Write down the three ADR exceptions** — Where we knowingly broke our own architecture rules, and why. | #18 |
| **F-10** | **Go/no-go meeting** — Saturday 10 October, 8 pm. Launch on the 12th, or move to the 14th. Quality decides, not the calendar. | #50 |

> [!example]- Examples
> - `F-01`: fill in the five blanks that say `_name_` at this time.
> - `F-04`: the Mumbai region makes the site fast for Indian users.
> - `F-09`: in six months, nobody asks "why on earth did we do it this way?".

## A · Everyone

| Code | Task | Issue |
|---|---|---|
| **A-01** | **Bug fix day** (Sun 11 Oct) — One full day. Nobody builds new things. Everyone only repairs. | #53 |
| **A-02** | **Launch** (Mon 12 Oct, fallback Wed 14 Oct) — Remove the gate. Open to the public. | #54 |

**62 tasks, 55 issues.** All codes above are live GitHub issues at `github.com/magentawood/roomsie/issues`, but not T-34 to T-40. These seven tasks are not filed at this time.
