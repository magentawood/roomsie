import type { User } from 'firebase/auth'
import type { z } from 'zod'
import { incompleteListingResponse, type GoLiveField } from '@roomsie/contract'

export const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'

/** A response of the API that is not 2xx. `body` is the parsed JSON, if any. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`The API answered ${status}`)
  }
}

type Options = { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown }

/** Calls the API as the signed-in user. getIdToken() gives the cached token, and we never store it (ADR-0007). */
export async function api<T>(user: User, path: string, schema: z.ZodType<T>, options: Options = {}): Promise<T> {
  const res = await fetch(`${apiUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      authorization: `Bearer ${await user.getIdToken()}`,
      ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  // A 204 has no body, so json() fails and gives null.
  const json: unknown = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, json)
  return schema.parse(json)
}

/** The `error` text of an API error body, for a message on the screen. */
export function errorText(err: unknown) {
  if (err instanceof ApiError && typeof err.body === 'object' && err.body && 'error' in err.body) return String(err.body.error)
  return 'Something went wrong. Try again.'
}

/** The fields that a 422 lists as missing to go live (T-41), or null for a different error. */
export function missingFields(err: unknown): GoLiveField[] | null {
  const incomplete = err instanceof ApiError && err.status === 422 ? incompleteListingResponse.safeParse(err.body) : null
  return incomplete?.success ? incomplete.data.missing : null
}
