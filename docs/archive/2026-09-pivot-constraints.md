# Pivot constraints and the master launch document outline

**Archived:** 2026-09-30 from CONTEXT.md. History only. Later decisions resolve most of these points: [PD7](../decisions/pd-07-models.md), [PD7a](../decisions/pd-07a-agent-architecture.md), [PD13](../decisions/pd-13-databases-and-backups.md) and [PD11](../decisions/pd-11-launch.md).

## Carried-over technical constraints that the AI pivot stresses

An LLM agent layer conflicts with the current stack in the places below. The technical document must resolve each conflict:

- **No queue or message broker.** Background work runs in the process on one Fly machine. Multi-turn agent loops have no durable place to live.
- **No vector store.** ADR 0001 forbids proprietary extensions on the critical path. Thus, `pgvector` needs an explicit amendment before we adopt it.
- **No streaming.** The API boundary is contract-first. Zod parses each byte in, and a generated OpenAPI document is the source of truth for all clients. Token streaming does not fit that shape.
- **Realtime has a cap.** Supabase Realtime `broadcast` only: 500 concurrent connections on Pro, then $10 for each 1,000 more.
- **No inference vendor, key class, prompt-versioning or eval story** exists. The ~$50–80/month budget has no line for one.
- **Data-residency posture is hostile to third-party inference.** ADR 0014 mandates PII scrubbing. Before we send conversation content to an external model, we need a decision that directly engages that reasoning.

These sanctioned hooks help:

- ADR 0004 explicitly allows an ML service outside the API, which the API calls.
- ADR 0012 already designates the analytics store as a training corpus.
- The `reportError` wrapper of ADR 0014 is the documented precedent to put a swappable vendor behind one internal module.

- We designed the current stack for a deterministic swipe app.
- ADR 0012 rejected a vendor. One reason was to not send a behavioural stream out.

## Deliverables for this session

One unified master launch document, with these sections in this order:

1. Executive summary and vision
2. Market and customer analysis
3. Business objectives and success metrics
4. Product scope and features
5. Technical and operational readiness
6. Go-to-market and marketing strategy
7. Sales and customer support enablement
8. Quality assurance and testing
9. Launch execution and governance
10. Post-launch evaluation and next steps

We finalise each section interactively, one point at a time, before we write it.
