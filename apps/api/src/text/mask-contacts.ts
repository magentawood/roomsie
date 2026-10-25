/** PD17: roomsie never reveals a phone number. Up to two spaces, dots, dashes or brackets join the digits. */
const join = String.raw`[\s.()-]{0,2}`
const whatsappLink = /(?:https?:\/\/)?(?:www\.)?(?:wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com)\/(?:\S*[^\s.,;:!?)])?/gi
// A mobile: an optional +91, 91 or 0, then ten digits that start with 6 to 9.
const mobile = new RegExp(String.raw`(?<!\d)(?:\+?91${join}|0)?[6-9](?:${join}\d){9}(?!\d)`, 'g')
// +91 and a landline, or a landline with its STD code.
const landline = new RegExp(String.raw`\+91(?:${join}\d){10}(?!\d)|(?<!\d)\(?0(?:${join}\d){9,10}(?!\d)`, 'g')
// "65000-70000" is a rent range, not a mobile: each group ends in 000.
const isAmounts = (match: string) => !match.startsWith('+') && match.split(/[\s.()-]+/).every((group) => group.endsWith('000'))

export function maskContacts(text: string) {
  return text
    .replace(whatsappLink, '••••')
    .replace(mobile, (match) => (isAmounts(match) ? match : '••••'))
    .replace(landline, '••••')
}
