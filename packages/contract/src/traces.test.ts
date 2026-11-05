import { describe, expect, it } from 'vitest'
import { adminTurnsView, adminTurnView } from './traces'

const at = '2026-11-05T10:00:00.000Z'
const row = { key: '0199e4b0-0000-7000-8000-000000000001', sessionCode: 's-7f3a', turn: 1, at, band: 'core', language: 'english', script: 'latin', calls: 3, ms: 2100, result: 'ok', resultRole: null }
const attempt = (role: string, outcome: string) => ({
  id: '0199e4b0-0000-7000-8000-000000000002', role, attempt: 1, model: 'deepseek-flash', fallback: false, outcome, startedAt: at, ms: 600,
  tokensIn: 10, cachedTokensIn: 0, tokensOut: 2, systemPrompt: { name: 'router · 3f9a2c1b', text: 'Route.' }, messages: [], answer: null,
})

describe('the traces of the AI pipeline, on the web (T-64)', () => {
  it('shows no band for a band that it does not know, and drops a turn with a result that it does not know', () => {
    const { turns } = adminTurnsView.parse({ turns: [{ ...row, band: 'legal' }, { ...row, result: 'cancelled' }], counts: { failed: 0, fallback: 0, slow: 0 } })
    expect(turns.map((t) => [t.result, t.band])).toEqual([['ok', null]])
  })

  it('drops an attempt with a role or an outcome that it does not know', () => {
    const turn = adminTurnView.parse({ ...row, rupees: 0, goneOn: '2026-12-06', lastView: null, attempts: [attempt('router', 'ok'), attempt('planner', 'ok'), attempt('router', 'timeout')] })
    expect(turn.attempts.map((a) => [a.role, a.outcome])).toEqual([['router', 'ok']])
  })
})
