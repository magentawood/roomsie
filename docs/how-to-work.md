# How to work — no-designs plan

Launch is **Monday 12 October**. The fallback is **Wednesday 14 October**.
Work two hours each day, on all days, weekends included, from **Thursday 24 September**.

**Quality comes before the date.** The go/no-go list in `docs/team-plan.md` is
the quality bar. If a check fails, we move the date by a small number of days.
We do not release something below the bar. Do not decrease the quality to meet
a date. If your task will be late, tell the team.

**We do not have designs at this time.** We made this plan for that condition.

---

## What we found

Of the 115 engineering hours in the first estimate, **80 needed no design**.
The other **35 could not start without a design**. The lanes did not get equal parts:

| Lane | Total | Design-free | Blocked |
|---|---|---|---|
| V1 Platform | 24h | 24h | 0h |
| V2 Assistant | 24h | 24h | 0h |
| V4 Matching | 22h | 22h | 0h |
| V3 Visitor | 23h | 6h | **17h** |
| V5 People | 22h | 4h | **18h** |

The lack of designs has no effect on three lanes. Two lanes are almost fully
blocked. Thus, we **cannot keep the initial verticals** for the first week.
With those verticals, V3 and V5 would have no work while all the other engineers work.

**The fix:** in the design-free period, all engineers work from one shared pool
of backend and infrastructure work. When the designs arrive, all five engineers
change to screens at the same time.

---

## The two phases

- **Phase A · Thu 24 → Wed 30 Sep.** Design-free work. No person works on a screen.
- **Phase B · Thu 1 → Sat 10 Oct.** All 35 hours of screens, when designs exist.
  Phase B also has the router, observer, advisor, analytics database and backups.

**The principles from before stay the same.** Each task has one owner from start
to finish. No task in your list waits for a different person. The finish date
is the same.

---

## The one hard deadline

**Design must finish D-02, D-03 and D-04 by end of Wednesday 30 September.**

"Mostly done" is not sufficient. The designs must be complete, because five
people must build from them on Thursday morning. All Phase A slots have work,
but P4 and P5 each have one free slot on Sunday 27. There is no spare time for
a design that arrives late. **For each day after 30 September that a design is
late, the launch is one day late.**

We need D-01, the styling decision, before that date. The other three designs
cannot start before D-01 is complete.

---

## The rules

1. **Work your list in order.** The order is the schedule.
2. **Do one task at a time.** Finish and merge a task before you start the next task.
3. **Open a pull request for each task.** Never push to `main`. Never commit
   to `main` directly. Your work goes into the repo only as a PR.
4. **Make one PR for each task.** Put the task ID in the PR title.
5. **Give your standup by 10 am.** Tell the team the tasks that you finished,
   your current task, and your blockers.
6. **In the first week, merge on the day that you finish.** Other people wait for your work.

---

# Phase A · Thu 24 → Wed 30 Sep

## P1 · Platform

| # | Task | Hours | When |
|---|---|---|---|
| 1 | T-02 Scaffold the monorepo in this repo | 4 | Thu 24 → Fri 25 |
| 2 | T-05 Google sign-in and token checks in the API | 6 | Sat 26 → Mon 28 |
| 3 | T-04 Deploy web and API to Mumbai | 3 | Tue 29 → Wed 30 |
| 4 | T-07 Error reporting wrapper and Sentry | 1 | Wed 30 |

14 hours. You start first. All engineers commit into T-02.

## P2 · Assistant — the chatbot specialist

Your lane needs no designs, so we do **not** re-cut your list. Work through the
two phases with no interruption.

| # | Task | Hours | When |
|---|---|---|---|
| 1 | T-08 Form A contract: slots and enums | 2 | Thu 24 |
| 2 | T-11 Model wrapper: DeepSeek with Gemini fallback | 4 | Fri 25 → Sat 26 |
| 3 | T-12 Extraction: free text to form slots | 6 | Sun 27 → Tue 29 |
| 4 | T-13 Reply writer with scope rules | 4 | Wed 30 → Thu 1 Oct |
| 5 | T-34 Router: sort each typed message and flag what we should not answer | 6 | Fri 2 → Sun 4 Oct |
| 6 | T-21 Five-turn cap, rate limits, spend ceiling | 5 | Mon 5 → Wed 7 Oct |
| 7 | T-27 Run the eval set and tune the prompt | 3 | Wed 7 → Thu 8 Oct |

