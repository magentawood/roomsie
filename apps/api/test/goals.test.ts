import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { goalResponse, newGoalResponse, turnResponse, visitorKeyHeader } from '@roomsie/contract'
import { events as eventRows } from '../src/analytics/schema'
import { anonymousSessions, areas, chatTurns, goals } from '../src/db/schema'
import { seedCatalogues } from '../src/db/seed-axes'
import { testApp, type TestApp } from './app'
import { createTestAnalyticsDb, type TestAnalyticsDb } from './db'
import { answer, fakeVendors, keys } from './vendors'

/**
 * A DeepSeek answer with one token for each character. Each value in `unsure` gets that probability on its first character,
 * so the probability of the value is that number.
 */
function scored(fields: object, unsure: Record<string, number> = {}) {
  const content = JSON.stringify(fields)
  const tokens = [...content].map((token) => ({ token, logprob: 0 }))
  for (const [value, probability] of Object.entries(unsure)) tokens[content.indexOf(`"${value}"`) + 1]!.logprob = Math.log(probability)
  return answer(content, undefined, tokens)
}

let t: TestApp<'asha' | 'ravi'>
let analytics: TestAnalyticsDb
beforeAll(async () => {
  analytics = await createTestAnalyticsDb()
  t = await testApp(['asha', 'ravi'], undefined, keys, analytics.db)
  await seedCatalogues(t.db)
})
afterAll(async () => {
  await t.close()
  await analytics.drop()
})
afterEach(() => { vi.unstubAllGlobals() })

/** A visitor: the key that the API gave, sent in its header. */
async function visitorGoal() {
  const res = await t.call(null, 'POST', '/v1/goals')
  expect(res.statusCode).toBe(201)
  const goal = newGoalResponse.parse(res.json())
  expect(goal.visitorKey).toEqual(expect.any(String))
  return { id: goal.id, key: goal.visitorKey! }
}
const send = (goal: { id: string; key: string }, text: string) =>
  t.app.inject({ method: 'POST', url: `/v1/goals/${goal.id}/turns`, payload: { text }, headers: { [visitorKeyHeader]: goal.key } })
const sent = async (goal: { id: string; key: string }, text: string) => {
  const res = await send(goal, text)
  expect(res.statusCode).toBe(200)
  return turnResponse.parse(res.json())
}
const startedEvents = async () => {
  await t.flushEvents()
  return (await analytics.db.select().from(eventRows).where(eq(eventRows.name, 'interview_started'))).length
}

describe('the goals of visitors and users', () => {
  it('gives a visitor a key, and only that key opens the goal', async () => {
    const goal = await visitorGoal()
    const other = await visitorGoal()
    const read = (key?: string) => t.app.inject({ method: 'GET', url: `/v1/goals/${goal.id}`, headers: key ? { [visitorKeyHeader]: key } : {} })
    expect((await read(goal.key)).statusCode).toBe(200)
    expect((await read()).statusCode).toBe(404)
    expect((await read(other.key)).statusCode).toBe(404)
    expect((await read('a-made-up-key')).statusCode).toBe(404)
    expect((await t.call('asha', 'GET', `/v1/goals/${goal.id}`)).statusCode).toBe(404)
  })

  it('gives the goal of a signed-in person to the person, with no visitor key', async () => {
    const res = await t.call('asha', 'POST', '/v1/goals')
    const goal = newGoalResponse.parse(res.json())
    expect(goal.visitorKey).toBeNull()
    expect((await t.call('asha', 'GET', `/v1/goals/${goal.id}`)).statusCode).toBe(200)
    expect((await t.call('ravi', 'GET', `/v1/goals/${goal.id}`)).statusCode).toBe(404)
  })

  it('makes a goal in the same session when the visitor sends the key', async () => {
    const first = await visitorGoal()
    const res = await t.app.inject({ method: 'POST', url: '/v1/goals', headers: { [visitorKeyHeader]: first.key } })
    expect(newGoalResponse.parse(res.json()).visitorKey).toBeNull()
  })
})

