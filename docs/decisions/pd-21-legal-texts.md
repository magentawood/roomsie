# PD21 — The legal texts

**Status:** Settled. · **Date:** 2026-11-06 · **Deciders:** n3rxv, for the founders

## Context

- roomsie hosts profiles, listings and messages of its users, so it is an intermediary under the IT Rules 2021. Rule 3 asks it to publish a privacy policy, a user agreement and the name and contact of a Grievance Officer.
- The DPDP Act 2023 and its Rules 2025 ask for a notice with each kind of data, its purpose, the rights and a complaint to the Data Protection Board. Most duties start on 13 May 2027.
- roomsie has no company yet.
- The chat text goes to DeepSeek and, as the fallback, to Google Gemini ([PD7](pd-07-models.md)). Neither has a tool to delete the text of one end user.

## Decision

**In one line:** The texts name only "roomsie" and its Grievance Officer, and list each kind of data.

- **The texts:** the [privacy policy](../legal/privacy.md), the [terms](../legal/terms.md) and the [grievance page](../legal/grievance.md), effective from 8 November 2026. T-23b shows them at `/privacy`, `/terms` and `/grievance`.
- **The name:** the texts say "roomsie" only. They name no operator and no company.
- **The Grievance Officer:** Niruv Bhardwaj, at roomsie.in@gmail.com. The page gives the times of the IT Rules as amended in February 2026: an answer in 24 hours, a resolution in 7 days, a removal in 36 hours, and 2 hours for intimate images and impersonation.
- **The messages:** an account deletion deletes the chats with the assistant. The messages and request notes to other people stay with them, from "Deleted user" (T-44).
- **The visitor cards:** a visitor gets only the fields of the results card ([PD6b](pd-06b-login-gate-and-search.md), T-68).
- **The registration record:** an account deletion keeps the sign-in email and two dates for 180 days, as Rule 3(1)(h) of the IT Rules asks ([PD19](pd-19-retention.md), T-69).
- **The vendors:** each week, the Grievance Officer asks DeepSeek and Google by email to delete the text of the accounts that were deleted that week. The texts say that they may not be able to find it. The team opts out of training at DeepSeek by email, and the Gemini fallback runs on a project with billing on.
- **The reminders:** the yearly reminder of the texts and the notice on suspension each three months of the IT Rules (T-70).
- **The language:** English. The IT Rules and the DPDP Act allow English or a language of the Eighth Schedule.

## Rationale

- The user chose "roomsie" only over a line that names an operator. The texts stay the same when a company takes over.
- A person who runs the admin panel can act on a complaint in the times of the IT Rules.
- The messages stay because the other person keeps their own conversation, as T-44 decided.
- The 180-day record keeps the least data that Rule 3(1)(h) asks for.
- A weekly request keeps the done item of F-07 true with no code. The vendors give no tool to do more.

## Alternatives rejected

- **A line that names the operator, or both founders.** The user chose the brand only.
- **A role and an email with no name on the grievance page.** Rule 3(2)(a) asks for the name.
- **grievance@roomsie.in.** It needs mail routing before the launch. The texts can change to it later.
- **A deletion of the messages to other people.** The other person loses their conversation.
- **A deletion of all registration data at once.** It does not meet Rule 3(1)(h).
- **A vendor request only when a person asks, or one at each deletion.** The first changes the done item of F-07, and the second needs code and a daily chore.

## Consequences

- The texts name no legal person for the agreement. A lawyer reads them before or soon after the launch.
- T-68 and T-69 come before T-23b, so that the pages promise only what the code does.
- Each change of the data, its period or its vendors also changes the privacy policy.
- The DeepSeek opt-out and the Gemini billing are actions of the team before the launch.

## Revisit when

- roomsie becomes a company: the texts and this record name it.
- A lawyer reads the texts.
- The DPDP duties start on 13 May 2027.
- A vendor or a period changes.

## Sources

- The grill of F-07 ([#17](https://github.com/magentawood/roomsie/issues/17))
- The IT Rules 2021, consolidated to 10 February 2026, MeitY; the DPDP Act 2023 and the DPDP Rules 2025 (G.S.R. 846(E))
- The DeepSeek Open Platform terms (April 2026) and privacy policy (February 2026); the Gemini API additional terms (March 2026)
- [PD6b](pd-06b-login-gate-and-search.md), [PD7](pd-07-models.md), [PD16](pd-16-profiles.md), [PD17](pd-17-connect-and-contact.md), [PD18](pd-18-moderation.md), [PD19](pd-19-retention.md), [PD20](pd-20-model-traces.md)