30 hours, for the full period. **Do T-08 on day one.** Three people build against it.

## P3 · Data and trust — you

| # | Task | Hours | When |
|---|---|---|---|
| 1 | T-06 Database schema v1 | 8 | Thu 24 → Sun 27 |
| 2 | T-14 Match query API | 6 | Mon 28 → Wed 30 |

14 hours. Do T-06 alone, in four days. Do no other task until T-06 merges.
All downstream work waits for T-06. Thus, if you have spare time, the most
useful thing is to finish T-06 before its date.

## P4 · Content and moderation

| # | Task | Hours | When |
|---|---|---|---|
| 1 | T-23a Landing page ported from the prototype | 4 | Thu 24 → Fri 25 |
| 2 | T-23b Privacy, terms and grievance pages | 2 | Sat 26 |
| 3 | T-19 Report, block, suspend, and a saved moderation query | 5 | Mon 28 → Wed 30 |
| 4 | T-20 Account deletion | 3 | Wed 30 → Thu 1 Oct |

14 hours. The prototype at `docs/source/roomsie-prototype-V3.html` **is** your
design for T-23a. Thus, T-23a is not blocked.

Sunday 27 is a spare slot, because T-19 needs the schema. The schema arrives on
the evening of that day. Use the slot to read the ADRs or to help with M-03, the eval sentences.

## P5 · Accounts and connections

| # | Task | Hours | When |
|---|---|---|---|
| 1 | M-03 Write the eval sentences | 4 | Thu 24 → Fri 25 |
| 2 | T-03 CI: typecheck, lint, build, secret scan | 2 | Sat 26 |
| 3 | T-24 Event logging table | 2 | Mon 28 |
| 4 | T-17 Carry anonymous chat into the account on sign-in | 2 | Tue 29 |
| 5 | T-18a Connect request and contact reveal API | 4 | Wed 30 → Thu 1 Oct |

14 hours. Usually, M-03 is a marketing task. You do it for these reasons:

- It needs no design and no code.
- It is the only task available to you on day one.
- P2 needs it for T-27.

Sunday 27 is also a spare slot for you.

---

# Phase B · Thu 1 → Sat 10 Oct — screens and the assistant

In Phase B, designs exist. Everyone builds screens. The assistant gets its
router, observer and advisor. P2 continues on their own lane, as given above.

| Person | Task | Hours | When |
|---|---|---|---|
| **P1** | T-25 Uptime monitor and spend alerts | 2 | Thu 1 Oct |
| **P1** | T-33 Invite-only gate until launch | 1 | Fri 2 Oct |
| **P1** | T-39 Analytics in its own database, with scheduled jobs | 3 | Fri 2 → Sat 3 Oct |
| **P1** | T-40 Nightly database backups to R2 | 2 | Sun 4 Oct |
| **P1** | T-16 Profile create and edit, with photos | 8 | Mon 5 → Thu 8 Oct |
| **P1** | T-22 Launch areas and waitlist | 3 | Fri 9 → Sat 10 Oct |
| **P1** | T-29 Abuse test: 100 fake sessions | 1 | Sat 10 Oct |
| **P3 (you)** | T-37 Articles table and full-text search | 3 | Thu 1 → Fri 2 Oct |
| **P3 (you)** | T-15 Results panel, built against the contract | 6 | Fri 2 → Mon 5 Oct |
| **P3 (you)** | T-18b Person detail and connect screens | 4 | Mon 5 → Wed 7 Oct |
| **P3 (you)** | T-38 Advisor: articles first, then web search after sign-in | 7 | Wed 7 → Sat 10 Oct |
| **P4** | T-35 Form B contract and table | 3 | Fri 2 → Sat 3 Oct |
| **P4** | T-36 Observer: Form B from free text, with the quote check | 8 | Sat 3 → Wed 7 Oct |
| **P5** | T-10 Chat screen and split view | 8 | Fri 2 → Mon 5 Oct |
| **P5** | T-09 Chip flow for intent, area, budget | 6 | Tue 6 → Thu 8 Oct |

