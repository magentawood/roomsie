import { describe, expect, it } from 'vitest'
import { formA } from './form-a'
import { goalResponse } from './goals'

const olderTurn = { id: '01a19c99-5fa0-7d83-ab48-16626c750a4f', role: 'assistant', text: 'What is your monthly budget?', createdAt: '2026-11-02T14:00:00.000Z' }

describe('a reply of the API before a deploy', () => {
  it('reads a goal and a turn with no chips and no count of free messages', () => {
    expect(goalResponse.parse({ id: olderTurn.id, form: formA.parse({}), turns: [olderTurn] })).toMatchObject({ typedTurnsLeft: null, turns: [{ chips: null }] })
  })
})
