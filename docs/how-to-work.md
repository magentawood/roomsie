# How to work — no-designs plan

Launch is still **Wednesday 7 October**. Two hours a day, every day, weekends
included, from **Thursday 24 September**. Nothing about the deadline changes.

**We do not have designs yet.** This plan is built around that.

---

## What we found

Of 115 hours of engineering, **80 need no design at all** and **35 cannot
start without one**. But the split is lopsided:

| Lane | Total | Design-free | Blocked |
|---|---|---|---|
| V1 Platform | 24h | 24h | 0h |
| V2 Assistant | 24h | 24h | 0h |
| V4 Matching | 22h | 22h | 0h |
| V3 Visitor | 23h | 6h | **17h** |
| V5 People | 22h | 4h | **18h** |

Three lanes are untouched. Two are almost entirely blocked. So we **cannot
keep the old verticals** for the first week — V3 and V5 would sit idle while
everyone else works.

**The fix:** for the design-free period everybody works from one shared pool
of backend and infrastructure work. When designs land, all five switch to
screens at once.

---

## The two phases

- **Phase A · Thu 24 → Wed 30 Sep.** All 80 hours of design-free work. Nobody
  touches a screen.
- **Phase B · Thu 1 → Mon 5 Oct.** All 35 hours of screens, once designs exist.

**The principles from before still hold.** One owner per task, start to
finish. Nothing in your list waits on another person. Same finish date.

---

## The one hard deadline

**Designs D-02, D-03 and D-04 must be finished by end of Wednesday 30 September.**

Not "mostly done" — finished, so five people can build from them on Thursday
morning. Phase A is exactly 80 hours against exactly 80 hours of capacity.
There is no room to absorb a design that arrives late. **Every day a design
slips past 30 September is a day the launch slips.**

D-01, the styling decision, is needed sooner still — it gates the other three.

---

## The rules

1. **Work your list in order.** The order is the schedule.
2. **One task at a time.** Finish and merge one before starting the next.
3. **Open a pull request for every task.** Never push to `main`. Never commit
   to `main` directly. Your work reaches the repo as a PR and no other way.
4. **One PR per task**, titled with the task ID.
5. **Standup by 10 am** — what you finished, what you're on, what's blocking you.
6. **In the first week, merge the day you finish.** Others are waiting.

---

# Phase A · Thu 24 → Wed 30 Sep

## P1 · Platform

| # | Task | Hours | When |
|---|---|---|---|
| 1 | T-02 Scaffold the monorepo in this repo | 4 | Thu 24 → Fri 25 |
| 2 | T-05 Google sign-in and token checks in the API | 6 | Sat 26 → Mon 28 |
| 3 | T-04 Deploy web and API to Mumbai | 3 | Tue 29 → Wed 30 |
| 4 | T-07 Error reporting wrapper and Sentry | 1 | Wed 30 |

14 hours. You are first out of the gate — T-02 is what everyone commits into.

## P2 · Assistant — the chatbot specialist

Your lane needs no designs at all, so you are **not** re-cut. Work straight
through both phases without interruption.

| # | Task | Hours | When |
|---|---|---|---|
| 1 | T-08 Form A contract: slots and enums | 2 | Thu 24 |
| 2 | T-11 Model wrapper: DeepSeek with Gemini fallback | 4 | Fri 25 → Sat 26 |
| 3 | T-12 Extraction: free text to form slots | 6 | Sun 27 → Tue 29 |
| 4 | T-13 Reply writer with scope rules | 4 | Wed 30 → Thu 1 Oct |
| 5 | T-21 Five-turn cap, rate limits, spend ceiling | 5 | Fri 2 → Sun 4 Oct |
| 6 | T-27 Run the eval set and tune the prompt | 3 | Sun 4 → Mon 5 Oct |

24 hours, the full fortnight. **T-08 on day one** — three people build against it.

## P3 · Data and trust — you

| # | Task | Hours | When |
|---|---|---|---|
| 1 | T-06 Database schema v1 | 8 | Thu 24 → Sun 27 |
| 2 | T-14 Match query API | 6 | Mon 28 → Wed 30 |

14 hours. T-06 alone, four days, nothing else until it merges. Everything
downstream waits on it, so finishing early is the most useful thing you can do
with spare time.

