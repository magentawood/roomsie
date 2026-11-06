# The legal texts

**In one line:** the legal texts are Markdown files in `docs/legal/`, and each change of the data or its vendors also changes the privacy policy.

## What it is

- **The privacy policy** tells each kind of data, why roomsie keeps it, for how long, who else gets it, and the rights of a person (the DPDP Act 2023).
- **The terms** are the agreement with each user: who can use roomsie, what they can post, and what roomsie can do (Rule 3 of the IT Rules 2021).
- **The grievance page** names the Grievance Officer and tells how a complaint goes, with its times.
- **An intermediary** is a site that hosts what its users post. The IT Rules apply to it.

## How it fits our project

| Part | Where |
|---|---|
| The three texts | `docs/legal/privacy.md`, `terms.md` and `grievance.md` |
| The pages on the site | `/privacy`, `/terms` and `/grievance` (T-23b) |

- **One fact, one home.** A period or a vendor comes from its record. When a record changes, the text changes in the same PR. The folder is outside the word budget of the docs, because a legal text cannot be split.
- **The weekly vendor request.** Each week, the Grievance Officer counts the account deletions of the last 7 days, from the registration records of T-69. With one or more, they send this email to api-service@deepseek.com, and the same text to Google in a support case of the Gemini project:

  > Subject: Deletion request for end-user data, roomsie API account
  >
  > We are the developer of roomsie.in, which uses your API with the key of our account. In the last 7 days, N of our users deleted their accounts. Under our privacy policy and the Indian DPDP Act, please delete the inputs and outputs of our account that relate to these users, sent between <first date> and <last date>. Our requests carry no user identifier. If you cannot find the data of single users, please tell us so.

- **The team actions before the launch:** an email to privacy@deepseek.com opts our API account out of training. The Gemini key must belong to a project with billing on. The logging of the requests of that project must be off.

## The choice we made

- The name, the Grievance Officer, the messages, the registration record and the vendor requests: [PD21](../decisions/pd-21-legal-texts.md).
- The periods: [PD19](../decisions/pd-19-retention.md). The traces: [PD20](../decisions/pd-20-model-traces.md). The models: [PD7](../decisions/pd-07-models.md).

## Gotchas

- **The texts promise what T-68 and T-69 build** ([PD21](../decisions/pd-21-legal-texts.md)).
- **The texts name no company.** When roomsie becomes a company, the texts, PD21 and the sign-in screen change together.
- **The times of the IT Rules changed in February 2026.** Check the rules again before a change of the grievance page.
- **No lawyer has read the texts yet** ([PD21](../decisions/pd-21-legal-texts.md)).

## Tickets

- F-07: [#235](https://github.com/magentawood/roomsie/pull/235), 2026-11-06. The first texts.
