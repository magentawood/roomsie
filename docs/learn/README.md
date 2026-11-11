# Learn

**In one line:** one page for each technical topic that the team learned in a ticket, in plain language, with a link to the decision record or the PR.

Each page tells what the topic is, how it fits roomsie, the choice we made, and the gotchas. When a later ticket adds to a topic, the team updates its page. The list below is generated from the pages.

<!-- learn:start -->
- [The admin home](admin-home.md): `/admin` opens on one scorecard for each subject that the person can open, with live numbers, and each card opens its pages.
- [Alerts: email and browser push](alerts.md): a new request, an accept or a new message sends the other person an email and a browser push with no message text.
- [Analytics events](analytics-events.md): the API records what people do, for example "connect sent", in an `events` table of a second database, with no text and no `users.id`.
- [Areas, sub-areas and pockets](areas.md): the areas table holds three levels (area groups, sub-areas and pockets), and a pick of an area includes each area under it.
- [Articles and the blog](articles.md): the Roomsie team writes each article as a Markdown file in the repo, each deploy of the API loads the files into the database, the blog shows them, and the Advisor searches their passages.
- [The assistant turn](assistant-turn.md): one entry point fills Form A from each typed message, and writes a reply with the next question.
- [Backups](backups.md): each night, a GitHub workflow dumps the two databases, checks each restore, and keeps fourteen encrypted dumps in R2.
- [Building the API](building-the-api.md): `tsx` runs the TypeScript API in development, and `tsup` builds our code into one JavaScript file. The Docker image installs the libraries next to it.
- [The chat chips](chat-chips.md): each closed question of the chat (place type, areas, budget, room type, who is moving, the eight lifestyle questions and the weight of a must-have) shows tap buttons under the question, and a tap writes the answer into Form A with no model call.
- [The limits of the chat](chat-limits.md): a visitor gets five typed messages before the sign-in wall, the API stops a device or a network that starts too many chats and a person who types too fast, and the team gets an alert when the model spend of the day gets near its amount.
- [The chat screen and the sign-in wall](chat-screen.md): `/chat` is the chat of the goal that the onboarding started. A guest types with no sign-in, and a tap that needs an account opens the sign-in wall.
- [CI checks](ci-checks.md): GitHub checks each pull request automatically, and `main` accepts a merge only when the checks pass and a teammate approves.
- [Comparing cards](compare-cards.md): a person selects 1 to 4 places or people in the results and asks a question. The advisor answers from facts that code took from the database, and with 2 cards or more code also builds a table of their fields.
- [The composer](composer.md): code plans each reply, and the composer writes the words of that plan in the language of the person, inside a deadline.
- [Content-Security-Policy](content-security-policy.md): each page of the web tells the browser which scripts, styles and hosts it can use, so a script that an attacker puts into a page does not run and cannot take the sign-in.
- [Cross-browser support](cross-browser.md): roomsie looks and works the same in Chrome, Edge, Firefox and Safari, with standard code, a few normalising rules and no browser checks.
- [Deploys](deploys.md): Vercel publishes the web from `main` and builds a preview for each pull request. A GitHub workflow deploys the API as a Docker image to AWS Lightsail in Mumbai.
- [Error reporting](error-reporting.md): each error that a user gets, in the browser or in the API, goes to Sentry through one `reportError`, with the place in the code and the `users.id`, and with no message text, token, IP address or phone number.
- [Running the eval](eval-run.md): `pnpm eval` scores the extractor, the router and the composer of the API on the eval sentences, for each model.
- [The eval sentences](eval-set.md): 82 sentences that people type to the assistant, in English, Hinglish, Hindi and Marathi, each with its correct labels. A run thus gives a score to each handler.
- [Form A and intent](form-a-and-intent.md): Form A is the set of typed answers that drives matching, and intent is its first answer: the kind of place that a seeker wants.
- [Form B notes](form-b-notes.md): Form B is the set of notes that the assistant keeps about a person, each with a quote and its message.
- [Goals: the list, the close and the feedback](goals.md): each search is one goal, with a title from Form A, and "Same move?" stops a second goal for one move. The person closes a goal with "I found a place", can reopen it, and can send feedback after the close.
- [The hidden religion and community filter](hidden-filter.md): a religion or a community preference that a searcher states removes or reorders the people in the results, and nobody sees that the filter exists.
- [ID checks and the Verified badge](id-checks.md): a person sends an ID photo and a live selfie, a named reviewer decides, and roomsie keeps only the result.
- [The invite gate](invite-gate.md): until the launch on 8 November, only the invited emails and the moderators can sign in, and moderators change the list and the opening time on `/admin/invites`.
- [The landing page](landing-page.md): `/` is the public page that explains Roomsie. The server renders it, and moderators edit its quotes, links and details on admin pages with no code change.
- [The legal texts](legal-texts.md): the legal texts are Markdown files in `docs/legal/`, and each change of a record that they copy also changes them.
- [Listings and photo uploads](listings.md): a lister saves a listing of one of four kinds one step at a time, uploads photos straight to R2 with a signed link, and publishes it for 30 days.
- [Local development with Docker](local-dev-with-docker.md): a local Postgres 17 runs in Docker. `pnpm db:up` starts it, and `pnpm test` starts it if necessary and gives each test run a fresh database.
- [The match query](match-query.md): the match query takes a Form A and gives the people or the places that fit, in the Best Matches order.
- [Message requests](message-requests.md): "Say hi" sends a request with a short note, the other person accepts or declines, and only then can the two people chat; a phone number never shows in public or in a note.
- [Messages and realtime](messages.md): an accepted message request is a conversation; the API saves each message and sends it live to the two people on their private Supabase Realtime channels.
- [Database migrations](migrations.md): a migration is a committed SQL file that changes the shape of the database. The deploy applies the new migrations and the catalogue seed before the new API starts.
- [Model hosting and where user text goes](model-hosting-and-data.md): each chat message goes to a model provider, and the provider decides where the text is stored and if it trains on it; roomsie sends user text to the DeepSeek API.
- [The model wrapper](models.md): each call of the API to a language model goes through one module, which asks DeepSeek first, asks Gemini when DeepSeek fails or while the Gemini switch is on, and records the tokens of each attempt.
- [Moderation: reports, "Not interested", blocks and the admin screen](moderation.md): a user reports a person or a listing, or picks "Not interested"; reports can hide a card or a listing at once, and a moderator reviews each report on the admin screen and dismisses it, keeps the hide, or suspends the account.
- [The onboarding and the profile completion card](onboarding.md): `/start` asks the first questions of flow 01, then the sign-in, and one request starts the goal with the answers in Form A. The completion card shows how much of the profile is done.
- [OpenAPI from Zod](openapi-from-zod.md): the API makes its OpenAPI document from the Zod schemas in `packages/contract`. The document is committed, and a test fails when it is out of date.
- [Place detail and listing reports](place-detail.md): a signed-in user opens the full detail of a place, and can report it; a safety report, or reports from two people, hide the listing at once.
- [pnpm, Corepack and Turborepo](pnpm-and-corepack.md): pnpm installs the packages of the monorepo, Corepack gives each developer the same pnpm version, and Turborepo runs the tasks of all packages with one command.
- [Postgres drivers](postgres-drivers.md): a driver is the library that connects the API to Postgres. We use postgres.js under Drizzle, with prepared statements off for the Supabase pooler.
- [Product numbers](product-numbers.md): `/admin/numbers` shows the funnel of roomsie from the analytics events, for today, 7 days and 30 days, each against the period before.
- [Profiles and cards](profiles.md): a signed-in user makes one profile with a name, an age of 18 or more and a gender; the card goes live by itself when it is complete, and other users read it through the API.
- [The results panel](results-panel.md): the results panel shows the matches of Form A as cards beside the chat. It changes only when the form changes.
- [Roomsie Noticed](roomsie-noticed.md): under the results of a search, a box "Roomsie Noticed" gives up to five notes that the code counted, each with a button that changes the search, and chips under it ask the next step.
- [The router](router.md): the router labels each typed message of the chat with its kinds and its scope band, so the turn does only the work that the message needs.
- [Saved](saved.md): a signed-in user saves a place or a person with the Save button, and sees them again under Saved, in the tabs Places and People.
- [Secret scanning](secret-scanning.md): gitleaks finds a password or a key in the code before the secret goes into the shared git history. Run `pnpm secrets` before each pull request.
- [Sign-in and tokens](sign-in-and-tokens.md): the web signs in with Google through Firebase. The API checks the ID token locally and loads the `users` row.
- [Traces of the model calls](traces.md): the API keeps the prompt and the raw answer of each model call of a chat for 30 days, masked and under a session code, and a moderator opens one turn on the AI pipeline as a timeline of its calls.
- [Uptime monitoring](uptime-monitoring.md): HetrixTools calls the health check of the API each minute. When the API stops, it sends an alert to the Telegram group of the team.
- [The visitor chat at sign-in](visitor-chat-claim.md): when a visitor signs in, one claim request moves the chats of the visitor session to the account, and the visitor key ends.
- [The web UI base](web-ui-base.md): the web app takes its colours, type and spacing from theme tokens of the design system, builds each screen from a small set of shared components, and calls the API through one helper that sends the sign-in token.
<!-- learn:end -->
