# How to work — no-designs plan

Launch is **Wednesday 7 October**. Every day counts, weekends included, from
**Thursday 24 September**.

**We do not have designs yet.** This plan is built around that.

---

## What P1 to P5 mean

**P is a person.** Five engineers, one lane each, owned start to finish.

They are **slots, not names.** The plan works before anyone is assigned —
putting real names against them is task F-01, at kickoff on 24 September.

They used to be called V1 to V5, for *vertical*: one coherent slice of the
product, database to screen. They were renamed when the missing designs forced
the lanes to be re-cut, because most of them stopped being product areas.
**P4 · Content and moderation** is not a product area — it is a bundle of
unrelated design-free work sized to fit one person. **P2 · Chat** is the one
lane that is still a true vertical, and deliberately so.

| Lane | Owns | Hours | Per day |
|---|---|---|---|
| **P1 · Platform** | The ground everyone builds on | 18h | 1.5 |
| **P2 · Chat** | The whole conversation, model to screen | **40h** | **3.3** |
| **P3 · Data and trust** | The schema, the matching, who sees whom | 24h | 2.0 |
| **P4 · Content and moderation** | Public pages, reports, account removal | 17h | 1.4 |
| **P5 · Accounts and people** | Profiles, photos, events, connections | 20h | 1.7 |

**P2 is not like the others.** All nine chat tasks sit in one lane with one
owner, so the person who defines what the assistant understands also builds
the screen it speaks through. That coherence costs hours: 40 against everyone
else's 17 to 24, which is **3.3 hours a day for twelve days straight.** It is
a deliberate trade. Confirm the person taking it has agreed before you start.

---

## The idea behind the rest

Nobody should sit idle waiting on someone else.

Some dependencies are real — no one builds a profile screen before a database
exists. So rather than spread the shared pieces across the fortnight, where one
late person stalls three others, **all of them land in the first week.**

- **Phase A, Thu 24 → Wed 30 Sep.** Every hour of design-free work.
- **Phase B, Thu 1 → Mon 5 Oct.** Every screen, once designs exist.

Every task has exactly one owner. Nothing is split between two people.

---

## The one hard deadline

**Designs D-02, D-03 and D-04 must be finished by end of Wednesday 30 September.**

Not nearly done — finished, so five people can build from them on Thursday
morning. There is no slack to absorb a late design. **Every day a design slips
past 30 September is a day the launch slips.** D-01, the styling decision,
gates the other three and is needed sooner.

---

## The rules

1. **Work your list in order.** The order is the schedule.
2. **One task at a time.** Finish and merge one before starting the next.
3. **Open a pull request for every task.** Never push to `main`. Never commit
   to `main` directly. Your work reaches the repo as a PR and no other way.
4. **One PR per task**, titled with the task ID.
5. **Standup by 10 am** — what you finished, what you're on, what's blocking you.
6. **In the first week, merge the day you finish.** Others are waiting.

⚑ marks the critical path. If a ⚑ task slips, the launch slips.

---

# P1 · Platform

_The ground everyone builds on._

| # | Task | Hours | When |
|---|---|---|---|
| 1 | T-02 ⚑ Scaffold the monorepo | 4 | Thu 24 → Fri 25 Sep |
| 2 | T-05 ⚑ Google sign-in and token checks | 6 | Sat 26 → Mon 28 Sep |
| 3 | T-04 Deploy web and API to Mumbai | 3 | Tue 29 → Wed 30 Sep |
| 4 | T-07 Error reporting wrapper and Sentry | 1 | Wed 30 Sep |
| 5 | T-25 Uptime monitor and spend alerts | 2 | Thu 1 Oct |
| 6 | T-33 Invite-only gate until launch | 1 | Fri 2 Oct |
| 7 | T-29 Abuse test: 100 fake sessions | 1 | Tue 6 Oct |

**18 hours, 1.5 a day, 6 spare.** You go first — T-02 is what everyone else
commits into. Your spare hours are the plan's shock absorber; expect to be
asked to help.

---

# P2 · Chat

_The whole conversation, from the model to the screen._

Nine tasks, one owner. The brain first, all of it design-free, then the screens.

### The brain — Thu 24 → Wed 30 Sep

