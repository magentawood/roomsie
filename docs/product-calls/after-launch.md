# Product calls after launch

**Status:** backlog · **Updated:** 2026-10-04

These calls wait until after the launch on 12 October. No session is necessary before the launch. When the team decides a call, record the answer in the named record. Then delete the entry from this file.

## PC-42 · Where listing supply comes from

- **Question:** Where does listing supply come from? The current hypothesis: brokers list free and pay for an introduction to a matched seeker.
- **Waits on:** the broker calls from marketing (M-09). Open risk 4 is also not solved: deduplication needs a property identity, but roomsie does not collect the address.
- **Record:** [PD3](../decisions/pd-03-listing-supply.md)

## PC-43 · Monetisation and pricing

- **Question:** What is the price model for v1? v0 is free.
- **Waits on:** PC-42, and a price test during the Mumbai pilot, before we build billing.
- **Record:** [PD4](../decisions/pd-04-monetisation.md)

## PC-44 · Does the assistant speak to the other side of a match

- **Question:** Does the assistant ever send a message to the other person for the user?
- **Waits on:** the contact reveal (PC-05) and the connect rules (PC-35). This change has a large effect on the architecture (`docs/ai-agent-design.md:137`).
- **Record:** [PD7a](../decisions/pd-07a-agent-architecture.md)

## PC-45 · The master launch document

- **Question:** Who writes the master launch document, and when? The records settle all its inputs.
- **Waits on:** the elevator pitch (PC-11), which has no record at this time.
- **Record:** [PD11](../decisions/pd-11-launch.md)
