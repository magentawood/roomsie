import { afterEach, describe, expect, it, vi } from 'vitest'
import { routerPrompt } from '../src/assistant/handlers/router/prompt'
import { routeTurn } from '../src/assistant/handlers/router/router'
import { assistantSettings } from '../src/assistant/settings'
import type { Db } from '../src/db/client'
import { modelSettings } from '../src/models/settings'
import { answer, coreLabel, fakeRequest, fakeVendors, keys, scored } from './vendors'

const offTopic = { ...coreLabel, kinds: [], band: 'out_of_scope' }
const turn = { goalId: '0198f2c4-7a10-7c4e-9a3b-5d2e8f6a1b20', text: 'write me a poem', last: null }
const route = () => routeTurn(turn, { req: fakeRequest().req, db: {} as Db, models: modelSettings.parse(keys)!, settings: assistantSettings.parse({}), today: () => '2026-11-02' })
const down = () => new Response('down', { status: 500 })

afterEach(() => { vi.unstubAllGlobals() })

describe('the router', () => {
  it('labels a message with a sure band, in one DeepSeek call with token probabilities', async () => {
    const requests = fakeVendors({ router: { deepseek: [scored(offTopic)] } })
    expect(await route()).toEqual({ version: 1, ...offTopic, said: 'out_of_scope' })
    expect(requests.router).toHaveLength(1)
    expect(requests.router[0]!.body).toMatchObject({
      logprobs: true, messages: [{ role: 'system', content: routerPrompt }, { role: 'user', content: 'Message of the person: write me a poem' }],
    })
  })

  it('makes a band below the threshold core, and keeps the band of the router', async () => {
    fakeVendors({ router: { deepseek: [scored(offTopic, { out_of_scope: 0.6 })] } })
    expect(await route()).toMatchObject({ band: 'core', said: 'out_of_scope' })
  })

  it('takes the band of Gemini, which gives no probabilities', async () => {
    fakeVendors({ router: { deepseek: [down()], gemini: [answer(JSON.stringify(offTopic))] } })
    expect(await route()).toMatchObject({ band: 'out_of_scope', said: 'out_of_scope' })
  })

  it('makes a band of DeepSeek with no probabilities core', async () => {
    fakeVendors({ router: { deepseek: [answer(JSON.stringify(offTopic))] } })
    expect(await route()).toMatchObject({ band: 'core', said: 'out_of_scope' })
  })

  it('gives an empty core label when no model answers', async () => {
    fakeVendors({ router: { deepseek: [down()], gemini: [down()] } })
    expect(await route()).toEqual({ version: 1, kinds: [], band: 'core', said: null, register: null, danger: false, community: false })
  })
})
