import { describe, expect, it } from 'vitest'
import { genderIn } from '../src/assistant/words'

describe('the gender in an answer to "Are you a man, a woman or non-binary?"', () => {
  it.each([
    ["I'm a guy", 'male'], ['male', 'male'], ['main ladka hoon', 'male'], ['मैं पुरुष हूँ', 'male'], ['mi mulga aahe', 'male'],
    ['woman', 'female'], ['I am a girl', 'female'], ['ladki', 'female'], ['मी मुलगी आहे', 'female'],
    ['non-binary', 'non_binary'], ['nonbinary', 'non_binary'], ['nb', 'non_binary'],
  ] as const)('reads %j as %s', (text, gender) => {
    expect(genderIn(text)).toBe(gender)
  })

  it('reads nothing in a message of no gender or of two', () => {
    expect(genderIn('Bandra please')).toBeNull()
    expect(genderIn('a man and a woman')).toBeNull()
  })
})
