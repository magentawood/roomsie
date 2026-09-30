/**
 * The nine lifestyle axes — PROVISIONAL NAMES.
 *
 * ⚠️  Engineering chose these. No planning document enumerates the nine; they
 *     are referenced in six docs and defined in none. These are a placeholder
 *     so T-06, T-08, T-12 and T-14 can be built against something real.
 *
 * Changing them is a seed edit and a re-seed. No migration. No backfill.
 * Add one, drop one, rename one, change its answers — all data, not schema.
 *
 * Grounding, such as it is:
 *   · `smoking`  appears by name in ai-agent-design.md §3
 *   · `guests`   appears as the example key `guest_frequency` in
 *                agent-architecture.md, and as the worked example
 *                "my ex basically lived there, that's what killed it"
 *   · `diet`     carries jain and eggetarian because the launch market is Mumbai
 *   · `community` exists because decision PD3c (2026-09-20) explicitly chose to
 *                record and filter on community and religion. It is the one
 *                axis with press exposure attached — see ai-agent-design.md
 *                §4.1, which documents that exposure at length. Dropping it is
 *                a one-line change here if that decision is revisited.
 *
 * Every axis is a CLOSED question, so the UI derives chips from allowedValues
 * (ai-agent-design.md §3: "suggestions on closed questions, never on open
 * ones"). The open questions that earn the product its existence are Form B
 * observations and are deliberately not here.
 */
export const LIFESTYLE_AXES = [
  {
    key: 'smoking',
    question: 'Smoking in the flat?',
    allowedValues: ['never', 'outside_only', 'fine_anywhere'],
    sortOrder: 1,
  },
  {
    key: 'drinking',
    question: 'Drinking at home?',
    allowedValues: ['never', 'occasionally', 'often'],
    sortOrder: 2,
  },
  {
    key: 'diet',
    question: 'Food in the kitchen?',
    allowedValues: ['vegetarian_only', 'eggetarian', 'jain', 'no_restriction'],
    sortOrder: 3,
  },
  {
    key: 'sleep_schedule',
    question: 'When does your day end?',
    allowedValues: ['early', 'average', 'late'],
    sortOrder: 4,
  },
  {
    key: 'guests',
    question: 'How often do guests stay over?',
    allowedValues: ['rarely', 'sometimes', 'often', 'partner_lives_here'],
    sortOrder: 5,
  },
  {
    key: 'cleanliness',
    question: 'How tidy do shared spaces need to be?',
    allowedValues: ['relaxed', 'average', 'very_tidy'],
    sortOrder: 6,
  },
  {
    key: 'work_from_home',
    question: 'Are you home during the working day?',
    allowedValues: ['rarely', 'some_days', 'most_days'],
    sortOrder: 7,
  },
  {
    key: 'pets',
    question: 'Pets in the flat?',
    allowedValues: ['none', 'have_one', 'happy_to_live_with', 'allergic'],
    sortOrder: 8,
  },
  {
    key: 'community',
    question: 'Any community or religious preference for who you live with?',
    allowedValues: ['no_preference', 'prefer_same', 'specific'],
    sortOrder: 9,
  },
] as const

export type LifestyleAxisKey = (typeof LIFESTYLE_AXES)[number]['key']