## P4 · Content and moderation

| # | Task | Hours | When |
|---|---|---|---|
| 1 | T-23a Landing page ported from the prototype | 4 | Thu 24 → Fri 25 |
| 2 | T-23b Privacy, terms and grievance pages | 2 | Sat 26 |
| 3 | T-19 Report, block, suspend, and a saved moderation query | 5 | Mon 28 → Wed 30 |
| 4 | T-20 Account deletion | 3 | Wed 30 → Thu 1 Oct |

14 hours. The prototype at `docs/source/roomsie-prototype-V3.html` **is** your
design for T-23a — that is why it is not blocked.

Sunday 27 is a spare slot: T-19 needs the schema, which lands that evening.
Use it to read the ADRs or help with M-03, the eval sentences.

## P5 · Accounts and connections

| # | Task | Hours | When |
|---|---|---|---|
| 1 | M-03 Write the eval sentences | 4 | Thu 24 → Fri 25 |
| 2 | T-03 CI: typecheck, lint, build, secret scan | 2 | Sat 26 |
| 3 | T-24 Event logging table | 2 | Mon 28 |
| 4 | T-17 Carry anonymous chat into the account on sign-in | 2 | Tue 29 |
| 5 | T-18a Connect request and contact reveal API | 4 | Wed 30 → Thu 1 Oct |

14 hours. M-03 is normally marketing's, but it needs no design and no code, it
is the only thing available on day one, and P2 needs it for T-27. Sunday 27 is
spare here too.

---

# Phase B · Thu 1 → Mon 5 Oct — screens

Designs exist now. Everyone builds. P2 continues their own lane.

| Person | Task | Hours | When |
|---|---|---|---|
| **P1** | T-25 Uptime monitor and spend alerts | 2 | Thu 1 Oct |
| **P1** | T-33 Invite-only gate until launch | 1 | Fri 2 Oct |
| **P1** | T-09 Chip flow for intent, area, budget | 6 | Sat 3 → Mon 5 Oct |
| **P3 (you)** | T-15 Results panel, built against the contract | 6 | Thu 1 → Sat 3 Oct |
| **P3 (you)** | T-18b Person detail and connect screens | 4 | Sun 4 → Mon 5 Oct |
| **P4** | T-16 Profile create and edit, with photos | 8 | Fri 2 → Mon 5 Oct |
| **P4** | T-22 Launch areas and waitlist | 3 | Tue 6 Oct — flex |
| **P5** | T-10 Chat screen and split view | 8 | Fri 2 → Mon 5 Oct |

38 hours against 40 of capacity. **T-22 is the flex item** — if anything runs
long, it moves to 6 October.

You take T-15 and T-18b because they display the matches and people your own
schema and match query produce. You know that data better than anyone.

---

## Everyone

- **Tuesday 6 October** — bug fixing (A-01). P1 also runs T-29, the abuse test.
- **Wednesday 7 October** — launch (A-02).

---

## What this costs

Be clear-eyed about the trade.

- **Every screen is built in the last five days.** Normally UI work is spread
  out and problems surface early. Here they surface on 3 October. That is the
  price of not having designs, not a flaw in the ordering.
- **Nobody owns a vertical end to end any more** during Phase A. You get
  resilience and lose clean ownership.
- **Phase A has zero slack** — 80 hours of work, 80 hours of capacity.
- **Two people have a spare slot on Sunday 27 September**, because only three
  tasks in the whole project can start before the schema and monorepo exist.

**The single thing that decides whether 7 October holds is whether designs
land on 30 September.** Everything else here is arranged around that date.

# Index of every code

Every task, in plain words, with an example. If you are new to the project,
read this section first.

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

A trailing letter (**T-18a**, **T-18b**) means one task split into a backend
half and a screen half, owned by different people.

Number gaps are normal — T-01, T-26, T-28, T-30 to T-32 and M-08 were dropped
or merged while planning. The codes were never reused.

**⚑ marks the critical path.** If a ⚑ task slips, the launch date slips.

## The lanes and roles

