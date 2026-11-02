import { describe, expect, it } from 'vitest'
import { goalResponse, newGoalResponse, turnResponse } from './goals'
import { formA } from './form-a'

// The reply of the API from before T-09 and T-21: the web of a deploy reads it for a few minutes.
const olderTurn = { id: '01a19c99-5fa0-7d83-ab48-16626c750a4f', role: 'assistant', text: 'What is your monthly budget?', createdAt: '2026-11-02T14:00:00.000Z' }

describe('a reply of the API before a deploy', () => {
  it('reads a goal and a turn with no chips and no count of free messages', () => {
    const form = formA.parse({})
    expect(goalResponse.parse({ id: olderTurn.id, form, turns: [olderTurn] })).toMatchObject({ typedTurnsLeft: null, turns: [{ chips: null }] })
    expect(newGoalResponse.parse({ id: olderTurn.id, form, turns: [], visitorKey: 'key' }).typedTurnsLeft).toBeNull()
    expect(turnResponse.parse({ form, turns: [olderTurn, olderTurn] }).typedTurnsLeft).toBeNull()
  })
})
