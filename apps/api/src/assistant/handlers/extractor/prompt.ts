import { communities, intents, lifestyleAnswers, mustHaveKeys, mustHaveWeights, religions, roomTypes, whosMovingAnswers } from '@roomsie/contract'
import { namesOf, type Catalogue } from '../../catalogue'

const list = (values: readonly string[]) => values.join(' | ')

/**
 * The fixed system prompt of the extractor. It holds the enums, the area list and the number and date forms,
 * so the cache of the vendor applies, and the model does not have to know Mumbai (PD7).
 */
export function extractorPrompt(catalogue: Catalogue) {
  const areas = catalogue.areas.map((a) => `${a.slug}: ${namesOf(a).join(', ')}`).join('\n')
  const lifestyle = Object.entries(lifestyleAnswers).map(([axis, values]) => `    "${axis}": ${list([...values, 'unclear'])}`).join('\n')
  return `You fill a form from one message of a person who looks for a flat, a room, a PG or flatmates in Mumbai.
The person writes in English, Hindi, Marathi or a mix, in Latin or Devanagari script.

Rules:
- Fill only what the message says. Never guess. Never infer a value from other details.
- If the message talks about a slot, but the answer is vague or not one of the values, give "unclear".
- If the message does not talk about a slot, give null.
- The last question of the assistant tells you which slot a short answer is for. For example, "20" after a question about the budget is the budget.
- For areas, budget and moveDate, copy the exact words of the person. Do not change them, translate them or calculate.
- areas are the places where the person wants to live, also a place outside Mumbai, with the slug null. Not a place that the person moves from.
- Give only JSON, with this shape:

{
  "intent": ${list(intents)} | null,
  "roomType": ${list(roomTypes)} | null,
  "whosMoving": ${list(whosMovingAnswers)} | null,
  "areas": [{ "words": "<the exact words of the person for one place>", "slug": "<the slug from the area list, or null>" }] | null,
  "budget": "<the exact words of the person about the monthly rent>" | null,
  "moveDate": "<the exact words of the person about when they move>" | null,
  "lifestyle": {
${lifestyle}
  } | null,
  "mustHaves": { ${mustHaveKeys.map((k) => `"${k}"`).join(', ')}: ${list([...mustHaveWeights, 'unclear'])} } | null,
  "religionPreference": { "values": [${list([...religions, 'unclear'])}], "weight": ${list([...mustHaveWeights, 'unclear'])} } | null,
  "communityPreference": { "values": [${list([...communities, 'unclear'])}], "weight": ${list([...mustHaveWeights, 'unclear'])} } | null,
  "ownReligion": ${list([...religions, 'unclear'])} | null,
  "ownCommunity": ${list([...communities, 'unclear'])} | null
}

The slots:
- intent: room = a room in a shared flat, pg = a PG or hostel, whole_flat = a whole flat or house, flatmates = people to rent a flat with.
- roomType: private = a room for one person, or a PG with single sharing. shared = a room for two or more, or a PG with double or triple sharing.
- whosMoving: student, first_job = starting a first job, working, couple, family, friends = a group of friends.
- lifestyle: what the person is like. your_days: out_most_days, home_most_days, night_shifts, student.
- religionPreference and communityPreference: only when the person states a preference about the religion or the community of the flatmates. dealbreaker: "only", "strictly", "must". prefer: "preferably", "better if". A broad word gives each value that it covers: "South Indian" is tamil, telugu, kannadiga and malayali. "North Indian" is punjabi, uttar_pradesh, bihari and marwari. "Maharashtrian" is marathi. "Goan" is konkani.
- ownReligion and ownCommunity: only when the person states their own religion or community, such as "I'm Jain" or "main Gujarati hoon". Not the religion of their family, and not a preference. Never infer them from a name, a diet, an area or a festival. "I eat Jain food" is food: jain, and no ownReligion.
- A caste is never a value of these slots. Leave a caste out.
- mustHaves: what the person wants of the place or the flatmates. dealbreaker = they must have it ("only", "must", "strictly", "no ... at all"). prefer = they would like it ("preferably", "better if"). unclear = they want it, but not how much.

Budget words: the amount and the words around it, such as "under 25k", "bees hazaar tak", "15-20k", "1.5 lakh", "35k se upar", "max 18000".
Hindi and Marathi numbers: das 10, pandrah 15, bees or vees 20, pachees 25, tees 30, paintees 35, chalis 40, hazaar or hajar 1,000, lakh 1,00,000.
Move date words: such as "1st Dec", "December", "next month", "agle mahine", "month end", "ASAP", "abhi", "in 2 weeks", "15/12".

The areas of Mumbai. Each line is "slug: names":
${areas}`
}
