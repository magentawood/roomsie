import type { Mail } from '../email'

export type AlertKind = 'request' | 'message' | 'accept'
/** `name`: who did it. `link`: the page that the alert opens. */
export type Alert = { kind: AlertKind; name: string; link: string }

/** No alert has the text of a message or a note (PD17). */
const lines: Record<AlertKind, { title: (name: string) => string; body: string; button: string }> = {
  request: { title: (name) => `${name} wants to say hi`, body: 'Open roomsie to see the request and answer it.', button: 'See the request' },
  message: { title: (name) => `${name} sent you a message`, body: 'Open roomsie to read it and reply.', button: 'Open the chat' },
  accept: { title: (name) => `${name} accepted your request`, body: 'You can write more now.', button: 'Open the chat' },
}

export const alertTitle = ({ kind, name }: Alert) => lines[kind].title(name)

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

/** The email of an alert. `settings` is the page with the switch. */
export function alertMail(alert: Alert, settings: string): Mail {
  const { body, button } = lines[alert.kind]
  const { link } = alert
  const subject = alertTitle(alert)
  const footer = 'You get this email because Email alerts is on. Turn off these emails in Profile and Settings.'
  return {
    subject,
    text: `${subject}.\n\n${body}\n\n${button}: ${link}\n\n${footer}\n${settings}\n`,
    html: `<!doctype html><html><body style="margin:0;padding:32px;background:#fafafa;font-family:Arial,sans-serif;color:#181d27">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e9eaeb;border-radius:12px;padding:32px">
<p style="margin:0 0 24px;font-size:20px;font-weight:600">roomsie</p>
<h1 style="margin:0 0 8px;font-size:18px;font-weight:600">${escape(subject)}</h1>
<p style="margin:0 0 24px;font-size:16px;color:#535862">${body} We never put your messages in an email.</p>
<a href="${escape(link)}" style="display:inline-block;padding:10px 16px;background:#181d27;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:600">${button}</a>
<hr style="margin:32px 0 16px;border:0;border-top:1px solid #e9eaeb">
<p style="margin:0;font-size:14px;color:#535862">${footer} <a href="${escape(settings)}" style="color:#535862">Profile and Settings</a></p>
</div></body></html>`,
  }
}
