# Web standards

These rules apply to `apps/web`: Next.js 16, React 19 and TanStack Query. The rules in [_index.md](_index.md) and [`styling.md`](styling.md) also apply.

## Boundaries

- `apps/web` has no business logic and no database access. Why: a Server Component must not be one import away from the database. ([ADR-0003](../decisions/0003-api-as-separate-service.md), [ADR-0006](../decisions/0006-drizzle.md))
- Route handlers exist only for OAuth callbacks, image proxying and webhooks. They hold no business logic. Why: the API is the one home of the rules. ([ADR-0003](../decisions/0003-api-as-separate-service.md))
- Pin the Vercel functions to the `bom1` region. Why: if not, each server call to the API crosses regions and adds approximately 55 ms. ([ADR-0009](../decisions/0009-hosting-and-region.md))

## Rendering and data

- Render the public search pages on the server: the landing page, and the area and filter pages. Next gets their data from `apps/api`, server to server. Why: these pages are the organic search surface. ([ADR-0007](../decisions/0007-web-rendering-and-auth-transport.md), [PD6b](../decisions/pd-06b-login-gate-and-search.md))
- Render the pages behind login in the browser. Why: they have no search value. ([ADR-0007](../decisions/0007-web-rendering-and-auth-transport.md))
- Area and filter pages show aggregate data only. If a cell has fewer than 20 active users or listings, show a band, not the number. Why: a small cell can show data about one person. ([PD6b](../decisions/pd-06b-login-gate-and-search.md))
- In the authenticated app, get data only through TanStack Query and the client that we generate from the contract. Why: TanStack Query stops the race when the id changes. ([ADR-0008](../decisions/0008-web-stack.md), [ADR-0004](../decisions/0004-api-stack-typescript-fastify.md))
- Never call `fetch` in a `useEffect`. Why: each hand-written fetch needs its own cancellation guard, and people forget it. ([ADR-0008](../decisions/0008-web-stack.md))
- The results panel is a pure function of the form. Query again when the form changes, not when a chat turn occurs. Why: a pure function is deterministic and testable. ([PD6c](../decisions/pd-06c-interface-holes.md))
- The panel never waits for the model. Run the query from the current form state. Why: the results must not wait for a slow model call. ([PD6c](../decisions/pd-06c-interface-holes.md))

## Auth in the browser

- Send the Firebase ID token in `Authorization: Bearer`. Use no session cookies. Why: web and mobile then use one auth path. ([ADR-0007](../decisions/0007-web-rendering-and-auth-transport.md))
- Keep the token in the memory of the Firebase SDK, never in `localStorage`. Why: an XSS attack can read the token. ([ADR-0007](../decisions/0007-web-rendering-and-auth-transport.md))
- Serve a strict Content-Security-Policy. Why: it is a primary control against XSS, which can steal the token. ([ADR-0007](../decisions/0007-web-rendering-and-auth-transport.md))
- Ask for login only when a user opens one listing or person, or sends a message. Browse, chat and filters need no login. Why: the product is open until that step. ([PD6b](../decisions/pd-06b-login-gate-and-search.md))
- The sign-in wall never shows before the results. It replaces the chat input, and the results stay on the screen. Why: a user signs in after they see something that they want. ([PD9](../decisions/pd-09-pre-login-limits.md))

## Pages and content

- Port the look of the V3 prototype into `apps/web`. Do not make the pages again from `create-next-app`. Why: the prototype is the launch design. ([PD12](../decisions/pd-12-team-plan.md), [ADR-0008](../decisions/0008-web-stack.md))
- Remove each women-only line from the prototype. Why: roomsie is open to all genders. ([PD1](../decisions/pd-01-audience.md))
- Never blur a photo with CSS. Show the blurred copy that the server made. Why: a CSS blur gives no protection. ([PD8](../decisions/pd-08-verification.md))
