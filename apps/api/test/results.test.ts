import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import { listingResponse, profileResponse, resultsResponse, type MatchResult, type ProfileEditBody } from '@roomsie/contract'
import { areas, chatTurns, goals, observations, users } from '../src/db/schema'
import { seedCatalogues } from '../src/db/seed-axes'
import { createTestAnalyticsDb, type TestAnalyticsDb } from './db'
import { testApp, type TestApp } from './app'
import { offlineStorage } from '../scripts/openapi'
import { events } from '../src/analytics/schema'

const stated = <V>(value: V) => ({ source: 'stated', value })
const idOf = (r: MatchResult) => (r.kind === 'person' ? r.card.id : r.listing.id)

async function search<U extends string>(t: TestApp<U>, who: U | null, form: object, page = 1) {
  const res = await t.call(who, 'POST', '/v1/results', { form, page })
  expect(res.statusCode).toBe(200)
  return resultsResponse.parse(res.json())
}

/** A live card with these answers. */
async function person<U extends string>(t: TestApp<U>, who: U, edit: ProfileEditBody, gender: 'male' | 'female' = 'female') {
  const made = profileResponse.parse((await t.call(who, 'POST', '/v1/me/profile', { fullName: `Card ${who}`, age: 25, gender })).json())
  const body = { intent: 'flatmates', whosMoving: 'working', areas: ['bandra'], budgetMin: 15000, budgetMax: 20000, moveDate: '2026-12-01', ...edit }
  expect((await t.call(who, 'PATCH', '/v1/me/profile', body)).statusCode).toBe(200)
  return made.id
}

const allAnswers = { food: 'veg', smoking: 'non_smoker', tidiness: 'very_tidy', drinks: 'none_at_home' } as const

