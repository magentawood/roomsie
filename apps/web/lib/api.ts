import type { User } from 'firebase/auth'
import type { z } from 'zod'
import { errorResponse, incompleteListingResponse, inviteRefusalResponse, visitorKeyHeader, type GoLiveField, type InviteRefusal } from '@roomsie/contract'
import { apiUrl } from './api-url'
import { chatStorage, readStored } from './chat'

/** A response of the API that is not 2xx. `body` is the parsed JSON, if any. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`The API answered ${status}`)
  }
}

/** A signed-in person sends the token, and a visitor of the chat the key. Before T-17 moves a visitor goal, a person sends both. */
export function requestHeaders(token: string | null, visitorKey: string | null, json: boolean): Record<string, string> {
  return {
    ...(token && { authorization: `Bearer ${token}` }),
    ...(visitorKey && { [visitorKeyHeader]: visitorKey }),
    ...(json && { 'content-type': 'application/json' }),
  }
}

type Options = { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown }

async function request<T>(path: string, headers: Record<string, string>, schema: z.ZodType<T>, options: Options): Promise<T> {
  const res = await fetch(`${apiUrl}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  // A 204 has no body, so json() fails and gives null.
  const json: unknown = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, json)
  return schema.parse(json)
}

/**
 * Calls the API as the signed-in user. getIdToken() gives the cached token, and we never store it (ADR-0007).
 * `null`: a guest, for a public route only, such as the areas of the chat (PD6b).
 */
export async function api<T>(user: User | null, path: string, schema: z.ZodType<T>, options: Options = {}): Promise<T> {
  return request(path, requestHeaders(user ? await user.getIdToken() : null, null, options.body !== undefined), schema, options)
}

/** Calls the API of the chat, which is open to a visitor (PD6b): with the token, the visitor key, or both. */
export async function chatApi<T>(user: User | null, path: string, schema: z.ZodType<T>, options: Options = {}): Promise<T> {
  const token = user ? await user.getIdToken() : null
  return request(path, requestHeaders(token, readStored(chatStorage.visitorKey), options.body !== undefined), schema, options)
}

export function errorText(err: unknown) {
  const parsed = err instanceof ApiError ? errorResponse.safeParse(err.body) : null
  return parsed?.success ? parsed.data.error : 'Something went wrong. Try again.'
}

/** The fields that a 422 lists as missing to go live (T-41), or null for a different error. */
export function missingFields(err: unknown): GoLiveField[] | null {
  const incomplete = err instanceof ApiError && err.status === 422 ? incompleteListingResponse.safeParse(err.body) : null
  return incomplete?.success ? incomplete.data.missing : null
}

/** The answer of the gate of T-33, or null for a different error. */
export function refusalOf(err: unknown): InviteRefusal | null {
  const parsed = err instanceof ApiError && err.status === 403 ? inviteRefusalResponse.safeParse(err.body) : null
  return parsed?.success ? parsed.data : null
}
