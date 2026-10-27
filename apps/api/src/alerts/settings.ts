import { z } from 'zod'
import { noMailer, sesMailer } from '../email'
import { optional } from '../messages/settings'

/** The key of the IAM user that only sends email (ADR-0019). Unset: the API sends no email alert, so development needs no SES. */
export const mailerSettings = z.object({ SES_ACCESS_KEY_ID: optional, SES_SECRET_ACCESS_KEY: optional })
  .transform((s) => (s.SES_ACCESS_KEY_ID && s.SES_SECRET_ACCESS_KEY ? sesMailer({ accessKeyId: s.SES_ACCESS_KEY_ID, secretAccessKey: s.SES_SECRET_ACCESS_KEY }) : noMailer))
