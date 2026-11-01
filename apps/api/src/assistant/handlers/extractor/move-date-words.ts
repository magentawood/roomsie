import { numberWords } from './number-words'

const monthWords: Record<string, number> = Object.fromEntries([
  'jan january janvari januari', 'feb february farvari februari', 'mar march', 'apr april aprail', 'may mai', 'jun june joon',
  'jul july julai', 'aug august agast', 'sep sept september sitambar', 'oct october aktubar', 'nov november navambar', 'dec december disambar',
].flatMap((words, i) => words.split(' ').map((w) => [w, i + 1])))
const now = /\b(asap|immediately|now|abhi|turant|lagech|right away|as soon as possible)\b/
const nextMonth = /\b(next|agle|agla|pudhchya|pudhcha) (month|mahine|mahina|mahinyat)\b/
const thisMonth = /\b(this|is|ya) (month|mahine|mahina|mahinyat)\b/
const monthEnd = /\b(end|ant)\b/
const nextWeek = /\b(next|agle|agla|pudhchya) (week|hafte|hafta|athavdyat)\b/
const after = /\b(\w+) (days?|din|divas|weeks?|hafte|haftay|months?|mahine|mahinyanni)\b/

type Day = { y: number; m: number; d: number }
const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate()
const iso = ({ y, m, d }: Day) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
const valid = (day: Day) => day.m >= 1 && day.m <= 12 && day.d >= 1 && day.d <= daysIn(day.y, day.m)
const addDays = ({ y, m, d }: Day, days: number) => {
  const date = new Date(Date.UTC(y, m - 1, d + days))
  return { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate() }
}
/** The same day some months on, or the last day of that month if it is shorter. */
const addMonths = ({ y, m, d }: Day, months: number): Day => {
  const total = y * 12 + (m - 1) + months
  const [ny, nm] = [Math.floor(total / 12), (total % 12) + 1]
  return { y: ny, m: nm, d: Math.min(d, daysIn(ny, nm)) }
}
const countOf = (word: string) => (/^\d+$/.test(word) ? Number(word) : numberWords[word])

/** A date with a month and no year is the next one, so "January" in November is next year. */
function inMonth(text: string, words: string[], today: Day): Day | null {
  const i = words.findIndex((w) => monthWords[w] !== undefined)
  if (i < 0) return null
  const m = monthWords[words[i]!]!
  const year = words.find((w) => /^\d{4}$/.test(w))
  const y = year ? Number(year) : m < today.m ? today.y + 1 : today.y
  const day = [words[i - 1], words[i + 1]].map((w) => w?.match(/^(\d{1,2})(st|nd|rd|th)?$/)).find(Boolean)
  if (day) return { y, m, d: Number(day[1]) }
  if (monthEnd.test(text)) return { y, m, d: daysIn(y, m) }
  if (/\bmid\b/.test(text)) return { y, m, d: 15 }
  return y === today.y && m === today.m ? today : { y, m, d: 1 }
}

function read(text: string, today: Day): Day | null {
  const numeric = text.match(/^(\d{4})-(\d{2})-(\d{2})$/) ?? text.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{4}))?$/)
  if (numeric) {
    const [, a, b, c] = numeric
    return a!.length === 4 ? { y: Number(a), m: Number(b), d: Number(c) } : { y: c ? Number(c) : today.y, m: Number(b), d: Number(a) }
  }
  const words = text.split(/[^a-z0-9]+/).filter(Boolean)
  const month = inMonth(text, words, today)
  if (month) return month
  if (now.test(text)) return today
  if (/\btomorrow\b/.test(text)) return addDays(today, 1)
  if (nextWeek.test(text)) return addDays(today, 7)
  if (nextMonth.test(text)) {
    const next = addMonths({ ...today, d: 1 }, 1)
    return monthEnd.test(text) ? { ...next, d: daysIn(next.y, next.m) } : next
  }
  if (monthEnd.test(text) && /\b(month|mahine|mahina|mahinyacha)\b/.test(text)) return { ...today, d: daysIn(today.y, today.m) }
  if (thisMonth.test(text)) return today
  const span = text.match(after)
  const count = span && countOf(span[1]!)
  if (!span || count == null) return null
  const unit = span[2]!
  if (/^(days?|din|divas)$/.test(unit)) return addDays(today, count)
  if (/^(weeks?|hafte|haftay)$/.test(unit)) return addDays(today, count * 7)
  return addMonths(today, count)
}

/** The move date in the words of the person, as an ISO date, or null (PD7: code parses dates, not the model). `today` is the date in IST. */
export function parseMoveDate(words: string, today: string): string | null {
  const [y, m, d] = today.split('-').map(Number) as [number, number, number]
  const day = read(words.toLowerCase().trim(), { y, m, d })
  return day && valid(day) ? iso(day) : null
}