| Code | Name | In plain words |
|---|---|---|
| **P1** | Platform | The plumbing: the project itself, sign-in, deploy, monitoring. Then the chips. |
| **P2** | Assistant | The brain: everything the AI understands and says, and the limits on it. |
| **P3** | Data and trust | The database and the matching. Then the results panel and person screens that show them. |
| **P4** | Content and moderation | The public and legal pages, reporting and deletion. Then profiles and the waitlist. |
| **P5** | Accounts and connections | CI, event logging, carrying a chat into an account, connecting two people. Then the chat screen. |
| **D** | Design | Draws every screen before it gets built. |
| **M1** | Content | Writes articles and launch posts to bring people in. |
| **M2** | Community | Finds the first real users and talks to brokers. |
| **F** | Founder | Money, legal, domain, naming people, and the final go/no-go call. |

## Checkpoints

| Code | Name | Date | What is true by then |
|---|---|---|---|
| **CP0** | Kickoff | Fri 25 Sep | Everyone knows what they own. Accounts, billing and domain exist. The look is decided. |
| **CP1** | Foundation | Mon 28 Sep | The shared plumbing is merged — project, database, sign-in, AI wrapper. Landing and legal pages are up. No product screens yet. |
| **CP2** | Core loop live | Thu 1 Oct | It works end to end on the real internet without a UI: a sentence goes in, matches come out, connecting works. Designs are finished. 100 people signed up. |
| **CP3** | Feature freeze, go/no-go | Mon 5 Oct | Every screen is merged and live behind the invite gate. 8 pm meeting decides 7 or 9 October. |
| **CP4** | Launch | Wed 7 Oct | Open to the public. Fallback Friday 9 October. |
| **CP5** | First-week review | Wed 14 Oct | Look at the numbers, decide what v1 should be. |

## T · Engineering tasks