All lanes finish by Saturday 10 October. P4 has about 9 spare hours. P5 has 6
and P2 has 4. If a person is late, P4, P5 and P2 are the first to do their work.

You own T-15 and T-18b because they show the matches and people from your own
schema and match query. You also own the advisor because it searches data that
you own. You have no spare hours. Thus, if a task will take more time than
planned, tell the team immediately.

---

## Everyone

- **Sunday 11 October** — bug fixing (A-01).
- **Monday 12 October** — launch (A-02). The fallback is **Wednesday 14 October**.

---

## What this costs

- **We build all screens in Phase B.** Usually, UI work is spread across the
  schedule, and problems show at the start. Here, problems show in the first week
  of October. This is the cost of no designs. It is not a mistake in the order of tasks.
- **During Phase A, no person owns a vertical from end to end.** This is a
  change from before. You get resilience, but you lose clean ownership.
- **Phase A has almost no slack.** All slots have work, but P4 and P5 have
  Sunday 27 free.
- **Two people have a spare slot on Sunday 27 September.** The cause: only three
  tasks in the full project can start before the schema and monorepo exist.

**One thing decides if the launch stays on 12 October: if the designs arrive on
30 September.** We arranged all other parts of this plan around that date.

# Index of every code

This section gives each task in plain words, with an example. If you are new to
the project, read this section first.

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

A letter at the end of a code (**T-18a**, **T-18b**) shows one task divided into
a backend half and a screen half. Different people own the two halves.

Gaps in the numbers are usual. We removed or merged T-01, T-26, T-28, T-30 to
T-32 and M-08 during the plan work. We never used a code again. We added T-34
to T-40 on 26 September.

**⚑ marks the critical path.** If a ⚑ task is late, the launch date is late.

## The lanes and roles

| Code | Name | In plain words |
|---|---|---|
| **P1** | Platform | The plumbing: the project itself, sign-in, deploy, monitoring. Then profiles, the waitlist, the analytics database and backups. |
| **P2** | Assistant | The brain: all that the AI understands and says, the limits on the AI, and the router that decides which part of the AI runs. |
| **P3** | Data and trust | The database and the matching. Then the results panel, person screens and the advisor. |
| **P4** | Content and moderation | The public and legal pages, reporting and deletion. Then the observer. |
| **P5** | Accounts and connections | CI, event logging, carrying a chat into an account, connecting two people. Then the chat screen and its chips. |
| **D** | Design | Draws each screen before the engineers build it. |
| **M1** | Content | Writes articles and launch posts to bring people in. |
| **M2** | Community | Finds the first real users and talks to brokers. |
| **F** | Founder | Money, legal, domain, naming people, and the final go/no-go decision. |

## Checkpoints

| Code | Name | Date | What is true by then |
|---|---|---|---|
| **CP0** | Kickoff | Fri 25 Sep | Everyone knows what they own. Accounts, billing and domain exist. The look is decided. |
| **CP1** | Foundation | Mon 28 Sep | The shared plumbing is merged: project, database, sign-in, AI wrapper. Landing and legal pages are live. There are no product screens at this time. |
| **CP2** | Core loop live | Thu 1 Oct | It works from end to end on the real internet, with no UI: a sentence goes in, matches come out, and connecting works. Designs are finished. 100 people signed up. |
| **CP3** | Feature freeze, go/no-go | Sat 10 Oct | All screens and assistant handlers are merged and live behind the invite gate. An 8 pm meeting decides 12 or 14 October. |
| **CP4** | Launch | Mon 12 Oct | Open to the public. Fallback Wednesday 14 October. |
| **CP5** | First-week review | Mon 19 Oct | The team looks at the numbers and decides what v1 should be. |

## T · Engineering tasks

