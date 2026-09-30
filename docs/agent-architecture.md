# Agent architecture

**Date:** 2026-09-20 · **Status:** proposed · **Decision:** PD7a
**Supersedes** the single-model assumption in `ai-agent-design.md`.

---

## The verdict in one line

- **You do not want a multi-agent system. You want a router and small specialist handlers.**
- This design costs less than a single large model *and* less than a multi-agent system.
- It fixes hallucination through its structure, not through the prompt.

---

## Where the multi-agent instinct is right, and where it is wrong

- Send each turn to the cheapest thing that can handle it.
- Make sure that most turns do not go to a large model at all.

> [!note]- Why
> - Right: a small model that does one narrow job is much cheaper and much more reliable than a large model that does all the jobs.
> - Wrong: the decrease in cost comes from model size for each task, not from the number of agents.
> - More agents add cost:
>   - Each agent has its own system prompt. Thus, each turn has more input tokens, not fewer.
>   - Each handoff serialises the state, reads it again and repeats the context.
>   - Calls run in sequence. Thus, the latency of each call adds to the total. Users notice three seconds in a chat.
>   - More parts give more failure modes and a much more complex eval suite.
> - "Specialised agents think less" is correct for each agent. But it is incorrect for the system if all the agents run on each turn.
> - The fix is not more agents. The fix is fewer calls to expensive models.

---

## Two forms, not one

There are two forms: Form A and Form B.

> [!note]- Why
> - This idea is correct. It is the centre of the design.

### Form A — the filter form

- Form A drives the SQL query and the listings panel.
- It holds hard constraints only.
- It contains intent, budget, areas, move date, room type, and the nine lifestyle axes with weights.
- Each slot has a type and a fixed set of values.
- `ai-agent-design.md` section 3.1 describes this form.

### Form B — the profile

Form B holds all the other information that the user reveals.
**Form B must have a structure. It must not be a text blob.**

```
observation: {
  key:        "guest_frequency",
  value:      "partner stays over most nights",
  kind:       "constraint" | "preference" | "context" | "concern",
  evidence:   "my ex basically lived there, that's what killed it",
  turn:       11,
  confidence: 0.82,
  visible:    true
}
```

- **Each observation must contain the user's actual words.** If the model cannot give a verbatim span from the turn, the system rejects the observation.
- **Build Form B one turn at a time, not in one pass at the end.**
- **The user can see and edit Form B.** This is how we meet the DPDP access and correction obligations with no more work.

> [!note]- Why
> - Chips cannot capture this information. It is the reason that the product exists.
> - A text blob that grows is the transcript with a different name. Then Form B has no purpose.
> - The verbatim rule is the strongest anti-hallucination device available here. It forces each stored fact to point at the words of the user.
> - One turn at a time costs less, because each call sees one turn, not the full conversation.
> - Form B is then available during the session. Thus, it can inform the ranking while the user browses.
> - A profile that the user can see and edit is good product.

---

## The router

The router classifies each turn first.

| Turn type | Handler | Model |
|---|---|---|
| Chip tap | Scripted next question | **None** |
| Answer to a closed question | Extractor → Form A | Small, constrained |
| Something revealing | Observer → Form B | Small |
| Consulting question | Advisor, grounded | Small + retrieval |
| Off topic | Scripted redirect | **None** |
| Safety signal | Scripted response, logged | **None** |

- One turn can be more than one type. **Run the Extractor and the Observer in parallel** on the same input.
- **Keep the router rules-based where possible.** A chip tap needs no classification. Only free text needs the classifier.

> [!note]- Why
> - Classification is the cost lever and the on-rails lever at the same time.
> - Example: "I need Powai under 20k, my last place fell apart because of my flatmate's boyfriend" fills slots *and* reveals something.
> - The Extractor and the Observer are small and cheap.
> - The router knows a chip tap from the client.

### The composer

- The composer is the only expensive call. It writes the free text that goes back to the user.
- It gets Form A, Form B and the last two turns. It does not get the transcript at all.
- **Many turns do not need the composer:**
  - A chip tap gets a scripted question.
  - A clean slot answer gets a scripted acknowledgement and the next question.
- The composer runs when the reply genuinely needs new text. These turns are a minority.

---

## RAG: yes, for exactly one thing

| Use | RAG | Retrieval |
|---|---|---|
| Listings | **No** | A structured query in Postgres. We decided this in `cost-and-team.md`. |
| Consulting questions | **Yes** | Ground the answer. |

- The corpus is your own material:
  - The blog articles that marketing will write next
  - A rental FAQ
  - Area guides
  - A deposit and agreement explainer
- **Still no vector store.** The corpus is dozens of documents, not millions.
- **The Advisor uses the corpus first.** For a general question with no corpus answer, signed-in users get a web search, and visitors get model knowledge, clearly hedged. Law, tax, area safety and claims about a person stay corpus-only or go to a hand-off. (PD7a)
- Each consulting question with no good answer is a blog article that marketing should write.

> [!note]- Why
> - An example of a consulting question is "What should I watch out for legally when renting in Mumbai".
> - A general model hallucinates on this type of question. An incorrect answer also causes the most damage here.
> - Postgres full-text search gives good results for a corpus of this size.
> - This does not break ADR 0001, because no proprietary extension goes on the critical path.
> - It also removes one decision and one line of spend.
> - Refusal with no fallback is the full purpose of the grounding.
> - The questions with no answer make a useful loop.

