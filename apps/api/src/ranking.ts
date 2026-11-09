import { sql, type SQL } from 'drizzle-orm'
import type { Budget, MustHaveKey } from '@roomsie/contract'

/** The parts of PD3a that people and listings share. `meets` gives true or false, or null when the card did not answer. */
export function mustHaveSql(meets: (key: MustHaveKey) => SQL, dealbreakers: MustHaveKey[], preferences: MustHaveKey[]) {
  return {
    filters: dealbreakers.map((key) => sql`${meets(key)} is not false`),
    didntSay: dealbreakers.length
      ? sql`array_remove(array[${sql.join(dealbreakers.map((key) => sql`case when ${meets(key)} is null then ${key} end`), sql`, `)}]::text[], null)`
      : sql`'{}'::text[]`,
    prefsMet: preferences.length ? sql.join(preferences.map((key) => sql`(case when ${meets(key)} then 1 else 0 end)`), sql` + `) : sql`0`,
    /** "Best match": a full match that meets three or more stated preferences, all of them. */
    labels: (row: { didntSay: MustHaveKey[]; isFull: boolean; prefsMet: number }) =>
      ({ didntSay: row.didntSay, bestMatch: row.isFull && preferences.length >= 3 && row.prefsMet === preferences.length }),
  }
}

export type BaseSearch = {
  viewerUserId?: string
  /** Null: all of Mumbai. */
  areas: string[] | null
  budget: Budget | null
  moveDate: string | null
  dealbreakers: MustHaveKey[]
  preferences: MustHaveKey[]
  limit: number
  offset: number
  /** Only these cards: the fit of one card (PD3a). */
  ids?: string[]
}

/** 30 days before or after the move date. An empty date passes (PD3a). */
export const near = (date: SQL, moveDate: string) => sql`(${date} is null or ${date} between ${moveDate}::date - 30 and ${moveDate}::date + 30)`
export const moveGap = (date: SQL, moveDate: string | null) => (moveDate ? sql`abs(${date} - ${moveDate}::date)` : sql`null::int`)
