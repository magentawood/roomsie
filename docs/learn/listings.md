# Listings and photo uploads

**In one line:** a lister saves a listing of one of four kinds one step at a time, uploads photos straight to R2 with a signed link, and publishes it for 30 days.

## What it is

- A **listing** is a place that a lister offers. Its **kind** is one of four: a room in my flat, a whole flat that I own, a PG or hostel, or a broker flat. The kind decides the fields of the listing flow (flow 04 of the designs).
- A listing has a **status**: `draft`, `live`, `inactive` (paused) or `filled`. Only a live listing that has not expired shows to other people.
- A **signed upload link** is an address of R2 with a signature in it. It lets the browser upload one file for ten minutes, with no R2 key. The API makes the link, so photo bytes never pass through the API.
- **Masking** replaces a phone number or a WhatsApp link with `••••` before the API saves the text.

## How it fits our project

| Route | What it does |
|---|---|
| `POST /v1/listings` | Makes a draft of one kind |
| `PATCH /v1/listings/:id` | Saves the fields of one or more steps |
| `POST /v1/listings/:id/upload-urls` | Gives a signed link for one photo |
| `POST /v1/listings/:id/status` | Publishes, pauses or marks a listing filled |
| `GET /v1/listings/mine` | My listings |
| `GET /v1/listings/:id` | One listing. It needs sign-in. Other users see the address, the street and the pincode only if the lister shares them |
| `DELETE /v1/listings/:id` | Deletes the listing and its photos |

```
browser ─▶ POST upload-urls {contentType, size} ─▶ API signs the link
browser ─▶ PUT the file to R2, with the same content-type and content-length
browser ─▶ PATCH {photoKeys: [..., key]} ─▶ API checks that the key is of this listing
```

- The code is in `apps/api/src/listings/routes.ts`. The shapes and the key lists are in `packages/contract/src/listings.ts`.
- `apps/api/src/storage.ts` signs the links and deletes photos. `apps/api/src/text/mask-contacts.ts` masks the text. T-16a and T-44 use both again.

## The choice we made

- The fields and the database checks of each kind: [ADR-0017](../decisions/0017-schema-v1-shape.md).
- Masking at save: [PD17](../decisions/pd-17-connect-and-contact.md).
- Photos go before the database row: [PD19](../decisions/pd-19-retention.md).
- Who sees a listing: [PD6b](../decisions/pd-06b-login-gate-and-search.md). The other choices are in the spec of the T-41 task note.

## Gotchas

- **The kind is fixed.** To change the kind, delete the listing and make a new one.
- **Rents and flatmates replace the full set.** A `PATCH` with `rates` or `flatmates` deletes the old rows. Send the full list each time.
- **Upload with the type and the size that you asked for.** The link signs the `content-type` and the `content-length`. A different file type or size gets 403 from R2.
- **A removed photo is gone.** The API deletes it in R2 before it saves the edit. If R2 fails, the API gives 502 and saves nothing.
- **A live listing needs an area.** The `areas` table is empty in production until F-06 and T-22a add the launch areas. Until then, no listing can go live there.
- **A live edit is checked again.** An edit that removes the last rent of a live listing gets 422.
- **The lister sees `••••` in their own text.** The original is never stored, so it cannot come back.
- **Photo addresses use `R2_PUBLIC_URL`.** The photos bucket must serve that address, or the photos do not load.

## Tickets

- T-41: [#141](https://github.com/magentawood/roomsie/pull/141), 2026-10-26. The listings API, the signed photo uploads and the masking.