| # | Task | Hours | When |
|---|---|---|---|
| 1 | T-08 ⚑ Form A contract: slots and enums | 2 | Thu 24 Sep |
| 2 | T-11 ⚑ Model wrapper: DeepSeek with Gemini fallback | 4 | Thu 24 → Fri 25 Sep |
| 3 | T-12 ⚑ Extraction: free text to form slots | 6 | Sat 26 → Sun 27 Sep |
| 4 | T-13 Reply writer with scope rules | 4 | Mon 28 → Tue 29 Sep |
| 5 | T-21 Five-turn cap, rate limits, spend ceiling | 5 | Tue 29 → Wed 30 Sep |
| 6 | T-27 Run the eval set and tune the prompt | 3 | Wed 30 Sep |

### The screens — Thu 1 → Mon 5 Oct

| # | Task | Hours | When |
|---|---|---|---|
| 7 | T-17 Carry anonymous chat into the account | 2 | Thu 1 Oct |
| 8 | T-10 ⚑ Chat screen and split view | 8 | Thu 1 → Sat 3 Oct |
| 9 | T-09 ⚑ Chip flow for intent, area, budget | 6 | Sun 4 → Mon 5 Oct |

**40 hours, 3.3 a day, no spare.**

**T-08 is due on day one and three people build against it.** Two hours, and
the most load-bearing two hours in the plan.

P5 writes the eval sentences (M-03) in the first two days so they are ready
for your T-27.

---

# P3 · Data and trust

_The schema, the matching, and who sees whom._

| # | Task | Hours | When |
|---|---|---|---|
| 1 | T-06 ⚑ Database schema v1 | 8 | Thu 24 → Sun 27 Sep |
| 2 | T-14 ⚑ Match query API | 6 | Mon 28 → Wed 30 Sep |
| 3 | T-15 ⚑ Results panel | 6 | Thu 1 → Sat 3 Oct |
| 4 | T-18b ⚑ Person detail and connect screens | 4 | Sun 4 → Mon 5 Oct |

**24 hours, 2 a day, no spare.** T-06 is yours alone for four days — it blocks
more work than anything else in the project, so finishing early is the single
most useful thing you can do with spare time. T-15 and T-18b display the data
your own schema and match query produce, which is why they are yours.

---

# P4 · Content and moderation

_Public pages, reports and account removal._

| # | Task | Hours | When |
|---|---|---|---|
| 1 | T-23a Landing page ported from the prototype | 4 | Thu 24 → Fri 25 Sep |
| 2 | T-23b Privacy, terms and grievance pages | 2 | Sat 26 Sep |
| 3 | T-19 Report, block, suspend, moderation query | 5 | Mon 28 → Wed 30 Sep |
| 4 | T-20 Account deletion | 3 | Wed 30 Sep → Thu 1 Oct |
| 5 | T-22 Launch areas and waitlist | 3 | Tue 6 Oct |

**17 hours, 1.4 a day, 7 spare.** The prototype at
`docs/source/roomsie-prototype-V3.html` **is** the design for T-23a — that is
why it is not blocked. Sunday 27 is a spare slot while you wait for the schema.
You carry the most slack in the plan; expect to be redirected.

---

# P5 · Accounts and people

_Profiles, photos, events and connecting people._

| # | Task | Hours | When |
|---|---|---|---|
| 1 | M-03 Write the eval sentences | 4 | Thu 24 → Fri 25 Sep |
| 2 | T-03 CI: typecheck, lint, build, secret scan | 2 | Sat 26 Sep |
| 3 | T-24 Event logging table | 2 | Mon 28 Sep |
| 4 | T-18a Connect request and contact reveal API | 4 | Wed 30 Sep → Thu 1 Oct |
| 5 | T-16 ⚑ Profile create and edit, with photos | 8 | Fri 2 → Mon 5 Oct |

**20 hours, 1.7 a day, 4 spare.** M-03 is normally marketing's, but it needs no
design and no code, it is one of the only things available on day one, and P2
needs it for T-27. Do it first.

---

## Everyone

- **Tuesday 6 October** — bug fixing (A-01), plus P1's abuse test and P4's
  waitlist.
- **Wednesday 7 October** — launch (A-02).

---

## What this costs

- **Every screen is built in the last five days.** UI problems surface on
  3 October instead of early. That is the price of no designs, not a flaw in
  the ordering.
- **P2 carries 40 hours against everyone else's 17 to 24.** All the
  conversational risk sits with one person, by design. If they have a bad
  week, the product's core slips and nobody else can pick it up.
- **P1 and P4 hold 13 spare hours between them.** That is the plan's only real
  insurance. Keep it free.

**The single thing that decides whether 7 October holds is whether designs
land on 30 September.**

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
| **P1–P5** | The five people's lanes | One engineer each |

