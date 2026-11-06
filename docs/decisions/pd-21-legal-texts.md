# PD21 — The legal texts

**Status:** Settled. · **Date:** 2026-11-06 · **Deciders:** n3rxv, for the founders

## Context

- roomsie hosts profiles, listings and messages of its users, so it is an intermediary under the IT Rules 2021. Rule 3 asks it to publish a privacy policy, a user agreement and the name and contact of a Grievance Officer.
- The DPDP Act 2023 and its Rules 2025 ask for a notice with each kind of data, its purpose, the rights and a complaint to the Data Protection Board. Most duties start on 13 May 2027.
- roomsie has no company yet.
- The chat text goes to DeepSeek and, as the fallback, to Google Gemini ([PD7](pd-07-models.md)). Neither has a tool to delete the text of one end user.

## Decision

**In one line:** The texts name only "roomsie" and its Grievance Officer, and list each kind of data.

- **The texts:** the [privacy policy](../legal/privacy.md), the [terms](../legal/terms.md) and the [grievance page](../legal/grievance.md), effective from 8 November 2026.
- **The name:** the texts say "roomsie" only. They name no operator and no company.
- **The Grievance Officer:** Niruv Bhardwaj, at roomsie.in@gmail.com.
- **The messages:** an account deletion deletes the chats with the assistant. The messages and request notes to other people stay with them, from "Deleted user" (T-44).
- **The visitor cards:** a visitor gets only the fields of the results card ([PD6b](pd-06b-login-gate-and-search.md), T-68).
- **The registration record:** an account deletion keeps a registration record for 180 days ([PD19](pd-19-retention.md), T-69).
- **The vendors:** each week, the Grievance Officer asks DeepSeek by email and Google in a support case of the Gemini project to delete the text of the accounts that were deleted that week. The texts say that possibly they cannot find it. The team opts out of training at DeepSeek by email. The Gemini project has billing on and its request logging off. The addresses and the emails are in [the legal texts](../learn/legal-texts.md).
- **The promises:** we do not sell personal data. Before we ask for money for anything, we tell the users, and they choose.
- **The notices:** a change of a text goes to the users on roomsie or by email. The yearly reminder of the texts and the notice on suspension each three months of the IT Rules come with T-70. The terms say that we report some offences to the authorities, as Rule 3(1)(c) asks. The moderation tools act at once and send no notice, so the terms say "without notice".
- **The language:** English.

## Rationale

- The texts stay the same when a company takes over.
- The IT Rules and the DPDP Act allow English or a language of the Eighth Schedule.
- A person who runs the admin panel can act on a complaint in the times of the IT Rules.
- The 180-day record keeps the least data that Rule 3(1)(h) asks for.

## Alternatives rejected

- **A line that names the operator, or both founders.** The user chose the brand only.
- **A role and an email with no name on the grievance page.** Rule 3(2)(a) asks for the name.
- **grievance@roomsie.in.** It needs mail routing before the launch. The texts can change to it later.
- **A deletion of the messages to other people.** The other person loses their conversation.
- **A deletion of all registration data at once.** It does not meet Rule 3(1)(h).
- **A vendor request only when a person asks, or one at each deletion.** The first changes the done item of F-07, and the second needs code and a daily chore.
- **A promise of no ads.** [PD4](pd-04-monetisation.md) is still open.

## Consequences

- The texts name no legal person for the agreement. A lawyer reads them before or soon after the launch.
- T-68 and T-69 come before T-23b, so that the pages promise only what the code does.
- Each change of a record that a text copies also changes that text: the privacy policy for the data, the terms for the rules, and the grievance page for the contact.

## Revisit when

- roomsie becomes a company: the texts and this record name it.
- A lawyer reads the texts.
- The DPDP duties start on 13 May 2027.
- A vendor or a period changes.

## Sources

- The grill of F-07 ([#17](https://github.com/magentawood/roomsie/issues/17))
- The IT Rules 2021, consolidated to 10 February 2026, MeitY
- The DPDP Act 2023 and the DPDP Rules 2025 (G.S.R. 846(E))
- The DeepSeek Open Platform terms (April 2026) and privacy policy (February 2026)
- The Gemini API additional terms (March 2026)
- [ADR-0007](0007-web-rendering-and-auth-transport.md), [ADR-0014](0014-error-tracking.md), [ADR-0017](0017-schema-v1-shape.md), [PD3c](pd-03c-exclusionary-preferences.md), [PD3d](pd-03d-listing-identity-restrictions.md), [PD4](pd-04-monetisation.md), [PD6b](pd-06b-login-gate-and-search.md), [PD7](pd-07-models.md), [PD8](pd-08-verification.md), [PD9](pd-09-pre-login-limits.md), [PD13](pd-13-databases-and-backups.md), [PD16](pd-16-profiles.md), [PD17](pd-17-connect-and-contact.md), [PD18](pd-18-moderation.md), [PD19](pd-19-retention.md), [PD20](pd-20-model-traces.md)
