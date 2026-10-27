# ADR 0019 — Alerts by Amazon SES and Firebase Cloud Messaging

**Status:** Accepted · **Date:** 2026-10-27 · **Deciders:** n3rxv

## Context

- PD17 says that a new request or message sends an email and a browser push, with no message text.
- The API runs on AWS Lightsail in `ap-south-1` (ADR 0009). It already signs AWS-style requests with `aws4fetch` for R2.
- Firebase Authentication runs the sign-in (ADR 0005). The API already holds the Firebase service account for the Realtime claims (T-44), and the web has the `firebase` package.
- The team is self-funded, and each fixed monthly cost needs a reason (PD5).

## Decision

**In one line:** Amazon SES in Mumbai sends the alert emails, and Firebase Cloud Messaging sends the browser pushes.

- **Email:** Amazon SES v2 in `ap-south-1`, from `roomsie <alerts@roomsie.in>`. The email module signs each call with `aws4fetch`. An IAM user that can only send email gives its key to the API.
- **Push:** Firebase Cloud Messaging (FCM). The web gets a token for the browser with `firebase/messaging`, and a service worker shows each push. The Firebase Admin module sends a data message with the service account of the API. It keeps each Google token for one hour.
- **The email address:** the sign-in path saves the verified email of the token. The alerts read it from our database, so only the sign-in path reads the Firebase UID.
- **Secrets:** `SES_ACCESS_KEY_ID` and `SES_SECRET_ACCESS_KEY` (the IAM user that only sends), in the CI secret store and the API (ADR 0016). The web gets two public values: `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` and `NEXT_PUBLIC_FIREBASE_VAPID_KEY`, the public key of the Web Push certificate.
- **No secrets, no alerts:** without the SES key, the API sends no email. Without the service account, it sends no push.
- **One browser, one person:** a browser has one push token. When a different person turns on Push alerts in the same browser, the token moves to that person. This is a named exception to the rule that an update on a client-supplied id checks the user.

## Rationale

- SES needs no new company, no new package and no monthly fee. It costs approximately $0.10 for 1,000 emails, with 3,000 free each month in the first year.
- FCM needs no new vendor, no new package and no new secret. Google encrypts each push, so the API makes only one HTTPS call for each browser. That is the least compute on our API.
- A token that lives one hour saves one signature and one token call for each alert.

## Alternatives rejected

- **Resend.** The simplest setup, but a new vendor, and its free plan stops at 100 emails a day.
- **Brevo, free plan.** Free with no end date, but a new vendor, a possible Brevo logo, and a stop at 300 emails a day.
- **Gmail SMTP.** Gmail limits the volume, and the mail often lands in spam.
- **Standard Web Push with our own VAPID keys.** No vendor in the path, but one more secret, and the `web-push` package encrypts each push on our API.
- **A Firebase lookup of the email at each send.** No stored email, but one more Google call for each email, and a second reader of the Firebase UID.

## Consequences

- Before the first email, SES needs the DNS records of `roomsie.in` in Cloudflare and production access. In the sandbox, SES sends only to verified addresses.
- The API keeps one more column of personal data, the email. Account deletion clears it ([PD19](pd-19-retention.md)).
- A push on an iPhone needs roomsie on the home screen.
- Google is in the path of each push, also for Firefox and Safari users.
- A person who gets the push token of a different browser can move its pushes, which have no text, to an own account. The token stays in that browser and our API.

## Revisit when

- SES stops production access, or the bounce rate of SES goes up.
- The alerts need a different channel, for example WhatsApp or SMS.

## Sources

- The T-55 grill ([#161](https://github.com/magentawood/roomsie/issues/161)), 2026-10-27
- [PD17](pd-17-connect-and-contact.md), [ADR 0005](0005-managed-platform-split.md), [ADR 0009](0009-hosting-and-region.md), [ADR 0016](0016-credentials-and-secrets.md), [PD5](pd-05-team-and-budget.md)
- The pricing pages of Resend, and the reviews of SES and Brevo pricing, read on 2026-10-27
