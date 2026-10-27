# Messages and realtime

**In one line:** an accepted message request is a conversation; the API saves each message, masks phone numbers, and sends it live to the two people on their private Supabase Realtime channels.

## What it is

- A **conversation** is an accepted message request. The note of the request is its first message.
- A **realtime channel** is a pipe from the server to an open app. The API sends to it, and the app gets each message at once, with no reload.
- A **private channel** is open only to one signed-in person. Supabase checks a policy before the app can join.
- A **claim** is a field in the sign-in token. Supabase needs two claims that Firebase does not give by default.

## How it fits our project

```
Rahul sends a message ──▶ POST /v1/conversations/:id/messages
                            ├── mask phone numbers, save (one row for each client id)
                            └── broadcast to user:<Rahul> and user:<Divya> ──▶ both apps show it
```

| Route | What it does |
|---|---|
| `GET /v1/conversations` | Gives each conversation: the other person, the last message and the unread count, the newest first. |
| `GET /v1/conversations/:id` | Gives one conversation. |
| `GET /v1/conversations/:id/messages` | Gives 50 messages, the newest first. `?before=<time>` gives the page before. |
| `POST /v1/conversations/:id/messages` | Sends a message of 1 to 2,000 characters, with an id that the client makes. |
| `POST /v1/conversations/:id/read` | Marks the conversation as read. |
| `POST /v1/me/realtime` | Gives the channel, the public URL and key of Supabase, and `refreshToken`. |

- **The claims.** Supabase trusts a Firebase token only with `role: 'authenticated'`. The API also adds `user_id`, our id of the person, so the policy can check the channel. `POST /v1/me/realtime` adds the claims with the Firebase Admin API the first time. Then the web gets a fresh token, and joins `user:<our user id>`.
- **The policy.** The migration adds a policy on Supabase's `realtime.messages`: a person can join only `user:` and their own `user_id`. The local and test databases do not have Supabase's functions, so they skip it.
- **Who sees what.** Only the two people of a conversation get it. A block hides it from both. Nobody can send to a suspended or a deleted account. After a deletion, the other person keeps the thread and sees "Deleted user".

## The choice we made

- Broadcast only, never table changes: [ADR-0005](../decisions/0005-managed-platform-split.md).
- Message requests, no phone numbers: [PD17](../decisions/pd-17-connect-and-contact.md).
- Private channels with the Firebase sign-in, the claims from the API, and the alerts in T-55: the spec of T-44 ([#120](https://github.com/magentawood/roomsie/issues/120)).

## Gotchas

- **Realtime is best effort.** The API saves the message first. If the broadcast fails, the API logs it, and the app gets the message at its next fetch.
- **A new claim needs a new token.** Firebase puts a claim in the next token, so the web refreshes the token one time when `refreshToken` is true.
- **The setup is in two consoles.** The API needs the secrets `SUPABASE_ANON_KEY` and `FIREBASE_SERVICE_ACCOUNT`. Supabase needs Firebase as a third-party auth provider, and Realtime set to private channels only. Without the secrets, `POST /v1/me/realtime` gives 503.
- **No SDK.** The Firebase Admin module calls the REST API that the Admin SDK calls, with a token that `jose` signs, as `aws4fetch` does for R2.

## Tickets

- T-44: [#160](https://github.com/magentawood/roomsie/pull/160), 2026-10-27. Conversations, messages, the private channels and Deleted user.
