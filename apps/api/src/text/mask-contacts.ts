/** PD17: roomsie never reveals a phone number. Separators are one space, dot or dash between digits. */
const contactPatterns = [
  // A link ends before the punctuation that follows it.
  /(?:https?:\/\/)?(?:www\.)?(?:wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com)\/(?:\S*[^\s.,;:!?)])?/gi,
  // A mobile: an optional +91, 91 or 0, then ten digits that start with 6 to 9.
  /(?<!\d)(?:\+?91[\s.-]?|0)?[6-9](?:[\s.-]?\d){9}(?!\d)/g,
  // +91 and a landline, or a landline with its STD code.
  /\+91(?:[\s.-]?\d){10}(?!\d)/g,
  /(?<!\d)0(?:[\s.-]?\d){9,10}(?!\d)/g,
]

export function maskContacts(text: string) {
  return contactPatterns.reduce((masked, pattern) => masked.replace(pattern, '••••'), text)
}
