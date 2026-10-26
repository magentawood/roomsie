# The web UI base

**In one line:** the web app takes its colours, type and spacing from theme tokens of the design system, builds each screen from a small set of shared components, and calls the API through one helper that sends the sign-in token.

## What it is

- A **design token** is a named value of the design system, for example the main text colour or the radius of a card. The values come from the Figma file "Roomsie design system (extended)".
- **Tailwind CSS v4** makes the utility classes from the tokens in `apps/web/app/globals.css`. A component writes `text-primary` or `bg-brand-solid`, never a hex value.
- A **semantic token** names a job, for example `border-secondary`. A **primitive** names a raw colour, for example `--color-gray-200`. Components use only semantic tokens ([styling standard](../standards/styling.md)).

## How it fits our project

| Part | Where | What it gives |
|---|---|---|
| Tokens | `apps/web/app/globals.css` | Colours, Figtree, text sizes, radii and shadows |
| Components | `apps/web/components/ui/` | Button, text and number fields, chips, choice cards, toggle, checkbox, step bar, badge and modal |
| App shell | `apps/web/components/shell/` | The sidebar on a desktop, the floating navigation on a phone, the page header and the sign-in gate |
| API helper | `apps/web/lib/api.ts` | `api(user, path, schema)` sends the ID token and parses the reply with the contract |
| Sign-in | `apps/web/lib/auth.tsx` | `useAuth()` gives the user and `signIn` |

- The tokens use the colour groups of Tailwind for each property: `--text-color-*`, `--background-color-*` and `--border-color-*`. Thus `text-primary` and `bg-primary` are two different tokens.
- Each call goes through TanStack Query. `apps/web/lib/queries.ts` names the cache key of each piece of data. After a change, the page sets or refreshes that key ([web standard](../standards/web.md)).
- The icons come from `@untitledui/icons`, the icon set of the design system.
- The sidebar shows the items of screens that later tasks build. They show as inactive until then.

## The choice we made

- Tokens, components and the shell came with the first screens, in T-42 ([#144](https://github.com/magentawood/roomsie/pull/144)). The token pipeline of [ADR-0011](../decisions/0011-design-system-token-pipeline.md) replaces the token block in v1.
- The ID token stays in memory, and each call asks Firebase for it ([ADR-0007](../decisions/0007-web-rendering-and-auth-transport.md)).

## Gotchas

- **A class that sets `display` on a component can lose to its own classes.** To show a component only on a phone, wrap it in an element with `md:hidden`.
- **Next 16 writes `AGENTS.md` and `CLAUDE.md` in `apps/web` by default.** `agentRules: false` in `next.config.ts` stops it. The project has one agent file, `CONTEXT.md`.
- **A 204 reply has no body.** Give `api()` the schema `z.null()` for it.
- **Figtree comes from `next/font`.** The build downloads it one time, and the site serves it from its own domain.

## Tickets

- T-42: [#144](https://github.com/magentawood/roomsie/pull/144), 2026-10-26. The tokens, the components, the app shell and the API helper.
