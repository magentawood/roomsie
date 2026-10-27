import { z } from 'zod'
import { noMailer, sesMailer } from '../email'
import { unsetIfEmpty } from '../env-values'

/** The key of the IAM user of the alerts and the ID checks (ADR-0019, ADR-0020). Unset: the API sends no email alert, so development needs no SES. */
export const mailerSettings = z.object({ SES_ACCESS_KEY_ID: unsetIfEmpty, SES_SECRET_ACCESS_KEY: unsetIfEmpty })
  .transform((s) => (s.SES_ACCESS_KEY_ID && s.SES_SECRET_ACCESS_KEY ? sesMailer({ accessKeyId: s.SES_ACCESS_KEY_ID, secretAccessKey: s.SES_SECRET_ACCESS_KEY }) : noMailer))
