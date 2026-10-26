/** PD17: roomsie never reveals a phone number. Up to three spaces, dots, dashes or brackets join the digits. */
const separator = String.raw`[\s.()–—-]{0,3}`
const whatsappLink = /(?:https?:\/\/)?(?:(?:www|web|api|chat)\.)?(?:wa\.(?:me|link)|whatsapp\.com)\/(?:\S*[^\s.,;:!?)])?/gi
// A mobile: an optional +91, 91 or 0, then ten digits that start with 6 to 9.
const mobile = new RegExp(String.raw`(?<!\d)(?:\+?91${separator}|0)?[6-9](?:${separator}\d){9}(?!\d)`, 'g')
// A landline with 91 or an STD code. It must stand alone, so a date range stays. Dots do not join it.
const landlineSeparator = String.raw`[\s()–—-]{0,3}`
const landline = new RegExp(
  String.raw`(?<!\d${landlineSeparator})(?:(?:\+|00)?91(?:${landlineSeparator}\d){10}|\(?0(?:${landlineSeparator}\d){9,10})(?!${landlineSeparator}\d)`,
  'g',
)
// "65000-70000" is a rent range, not a mobile: two round amounts, the lower first.
const rentRange = /^(\d{3}00)[\s.()–—-]+(\d{3}00)$/
const isRentRange = (match: string) => {
  const amounts = rentRange.exec(match)
  return amounts !== null && Number(amounts[1]) < Number(amounts[2])
}

export function maskContacts(text: string) {
  return text
    .replace(whatsappLink, '••••')
    .replace(mobile, (match) => (isRentRange(match) ? match : '••••'))
    .replace(landline, '••••')
}

/** A copy of `fields` with `maskContacts` on each text value that the keys name (PD17). */
export function maskFields<T extends Partial<Record<K, string | null>>, K extends string>(fields: T, keys: readonly K[]): T {
  const masked = { ...fields }
  for (const key of keys) {
    const value = fields[key]
    if (value) masked[key] = maskContacts(value) as T[K]
  }
  return masked
}