A trailing letter (**T-18a**, **T-18b**) means one task split into a backend
half and a screen half, owned by different people.

Number gaps are normal — T-01, T-26, T-28, T-30 to T-32 and M-08 were dropped
or merged while planning. The codes were never reused.

**⚑ marks the critical path.** If a ⚑ task slips, the launch date slips.

## The verticals and roles

| Code | Name | In plain words |
|---|---|---|
| **P1** | Platform | The plumbing. The ground the other four build on — the project itself, sign-in, deployment, monitoring. |
| **P2** | Chat | The whole conversation: what the assistant understands, what it says, and the screen it says it through. |
| **P3** | Data and trust | Who sees whom. The schema, the matching logic, and what gets shown. |
| **P4** | Content and moderation | The public pages, plus reporting, blocking and deleting an account. |
| **P5** | Accounts and people | Profiles, photos, event logging, and asking to connect. |
| **D** | Design | Draws every screen before it gets built. |
| **M1** | Content | Writes articles and launch posts to bring people in. |
| **M2** | Community | Finds the first real users and talks to brokers. |
| **F** | Founder | Money, legal, domain, naming people, and the final go/no-go call. |

## Checkpoints

| Code | Name | Date | What is true by then |
|---|---|---|---|
| **CP0** | Kickoff | Fri 25 Sep | Everyone knows what they own. Accounts, billing and domain exist. The look is decided. |
| **CP1** | Foundation | Mon 28 Sep | The shared plumbing is merged — project, database, sign-in, AI wrapper. Chat screen and results panel exist. |
| **CP2** | Core loop live | Thu 1 Oct | It works end to end on the real internet: type a sentence, get matches back. 100 people signed up. |
| **CP3** | Feature freeze, go/no-go | Mon 5 Oct | Nothing new gets built after this. 8 pm meeting decides 7 or 9 October. |
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
| **T-08** ⚑ | **Form A contract: slots and enums** — Write down the exact list of things the assistant tries to learn, and the exact allowed answers. *Example: "intent" can only be `has_flat`, `wants_flat` or `wants_room`. Everyone builds against that fixed list so the pieces fit together.* | P2 | #6 |
| **T-09** ⚑ | **Chip flow for intent, area, budget** — Tappable buttons under the chat so people don't have to type. *Example: instead of typing a full sentence, you tap [Looking for a room] [Bandra] [Under ₹25k].* | P2 | #26 |
| **T-10** ⚑ | **Chat screen and split view** — The main screen: conversation on one side, results on the other. *Example: you chat on the left, and as the assistant works out what you want, flats appear on the right.* | P2 | #12 |
| **T-11** ⚑ | **Model wrapper: DeepSeek with Gemini fallback** — One piece of code that talks to the AI, and silently switches to a backup AI if the first one is down. *Example: DeepSeek goes offline at 9 pm and users never notice, because Gemini answers instead.* | P2 | #15 |
| **T-12** ⚑ | **Extraction: free text to form slots** — Turn a sentence someone typed into tidy fields. *Example: "me and my sister need a 2BHK in Powai, max 40k, moving next month" becomes intent=wants_flat, area=Powai, budget=40000, move-in=October.* | P2 | #23 |
| **T-13** | **Reply writer with scope rules** — Make the assistant write its answers, and keep it on topic. *Example: someone asks "what's the weather?" and it politely steers back to flats instead of answering.* | P2 | #33 |
| **T-14** ⚑ | **Match query API** — The server code that takes what someone wants and returns who or what fits. *Example: budget 25k, Bandra, non-smoker → here are the 12 best matches, best first.* | P3 | #27 |
| **T-15** ⚑ | **Results panel** — The part of the screen that shows matches as cards. *Example: the right-hand column filling up with flat cards showing rent, area and a photo.* | P3 | #16 |
| **T-16** ⚑ | **Profile create and edit, with photos** — The screens where someone says who they are and uploads pictures. *Example: name, age, job, "I'm tidy and sleep early", plus four photos of the room.* | P5 | #36 |
| **T-17** | **Carry anonymous chat into the account** — If someone chats before signing up, keep that conversation when they do. *Example: you chat for five minutes as a stranger, then sign in — and your chat is still there instead of wiped.* | P2 | #32 |
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
| **M-03** | **Write the eval sentences** — Write realistic sentences to test the assistant against. *Example: "need a room in Chembur under 15k, veg only".* | M1 | #21 |
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
