# ADR 0016 — Credentials and secrets

**Status:** Accepted · **Deciders:** Yash

## Context

Some values are public by design, and we cannot hide them. Thus, the goal is not
"nothing visible in the browser". The goal is that the browser shows nothing
*dangerous*.

The Firebase web `apiKey` is not a secret:

- It must ship in the browser bundle.
- Google documents it as public.
- It is an *identifier* ("this request is for the Roomsie project"), not a
  password.

Security comes from these three items:

- the authorized-domains allowlist
- a token that our API accepts also needs a real Google sign-in
- our API verifies each token.

## Decision

**In one line:** Public credentials can ship in the clients, but critical credentials stay only in `apps/api` or the CI secret store.

The table gives the class of each credential and where it lives:

| Credential | Class | Lives in |
|---|---|---|
| Firebase web config | **[Public]** | Browser bundle |
| google-services.json / plist | **[Public]** | Shipped in mobile apps |
| Supabase URL + anon key | **[Public]** | Browser — Realtime only |
| Sentry DSN | **[Public]** | Browser |
| Supabase service_role key | **[Critical]** | apps/api only |
| Postgres connection string | **[Critical]** | apps/api only |
| R2 access key + secret | **[Critical]** | apps/api only |
| Firebase Admin service account | **[Critical]** | apps/api only |
| Deploy tokens | **[Critical]** | CI secret store |

> [!danger] The one that ends the company
>
> The Supabase `service_role` key bypasses Row Level Security fully. A leak of
> this key is a full database compromise: all profiles, messages and
> verification selfies. It never leaves `apps/api`.

Two hard rules:

1. The build **compiles all items named `NEXT_PUBLIC_*` into the browser
   bundle**. That prefix is a public declaration. Never put a secret behind it.
2. Secrets exist only in the environment of `apps/api`, never in `apps/web`:
   not in a config file, not in an env var and not through an import.

Handling rules:

- Git ignores `.env*`. A committed `.env.example` documents each key with dummy
  values.
- Real values are in the env store of the provider and in CI secrets, **never
  in Slack or WhatsApp.**
- `gitleaks` runs as a pre-commit hook.
- API logs redact `Authorization` headers.
- Before launch, rotate all values that anybody ever pasted into a chat, a
  screenshot or a shared laptop.

## Rationale

**Leaks occur through people and process much more frequently than through
code.**

**A shared vault.** With four people, a shared vault is worth the setup time.

**gitleaks.** It finds the paste-into-the-wrong-file mistake before it becomes
permanent git history.

**Log redaction.** To log a token is to log a password.

**Sources:** old tech base, `docs/tech-base.md` (before this change), section
"§ · Credentials".
