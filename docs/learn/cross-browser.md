# Cross-browser support

**In one line:** roomsie looks and works the same in Chrome, Edge, Firefox and Safari, with standard code, a few normalising rules and no browser checks.

## What it is

- A **browser engine** draws the page and runs the scripts. Chrome and Edge use Blink, Firefox uses Gecko, and Safari uses WebKit. Thus, three engines cover the four browsers.
- A **normalising rule** is a CSS rule that makes a native control the same in each engine, for example the arrows of a number box.
- A **fallback** is the value that an engine uses when it does not know a newer feature. Tailwind writes most fallbacks for us, for example `-webkit-backdrop-filter` for Safari and a hex colour before each `color-mix()`.

## How it fits our project

| Part | Where | What it does |
|---|---|---|
| Reset and normalising | Tailwind preflight, then `@layer base` in `apps/web/app/globals.css` | `box-sizing: border-box` on each element, no default margins, the same form fonts and colours, and our own rules |
| Fonts | `next/font` in `apps/web/app/layout.tsx` | Figtree and Fredoka come from our domain, with a fallback font of the same size, so a slow font does not move the page |
| Native controls | `apps/web/components/ui/field.tsx` | The text, number, date and select boxes of the forms |
| The live channel | `apps/web/lib/live.tsx` | Joins the Supabase channel of the user, and polls when it cannot ([messages](messages.md)) |

## The choice we made

- **The rules of the audit of 2026-11-10:**
  - **A number box has no arrows.** Firefox and Safari show the arrows at all times, Chrome and Edge on a hover, and the designs show none. A base rule in `globals.css` removes them in each engine. The arrow keys still change the number.
  - **An empty date box has the colour of a placeholder.** Chrome, Edge and Firefox show "dd/mm/yyyy" in the text colour, so it reads as an answer. Safari shows a grey date. Use `DateInput` from `field.tsx` for each date. It colours the empty box, as `Select` does.
  - **The code catches a throw from `new WebSocket`.** Firefox and Safari throw at once when the Content-Security-Policy blocks the host. Chrome only logs an error. With no catch, the whole page showed "Something went wrong".
- **No browser checks.** The code tests a feature, never the name of a browser.
- **Native parts stay native.** The calendar icon of a date box, the grip of a text area and the look of a checkbox come from each engine. They do not change the layout, so we keep them.

## How to check a change

- Use a production build (`next build`, then `next start`), because `next dev` has a different policy ([CSP](content-security-policy.md)).
- Check each page in Chrome, in Firefox, and in the WebKit build of Playwright, at 390 × 844, 834 × 1194 and 1440 × 900. Chrome stands in for Edge, because both use Blink.
- Compare the boxes of the elements, not only the pixels. Text has a different anti-aliasing in each engine, so 1 % to 3 % of the pixels always differ.
- For Chrome and Edge on Windows, start Chrome with the scrollbars always on: `-AppleShowScrollBars Always`, and no `--hide-scrollbars`. Then the results panel is 15 px narrower, and its cards are 8 px narrower. Nothing overflows.

## Gotchas

- **Headless Firefox and headless WebKit do not paint `backdrop-filter`.** The computed style is correct, but a screenshot shows no blur. Check the blur in a real browser.
- **WebKit applies `upgrade-insecure-requests` to `http://localhost`.** Chrome and Firefox do not. Thus, a local production build fails in WebKit unless a test removes that directive. On `https://roomsie.in` the directive has no effect.
- **Safari opens the Firebase sign-in frame at the start.** Firebase does this only in Safari, to make the popup quicker. The frame is 1 px, outside the screen.
- **On an iPhone, Safari zooms in on a text box with text under 16 px.** The `xs` boxes of the profile and of the search boxes use 14 px. This is open: the fix changes the type size of the designs.

## Tickets

- The cross-browser audit: PR-NUMBER, 2026-11-10.
