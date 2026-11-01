import { describe, expect, it } from 'vitest'
import { observation } from './form-b'

/** The example of agent-architecture.md. */
const note = {
  key: 'guest_frequency',
  value: 'partner stays over most nights',
  kind: 'concern',
  evidence: "my ex basically lived there, that's what killed it",
  turn: '019a4b6e-8c1d-7f3a-9b2e-4d5c6e7f8a9b',
  confidence: 0.82,
  visible: true,
}

describe('Form B observation', () => {
  it('reads the seven fields, with a version', () => {
    expect(observation.parse(note)).toEqual({ version: 1, ...note })
  })

  it('rejects a key that it does not have', () => {
    expect(observation.safeParse({ ...note, mood: 'happy' }).success).toBe(false)
  })

  it.each(['constraint', 'preference', 'context', 'concern'])('accepts the kind %s', (kind) => {
    expect(observation.safeParse({ ...note, kind }).success).toBe(true)
  })

  it('rejects a different kind', () => {
    expect(observation.safeParse({ ...note, kind: 'fact' }).success).toBe(false)
  })

  it.each(['', '   '])('rejects the empty quote %j', (evidence) => {
    expect(observation.safeParse({ ...note, evidence }).success).toBe(false)
  })

  it.each([-0.01, 1.01])('rejects the confidence %d', (confidence) => {
    expect(observation.safeParse({ ...note, confidence }).success).toBe(false)
  })

  it('is visible when the input does not tell', () => {
    expect(observation.parse({ ...note, visible: undefined }).visible).toBe(true)
  })

  it('rejects a topic key that is not lowercase with underscores', () => {
    expect(observation.safeParse({ ...note, key: 'Guest Frequency' }).success).toBe(false)
  })
})