describe('people', () => {
  type Who = 'seeker' | 'best' | 'twin' | 'lowNote' | 'pocket' | 'noDate' | 'twoPrefs' | 'picky' | 'quiet' | 'smoker' | 'strict'
    | 'far' | 'rich' | 'late' | 'roomie' | 'blocked' | 'suspended' | 'hidden'
  let t: TestApp<Who>
  const cards = {} as Record<Who, string>

  /** Flatmates in Bandra–Santacruz under 20k, moving on 1 December: no smokers, and three preferences. */
  const form = {
    intent: stated('flatmates'), areas: stated(['bandra-santacruz']), budget: stated({ min: null, max: 20000 }), moveDate: stated('2026-12-01'),
    lifestyle: { smoking: stated('non_smoker'), food: stated('veg'), drinks: stated('none_at_home') },
    mustHaves: { non_smokers: stated('dealbreaker'), veg_kitchen: stated('prefer'), tidy_flatmates: stated('prefer'), no_alcohol: stated('prefer') },
  }

  /** A note of a person on a topic, with its turn. */
  async function note(who: Who, kind: 'concern' | 'context', confidence: number) {
    const [goal] = await t.db.insert(goals).values({ userId: t.ids[who] }).returning()
    const [turn] = await t.db.insert(chatTurns).values({ goalId: goal!.id, role: 'user', inputMethod: 'typed', text: 'I need quiet' }).returning()
    await t.db.insert(observations).values({ userId: t.ids[who], key: 'noise', value: 'needs quiet', kind, evidence: 'I need quiet', turnId: turn!.id, confidence })
  }

  beforeAll(async () => {
    t = await testApp(['seeker', 'best', 'twin', 'lowNote', 'pocket', 'noDate', 'twoPrefs', 'picky', 'quiet', 'smoker', 'strict',
      'far', 'rich', 'late', 'roomie', 'blocked', 'suspended', 'hidden'])
    await seedCatalogues(t.db)
    cards.seeker = await person(t, 'seeker', { lifestyle: allAnswers }, 'male')
    // In this order: the newer card of two equal cards comes first.
    cards.best = await person(t, 'best', { lifestyle: allAnswers })
    cards.twin = await person(t, 'twin', { lifestyle: allAnswers })
    cards.lowNote = await person(t, 'lowNote', { lifestyle: allAnswers })
    cards.pocket = await person(t, 'pocket', { lifestyle: allAnswers, areas: ['pali-hill'], moveDate: '2026-12-10' })
    cards.noDate = await person(t, 'noDate', { lifestyle: allAnswers, moveDate: null })
    cards.twoPrefs = await person(t, 'twoPrefs', { lifestyle: { ...allAnswers, tidiness: 'relaxed_about_mess' } })
    cards.picky = await person(t, 'picky', { lifestyle: allAnswers, mustHaves: { tidy_flatmates: 'dealbreaker' } })
    cards.quiet = await person(t, 'quiet', { lifestyle: { food: 'veg' } })
    cards.smoker = await person(t, 'smoker', { lifestyle: { ...allAnswers, smoking: 'smoker' } })
    cards.strict = await person(t, 'strict', { lifestyle: allAnswers, mustHaves: { women_only: 'dealbreaker' } })
    cards.far = await person(t, 'far', { lifestyle: allAnswers, areas: ['andheri-west'] })
    cards.rich = await person(t, 'rich', { lifestyle: allAnswers, budgetMin: 25000, budgetMax: 30000 })
    cards.late = await person(t, 'late', { lifestyle: allAnswers, moveDate: '2027-02-01' })
    cards.roomie = await person(t, 'roomie', { lifestyle: allAnswers, intent: 'room' })
    cards.blocked = await person(t, 'blocked', { lifestyle: allAnswers })
    cards.suspended = await person(t, 'suspended', { lifestyle: allAnswers })
    cards.hidden = await person(t, 'hidden', { lifestyle: allAnswers, hidden: true })
    expect((await t.call('seeker', 'POST', '/v1/blocks', { id: uuidv7(), profileId: cards.blocked })).statusCode).toBe(204)
    await t.db.update(users).set({ status: 'suspended' }).where(eq(users.id, t.ids.suspended))
    await note('seeker', 'concern', 0.9)
    await note('twin', 'concern', 0.9)
    await note('lowNote', 'concern', 0.4)
  })
  afterAll(() => t.close())

  const nameOf = (id: string) => (Object.keys(cards) as Who[]).find((who) => cards[who] === id)

  it('gives the people who fit, in the Best Matches order, with the labels', async () => {
    const { results, total } = await search(t, 'seeker', form)
    expect(results.map((r) => nameOf(idOf(r)))).toEqual(['twin', 'lowNote', 'best', 'pocket', 'noDate', 'twoPrefs', 'picky', 'quiet'])
    expect(total).toBe(8)
    const labels = Object.fromEntries(results.map((r) => [nameOf(idOf(r)), [r.bestMatch, r.didntSay]]))
    // Picky has a rule that the searcher did not answer: not a full match, so no label.
    expect(labels).toMatchObject({ twin: [true, []], twoPrefs: [false, []], picky: [false, []], quiet: [false, ['non_smokers']] })
    expect(results.every((r) => r.kind === 'person')).toBe(true)
  })

  it('gives a guest the people whose rule the guest did not answer, below the full matches, and no Form B points', async () => {
    const { results } = await search(t, null, form)
    const names = results.map((r) => nameOf(idOf(r)))
    // With no Form B points, the newer of two equal cards comes first.
    expect(names.indexOf('lowNote')).toBeLessThan(names.indexOf('twin'))
    expect(names.indexOf('twin')).toBeLessThan(names.indexOf('best'))
    expect(names).toContain('strict')
    expect(names.indexOf('strict')).toBeGreaterThan(names.indexOf('twoPrefs'))
    // A guest has no blocks, and is not the seeker.
    expect(names).toEqual(expect.arrayContaining(['blocked', 'seeker']))
  })

  it('takes all of Mumbai for an empty area, and leaves out the people of a different place type', async () => {
    const { results } = await search(t, 'seeker', { ...form, areas: { source: 'empty', value: null } })
    const names = results.map((r) => nameOf(idOf(r)))
    expect(names).toContain('far')
    expect(names).not.toContain('roomie')
  })

  it('gives the second page, and the same total', async () => {
    expect(await search(t, 'seeker', form, 2)).toMatchObject({ results: [], total: 8, page: 2 })
  })

  it.each([
    ['an unclear intent', stated('unclear')],
    ['an empty intent', { source: 'empty', value: null }],
  ])('gives nothing to %s, with no suggested posts', async (_, intent) => {
    expect(await search(t, 'seeker', { ...form, intent })).toMatchObject({ results: [], total: 0, suggestions: [] })
  })
})