| Code | Task — in plain words, with an example | Owner | Issue |
|---|---|---|---|
| **T-02** ⚑ | **Scaffold the monorepo** — Make one project folder that holds the website, the server and the shared code. Then all five people commit into the same place. *Example: all five people open the same project, and each person works in their own part of it. There are not five separate projects.* | P1 | #10 |
| **T-03** | **CI: typecheck, lint, build, secret scan** — A robot that checks each pull request automatically. *Example: you open a PR at 11 pm. Two minutes later, a green tick or a red cross tells you if you broke something. This includes a password that you pasted accidentally.* | P5 | #24 |
| **T-04** | **Deploy web and API to Mumbai** — Put the site and server on real machines in Mumbai, so anyone on the internet can use it. *Example: the site is no longer "works on my laptop". It becomes a real web address that loads fast in India.* | P1 | #30 |
| **T-05** ⚑ | **Google sign-in and token checks** — Let people log in with Google. Make the server check who the user is on each request. *Example: you tap "Continue with Google" and pick your Gmail. Then you are in, with no password to invent.* | P1 | #20 |
| **T-06** ⚑ | **Database schema v1** — Decide the exact shape of all the data that you store: people, flats, messages, matches. *Example: a person has a name, age, budget and photos. The budget is a number like 25000, not text like "around 25k".* | P3 | #11 |
| **T-07** | **Error reporting wrapper and Sentry** — When the app breaks for a user, send the crash to a dashboard automatically. *Example: at 2 am, a person gets a broken page. You see exactly which line failed and how many people got it, but no person reported it to you.* | P1 | #28 |
| **T-08** ⚑ | **Form A contract: slots and enums** — Write down the exact list of things that the assistant tries to learn, and the exact allowed answers. *Example: "intent" is one of the four cards of the prototype — a flat and flatmates, just a flat, just a flatmate, or renting out a flat — or `unclear`. The nine lifestyle axes are smoking, alcohol, guests, pets, hours, tidiness, at home, daytime and kitchen. Everyone builds against that fixed list.* | P2 | #6 |
| **T-09** ⚑ | **Chip flow for intent, area, budget** — Buttons under the chat that people tap, so they do not have to type. *Example: you do not type a sentence. You tap [A flat and flatmates] [Powai] [₹15–20k].* | P5 | #26 |
| **T-10** ⚑ | **Chat screen and split view** — The main screen: the conversation on one side, the results on the other side. *Example: you chat on the left. While the assistant learns what you want, people who fit appear on the right.* | P5 | #12 |
| **T-11** ⚑ | **Model wrapper: DeepSeek with Gemini fallback** — One piece of code that talks to the AI. If the first AI is down, it silently changes to a backup AI. *Example: DeepSeek goes offline at 9 pm. Users never know, because Gemini answers.* | P2 | #15 |
| **T-12** ⚑ | **Extraction: free text to form slots** — Change a sentence that a person typed into tidy fields. *Example: "need a room near Powai, max 18k, moving next month, I don't smoke" becomes intent = a flat and flatmates, area = Powai, budget = 18,000, move date = October, smoking = no.* | P2 | #23 |
| **T-13** | **Reply writer with scope rules** — Make the assistant write its answers, and keep it on the topic. *Example: a person asks "what's the weather?". The assistant does not answer. It politely moves the conversation back to flats.* | P2 | #33 |
| **T-14** ⚑ | **Match query API** — The server code that takes what a person wants and returns the people who fit. *Example: Powai, ₹18k, no smoking → the 12 people who fit best, best first.* | P3 | #27 |
| **T-15** ⚑ | **Results panel** — The part of the screen that shows matches as cards. In v0, each card is a person, never a property listing. *Example: the right column fills with person cards: name, area, budget, and a match score when we know enough.* | P3 | #16 |
| **T-16** ⚑ | **Profile create and edit, with photos** — The screens where a person says who they are and uploads photos. *Example: name, age, job, "I'm tidy and sleep early", and four photos of the room.* | P1 | #36 |
| **T-17** | **Carry anonymous chat into the account** — If a person chats before they sign up, keep that conversation when they sign up. *Example: you chat for five minutes as a stranger, then you sign in. Your chat is still there. It is not deleted.* | P5 | #32 |
| **T-18a** ⚑ | **Connect request and contact reveal API** — The server side of a connect request. It shows phone numbers only when the two people agree. *Example: you tap Connect and they accept. Only then do you both see the number of the other person.* | P5 | #38 |
| **T-18b** ⚑ | **Person detail and connect screens** — The screens where you read the full profile of a person and send that request. *Example: when you tap a card, the full profile opens, with a Connect button at the bottom.* | P3 | #44 |
| **T-19** | **Report, block, suspend, moderation query** — The safety tools. *Example: a person sends you a creepy message. You block them, and they disappear from your results. A moderator sees the report.* | P4 | #45 |
| **T-20** | **Account deletion** — Let people delete their account and data correctly. *Example: you tap Delete, and your profile, photos and messages are really removed. Indian law requires this.* | P4 | #46 |
| **T-21** | **Five-turn cap, rate limits, spend ceiling** — Limits that stop abuse of the AI and a very large bill. *Example: one visitor cannot send 10,000 messages overnight and cost you ₹80,000 in AI fees.* | P2 | #41 |
| **T-22** | **Launch areas and waitlist** — Open only the three chosen Mumbai areas. Collect emails from all other areas. *Example: a person in Pune visits and sees "not here yet". They leave their email for later.* | P1 | #47 |
| **T-23a** | **Landing page** — The public home page that explains what roomsie is. *Example: the first page that a stranger sees, with the pitch and a "Start chatting" button.* | P4 | #39 |
| **T-23b** | **Privacy, terms and grievance pages** — The legal pages that each Indian site must have. *Example: the Privacy Policy link in the footer, and a named grievance officer that people can contact.* | P4 | #40 |
| **T-24** | **Event logging table** — Record what people actually do, so you can see what works. *Example: count how many people start a chat but never sign up, and exactly where they stop.* | P5 | #37 |
| **T-25** | **Uptime monitor and spend alerts** — Automatic warnings if the site stops or costs increase quickly. *Example: a message at 3 am that says "site down" or "AI spend passed ₹5,000 today".* | P1 | #43 |
| **T-27** | **Run the eval set and tune the prompt** — Test the assistant on a list of real sentences. Fix what it gets wrong. *Example: you give it 100 sentences. It reads "PG" as a full flat 30 times. You fix the wording and test again.* | P2 | #48 |
| **T-29** | **Abuse test: 100 fake sessions** — Attack your own site before strangers do. *Example: send 100 fake users to the chat at the same time. Make sure that the limits actually hold.* | P1 | #51 |
| **T-33** | **Invite-only gate until launch** — Keep the public out until launch day. *Example: a person with no invite code sees a "coming soon" page, not the app.* | P1 | #29 |
| **T-34** ⚑ | **Router: sort each typed message and flag what we should not answer** — One cheap model call that decides what a message is. Thus, it decides which handlers run. *Example: "is semi-furnished normal in Powai?" goes to the advisor. "my ex basically lived there" goes to the observer. "write my essay" gets a polite scripted line, with no model call, and is logged.* | P2 | — |
| **T-35** | **Form B contract and table** — The shape of what the observer records about a person, and where we store it. *Example: guest frequency = "partner stays over most nights", with the exact words of the user as evidence.* | P4 | — |
| **T-36** | **Observer: Form B from free text, with the quote check** — Records what chips cannot capture, but only when it can quote the user. *Example: "my ex basically lived there, that's what killed it" becomes a note about guests. The observer discards a note that has no exact quote behind it.* | P4 | — |
| **T-37** | **Articles table and full-text search** — Stores the articles of roomsie and finds the correct passage. *Example: "deposit" finds the paragraph in the article on Mumbai deposits.* | P3 | — |
| **T-38** | **Advisor: articles first, then web search after sign-in** — Answers housing questions from our articles first, then from the web. *Example: "what does semi-furnished usually include?" uses our article if we have one. If not, it uses a web search for signed-in users. The advisor never answers "Is this clause in my agreement legal?" from the web. It hands that question off.* | P3 | — |
| **T-39** | **Analytics in its own database, with scheduled jobs** — Keeps analytics writes off the main database. *Example: many "results shown" events at one time cannot make a profile save slow.* | P1 | — |
| **T-40** | **Nightly database backups to R2** — A copy of the two databases each night, because the free plan keeps no backups. *Example: a bad migration on day three is undone from the copy of last night. It is not lost permanently.* | P1 | — |