describe('a typed turn', () => {
  it('fills Form A from the words of the person, saves the two turns, and asks the next question', async () => {
    const requests = fakeVendors({ deepseek: [scored({ intent: 'room', areas: [{ words: 'Powai', slug: 'powai' }], budget: 'bees hazaar tak', moveDate: '1st Dec' })] })
    const goal = await visitorGoal()
    const before = await startedEvents()
    const { form, turns } = await sent(goal, 'Powai mein room chahiye, bees hazaar tak, 1st Dec se')
    expect(form).toMatchObject({
      intent: { source: 'stated', value: 'room' },
      areas: { source: 'stated', value: ['powai'] },
      budget: { source: 'stated', value: { min: null, max: 20_000 } },
      moveDate: { source: 'stated', value: '2026-12-01' },
      roomType: { source: 'empty' },
    })
    expect(turns.map((turn) => turn.role)).toEqual(['user', 'assistant'])
    expect(turns[1].text).toBe('Got it: a room in a shared flat, Powai, up to ₹20,000, from 1 Dec 2026. What do you eat?')

    const body = requests[0]!.body as { logprobs: boolean; messages: { role: string; content: string }[] }
    expect(body.logprobs).toBe(true)
    expect(body.messages[0]!.content).toContain('powai: Powai')
    expect(body.messages[0]!.content).toContain('bees or vees 20')
    expect(body.messages[1]).toEqual({ role: 'user', content: 'Message of the person: Powai mein room chahiye, bees hazaar tak, 1st Dec se' })
    expect(await startedEvents()).toBe(before + 1)

    // A reload shows the chat and the form.
    const reloaded = goalResponse.parse((await t.app.inject({ method: 'GET', url: `/v1/goals/${goal.id}`, headers: { [visitorKeyHeader]: goal.key } })).json())
    expect(reloaded.turns.map((turn) => turn.text)).toEqual(turns.map((turn) => turn.text))
    expect(reloaded.form).toEqual(form)

    // The next turn gets the last question, and is not the start of an interview.
    const next = fakeVendors({ deepseek: [scored({ lifestyle: { food: 'veg' } })] })
    expect((await sent(goal, 'veg')).form.lifestyle.food).toEqual({ source: 'stated', value: 'veg' })
    expect((next[0]!.body as { messages: { content: string }[] }).messages[1]!.content).toBe('Last question of the assistant: What do you eat?\nMessage of the person: veg')
    expect(await startedEvents()).toBe(before + 1)
  })

  it('makes a value with a low token probability unclear, and asks again', async () => {
    fakeVendors({ deepseek: [scored({ intent: 'pg', lifestyle: { food: 'eggetarian' } }, { eggetarian: 0.55 })] })
    const goal = await visitorGoal()
    const { form, turns } = await sent(goal, 'PG chahiye, mostly veg, kabhi kabhi eggs')
    expect(form.intent).toEqual({ source: 'stated', value: 'pg' })
    expect(form.lifestyle.food).toEqual({ source: 'stated', value: 'unclear' })
    expect(turns[1].text).toBe('Got it: a PG. Which areas of Mumbai work for you?')
  })

  it('makes a value unclear, and reports it, when the tokens of DeepSeek do not hold it', async () => {
    fakeVendors({ deepseek: [answer(JSON.stringify({ intent: 'room' }), undefined, [{ token: '{"intent":"flat"}', logprob: 0 }])] })
    const goal = await visitorGoal()
    expect((await sent(goal, 'room chahiye')).form.intent).toEqual({ source: 'stated', value: 'unclear' })
  })

  it('reads a budget in Devanagari', async () => {
    fakeVendors({ deepseek: [scored({ budget: 'बीस हज़ार तक' })] })
    const goal = await visitorGoal()
    expect((await sent(goal, 'बजट बीस हज़ार तक')).form.budget.value).toEqual({ min: null, max: 20_000 })
  })

  it('keeps the values of Gemini, which gives no probabilities', async () => {
    fakeVendors({ deepseek: [new Response('busy', { status: 503 })], gemini: [answer(JSON.stringify({ lifestyle: { food: 'eggetarian' } }))] })
    const goal = await visitorGoal()
    expect((await sent(goal, 'mostly veg, kabhi kabhi eggs')).form.lifestyle.food).toEqual({ source: 'stated', value: 'eggetarian' })
  })

  it('fills no slot from words that are not in the turn, or from an unsure area', async () => {
    fakeVendors({ deepseek: [scored({ budget: '25k', moveDate: 'next month', areas: [{ words: 'near the station', slug: 'dadar' }] }, { dadar: 0.3 })] })
    const goal = await visitorGoal()
    const { form } = await sent(goal, 'something near the station, cheap, soon')
    expect([form.budget.source, form.moveDate.source, form.areas.source]).toEqual(['empty', 'empty', 'empty'])
  })

  it('asks which area a name of two areas means, and reads the answer', async () => {
    fakeVendors({ deepseek: [scored({ areas: [{ words: 'Andheri', slug: 'andheri-west' }] })] })
    const goal = await visitorGoal()
    const first = await sent(goal, 'Andheri mein room')
    expect(first.form.areas.source).toBe('empty')
    expect(first.turns[1].text).toBe('Which Andheri do you mean: Andheri West, Andheri East, or both?')
    fakeVendors({ deepseek: [scored({ areas: [{ words: 'both', slug: 'andheri-west' }, { words: 'both', slug: 'andheri-east' }] })] })
    expect((await sent(goal, 'both')).form.areas.value).toEqual(['andheri-west', 'andheri-east'])
  })

  it('takes a slug of the model only from an area named in the turn, or in a question about the areas', async () => {
    const goal = await visitorGoal()
    // A reply that names Bandra West, but asks about the budget.
    await t.db.insert(chatTurns).values({ goalId: goal.id, role: 'assistant', text: 'Got it: Bandra West. What is your monthly budget?', parts: { version: 1, asked: { slot: 'budget', conflict: false } } })
    fakeVendors({ deepseek: [scored({ areas: [{ words: 'there', slug: 'bandra-west' }] })] })
    expect((await sent(goal, 'somewhere there')).form.areas.source).toBe('empty')
  })

  it('asks about a name of two areas in longer words, and about each such name of the turn', async () => {
    fakeVendors({ deepseek: [scored({ areas: [{ words: 'Andheri station', slug: 'andheri-west' }] })] })
    const station = await sent(await visitorGoal(), 'Andheri station ke paas')
    expect(station.form.areas.source).toBe('empty')
    expect(station.turns[1].text).toBe('Which Andheri do you mean: Andheri West, Andheri East, or both?')
    fakeVendors({ deepseek: [scored({ areas: [{ words: 'Andheri', slug: 'andheri-west' }, { words: 'Goregaon', slug: 'goregaon-west' }] })] })
    const two = await sent(await visitorGoal(), 'Andheri ya Goregaon')
    expect(two.turns[1].text).toBe('Which Andheri do you mean: Andheri West, Andheri East, or both? Which Goregaon do you mean: Goregaon West, Goregaon East, or both?')
  })

  it('seeds a Devanagari name for each area', async () => {
    const rows = await t.db.select({ slug: areas.slug, aliases: areas.aliases }).from(areas)
    // Only the test fixtures have no aliases.
    expect(rows.filter((r) => r.aliases.length && !r.aliases.some((a) => /\p{Script=Devanagari}/u.test(a))).map((r) => r.slug)).toEqual([])
  })

  it('reads an area name in Devanagari, with or without a nukta', async () => {
    fakeVendors({ deepseek: [scored({ areas: [{ words: 'पवई', slug: 'powai' }] }), scored({ areas: [{ words: 'सांताक्रूज़', slug: 'santacruz-west' }] })] })
    expect((await sent(await visitorGoal(), 'पवई में रूम चाहिए')).form.areas.value).toEqual(['powai'])
    expect((await sent(await visitorGoal(), 'सांताक्रूज़ में')).turns[1].text).toBe('Which सांताक्रूज do you mean: Santacruz West, Santacruz East, or both?')
  })

  it('reads an area name with a Marathi ending', async () => {
    fakeVendors({ deepseek: [scored({ areas: [{ words: 'पवईत', slug: 'powai' }] }), scored({ areas: [{ words: 'अंधेरीत', slug: 'andheri-west' }] }), scored({ areas: [{ words: 'ठाण्यात', slug: 'thane-west' }] })] })
    expect((await sent(await visitorGoal(), 'पवईत रूम हवी')).form.areas.value).toEqual(['powai'])
    expect((await sent(await visitorGoal(), 'मला अंधेरीत रूम हवी')).turns[1].text).toBe('Which अंधेरी do you mean: Andheri West, Andheri East, or both?')
    expect((await sent(await visitorGoal(), 'ठाण्यात रूम')).turns[1].text).toBe('Which ठाणे do you mean: Thane, Thane West, Thane East, or all of them?')
  })

  it('fills no budget or move date from words with a low token probability', async () => {
    fakeVendors({ deepseek: [scored({ budget: '25k', moveDate: 'next month' }, { '25k': 0.3, 'next month': 0.4 })] })
    const { form } = await sent(await visitorGoal(), 'shayad 25k, next month maybe')
    expect([form.budget.source, form.moveDate.source]).toEqual(['empty', 'empty'])
  })

  it('makes each value unclear, and reports it, when DeepSeek gives no token probabilities', async () => {
    fakeVendors({ deepseek: [answer(JSON.stringify({ intent: 'room' }))] })
    expect((await sent(await visitorGoal(), 'room chahiye')).form.intent).toEqual({ source: 'stated', value: 'unclear' })
  })

  it('adds a new area to the areas of the form', async () => {
    fakeVendors({ deepseek: [scored({ areas: [{ words: 'Powai', slug: 'powai' }] }), scored({ areas: [{ words: 'Bandra West', slug: 'bandra-west' }] })] })
    const goal = await visitorGoal()
    await sent(goal, 'Powai')
    expect((await sent(goal, 'Bandra West bhi chalega')).form.areas.value).toEqual(['powai', 'bandra-west'])
  })

  it('keeps an earlier value that a new value contradicts, asks which to keep, and records the conflict', async () => {
    const earlier = fakeVendors({ deepseek: [scored({ budget: '20k' }), scored({ budget: '25k' })] })
    const goal = await visitorGoal()
    await sent(goal, 'budget 20k')
    await t.flushEvents()
    const before = (await analytics.db.select().from(eventRows).where(eq(eventRows.name, 'slot_conflict'))).length
    const second = await sent(goal, 'actually 25k')
    expect(second.form.budget.value).toEqual({ min: null, max: 20_000 })
    expect(second.turns[1].text).toBe('You said up to ₹20,000 before, and now up to ₹25,000. Which one should I keep?')
    await t.flushEvents()
    const conflicts = await analytics.db.select({ fields: eventRows.fields }).from(eventRows).where(eq(eventRows.name, 'slot_conflict'))
    expect(conflicts).toHaveLength(before + 1)
    expect(conflicts.at(-1)!.fields).toEqual({ slot: 'budget' })
    // An answer that settles nothing gets the question again. The extractor reads only the question, not the line before it.
    const requests = fakeVendors({ deepseek: [scored({}), scored({ budget: '25k' })] })
    const unclear = await sent(goal, 'hmm')
    expect(unclear.form.budget.value).toEqual({ min: null, max: 20_000 })
    expect(unclear.turns[1].text).toBe('You said up to ₹20,000 before, and now up to ₹25,000. Which one should I keep?')
    // The answer to the question replaces the earlier value.
    expect((await sent(goal, '25k')).form.budget.value).toEqual({ min: null, max: 25_000 })
    expect((requests[1]!.body as { messages: { content: string }[] }).messages[1]!.content).toContain('Which one should I keep?')
    // The reply to "budget 20k" began with "Got it: up to ₹20,000.", and the extractor of the next turn did not get that line.
    expect((earlier[1]!.body as { messages: { content: string }[] }).messages[1]!.content).not.toContain('Got it')
  })

  it('asks about each conflict of a turn, and reads "doosra wala" or "pehla" as the answer', async () => {
    fakeVendors({ deepseek: [scored({ intent: 'pg', budget: '20k' }), scored({ intent: 'whole_flat', budget: '30k' }), scored({})] })
    const goal = await visitorGoal()
    await sent(goal, 'PG, 20k')
    const both = await sent(goal, 'whole flat, 30k')
    expect(both.turns[1].text).toBe('You said a PG before, and now a whole flat. Which one should I keep? You said up to ₹20,000 before, and now up to ₹30,000. Which one should I keep?')
    const later = await sent(goal, 'doosra wala')
    expect([later.form.intent.value, later.form.budget.value]).toEqual(['whole_flat', { min: null, max: 30_000 }])

    fakeVendors({ deepseek: [scored({ budget: '20k' }), scored({ budget: '25k' }), scored({})] })
    const other = await visitorGoal()
    await sent(other, '20k')
    await sent(other, '25k')
    const earlier = await sent(other, 'pehla wala')
    expect(earlier.form.budget.value).toEqual({ min: null, max: 20_000 })
    expect(earlier.turns[1].text).not.toContain('Which one should I keep?')
  })

  it('fills the other budget bound with no conflict', async () => {
    fakeVendors({ deepseek: [scored({ budget: 'under 25k' }), scored({ budget: 'min 15k' })] })
    const goal = await visitorGoal()
    await sent(goal, 'under 25k')
    expect((await sent(goal, 'min 15k')).form.budget.value).toEqual({ min: 15_000, max: 25_000 })
  })

  it('asks the weight of a must-have at once when it is unclear', async () => {
    fakeVendors({ deepseek: [scored({ mustHaves: { veg_kitchen: 'unclear' } })] })
    const goal = await visitorGoal()
    const { form, turns } = await sent(goal, 'veg kitchen chahiye')
    expect(form.mustHaves.veg_kitchen).toEqual({ source: 'stated', value: 'unclear' })
    expect(turns[1].text).toBe('Is Veg kitchen a must, so I hide the places without it, or should I only show those places first?')
  })

  it('saves the turn and keeps the form when no model answers', async () => {
    fakeVendors({ deepseek: [new Response('down', { status: 500 })], gemini: [new Response('down', { status: 500 })] })
    const goal = await visitorGoal()
    const { form, turns } = await sent(goal, 'Powai, 20k')
    expect(form.areas.source).toBe('empty')
    expect(turns[1].text).toBe('Sorry, I could not read that just now. Please send it again.')
  })

  it('refuses a visitor key after its session expired', async () => {
    const goal = await visitorGoal()
    const [row] = await t.db.select({ session: goals.anonymousSessionId }).from(goals).where(eq(goals.id, goal.id))
    await t.db.update(anonymousSessions).set({ expiresAt: new Date(Date.now() - 1_000) }).where(eq(anonymousSessions.id, row!.session!))
    expect((await send(goal, 'PG chahiye')).statusCode).toBe(404)
  })

  it('refuses the second of two turns at the same time with 409, and saves the first', async () => {
    const goal = await visitorGoal()
    let release = () => {}
    const gate = new Promise<void>((resolve) => { release = resolve })
    vi.stubGlobal('fetch', async () => {
      await gate
      return scored({ intent: 'pg' })
    })
    const both = Promise.all([send(goal, 'PG'), send(goal, 'PG')])
    // Both turns read the goal, then wait for the model.
    await new Promise((resolve) => setTimeout(resolve, 100))
    release()
    expect((await both).map((res) => res.statusCode).sort()).toEqual([200, 409])
  })

  it('refuses a turn to a goal of a different person', async () => {
    const goal = await visitorGoal()
    const res = await t.app.inject({ method: 'POST', url: `/v1/goals/${goal.id}/turns`, payload: { text: 'hi' } })
    expect(res.statusCode).toBe(404)
  })
})
