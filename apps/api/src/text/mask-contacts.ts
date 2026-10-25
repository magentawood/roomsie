/** PD17: roomsie never reveals a phone number. Up to three spaces, dots, dashes or brackets join the digits. */
const separator = String.raw`[\s.()-]{0,3}`
const whatsappLink = /(?:https?:\/\/)?(?:www\.|web\.)?(?:wa\.me|wa\.link|api\.whatsapp\.com|chat\.whatsapp\.com|whatsapp\.com)\/(?:\S*[^\s.,;:!?)])?/gi
// A mobile: an optional +91, 91 or 0, then ten digits that start with 6 to 9.
const mobile = new RegExp(String.raw`(?<!\d)(?:\+?91${separator}|0)?[6-9](?:${separator}\d){9}(?!\d)`, 'g')
// +91 and a landline, or a landline with its STD code.
const landline = new RegExp(String.raw`\+91(?:${separator}\d){10}(?!\d)|(?<!\d)\(?0(?:${separator}\d){9,10}(?!\d)`, 'g')
// "65000-70000" or "62500 67500" is a rent range, not a mobile: two or more round amounts.
const isRentRange = (match: string) => {
  const groups = match.split(/[\s.()-]+/)
  return !match.startsWith('+') && groups.length > 1 && groups.every((group) => group.length >= 4 && group.endsWith('00'))
}

export function maskContacts(text: string) {
  return text
    .replace(whatsappLink, '••••')
    .replace(mobile, (match) => (isRentRange(match) ? match : '••••'))
    .replace(landline, '••••')
}
