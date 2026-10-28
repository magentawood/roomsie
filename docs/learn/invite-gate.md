# The invite gate

**In one line:** until the launch on 8 November, only the invited emails and the moderators can sign in, and moderators change the list and the opening time on `/admin/invites`.

## What it is

- The **gate** is a check at each sign-in and each request of a signed-in person. While it is closed, it lets in only an invited email and the moderators.
- An **invite** is one email on the list. A sign-in with that Google email, verified by Google, gets in. The case of the letters does not matter.
- The **opening time** is the time when the gate opens by itself: the launch ([PD11](../decisions/pd-11-launch.md)).
- The **switch** "Invite only" opens or closes the gate at once.

## How it fits our project

```
Google sign-in ─▶ a request to the API ─▶ moderator? ──yes──▶ in
                                             │ no
                                             ▼
                        gate closed and email not invited? ──yes──▶ 403 "invite only", no account
                                             │ no
                                             ▼
                                            in
```

- **The invites module** (`apps/api/src/invites/`) owns the tables `invites` and `invite_gate`. The sign-in path of the account module asks it before it makes an account ([database standard](../standards/database.md)).
- **Closed** means: the switch is on, and the opening time is empty or in the future. Each save of the admin page adds a row to `invite_gate`, and the newest row counts. With no row, the gate is closed. The check compares with `now()` in the database, so the gate opens at the opening time with no job.
- **A refused person** gets 403 with `error: "invite only"`, the opening time and `account`: true when the person has an account. The API makes no account row for a new person.
- **An account that is not invited** can still delete itself, because the deletion route skips the gate (DPDP).
- **The web** shows the screen "Roomsie opens on 8 November" in place of each page. "Go home" signs the person out. "Delete my account" shows only for an account. A revoked session gets 401 before the gate, as before.
- **The admin page** `/admin/invites` shows the switch, the opening time in IST, a form to add an email, and the list. Turning the switch off, or saving an opening time that is past, asks first.

## The choice we made

- A table that moderators change, not a setting, so a new invite needs no deploy (T-33).
- Moderators pass the gate. Thus, a moderator can add the first invites after the gate closes.
- An opening time, so the launch needs no one awake at midnight.

## Gotchas

- The migration adds no row, so the gate is closed after the deploy. Before the deploy, `MODERATOR_UIDS` must have a value. If not, nobody can open the admin page.
- An email that Google did not verify does not count, even on the list.
- The tests open the gate in `createTestDb`. A test of the gate closes it again.
- The opening time is stored as a moment. The admin page shows and reads it in IST.

## Tickets

- T-33: [#181](https://github.com/magentawood/roomsie/pull/181), 2026-10-28. The gate, the admin page and the screen of a refused person.
