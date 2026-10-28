# Content-Security-Policy

**In one line:** each page of the web tells the browser which scripts, styles and hosts it can use, so a script that an attacker puts into a page does not run and cannot take the sign-in.

## What it is

- A **Content-Security-Policy (CSP)** is a response header. It lists the sources that the browser can use for each type of content: scripts, styles, images, connections and frames. The browser blocks each other source.
- A **nonce** is a random value that is new for each response. The policy names it, and each of our script tags carries it. An injected script does not know the nonce, so it does not run.
- **`strict-dynamic`** lets a script with the nonce load more scripts. Firebase sign-in loads a script of Google in this way.
- An **XSS attack** puts a script of the attacker into our page. The ID token is in JavaScript, so a script that runs can take it ([ADR-0007](../decisions/0007-web-rendering-and-auth-transport.md)). The policy is the main control.

## How it fits our project

```
request ──▶ proxy: new nonce ──▶ policy on the request and the response
                                      │
                                      └─▶ Next renders the page and puts the nonce on its own scripts
```

- **The proxy** (`apps/web/proxy.ts`) makes the nonce and the policy for each page request. It does not run for the files in `_next/static` and `public`, or for the link prefetches. A new type of file in `public` needs its extension in the matcher of the proxy.
- **Each page renders on each request.** A static page has no nonce, so the policy blocks its scripts. The root layout waits for the request. The landing page keeps its data from the API for 60 seconds with the option of `fetch`.
- **No inline styles and no `eval`.** The policy blocks a `style` attribute, an inline `<style>` with no nonce, and `eval`. The code uses classes. Zod tries `eval` to parse faster, so `instrumentation-client.ts` turns that off. The "not found" and error pages of Next have inline styles, so we have our own.

| Content | Allowed sources |
|---|---|
| Scripts | the nonce, and the scripts that they load |
| Styles | our files and the nonce |
| Images | our files, `blob:`, `data:`, the photos host, the ID bucket, Google profile photos |
| Connections | the API, Firebase sign-in and push, the R2 and ID uploads, Supabase realtime |
| Frames | the Firebase auth domain |
| Plugins, embedding of our pages | none |

## The choice we made

- A nonce for each request, not the hashes of the files ([ADR-0007](../decisions/0007-web-rendering-and-auth-transport.md)).
- Wildcards for the R2 upload host and the Supabase realtime host, because Vercel does not have their values. The nonce stops a script before it can send data out.
- The policy blocks from the first deploy, with no report-only period. Since T-07, the browser sends each violation to the security address of the Sentry project of the web ([error reporting](error-reporting.md)).
- A unit test of the proxy and a live check, not a browser test in CI, because ADR-0013 defers the Playwright tests ([ADR-0013](../decisions/0013-ci-gate-and-testing.md)).

## Gotchas

- A new host, for example a new photo host or a new vendor script, needs a line in the policy. If not, the browser blocks it, and the console shows "violates the following Content Security Policy directive".
- `next dev` adds `unsafe-eval` and inline styles, because the development server of Next needs them. A page can work in development and fail in production. Check a production build with `next build` and `next start`.
- The comments toolbar of the Vercel previews does not load, because the policy blocks its script.
- The photos host and the ID bucket are in the proxy and in `deploy-api.yml`. A change of one needs a change of the other.
- The proxy skips a request by the extension of the file. Thus, a request for a missing file, for example `/missing.png`, gets the "not found" page with no policy. The page shows nothing from the request, so the user accepted this gap.

## Tickets

- T-52: [#177](https://github.com/magentawood/roomsie/pull/177), 2026-10-28. The policy, the nonce for each request, and the pages that render on each request.
- T-07: [#178](https://github.com/magentawood/roomsie/pull/178), 2026-10-28. The violation reports go to Sentry, and `/monitoring` skips the proxy.
