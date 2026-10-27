# Alerts: email and browser push

**In one line:** a new request, an accept or a new message sends the other person an email and a browser push with no message text.

## What it is

- An **alert** tells a person that something waits for them in roomsie: "Divya sent you a message", "Divya wants to say hi" or "Divya accepted your request". It never has the text of a message or a note ([PD17](../decisions/pd-17-connect-and-contact.md)).
- An **email service** sends mail from our domain, so that the mail gets to the inbox and not to spam. We use Amazon SES.
- A **browser push** is a notice from the browser that shows also when no roomsie tab is open. The browser gives each device a **push token**. The API sends to that token through **Firebase Cloud Messaging (FCM)**. A **service worker**, a small script of the web that runs in the background, shows the notice.

## How it fits our project

```
POST /v1/requests ─┐                      ┌─▶ SES ──▶ the email of the other person
accept a request ──┼─▶ alerts module ─────┤
send a message ────┘   (after the reply)  └─▶ FCM ──▶ each browser of the other person
```

- **The rules:** each new request alerts its recipient, and each accept alerts the sender of the request. A message alerts only when it is the first message in the chat that the person did not read. The person also must not have read the chat in the last 5 minutes. An accept counts as the alert of the chat for 5 minutes. A person whose account is not active gets nothing.
- **Best effort:** the API saves first, replies, then sends. A failed send goes to the log, with no retry. The API deletes a push token that FCM refuses.
- **The email address:** the sign-in path keeps the verified email of the Google account in `users.email`. Account deletion clears it and deletes the push tokens ([PD19](../decisions/pd-19-retention.md)).
- **The switches:** in "Profile and Settings", also with no profile. "Email alerts" is one setting of the account, on by default. "Push alerts" belongs to each browser, off by default. A tap asks the browser "Allow notifications?", then gives the token to the API. The switch shows on when the API has the token of this browser for this person.

| Route | What it does |
|---|---|
| `GET /v1/me/alerts` and `PUT /v1/me/alerts` | Read and set `emailAlerts`. |
| `POST /v1/me/push-tokens` and `DELETE /v1/me/push-tokens` | Add or remove the push token of this browser. |
| `POST /v1/me/push-tokens/status` | Tells if the API has this token for the caller. A POST keeps the token out of the URL and the logs. |

## The choice we made

- SES and FCM, and the email at sign-in: [ADR-0019](../decisions/0019-alerts-by-ses-and-fcm.md).
- The alerts, their texts and the switches: [PD17](../decisions/pd-17-connect-and-contact.md).

## Gotchas

- **The setup.** The API needs the secrets `SES_ACCESS_KEY_ID` and `SES_SECRET_ACCESS_KEY`, from an IAM user that can only send email. SES needs the DNS records of `roomsie.in` in Cloudflare and production access. In the sandbox, SES sends only to verified addresses. The web needs the public values `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` and `NEXT_PUBLIC_FIREBASE_VAPID_KEY` (the public key of the Web Push certificate of Cloud Messaging). Without them, the API sends no email or no push, and the switches still save.
- **iPhones.** Safari on an iPhone gives push only to roomsie on the home screen. In a normal tab, the switch is off with a line that tells this.
- **A blocked browser.** After a "Block", the browser does not ask again. The person must allow notifications in the site settings of the browser.
- **One browser, one person.** When a second person turns on push in the same browser, the token moves to that person. It is the named exception to the rule on updates of client-supplied ids.
- **Tests.** The API tests use a fake mailer and a fake FCM that record each send. A test call waits for the alerts, because they go out after the reply.

## Tickets

- T-55: [#168](https://github.com/magentawood/roomsie/pull/168), 2026-10-27. The alerts, the switches, SES and FCM.
