import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { newGoalResponse, turnResponse, visitorKeyHeader } from '@roomsie/contract'
import { passesCheck } from '../src/assistant/handlers/composer/check'
import { fixedLines } from '../src/assistant/lines'
import lines from '../src/assistant/lines.json'
import { seedCatalogues } from '../src/db/seed-axes'
import { testApp, type TestApp } from './app'
import { answer, down, fakeVendors, hang, intentQuestion, keys, room, roomAck, routed, scored, sentMessageOf } from './vendors'

let t: TestApp<'asha'>
beforeAll(async () => {
  // A short deadline keeps the test of a late composer fast. Two questions reach the last line soon.
  t = await testApp(['asha'], undefined, { ...keys, COMPOSER_DEADLINE_MS: '300', ASSISTANT_QUESTION_ORDER: 'intent,areas' })
  await seedCatalogues(t.db)
})
afterAll(async () => { await t.close() })
afterEach(() => { vi.unstubAllGlobals() })

type Goal = { id: string; key: string }
async function visitorGoal(): Promise<Goal> {
  const goal = newGoalResponse.parse((await t.app.inject({ method: 'POST', url: '/v1/goals' })).json())
  return { id: goal.id, key: goal.visitorKey! }
}
async function send(goal: Goal, payload: object) {
  const res = await t.app.inject({ method: 'POST', url: `/v1/goals/${goal.id}/turns`, payload, headers: { [visitorKeyHeader]: goal.key } })
  expect(res.statusCode).toBe(200)
  const { turns, form } = turnResponse.parse(res.json())
  return { reply: turns[1]!, form }
}

const hinglish = { language: 'hindi', script: 'latin' }
const composed = (...replies: Parameters<typeof answer>[0][]) => ({ composer: { deepseek: replies.map((text) => answer(JSON.stringify({ text }))) } })
/** The scripted reply of the message "room chahiye": its text, its chips and its form. */
const expectScripted = ({ reply, form }: Awaited<ReturnType<typeof send>>) => {
  expect(reply).toMatchObject({ text: roomAck, chips: 'areas' })
  expect(form.intent).toEqual({ source: 'stated', value: 'room' })
}

describe('the fixed lines', () => {
  it('gives an off-topic message in Hinglish the Hinglish line, then the question in English, with no composer call', async () => {
    const requests = fakeVendors({ deepseek: [room()], ...routed({ kinds: [], band: 'out_of_scope', register: hinglish }) })
    const { reply } = await send(await visitorGoal(), { text: 'ek poem likho na' })
    expect(reply.text).toBe('Yeh roomsie ke kaam se bahar hai. Wapas aapki search par: what are you looking for: a room in a shared flat, a PG, a whole flat, or flatmates to rent with?')
    expect(requests.composer).toEqual([])
  })

  it('hands a legal question in Marathi off to a real source, then asks the question again', async () => {
    fakeVendors({ deepseek: [room()], ...routed({ kinds: ['question'], band: 'consequential', register: { language: 'marathi', script: 'devanagari' } }) })
    const { reply } = await send(await visitorGoal(), { text: 'हा लॉक-इन क्लॉज कायदेशीर आहे का?' })
    expect(reply.text).toBe('याचं खरं उत्तर हवं, माझा अंदाज नाही. करार, वाद किंवा करासाठी वकिलाला किंवा CA ला विचारा. '
      + 'स्टॅम्प ड्युटी आणि नोंदणीसाठी IGR महाराष्ट्रची साइट बघा. एखाद्या भागाच्या सुरक्षिततेसाठी, रात्री तिथे जाऊन बघा आणि तिथे राहणाऱ्या लोकांना विचारा. '
      + intentQuestion)
  })

  it('gives a tap the language of the last typed turn, with no model call', async () => {
    const goal = await visitorGoal()
    fakeVendors({ deepseek: [room()], ...routed({ register: { language: 'marathi', script: 'latin' } }) })
    expectScripted(await send(goal, { text: 'mala room pahije' }))

    const requests = fakeVendors({})
    const { reply } = await send(goal, { tap: { slot: 'areas', value: ['bandra-santacruz'] } })
    expect(reply.text).toBe('Got it: Bandra–Santacruz. Aattasathi evdha purey aahe. Aata results bagha.')
    expect([...requests, ...requests.router, ...requests.composer]).toEqual([])
  })
})

