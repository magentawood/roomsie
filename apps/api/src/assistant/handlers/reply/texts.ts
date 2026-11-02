import { slotPath, type Budget, type FormASlot, type LifestyleAxis } from '@roomsie/contract'
import type { Catalogue } from '../../catalogue'

/** The scripted lines of the reply writer, in English only, until T-13 writes replies with the model. */
export const replyLines = {
  failed: 'Sorry, I could not read that just now. Please send it again.',
  done: 'That is all I need for now. Have a look at the results.',
  helpPick: 'No stress. A room in a shared flat: your own room, the rest shared. A PG or hostel: meals often in, house rules always. '
    + 'A whole flat: all yours, rent and all. People to rent with: find your people first, then the place. Which one sounds like you?',
  conflict: (earlier: string, later: string) => `You said ${earlier} before, and now ${later}. Which one should I keep?`,
  ambiguous: (words: string, names: string[]) => `Which ${words} do you mean: ${names.join(', ')}, or ${names.length === 2 ? 'both' : 'all of them'}?`,
  weight: (label: string) => `Is ${label} a must, so I hide the places without it, or should I only show those places first?`,
  ack: (parts: string[]) => `Got it: ${parts.join(', ')}.`,
  /** The first lines of a turn that is not core (T-34). */
  noted: "Good question. I can't answer that one yet, but I've noted it.",
  outOfScope: "That one's outside what I can help with.",
  backToIt: (question: string) => `Back to it: ${question[0]!.toLowerCase()}${question.slice(1)}`,
  adversarial: "Let's get back to your search.",
  sensitive: "Thanks for telling me, and I'm sorry you're dealing with that.",
  danger: "If you're not safe right now, call 112, or Tele-MANAS on 14416 (free, 24x7).",
}

const questions: Partial<Record<FormASlot, string>> = {
  intent: 'What are you looking for: a room in a shared flat, a PG, a whole flat, or flatmates to rent with?',
  roomType: 'Do you want a private room or a shared room?',
  whosMoving: 'Who is moving: a student, someone in their first job, a working person, a couple, a family, or a group of friends?',
  areas: 'Which areas of Mumbai work for you?',
  budget: 'What is your monthly budget?',
  moveDate: 'When do you want to move in?',
}

export function questionFor(slot: FormASlot, catalogue: Catalogue) {
  const [group, key] = slotPath(slot)
  if (group === 'lifestyle') return catalogue.questions.get(key as LifestyleAxis) ?? `${key}?`
  if (group === 'mustHaves') return `Is ${catalogue.mustHaveLabels.get(key!) ?? key} a must for you?`
  return questions[slot]!
}

const intentText: Record<string, string> = { room: 'a room in a shared flat', pg: 'a PG', whole_flat: 'a whole flat', flatmates: 'flatmates to rent with' }
const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`
const budgetText = ({ min, max }: Budget) => (min != null && max != null ? `${rupees(min)} to ${rupees(max)}` : max != null ? `up to ${rupees(max)}` : `${rupees(min!)} or more`)
const dateText = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const humanize = (value: string) => value.replaceAll('_', ' ')

export function valueText(slot: FormASlot, value: unknown, catalogue: Catalogue): string {
  const [group, key] = slotPath(slot)
  switch (group) {
    case 'intent': return intentText[value as string]!
    case 'roomType': return `a ${humanize(value as string)} room`
    case 'areas': return (value as string[]).map((slug) => catalogue.bySlug.get(slug)?.name ?? slug).join(', ')
    case 'budget': return budgetText(value as Budget)
    case 'moveDate': return `from ${dateText(value as string)}`
    case 'lifestyle': return `${humanize(key!)}: ${humanize(value as string)}`
    case 'mustHaves': return `${catalogue.mustHaveLabels.get(key!) ?? key} (${value === 'dealbreaker' ? 'a must' : 'preferred'})`
    default: return humanize(value as string)
  }
}