## D · Design

| Code | Task — in plain words, with an example | Issue |
|---|---|---|
| **D-01** | **Styling decision for launch** — Pick the colours, fonts and general feel one time, so that the team never argues about them again. *Example: roomsie looks clean and warm, not neon and loud.* | #1 |
| **D-02** ⚑ | **Design the chat screens** — Draw what the chat looks like before anyone builds it. *Example: a picture that shows the positions of the message bubbles, chips and results.* | #7 |
| **D-03** | **Design results, profile and connect screens** — Draw the match cards, profile pages and the connect flow. | #19 |
| **D-04** | **Design landing, wall and waitlist** — Draw the public home page and the waitlist page. | #25 |
| **D-05** | **Design QA on the live build** — Make sure that the built site actually agrees with the drawings. *Example: you see that a real button is grey, but the design says purple.* | #42 |
| **D-06** | **Launch visuals** — The images for the launch-day posts. | #52 |

## M · Marketing

| Code | Task — in plain words, with an example | Role | Issue |
|---|---|---|---|
| **M-01** ⚑ | **Seeding form live, outreach starts** — Publish a simple sign-up form and start to tell people. *Example: share it in Mumbai flat-hunting WhatsApp groups.* | M2 | #14 |
| **M-02** | **Seeding target: 100 sign-ups** — Get 100 real people in before launch, so day one is not empty. *Example: nobody joins a flatmate app that has zero flatmates on it.* | M2 | #22 |
| **M-03** | **Write the eval sentences** — Write realistic sentences to test the assistant against. *Example: "need a room in Chembur under 15k, veg only".* | P5 (normally M1) | #21 |
| **M-04** | **Interviews for articles 1 to 10** — Talk to real flat-hunters and collect their stories. | M1 | #13 |
| **M-05** | **Drafts of articles 1 to 10** — Write those ten articles, so Google sends people to you. *Example: "What renting in Bandra actually costs in 2026".* | M1 | #31 |
| **M-06** ⚑ | **Beta invites to seeded sign-ups** — Let the 100 seeded people in first, before the public. | M2 | #49 |
| **M-07** | **Draft launch posts** — Write the launch-day social posts before the launch. | M1 | #35 |
| **M-09** | **Broker calls** — Phone brokers to get real flats listed. | M2 | #55 |

