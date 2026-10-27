import { z } from 'zod'

/** An unset secret of the deploy arrives as an empty string, so empty means unset. */
export const unsetIfEmpty = z.preprocess((v) => v || undefined, z.string().optional())
