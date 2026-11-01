import { sql } from 'drizzle-orm'

/** Drizzle gives a JS array as a list `($1, $2)`, so a `text[]` needs this. */
export const textArray = (values: readonly string[]) => sql`array[${sql.join(values.map((v) => sql`${v}`), sql`, `)}]::text[]`
