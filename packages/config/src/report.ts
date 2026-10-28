import { captureException, setUser, withScope, type ErrorEvent, type Options } from '@sentry/core'

/** The one way to report an error (ADR-0014). `where` names the place in the code. Without a DSN, only the log line goes out. */
export function reportError(err: unknown, context: { where: string; userId?: string | null; log?: { error(obj: object, msg: string): void } }) {
  const { where, userId, log } = context
  log?.error({ err, userId }, where)
  withScope((scope) => {
    scope.setTag('where', where)
    if (userId) scope.setUser({ id: userId })
    captureException(err)
  })
}

/** The person of the events of this browser, or null at sign-out. */
export const setReportUser = (id: string | null) => setUser(id ? { id } : null)

// An Indian mobile number: +91, 91 or 0 is optional, then 10 digits that start with 6 to 9, with a space or a dash in any place.
const phone = /(?:\+91[\s-]?|\b(?:91[\s-]?|0)?)[6-9](?:[\s-]?\d){9}\b/g
// A failed query of Drizzle ends with its values, for example the text of a message.
const queryValues = /\nparams: [\s\S]*$/

function scrubText<T>(value: T): T {
  if (typeof value === 'string') return value.replace(queryValues, '\nparams: [removed]').replace(phone, '[phone]') as T
  if (Array.isArray(value)) return value.map(scrubText) as T
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, scrubText(v)])) as T
  return value
}

/** `beforeSend` of each app (ADR-0014). */
function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    delete event.request.data
    delete event.request.cookies
    // Each other header can hold a token, a cookie or the IP address, for example X-Forwarded-For.
    event.request.headers = Object.fromEntries(Object.entries(event.request.headers ?? {}).filter(([name]) => name.toLowerCase() === 'user-agent'))
  }
  if (event.user) event.user = { id: event.user.id }
  for (const part of ['message', 'exception', 'breadcrumbs', 'extra', 'request', 'tags'] as const) event[part] = scrubText(event[part]) as never
  return event
}

/** The privacy part of the options of `Sentry.init` in each app. Sentry collects none of this data, and `scrubEvent` removes what is left. */
export const privacyOptions: Pick<Options, 'beforeSend' | 'dataCollection'> = {
  beforeSend: scrubEvent,
  dataCollection: { userInfo: false, cookies: false, httpHeaders: { request: { allow: ['user-agent'] }, response: false }, httpBodies: [], stackFrameVariables: false, databaseQueryData: false },
}