describe('the composer', () => {
  it('writes the words of a core reply in the language of the person, from the plan, the forms and the last two turns', async () => {
    const goal = await visitorGoal()
    fakeVendors({ deepseek: [room()], ...routed({ register: hinglish }) })
    expectScripted(await send(goal, { text: 'room chahiye' }))

    const requests = fakeVendors({ deepseek: [scored({ areas: [{ words: 'Powai', slug: 'powai' }] })], ...routed({ register: hinglish }), ...composed('Powai, done! Abhi ke liye itna kaafi hai, results dekhiye.') })
    const { reply, form } = await send(goal, { text: 'Powai mein' })
    expect(reply).toMatchObject({ text: 'Powai, done! Abhi ke liye itna kaafi hai, results dekhiye.', chips: null })
    expect(form.areas).toEqual({ source: 'stated', value: ['powai'] })
    expect(requests.composer).toHaveLength(1)
    const message = sentMessageOf(requests.composer[0]!)
    expect(JSON.parse(message)).toEqual({
      version: 1,
      language: 'hi-Latn',
      draft: 'Got it: Powai. Abhi ke liye itna kaafi hai. Ab results dekhiye.',
      form: { intent: 'room', areas: ['powai'] },
      formB: [],
      turns: [{ role: 'user', text: 'room chahiye' }, { role: 'assistant', text: roomAck }],
      message: 'Powai mein',
    })
  })

  it('sends the scripted reply when the text of the composer fails the check', async () => {
    const requests = fakeVendors({ deepseek: [room()], ...composed('Rahul bhi room dhoondh raha hai, 9876543210 pe call karo.') })
    expectScripted(await send(await visitorGoal(), { text: 'room chahiye, Rahul ke saath' }))
    expect(requests.composer).toHaveLength(1)
  })

  it('keeps a turn that states a hidden preference away from the composer, also as an earlier turn (PD3c)', async () => {
    const goal = await visitorGoal()
    const first = fakeVendors({ deepseek: [room()], ...routed({ community: true, register: hinglish }), ...composed('Jain flatmates, noted.') })
    expectScripted(await send(goal, { text: 'room chahiye, sirf jain flatmates' }))
    expect(first.composer).toEqual([])

    await expectComposedWithout(goal)
  })

  it('keeps a turn away from the composer when only the extractor finds the hidden preference (PD3c)', async () => {
    const goal = await visitorGoal()
    const first = fakeVendors({ deepseek: [scored({ intent: 'room', religionPreference: { values: ['jain'], weight: 'dealbreaker' } })], ...composed('Jain flatmates, noted.') })
    expectScripted(await send(goal, { text: 'room chahiye, sirf jain flatmates' }))
    expect(first.composer).toEqual([])
    await expectComposedWithout(goal)
  })

  /** The next turn gets the words of the composer, and the composer did not read the earlier user turn. */
  async function expectComposedWithout(goal: Goal) {
    const next = fakeVendors({ deepseek: [scored({ areas: [{ words: 'Powai', slug: 'powai' }] })], ...routed({ register: hinglish }), ...composed('Powai, done! Ab results dekhiye.') })
    const { reply, form } = await send(goal, { text: 'Powai mein' })
    expect(reply).toMatchObject({ text: 'Powai, done! Ab results dekhiye.', chips: null })
    expect(form.areas).toEqual({ source: 'stated', value: ['powai'] })
    const message = sentMessageOf(next.composer[0]!)
    expect(JSON.parse(message).turns).toEqual([{ role: 'assistant', text: roomAck }])
  }

  it('sends the scripted reply when the composer misses its deadline, with no second attempt', async () => {
    const requests = fakeVendors({ deepseek: [room()], composer: { deepseek: [hang] } })
    const started = performance.now()
    expectScripted(await send(await visitorGoal(), { text: 'room chahiye' }))
    expect(performance.now() - started).toBeLessThan(2000)
    expect(requests.composer).toHaveLength(1)
  })

  it('sends the scripted reply when no composer answers', async () => {
    const requests = fakeVendors({ deepseek: [room()], composer: { deepseek: [down()], gemini: [down()] } })
    expectScripted(await send(await visitorGoal(), { text: 'room chahiye' }))
    expect(requests.composer.map(({ url }) => url)).toEqual(['https://api.deepseek.com/chat/completions', 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'])
  })
})

describe('the output check of the composer', () => {
  const draft = 'Got it: Powai, up to ₹20,000. When do you want to move in?'
  const check = (text: string, message = 'Powai mein bees hazaar tak') => passesCheck(text, { draft, message, turns: [], formB: [] })

  it('passes the words of the draft in a different language', () => {
    expect(check('Powai, 20k tak, noted. Kab shift karna hai?')).toBe(true)
    expect(check('पवई, ₹२०,००० तक। आप कब शिफ़्ट होना चाहते हैं?')).toBe(true)
    expect(check('Powai, 20 se 25k. Kab shift karna hai?', '20 se 25 hazaar')).toBe(true)
  })

  it('rejects a long text, contact details and links', () => {
    expect(check(`Powai. ${'Bahut badhiya. '.repeat(40)}`)).toBe(false)
    expect(check('Powai, 20k. Call 98765 43210 for a room.')).toBe(false)
    expect(check('Powai, 20k. Mail rooms@example.com.')).toBe(false)
    expect(check('Powai, 20k. See https://example.com.')).toBe(false)
    expect(check('Powai, 20k. See nobroker.in for more.')).toBe(false)
  })

  it('rejects a text that drops the question of the plan', () => {
    expect(check('Powai, 20k tak, noted.')).toBe(false)
  })

  it('passes the pronoun I, which is no name', () => {
    expect(check("Powai, up to ₹20,000. I'll ask one thing: when should I plan your move?", "I need Powai, I'm fine with 20k")).toBe(true)
  })

  it('rejects a number that is not in the plan or the message', () => {
    expect(check('Powai, 25k tak. Kab shift karna hai?')).toBe(false)
    expect(check('Powai, tees hazaar tak. Kab shift karna hai?')).toBe(false)
    expect(check('Powai, bees hazaar tak. Kab shift karna hai?')).toBe(true)
    // "k" after a digit is "ke" here, not thousands.
    expect(check('Powai, 20k tak, 2 log k liye. Kab shift karna hai?', 'Powai 2 log 20k')).toBe(true)
    expect(check('Powai, 20k tak, do log k liye. Kab shift karna hai?', 'Powai do log 20k')).toBe(true)
  })

  it('rejects a name that is not in the plan, also a name from the message', () => {
    expect(check('Powai, 20k tak. Rahul ka flat bhi wahin hai. Kab shift karna hai?', 'Rahul says Powai, bees hazaar')).toBe(false)
    expect(check('Powai, 20k tak, and Bandra too. Kab shift karna hai?')).toBe(false)
  })
})

describe('the file of the fixed lines', () => {
  it('fails when a line has no text for a language', () => {
    const noMarathi = Object.fromEntries(Object.entries(lines.failed).filter(([language]) => language !== 'mr'))
    expect(fixedLines.safeParse({ ...lines, failed: noMarathi }).success).toBe(false)
  })
})