---

## The architecture

```mermaid
flowchart TD
    U([User turn])

    U --> K{Chip tap<br/>or free text?}

    K -->|Chip tap| SCR[Scripted next question]
    K -->|Free text| R[["**Router**<br/>small model"]]

    R -->|slot answer| EX[["**Extractor**<br/>small, constrained to enums"]]
    R -->|revealing| OB[["**Observer**<br/>small, must quote the user"]]
    R -->|consulting| AD[["**Advisor**<br/>small + retrieval"]]
    R -->|off topic| RED[Scripted redirect]
    R -->|safety signal| SAF[Scripted response<br/>logged]

    AD <--> CORP[(roomsie corpus<br/>blog, FAQ, guides<br/>Postgres full-text)]

    EX --> FA[(<b>Form A</b><br/>filter slots<br/>typed, weighted)]
    OB --> FB[(<b>Form B</b><br/>profile observations<br/>each with evidence)]

    FA --> CH{Value or weight<br/>changed?}
    CH -->|yes| SQL[[SQL query<br/>over Postgres]]
    CH -->|no| STILL[Panel unchanged]
    SQL --> PANEL([Listings panel])

    FA -.context.-> CMP
    FB -.context.-> CMP
    AD --> CMP
    EX --> CMP

    CMP[["**Composer**<br/>good model<br/>Form A + Form B + last 2 turns<br/>never the transcript"]]

    CMP --> OUT([Reply])
    SCR --> OUT
    RED --> OUT
    SAF --> OUT

    classDef nomodel fill:#FDF2CE,stroke:#9A7206,color:#33260A
    classDef small fill:#FFE3EC,stroke:#C42D63,color:#2A0D17
    classDef big fill:#C42D63,stroke:#C42D63,color:#FFFFFF
    classDef store fill:#F8F1E1,stroke:#EDE3CC,color:#141210

    class SCR,RED,SAF,STILL nomodel
    class R,EX,OB,AD small
    class CMP big
    class FA,FB,CORP store
```

> [!note]- Why
> - Yellow has no cost.
> - Pink is a small, cheap model.
> - Dark pink is the only expensive call, and most turns do not get to it.

### Two things the diagram does not show well

> [!note]- Why
> - The Extractor and the Observer run in parallel. Neither handler waits for the other.
> - The Composer frequently does not run. It runs only when a reply genuinely needs new text.

### Cost per turn, by path

```mermaid
flowchart LR
    A[Chip tap] --> A1["**zero**<br/>no model"]
    B[Typed slot answer] --> B1["**low**<br/>router + extractor"]
    C[Something revealing] --> C1["**low**<br/>router + extractor + observer<br/>last two in parallel"]
    D[Consulting question] --> D1["**medium**<br/>router + advisor + retrieval<br/>+ composer"]
    E[Off topic] --> E1["**low**<br/>router only, then a script"]

    classDef zero fill:#FDF2CE,stroke:#9A7206,color:#33260A
    classDef low fill:#FFE3EC,stroke:#C42D63,color:#2A0D17
    classDef med fill:#C42D63,stroke:#C42D63,color:#FFFFFF
    class A1 zero
    class B1,C1,E1 low
    class D1 med
```

In all interviews, the first three turns are chip taps. These turns have no cost.

## How this answers each worry

> [!note]- Why
> | Worry | Answer |
> |---|---|
> | It hallucinates | The Extractor can use only enum values. The Observer must quote the user. The Advisor uses the corpus first (PD7a). The Composer states no facts about listings. No part remains that can invent. |
> | The chat wanders | The router finds off-topic turns before an expensive call, and it sends a scripted redirect. This is cheap and on rails. |
> | Consulting questions pollute the profile | They do not write to Form A or Form B. |

---

## Cost, honestly

- Added calls: one router call for each free-text turn. This call is small, and chip taps do not use it.
- **Watch 1: latency adds up.** Keep the router very small. Do not add a third sequential hop without a measurement.
- **Watch 2: do not let this grow.** For four part-time engineers, twelve handlers is a maintenance problem.
- Measure the cost of each completed interview from the first day. Record this cost for each handler.

> [!note]- Why
> - The router and then the extractor are two sequential calls before the panel can move.
> - Each new handler is a new prompt, a new eval set and a new failure mode. Six handlers is a design.
> - The cost for each handler tells you which handler to make smaller.

---

## What this changes elsewhere

- **Schema.** Form A and Form B each need a home. Neither form is in S1 to S7 of the ledger. Form B is personal data that comes from free text. Thus, account deletion must purge it.
- **Evals.** Each handler gets its own score: router accuracy, extractor accuracy, observer evidence validity, advisor grounding and refusal rate.
- **`packages/contract`.** Handler inputs and outputs are Zod schemas with versions. They are next to the analytics event schemas in the package.
- **Model choice (PD7).** This design needs a small fast model and a good model.

> [!note]- Why
> - Separate handlers make evals easier, not more complex, because each handler has one job.
> - The design does not need one model that is excellent at all tasks. Thus, there are more options and the price is lower.
