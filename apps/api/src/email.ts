import { AwsClient } from 'aws4fetch'

/** The only code that sends email: Amazon SES in Mumbai (ADR-0019). */
export type Mail = { subject: string; text: string; html: string }
export type Mailer = { send(to: string, mail: Mail): Promise<void> }

const from = 'roomsie <alerts@roomsie.in>'
const region = 'ap-south-1'

export function sesMailer({ accessKeyId, secretAccessKey }: { accessKeyId: string; secretAccessKey: string }): Mailer {
  const client = new AwsClient({ accessKeyId, secretAccessKey, service: 'ses', region, retries: 0 })
  return {
    async send(to, { subject, text, html }) {
      const res = await client.fetch(`https://email.${region}.amazonaws.com/v2/email/outbound-emails`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          FromEmailAddress: from,
          Destination: { ToAddresses: [to] },
          Content: { Simple: { Subject: { Data: subject, Charset: 'UTF-8' }, Body: { Text: { Data: text, Charset: 'UTF-8' }, Html: { Data: html, Charset: 'UTF-8' } } } },
        }),
      })
      if (!res.ok) throw new Error(`SES failed: ${res.status}`)
    },
  }
}

export const noMailer: Mailer = { send: async () => {} }