| Code | Task — in plain words, with an example | Owner | Issue |
|---|---|---|---|
| **T-02** ⚑ | **Scaffold the monorepo** — Make one single project folder that holds the website, the server and the shared code, so all five people commit into the same place. *Example: instead of five people each starting their own separate project, everyone opens the same one and works in their own corner of it.* | P1 | #10 |
| **T-03** | **CI: typecheck, lint, build, secret scan** — A robot that checks every pull request automatically. *Example: you open a PR at 11 pm and two minutes later a green tick or red cross tells you whether you broke anything — including whether you accidentally pasted a password.* | P5 | #24 |
| **T-04** | **Deploy web and API to Mumbai** — Put the site and server on real machines in Mumbai so anyone on the internet can use it. *Example: the site stops being "works on my laptop" and starts being a real web address that loads fast in India.* | P1 | #30 |
| **T-05** ⚑ | **Google sign-in and token checks** — Let people log in with Google, and make the server check who they are on every request. *Example: you tap "Continue with Google", pick your Gmail, and you're in — no password to invent.* | P1 | #20 |
| **T-06** ⚑ | **Database schema v1** — Decide the exact shape of everything you store: people, flats, messages, matches. *Example: agreeing a person has a name, age, budget and photos — and that budget is a number like 25000, not text like "around 25k".* | P3 | #11 |
| **T-07** | **Error reporting wrapper and Sentry** — When the app breaks for a user, send the crash to a dashboard automatically. *Example: someone hits a broken page at 2 am; you see exactly which line failed and how many people hit it, without anyone reporting it.* | P1 | #28 |
| **T-08** ⚑ | **Form A contract: slots and enums** — Write down the exact list of things the assistant tries to learn, and the exact allowed answers. *Example: "intent" is one of the prototype's four cards — a flat and flatmates, just a flat, just a flatmate, or renting out a flat — or `unclear`. The nine lifestyle axes are smoking, alcohol, guests, pets, hours, tidiness, at home, daytime and kitchen. Everyone builds against that fixed list.* | P2 | #6 |
| **T-09** ⚑ | **Chip flow for intent, area, budget** — Tappable buttons under the chat so people don't have to type. *Example: instead of typing a sentence, you tap [A flat and flatmates] [Powai] [₹15–20k].* | P1 | #26 |
| **T-10** ⚑ | **Chat screen and split view** — The main screen: conversation on one side, results on the other. *Example: you chat on the left, and as the assistant works out what you want, people who fit appear on the right.* | P5 | #12 |
| **T-11** ⚑ | **Model wrapper: DeepSeek with Gemini fallback** — One piece of code that talks to the AI, and silently switches to a backup AI if the first one is down. *Example: DeepSeek goes offline at 9 pm and users never notice, because Gemini answers instead.* | P2 | #15 |
| **T-12** ⚑ | **Extraction: free text to form slots** — Turn a sentence someone typed into tidy fields. *Example: "need a room near Powai, max 18k, moving next month, I don't smoke" becomes intent = a flat and flatmates, area = Powai, budget = 18,000, move date = October, smoking = no.* | P2 | #23 |
| **T-13** | **Reply writer with scope rules** — Make the assistant write its answers, and keep it on topic. *Example: someone asks "what's the weather?" and it politely steers back to flats instead of answering.* | P2 | #33 |
| **T-14** ⚑ | **Match query API** — The server code that takes what someone wants and returns who fits. *Example: Powai, ₹18k, no smoking → the 12 people who fit best, best first.* | P3 | #27 |
| **T-15** ⚑ | **Results panel** — The part of the screen that shows matches as cards. In v0 every card is a person, never a property listing. *Example: the right-hand column fills with person cards — name, area, budget, and once we know enough, a match score.* | P3 | #16 |
| **T-16** ⚑ | **Profile create and edit, with photos** — The screens where someone says who they are and uploads pictures. *Example: name, age, job, "I'm tidy and sleep early", plus four photos of the room.* | P4 | #36 |
| **T-17** | **Carry anonymous chat into the account** — If someone chats before signing up, keep that conversation when they do. *Example: you chat for five minutes as a stranger, then sign in — and your chat is still there instead of wiped.* | P5 | #32 |
| **T-18a** ⚑ | **Connect request and contact reveal API** — The server side of asking to connect, and only showing phone numbers once both people agree. *Example: you tap Connect, they accept, and only then do you both see each other's number.* | P5 | #38 |
| **T-18b** ⚑ | **Person detail and connect screens** — The screens for reading someone's full profile and sending that request. *Example: tapping a card opens their whole profile with a Connect button at the bottom.* | P3 | #44 |
| **T-19** | **Report, block, suspend, moderation query** — The safety tools. *Example: someone sends a creepy message — you block them, they disappear from your results, and a moderator sees the report.* | P4 | #45 |
| **T-20** | **Account deletion** — Let people delete their account and data properly. *Example: you tap Delete, and your profile, photos and messages are actually gone — which Indian law requires.* | P4 | #46 |
| **T-21** | **Five-turn cap, rate limits, spend ceiling** — Limits so the AI can't be abused or run up a huge bill. *Example: one visitor can't send 10,000 messages overnight and cost you ₹80,000 in AI fees.* | P2 | #41 |
| **T-22** | **Launch areas and waitlist** — Only open the three chosen Mumbai areas; collect emails from everywhere else. *Example: someone in Pune visits, sees "not here yet", and leaves their email for later.* | P4 | #47 |
| **T-23a** | **Landing page** — The public home page explaining what roomsie is. *Example: the first thing a stranger sees, with the pitch and a "Start chatting" button.* | P4 | #39 |
| **T-23b** | **Privacy, terms and grievance pages** — The legal pages every Indian site must have. *Example: the Privacy Policy link in the footer, plus a named grievance officer people can contact.* | P4 | #40 |
| **T-24** | **Event logging table** — Record what people actually do, so you can see what works. *Example: counting how many people start a chat but never sign up — and where exactly they drop off.* | P5 | #37 |
| **T-25** | **Uptime monitor and spend alerts** — Automatic warnings if the site dies or costs spike. *Example: a message at 3 am saying "site down" or "AI spend passed ₹5,000 today".* | P1 | #43 |
| **T-27** | **Run the eval set and tune the prompt** — Test the assistant on a list of real sentences and fix what it gets wrong. *Example: you feed it 100 sentences, it misreads "PG" as a whole flat 30 times, you fix the wording and retest.* | P2 | #48 |
| **T-29** | **Abuse test: 100 fake sessions** — Attack your own site before strangers do. *Example: run 100 fake users hammering the chat at once and check the limits actually hold.* | P1 | #51 |
| **T-33** | **Invite-only gate until launch** — Keep the public out until launch day. *Example: anyone without an invite code sees a "coming soon" page instead of the app.* | P1 | #29 |

## D · Design