describe('the mapping of PD3a between people', () => {
  type Who = 'seeker' | 'veg' | 'jain' | 'nb' | 'wantsVeg' | 'wantsNonSmoker' | 'wantsDry' | 'wantsMen' | 'early' | 'tooEarly'
  let t: TestApp<Who>
  const cards = {} as Record<Who, string>
  const base = { intent: stated('flatmates'), areas: stated(['bandra']) }

  beforeAll(async () => {
    t = await testApp(['seeker', 'veg', 'jain', 'nb', 'wantsVeg', 'wantsNonSmoker', 'wantsDry', 'wantsMen', 'early', 'tooEarly'])
    await seedCatalogues(t.db)
    await person(t, 'seeker', {}, 'male')
    cards.veg = await person(t, 'veg', { lifestyle: { food: 'veg', tidiness: 'tidy_enough', drinks: 'none_at_home' } }, 'male')
    cards.jain = await person(t, 'jain', { lifestyle: { food: 'jain', tidiness: 'relaxed_about_mess', drinks: 'fine_at_home' } }, 'female')
    cards.nb = await person(t, 'nb', { lifestyle: { food: 'veg', tidiness: 'very_tidy', drinks: 'none_at_home' }, gender: 'non_binary' } as ProfileEditBody)
    cards.wantsVeg = await person(t, 'wantsVeg', { mustHaves: { veg_kitchen: 'dealbreaker' } })
    cards.wantsNonSmoker = await person(t, 'wantsNonSmoker', { mustHaves: { non_smokers: 'dealbreaker' } })
    cards.wantsDry = await person(t, 'wantsDry', { mustHaves: { no_alcohol: 'dealbreaker' } })
    cards.wantsMen = await person(t, 'wantsMen', { mustHaves: { men_only: 'dealbreaker' } })
    cards.early = await person(t, 'early', { moveDate: '2026-11-05' })
    cards.tooEarly = await person(t, 'tooEarly', { moveDate: '2026-10-25' })
  })
  afterAll(() => t.close())

  it.each([
    ['veg_kitchen', ['veg', 'nb'], ['jain']],
    ['tidy_flatmates', ['veg', 'nb'], ['jain']],
    ['no_alcohol', ['veg', 'nb'], ['jain']],
    ['men_only', ['veg'], ['jain', 'nb']],
    ['women_only', ['jain'], ['veg', 'nb']],
  ] as const)('a %s dealbreaker shows %j and hides %j', async (key, shown, hidden) => {
    const { results } = await search(t, 'seeker', { ...base, mustHaves: { [key]: stated('dealbreaker') } })
    const ids = results.map(idOf)
    for (const who of shown) expect(ids).toContain(cards[who])
    for (const who of hidden) expect(ids).not.toContain(cards[who])
  })

  it.each([
    ['wantsVeg', 'food', 'veg', 'non_veg'],
    ['wantsNonSmoker', 'smoking', 'non_smoker', 'smoker'],
    ['wantsDry', 'drinks', 'none_at_home', 'fine_at_home'],
  ] as const)('the dealbreaker of %s applies back to the %s answer of the searcher', async (who, axis, passes, fails) => {
    const ids = async (answer: string) => (await search(t, 'seeker', { ...base, lifestyle: { [axis]: stated(answer) } })).results.map(idOf)
    expect(await ids(passes)).toContain(cards[who])
    expect(await ids(fails)).not.toContain(cards[who])
  })

  it('applies a Men only dealbreaker back to the gender of the searcher', async () => {
    expect((await search(t, 'seeker', base)).results.map(idOf)).toContain(cards.wantsMen)
    expect((await search(t, 'jain', base)).results.map(idOf)).not.toContain(cards.wantsMen)
  })

  it('takes a move date up to 30 days before the date of the searcher, and not more', async () => {
    const ids = (await search(t, 'seeker', { ...base, moveDate: stated('2026-12-01') })).results.map(idOf)
    expect(ids).toContain(cards.early)
    expect(ids).not.toContain(cards.tooEarly)
  })

  it('counts only the preferences that apply to a person for Best match', async () => {
    const labelOf = async (third: string) => (await search(t, 'seeker', {
      ...base, mustHaves: { veg_kitchen: stated('prefer'), tidy_flatmates: stated('prefer'), [third]: stated('prefer') },
    })).results.find((r) => idOf(r) === cards.veg)!.bestMatch
    expect(await labelOf('no_alcohol')).toBe(true)
    // "Couple friendly" does not apply to a person, so only two preferences count.
    expect(await labelOf('couple_friendly')).toBe(false)
  })

  it('gives no Best match label for fewer than three preferences', async () => {
    const { results } = await search(t, 'seeker', { ...base, mustHaves: { veg_kitchen: stated('prefer'), tidy_flatmates: stated('prefer') } })
    expect(results.find((r) => idOf(r) === cards.veg)!.bestMatch).toBe(false)
  })
})

