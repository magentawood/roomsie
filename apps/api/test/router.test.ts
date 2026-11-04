import { afterEach, describe, expect, it, vi } from 'vitest'
import { routerPrompt } from '../src/assistant/handlers/router/prompt'
import { routeTurn } from '../src/assistant/handlers/router/router'
import { assistantSettings } from '../src/assistant/settings'
import { modelSettings } from '../src/models/settings'
import { answer, coreLabel, down, fakeRequest, fakeVendors, keys, scored } from './vendors'

const offTopic = { ...coreLabel, kinds: [], band: 'out_of_scope' }
const turn = { goalId: '0198f2c4-7a10-7c4e-9a3b-5d2e8f6a1b20', text: 'write me a poem', last: null }
const route = () => routeTurn(turn, { req: fakeRequest().req, models: modelSettings.parse(keys)!, settings: assistantSettings.parse({}) })

afterEach(() => { vi.unstubAllGlobals() })

describe('the router', () => {
  it('labels a message with a sure band, in one DeepSeek call with token probabilities', async () => {
    const requests = fakeVendors({ router: { deepseek: [scored(offTopic)] } })
    expect(await route()).toEqual({ version: 1, ...offTopic, routerBand: 'out_of_scope' })
    expect(requests.router).toHaveLength(1)
    expect(requests.router[0]!.body).toMatchObject({
      logprobs: true, messages: [{ role: 'system', content: routerPrompt }, { role: 'user', content: 'Message of the person: write me a poem' }],
    })
  })

  it('makes a band below the threshold core, with no kinds and no flags, and keeps the band of the router', async () => {
    fakeVendors({ router: { deepseek: [scored({ ...offTopic, kinds: ['question'], danger: true, community: true }, { out_of_scope: 0.6 })] } })
    expect(await route()).toMatchObject({ band: 'core', routerBand: 'out_of_scope', kinds: [], danger: false, community: false })
  })

  it('takes the band of Gemini, which gives no probabilities', async () => {
    fakeVendors({ router: { deepseek: [down()], gemini: [answer(JSON.stringify(offTopic))] } })
    expect(await route()).toMatchObject({ band: 'out_of_scope', routerBand: 'out_of_scope' })
  })

  it('makes a band of DeepSeek with no probabilities core', async () => {
    fakeVendors({ router: { deepseek: [answer(JSON.stringify(offTopic))] } })
    expect(await route()).toMatchObject({ band: 'core', routerBand: 'out_of_scope' })
  })

  it('keeps a flag, or the question kind, only when it passes the threshold', async () => {
    const fields = { ...coreLabel, kinds: ['question', 'filters'], danger: true, community: true }
    /** `fields` with the probability 0.6 on the character after `before`. */
    const unsureAfter = (before: string) => {
      const content = JSON.stringify(fields)
      const tokens = [...content].map((token) => ({ token, logprob: 0 }))
      tokens[content.indexOf(before) + before.length]!.logprob = Math.log(0.6)
      return answer(content, undefined, tokens)
    }
    fakeVendors({ router: { deepseek: [unsureAfter('"community":')] } })
    expect(await route()).toMatchObject({ band: 'core', kinds: ['question', 'filters'], danger: true, community: false })
    fakeVendors({ router: { deepseek: [unsureAfter('"kinds":["')] } })
    expect(await route()).toMatchObject({ kinds: ['filters'], community: true })
    fakeVendors({ router: { deepseek: [unsureAfter('"danger":')] } })
    expect(await route()).toMatchObject({ danger: false, community: true })
  })

  it('keeps the flags of Gemini, which gives no probabilities', async () => {
    fakeVendors({ router: { deepseek: [down()], gemini: [answer(JSON.stringify({ ...coreLabel, band: 'sensitive', danger: true, community: true }))] } })
    expect(await route()).toMatchObject({ band: 'sensitive', danger: true, community: true })
  })

  it('keeps the notes flag only when it passes the threshold (T-36)', async () => {
    fakeVendors({ router: { deepseek: [scored({ ...coreLabel, kinds: ['question'], notes: true })] } })
    expect(await route()).toMatchObject({ notes: true })
    const content = JSON.stringify({ ...coreLabel, kinds: ['question'], notes: true })
    const tokens = [...content].map((token) => ({ token, logprob: 0 }))
    tokens[content.indexOf('"notes":') + '"notes":'.length]!.logprob = Math.log(0.6)
    fakeVendors({ router: { deepseek: [answer(content, undefined, tokens)] } })
    expect(await route()).toMatchObject({ notes: false })
  })

  it('gives an empty core label when no model answers', async () => {
    fakeVendors({ router: { deepseek: [down()], gemini: [down()] } })
    expect(await route()).toEqual({ version: 1, kinds: [], band: 'core', routerBand: null, register: null, danger: false, community: false, notes: false })
  })
})