## F · Founder

| Code | Task — in plain words, with an example | Issue |
|---|---|---|
| **F-01** | **Kickoff: names on every role** — Put the name of a real person against each vertical. *Example: fill in the five blanks that say `_name_` at this time.* | #2 |
| **F-02** | **Secure the domain** — Buy the web address before a different person does. | #3 |
| **F-03** | **Billing and hard spend caps** — Configure payment, with hard ceilings. *Example: limit the AI account to ₹20,000 a month, so a bug cannot quietly cost a lakh.* | #4 |
| **F-04** | **Create accounts in Mumbai regions** — Open the hosting and database accounts in the Mumbai region, so the site is fast for Indian users. | #5 |
| **F-05** ⚑ | **Consent text for the seeding form** — The text that tells people what you will do with their data. | #8 |
| **F-06** | **Pick the three launch areas** — Choose the three Mumbai neighbourhoods where we open. *Example: Bandra, Andheri and Powai, and no other areas at launch.* | #9 |
| **F-07** | **Draft privacy policy, terms, grievance contact** — Write the legal text for those pages. | #17 |
| **F-08** | **Name the moderator** — Decide who handles reports and abuse when they arrive. | #34 |
| **F-09** | **Write down the three ADR exceptions** — Record the three places where you knowingly broke your own architecture rules, and the reasons. *Example: so that in six months, nobody asks "why on earth did we do it this way?".* | #18 |
| **F-10** | **Go/no-go meeting** — The meeting on Saturday 10 October, 8 pm. It decides to launch on the 12th, or to move the launch to the 14th. Quality decides, not the calendar. | #50 |

## A · Everyone

| Code | Task — in plain words | Issue |
|---|---|---|
| **A-01** | **Bug fix day** (Sun 11 Oct) — One full day. Nobody builds new things. Everyone only repairs what is broken. | #53 |
| **A-02** | **Launch** (Mon 12 Oct, fallback Wed 14 Oct) — Remove the gate. Open to the public. | #54 |

**62 tasks, 55 issues.** All codes above are live GitHub issues at
`github.com/magentawood/roomsie/issues`, but not T-34 to T-40. These seven tasks
are not filed at this time.
