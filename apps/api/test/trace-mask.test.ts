import { describe, expect, it } from 'vitest'
import { traceMaskForms } from '@roomsie/contract'
import { forTrace } from '../src/traces/mask'


describe('the mask of a trace (T-64)', () => {
  it('hides each form of each word of religion and of community, in each script, in a sentence', () => {
    for (const word of traceMaskForms) {
      const masked = forTrace(`room in Powai, only ${word} flatmates please`)
      expect(masked, word).toBe('room in Powai, only [hidden] flatmates please')
    }
  })

  it('hides the endings of a word: "s", "ism" and "ic" in Latin letters, and each ending in Devanagari', () => {
    expect(forTrace('Jains and Muslims, Islamic or HINDU, Sikhism, Christianity, Judaism')).toBe('[hidden] and [hidden], [hidden] or [hidden], [hidden], [hidden], [hidden]')
    expect(forTrace('फक्त मुस्लिमांसाठी आणि जैनांना')).toBe('फक्त [hidden] आणि [hidden]')
    expect(forTrace('सिखों ईसाइयों यहूदियों पारसियों बिहारियों मारवाड़ियों मलयालियों')).toBe(Array(7).fill('[hidden]').join(' '))
  })

  it('keeps the names of a language and a word that only starts like a mask word', () => {
    for (const text of [
      'Marathi family only', 'Gujarati or Tamil flatmates', 'फक्त मराठी फ्लॅटमेट', 'cooking sikhna hai', 'cooking sikho', 'parso shift karna hai', 'up to 20k',
      'मुझे खाना बनाना सिखाना है', 'बौद्धिक काम करतो', 'ज्यूस पिना है', 'यूपीएससी की तैयारी',
    ]) expect(forTrace(text)).toBe(text)
  })

  it('shows "set" for a slot of religion or community with a value, and keeps a slot with no value', () => {
    const answer = '{"intent":"room","communityPreference":{"values":["marathi"],"weight":"dealbreaker"},"religionPreference":null,"ownReligion":"jain","ownCommunity":"marathi"}'
    expect(forTrace(answer)).toBe('{"intent":"room","communityPreference":"set","religionPreference":null,"ownReligion":"set","ownCommunity":"set"}')
  })

  it('stops a long text at 20,000 characters, with "[cut]"', () => {
    const cut = forTrace('a'.repeat(30_000))
    expect(cut).toBe(`${'a'.repeat(20_000)} [cut]`)
  })
})