describe('listings', () => {
  type Who = 'lister' | 'seeker' | 'she' | 'nb'
  let t: TestApp<Who>
  const ids = {} as Record<string, string>

  async function listing(name: string, kind: string, fields: object) {
    const made = listingResponse.parse((await t.call('lister', 'POST', '/v1/listings', { kind })).json())
    expect((await t.call('lister', 'PATCH', `/v1/listings/${made.id}`, { areaSlug: 'bandra', ...fields })).statusCode).toBe(200)
    expect((await t.call('lister', 'POST', `/v1/listings/${made.id}/status`, { status: 'live' })).statusCode).toBe(200)
    ids[name] = made.id
  }

  /** A private room in Bandra under 20k from 1 December, with a veg kitchen. */
  const form = {
    intent: stated('room'), roomType: stated('private'), areas: stated(['bandra']), budget: stated({ min: null, max: 20000 }),
    moveDate: stated('2026-12-01'), mustHaves: { veg_kitchen: stated('dealbreaker') },
  }
  const room = { roomType: 'private', vegOnlyKitchen: true, availableFrom: '2026-12-01', rates: [{ rent: 19000 }] }

  beforeAll(async () => {
    t = await testApp(['lister', 'seeker', 'she', 'nb'])
    await seedCatalogues(t.db)
    await person(t, 'seeker', {}, 'male')
    await person(t, 'she', {}, 'female')
    await person(t, 'nb', { gender: 'non_binary' } as ProfileEditBody)
    await listing('inBudget', 'room_in_flat', room)
    await listing('leeway', 'room_in_flat', { ...room, rates: [{ rent: 21500 }] })
    await listing('tooDear', 'room_in_flat', { ...room, rates: [{ rent: 23000 }] })
    await listing('nonVeg', 'room_in_flat', { ...room, vegOnlyKitchen: false })
    await listing('noKitchenRule', 'room_in_flat', { ...room, vegOnlyKitchen: null })
    await listing('women', 'room_in_flat', { ...room, whoCanMoveIn: 'women' })
    await listing('shared', 'room_in_flat', { ...room, roomType: 'shared' })
    await listing('later', 'room_in_flat', { ...room, availableFrom: '2027-03-01' })
    await listing('pg', 'pg', { pgName: 'Shanti PG', vegOnlyKitchen: true, sharing: ['single', 'double'], rates: [{ sharing: 'single', rent: 30000 }, { sharing: 'double', rent: 15000 }] })
    await listing('ownerFlat', 'owner_flat', { vegOnlyKitchen: true, rates: [{ rent: 19000 }] })
    await listing('brokerFlat', 'broker_flat', { vegOnlyKitchen: true, brokerage: 19000, rates: [{ rent: 19000 }] })
    const flat = { rates: [{ rent: 19000 }], smokingAllowed: false, alcoholAllowed: false }
    await listing('smokers', 'owner_flat', { ...flat, smokingAllowed: true })
    await listing('drinkers', 'owner_flat', { ...flat, alcoholAllowed: true })
    await listing('families', 'owner_flat', { ...flat, whoIsWelcome: ['families'] })
    await listing('workers', 'owner_flat', { ...flat, whoIsWelcome: ['working_professionals'] })
    await listing('couples', 'owner_flat', { ...flat, whoIsWelcome: ['couples'] })
  })
  afterAll(() => t.close())

  const names = (results: MatchResult[]) => results.map((r) => Object.keys(ids).find((name) => ids[name] === idOf(r)))

  it('gives the rooms that fit: in budget first, then the 10% leeway, then a house rule that the lister did not give', async () => {
    const { results } = await search(t, 'seeker', form)
    expect(names(results)).toEqual(['inBudget', 'leeway', 'noKitchenRule'])
    expect(results.every((r) => r.kind === 'listing')).toBe(true)
    expect(results.at(-1)!.didntSay).toEqual(['veg_kitchen'])
  })

  it('checks "Who can move in" against the gender of the searcher, and puts it below for a guest', async () => {
    // The newer of two equal rooms comes first.
    expect(names((await search(t, 'she', form)).results)).toEqual(['women', 'inBudget', 'leeway', 'noKitchenRule'])
    const guest = names((await search(t, null, form)).results)
    expect(guest.slice(0, 2)).toEqual(['inBudget', 'leeway'])
    expect(guest).toContain('women')
  })

  it('counts only the Single rent of a PG for a private seeker', async () => {
    const pgForm = { ...form, intent: stated('pg') }
    expect(names((await search(t, 'seeker', pgForm)).results)).toEqual([])
    expect(names((await search(t, 'seeker', { ...pgForm, roomType: stated('shared') })).results)).toEqual(['pg'])
  })

  const flats = { intent: stated('whole_flat'), areas: stated(['bandra']) }

  it('gives owner flats and broker flats to a whole-flat seeker', async () => {
    const { results } = await search(t, 'seeker', flats)
    expect(names(results).sort()).toEqual(['brokerFlat', 'couples', 'drinkers', 'families', 'ownerFlat', 'smokers', 'workers'])
  })

  it.each([
    ['non_smokers', 'smokers'],
    ['no_alcohol', 'drinkers'],
  ] as const)('a %s dealbreaker needs the house rule, so it hides %s', async (key, hidden) => {
    const shown = names((await search(t, 'seeker', { ...flats, mustHaves: { [key]: stated('dealbreaker') } })).results)
    expect(shown).not.toContain(hidden)
    expect(shown).toContain('workers')
  })

  it('a couple-friendly dealbreaker needs Couples in "Who is welcome", and an empty list is a gap', async () => {
    const { results } = await search(t, 'seeker', { ...flats, mustHaves: { couple_friendly: stated('dealbreaker') } })
    expect(names(results)[0]).toBe('couples')
    expect(names(results)).not.toContain('families')
    expect(results.find((r) => idOf(r) === ids.ownerFlat)!.didntSay).toEqual(['couple_friendly'])
  })

  it.each([
    ['working', ['workers'], ['families', 'couples']],
    ['family', ['families', 'workers'], ['couples']],
    ['student', [], ['families', 'workers', 'couples']],
  ] as const)('"Who is welcome" lets a %s seeker see %j and not %j (PD15)', async (whosMoving, shown, hidden) => {
    const found = names((await search(t, 'seeker', { ...flats, whosMoving: stated(whosMoving) })).results)
    for (const name of shown) expect(found).toContain(name)
    for (const name of hidden) expect(found).not.toContain(name)
    expect(found).toContain('ownerFlat')
  })

  it('never shows a searcher their own listings', async () => {
    expect((await search(t, 'lister', form)).results).toEqual([])
  })

  it('shows a non-binary searcher only the listings open to all', async () => {
    expect(names((await search(t, 'nb', form)).results)).not.toContain('women')
  })
})

