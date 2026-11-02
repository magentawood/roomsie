import { isDevanagari, phrase, plainWords } from '../../words'
import { numberWords } from './number-words'

const monthWords: Record<string, number> = Object.fromEntries([
  'jan january janvari januari जनवरी जानेवारी', 'feb february farvari februari फरवरी फेब्रुवारी', 'mar march मार्च', 'apr april aprail अप्रैल एप्रिल',
  'may mai मई मे', 'jun june joon जून', 'jul july julai जुलाई जुलै', 'aug august agast अगस्त ऑगस्ट', 'sep sept september sitambar सितंबर सप्टेंबर',
  'oct october aktubar अक्टूबर ऑक्टोबर', 'nov november navambar नवंबर नोव्हेंबर', 'dec december disambar दिसंबर डिसेंबर',
].flatMap((words, i) => words.split(' ').map((w) => [w, i + 1])))

const next = 'next|agle|agla|pudhchya|pudhcha|pudhil|अगले|अगला|पुढच्या|पुढचा|पुढील'
const month = 'month|mahine|mahina|mahinyat|महीने|महीना|महिने|महिना|महिन्यात'
const week = 'week|hafte|hafta|athavdyat|हफ्ते|हफ्ता|सप्ताह|आठवड्यात|आठवडा'
const now = phrase('asap|immediately|now|abhi|turant|lagech|right away|as soon as possible|अभी|तुरंत|लगेच|ताबडतोब|आत्ता')
const notNow = phrase('not now|abhi nahi|abhi nahin|lagech nahi|अभी नहीं|अभी नही|आत्ता नाही|लगेच नाही')
const nextMonth = phrase(`(?:${next}) (?:${month})`)
const monthAfterNext = phrase(`(?:${next}) (?:to|ke) (?:${next}) (?:${month})`)
const thisMonth = phrase(`(?:this|is|ya|इस|या) (?:${month})`)
const nextWeek = phrase(`(?:${next}) (?:${week})`)
const monthEnd = phrase('end|ant|अंत|आखिर|अखेर|शेवटी')
const mid = phrase('mid|बीच|मध्य')
const tomorrow = phrase('tomorrow|udya|उद्या')
/** A count, then days, weeks or months, as "10 din" or "2 weeks". */
const after = /(?:^| )(\S+) (?:(days?|din|divas|दिन|दिनों|दिवस|दिवसांनी)|(weeks?|hafte|haftay|हफ्ते|हफ्तों|आठवड्यांनी)|months?|mahine|mahinyanni|महीने|महीनों|महिन्यांनी)(?= |$)/

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

/** A month name, also with a Marathi ending, as "डिसेंबरमध्ये" or "जानेवारीत". */
const devanagariMonths = Object.keys(monthWords).filter((w) => isDevanagari(w) && w.length >= 3)
const monthOf = (word: string) => monthWords[word] ?? monthWords[devanagariMonths.find((w) => word.startsWith(w)) ?? '']

/** A date with a month and no year is the next one, so "January" in November is next year. */
function inMonth(text: string, words: string[], today: Day): Day | null {
  const i = words.findIndex((w) => monthOf(w) !== undefined)
  if (i < 0) return null
  const m = monthOf(words[i]!)!
  const year = words.find((w) => /^\d{4}$/.test(w))
  const y = year ? Number(year) : m < today.m ? today.y + 1 : today.y
  // "15 Dec", "Dec 15" or "15th of December".
  const near = words[i - 1] === 'of' ? [words[i - 2]] : [words[i - 1], words[i + 1]]
  const day = near.map((w) => w?.match(/^(\d{1,2})(st|nd|rd|th)?$/)).find(Boolean)
  if (day) return { y, m, d: Number(day[1]) }
  if (monthEnd.test(text)) return { y, m, d: daysIn(y, m) }
  if (mid.test(text)) return { y, m, d: 15 }
  return y === today.y && m === today.m ? today : { y, m, d: 1 }
}

function read(raw: string, today: Day): Day | null {
  const numeric = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/) ?? raw.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{4}))?$/)
  if (numeric) {
    const [, a, b, c] = numeric
    if (a!.length === 4) return { y: Number(a), m: Number(b), d: Number(c) }
    const day = { y: c ? Number(c) : today.y, m: Number(b), d: Number(a) }
    // A day and a month with no year is the next one, as with a month name.
    return !c && iso(day) < iso(today) ? { ...day, y: day.y + 1 } : day
  }
  const words = raw.split(/[^\p{L}\p{M}\p{N}]+/u).filter(Boolean)
  const text = words.join(' ')
  const named = inMonth(text, words, today)
  if (named) return named
  if (tomorrow.test(text)) return addDays(today, 1)
  if (nextWeek.test(text)) return addDays(today, 7)
  if (monthAfterNext.test(text)) return addMonths({ ...today, d: 1 }, 2)
  if (nextMonth.test(text)) {
    const first = addMonths({ ...today, d: 1 }, 1)
    return monthEnd.test(text) ? { ...first, d: daysIn(first.y, first.m) } : first
  }
  if (monthEnd.test(text) && phrase(month).test(text)) return { ...today, d: daysIn(today.y, today.m) }
  if (thisMonth.test(text)) return today
  const span = text.match(after)
  const count = span && countOf(span[1]!)
  if (span && count != null) {
    if (span[2]) return addDays(today, count)
    if (span[3]) return addDays(today, count * 7)
    return addMonths(today, count)
  }
  // "Now" comes last, so "abhi nahi, agle mahine" is next month.
  return now.test(text) && !notNow.test(text) ? today : null
}

/** The move date in the words of the person, as an ISO date, or null (PD7: code parses dates, not the model). `today` is the date in IST. */
export function parseMoveDate(words: string, today: string): string | null {
  const [y, m, d] = today.split('-').map(Number) as [number, number, number]
  const day = read(plainWords(words).trim(), { y, m, d })
  return day && valid(day) ? iso(day) : null
}
