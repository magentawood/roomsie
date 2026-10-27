import { z } from 'zod'
import { unsetIfEmpty } from '../env-values'
import { s3IdStore } from '../id-store'

/** The private bucket, with the key of the IAM user of ADR-0019 (ADR-0020). Unset: the API takes no ID check, so development needs no AWS. */
export const idStoreSettings = z.object({ ID_BUCKET: unsetIfEmpty, SES_ACCESS_KEY_ID: unsetIfEmpty, SES_SECRET_ACCESS_KEY: unsetIfEmpty })
  .transform((s) => (s.ID_BUCKET && s.SES_ACCESS_KEY_ID && s.SES_SECRET_ACCESS_KEY
    ? s3IdStore({ bucket: s.ID_BUCKET, accessKeyId: s.SES_ACCESS_KEY_ID, secretAccessKey: s.SES_SECRET_ACCESS_KEY })
    : null))