describe('the suggested posts and the event', () => {
  type Who = 'seeker' | 'dearer' | 'neighbour' | 'n2' | 'n3' | 'n4' | 'n5' | 'dadar' | 'worli' | 'rich'
  let t: TestApp<Who>
  let analytics: TestAnalyticsDb
  const cards = {} as Record<Who, string>
  const form = { intent: stated('flatmates'), areas: stated(['bandra-santacruz']), budget: stated({ min: null, max: 15000 }) }

  beforeAll(async () => {
    analytics = await createTestAnalyticsDb()
    t = await testApp(['seeker', 'dearer', 'neighbour', 'n2', 'n3', 'n4', 'n5', 'dadar', 'worli', 'rich'], offlineStorage, {}, analytics.db)
    await seedCatalogues(t.db)
    await t.db.update(areas).set({ neighbours: ['andheri-goregaon', 'dadar-sion', 'lower-parel-worli'] }).where(eq(areas.slug, 'bandra-santacruz'))
    cards.dearer = await person(t, 'dearer', { budgetMin: 18000, budgetMax: 22000, moveDate: null })
    const near = { budgetMin: 10000, budgetMax: 14000, moveDate: null }
    // Four cards at most: the newest four of these five.
    cards.neighbour = await person(t, 'neighbour', { ...near, areas: ['andheri-west'] })
    for (const who of ['n2', 'n3', 'n4', 'n5'] as const) cards[who] = await person(t, who, { ...near, areas: ['andheri-west'] })
    cards.dadar = await person(t, 'dadar', { ...near, areas: ['dadar-west'] })
    cards.worli = await person(t, 'worli', { ...near, areas: ['worli'] })
    cards.rich = await person(t, 'rich', { areas: ['lower-parel'], budgetMin: 40000, budgetMax: 50000, moveDate: null })
  })
  afterAll(async () => {
    await t.close()
    await analytics.drop()
  })

  it('gives the next budget band and the neighbouring area group of an empty search, each with its cards', async () => {
    const { results, suggestions } = await search(t, 'seeker', form)
    expect(results).toEqual([])
    // Two neighbours at most: Lower Parel–Worli is the third.
    expect(suggestions.map((s) => [s.relaxed, s.results.map(idOf)])).toEqual([
      [{ kind: 'budget', max: 25000 }, [cards.dearer]],
      [{ kind: 'area', area: 'andheri-goregaon' }, [cards.n5, cards.n4, cards.n3, cards.n2]],
      [{ kind: 'area', area: 'dadar-sion' }, [cards.dadar]],
    ])
  })

  it('gives "above 35k", with no maximum, as the next band of "under 35k"', async () => {
    const { suggestions } = await search(t, 'seeker', { ...form, areas: stated(['lower-parel']), budget: stated({ min: null, max: 35000 }) })
    expect(suggestions.find((s) => s.relaxed.kind === 'budget')).toEqual({ relaxed: { kind: 'budget', max: null }, results: [expect.objectContaining({ kind: 'person' })] })
    expect(idOf(suggestions[0]!.results[0]!)).toBe(cards.rich)
  })

  it('has no next band above 35k', async () => {
    const { suggestions } = await search(t, 'seeker', { ...form, budget: stated({ min: 40000, max: null }) })
    expect(suggestions.map((s) => s.relaxed.kind)).not.toContain('budget')
  })

  it('fires one "results shown" event for each page, with its count', async () => {
    await t.flushEvents()
    await analytics.db.delete(events)
    await search(t, 'seeker', { ...form, budget: stated({ min: null, max: 25000 }) })
    await search(t, 'seeker', { ...form, budget: stated({ min: null, max: 25000 }) }, 2)
    await t.flushEvents()
    const rows = await analytics.db.select().from(events).where(eq(events.name, 'results_shown'))
    expect(rows.map((r) => [r.name, r.fields])).toEqual([['results_shown', { count: 1 }], ['results_shown', { count: 0 }]])
  })
})
