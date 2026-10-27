import type { Mail } from '../email'

/** `name`: who did it. `link`: the page that the alert opens. The ID check alerts name nobody. */
export type Alert = { kind: 'request' | 'message' | 'accept'; name: string; link: string } | { kind: 'verified' | 'rejected'; link: string }

/** No alert has the text of a message or a note (PD17), or the reason of a rejection (T-46). */
const lines: Record<Alert['kind'], { title: (name: string) => string; body: string; button: string }> = {
  request: { title: (name) => `${name} wants to say hi`, body: 'Open roomsie to see the request and answer it. We never put your messages in an email.', button: 'See the request' },
  message: { title: (name) => `${name} sent you a message`, body: 'Open roomsie to read it and reply. We never put your messages in an email.', button: 'Open the chat' },
  accept: { title: (name) => `${name} accepted your request`, body: 'You can write more now. We never put your messages in an email.', button: 'Open the chat' },
  verified: { title: () => 'You’re verified on roomsie', body: 'Your card now shows the Verified badge. We deleted the photos of your ID check.', button: 'Open Settings' },
  rejected: { title: () => 'Your ID check needs a new photo', body: 'Open Profile and Settings in roomsie to see why, and to send a new ID. We never put the reason in an email.', button: 'Open Settings' },
}

export const alertTitle = (alert: Alert) => lines[alert.kind].title('name' in alert ? alert.name : '')

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

/** The email of an alert. `settings` is the page with the switch. */
export function alertMail(alert: Alert, settings: string): Mail {
  const { kind, link } = alert
  const { body, button } = lines[kind]
  const subject = alertTitle(alert)
  const footer = 'You get this email because Email alerts is on. Turn off these emails in Profile and Settings.'
  return {
    subject,
    text: `${subject}.\n\n${body}\n\n${button}: ${link}\n\n${footer}\n${settings}\n`,
    html: `<!doctype html><html><body style="margin:0;padding:32px;background:#fafafa;font-family:Arial,sans-serif;color:#181d27">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e9eaeb;border-radius:12px;padding:32px">
<p style="margin:0 0 24px;font-size:20px;font-weight:600">roomsie</p>
<h1 style="margin:0 0 8px;font-size:18px;font-weight:600">${escape(subject)}</h1>
<p style="margin:0 0 24px;font-size:16px;color:#535862">${body}</p>
<a href="${escape(link)}" style="display:inline-block;padding:10px 16px;background:#181d27;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:600">${button}</a>
<hr style="margin:32px 0 16px;border:0;border-top:1px solid #e9eaeb">
<p style="margin:0;font-size:14px;color:#535862">${footer} <a href="${escape(settings)}" style="color:#535862">Profile and Settings</a></p>
</div></body></html>`,
  }
}