| Code | Task — in plain words, with an example | Issue |
|---|---|---|
| **D-01** | **Styling decision for launch** — Pick the colours, fonts and overall feel once, so it is never argued twice. *Example: deciding roomsie looks clean and warm, not neon and loud.* | #1 |
| **D-02** ⚑ | **Design the chat screens** — Draw what the chat looks like before anyone builds it. *Example: a picture showing where the message bubbles, chips and results sit.* | #7 |
| **D-03** | **Design results, profile and connect screens** — Draw the match cards, profile pages and the connect flow. | #19 |
| **D-04** | **Design landing, wall and waitlist** — Draw the public home page and the waitlist page. | #25 |
| **D-05** | **Design QA on the live build** — Check the built site actually matches the drawings. *Example: spotting that a real button came out grey when the design says purple.* | #42 |
| **D-06** | **Launch visuals** — The images for launch-day posts. | #52 |

## M · Marketing

| Code | Task — in plain words, with an example | Role | Issue |
|---|---|---|---|
| **M-01** ⚑ | **Seeding form live, outreach starts** — Put up a simple sign-up form and start telling people. *Example: sharing it in Mumbai flat-hunting WhatsApp groups.* | M2 | #14 |
| **M-02** | **Seeding target: 100 sign-ups** — Get 100 real people in before launch so day one isn't empty. *Example: nobody joins a flatmate app that has zero flatmates on it.* | M2 | #22 |
| **M-03** | **Write the eval sentences** — Write realistic sentences to test the assistant against. *Example: "need a room in Chembur under 15k, veg only".* | P5 (normally M1) | #21 |
| **M-04** | **Interviews for articles 1 to 10** — Talk to real flat-hunters and collect their stories. | M1 | #13 |
| **M-05** | **Drafts of articles 1 to 10** — Write those ten articles so Google sends people to you. *Example: "What renting in Bandra actually costs in 2026".* | M1 | #31 |
| **M-06** ⚑ | **Beta invites to seeded sign-ups** — Let the 100 seeded people in first, before the public. | M2 | #49 |
| **M-07** | **Draft launch posts** — Write the launch-day social posts in advance. | M1 | #35 |
| **M-09** | **Broker calls** — Phone brokers to get real flats listed. | M2 | #55 |

## F · Founder

| Code | Task — in plain words, with an example | Issue |
|---|---|---|
| **F-01** | **Kickoff: names on every role** — Put a real person's name against each vertical. *Example: filling in the five blanks that currently say `_name_`.* | #2 |
| **F-02** | **Secure the domain** — Buy the web address before someone else does. | #3 |
| **F-03** | **Billing and hard spend caps** — Set up payment, with hard ceilings. *Example: capping the AI account at ₹20,000 a month so a bug can't quietly cost a lakh.* | #4 |
| **F-04** | **Create accounts in Mumbai regions** — Open the hosting and database accounts in the Mumbai region, so the site is fast for Indian users. | #5 |
| **F-05** ⚑ | **Consent text for the seeding form** — The wording telling people what you'll do with their data. | #8 |
| **F-06** | **Pick the three launch areas** — Choose which three Mumbai neighbourhoods to open in. *Example: Bandra, Andheri and Powai — and nothing else at launch.* | #9 |
| **F-07** | **Draft privacy policy, terms, grievance contact** — Write the legal text that fills those pages. | #17 |
| **F-08** | **Name the moderator** — Decide who handles reports and abuse when they arrive. | #34 |
| **F-09** | **Write down the three ADR exceptions** — Record the three places you knowingly broke your own architecture rules, and why. *Example: so that in six months nobody asks "why on earth did we do it this way?".* | #18 |
| **F-10** | **Go/no-go meeting** — The 5 October meeting that decides: launch on the 7th, or slip to the 9th. | #50 |

## A · Everyone

| Code | Task — in plain words | Issue |
|---|---|---|
| **A-01** | **Bug fix day** (Tue 6 Oct) — One whole day where nobody builds anything new and everyone just fixes what's broken. | #53 |
| **A-02** | **Launch** (Wed 7 Oct) — Take the gate down. Open to the public. | #54 |

**55 tasks, 55 issues.** Every code above is a live GitHub issue at
`github.com/magentawood/roomsie/issues`.
