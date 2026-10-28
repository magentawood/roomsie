# The landing page

**In one line:** `/` is the public page that explains Roomsie. The server renders it, and moderators edit its quotes, links and details on admin pages with no code change.

## What it is

- The **landing page** is at `/`. It follows the section "Final screens" of the Website page of the Product file, with the fixes of drafts section 19, at phone, tablet and desktop widths.
- The **film** in the hero and the videos of "Tell it." and "It searches." are MP4 files in the web app. They play muted in a loop. When the person turns off motion, each shows its first frame.
- The **quotes** ("What our early users say") are real quotes that a moderator adds. The section shows only when five quotes or more exist, and then it shows the five newest.
- The **site details** are the links of Instagram, WhatsApp, Facebook and LinkedIn, the contact email and the organisation number. Each part shows only when a moderator sets it. Each save adds a new row, and the newest row counts, so the table keeps who changed what and when.
- **Feedback** goes into our database. Sign-in is necessary to send it. Moderators read it on an admin page.

## How it fits our project

| Part | Where |
|---|---|
| The page | `apps/web/app/page.tsx`, a server component |
| The sections | `apps/web/components/landing/` |
| The data of the page | `GET /v1/site`, through `getSite()` in `apps/web/lib/site.ts` |
| The quotes and the site details | the site module, `apps/api/src/site/` |
| The feedback | the feedback module, `apps/api/src/feedback/` |
| The admin pages | `/admin/quotes`, `/admin/site` and `/admin/feedback`, for moderators |
| The videos and their first frames | `apps/web/public/landing/` |

- **The server renders the page,** because the landing page is a search page (ADR-0007). It renders on each request, because of the nonce of the [Content-Security-Policy](content-security-policy.md). Next keeps the quotes and the details from the API for at most 60 seconds. Thus, a change on an admin page shows on the landing page in one minute or less.
- **If the API does not answer in 5 seconds,** the page shows with no quotes and no details. The page never fails because of the API.
- **The header knows the person only in the browser,** because sign-in is in the browser (ADR-0007). A guest sees "Sign in with Google", and the sign-in opens `/chat`. A signed-in person sees "Open Roomsie".
- **Moderators** are the editors. Their Firebase uids are in `MODERATOR_UIDS`.

## The choice we made

- Why the designs set the page: [PD14](../decisions/pd-14-v0-is-the-figma-designs.md).
- Why public pages render on the server: [ADR-0007](../decisions/0007-web-rendering-and-auth-transport.md) and [PD6b](../decisions/pd-06b-login-gate-and-search.md).
- The quotes, the editors, the footer and the feedback: the spec of T-23a.

## Gotchas

- **Figma cannot export a video fill directly.** The plugin API cannot read the bytes, and `export_video` takes only a top-level frame. To export the film again, copy the video rectangle into a new top-level frame on the drafts page, set the timeline of the frame longer than the film with `setTimelineDuration`, and export the frame. Figma loops the video, so cut one loop with `ffmpeg -t <seconds>`. The film is 25 seconds, "Tell it." is 8 seconds and "It searches." is 6 seconds. Delete the temporary frame after.
- **A quote needs the agreement of its person.** The admin form has a tick for it, and the API refuses a quote with no tick. The API also hides a phone number in a quote, as in each public text (PD17).
- **The footer links go to `/privacy`, `/terms` and `/grievance`.** T-23b makes those pages.
