import { describe, expect, it } from 'vitest'
import { formA, type CardResponse, type ProfileResponse } from '@roomsie/contract'
import { factSentence, formOfProfile, matchTitle, personFacts, placeFacts, sideOfForm, sideOfProfile, type AreaNames } from './match-box'
import { listing, testId } from './test-listing'

/** Bandra West and Khar West are in Bandra–Santacruz. */
const parents: Record<string, string> = { 'bandra-west': 'bandra-santacruz', 'khar-west': 'bandra-santacruz', 'andheri-west': 'andheri-goregaon' }
const names: Record<string, string> = { 'bandra-west': 'Bandra West', 'khar-west': 'Khar West', 'bandra-santacruz': 'Bandra–Santacruz', 'andheri-west': 'Andheri West' }
const areas: AreaNames = {
  lineage: (slug) => (parents[slug] ? [slug, parents[slug]] : [slug]),
  name: (slug) => names[slug] ?? slug,
}

const card: CardResponse = {
  id: testId(2), fullName: 'Divya Sharma', age: 26, jobRole: 'Business analyst', commuteAddress: 'Goregaon East', bio: null,
  managedByParent: false, intent: 'flatmates', whosMoving: 'working', areas: ['bandra-west', 'andheri-west'], budgetMin: 12000, budgetMax: 18000,
  moveDate: '2026-12-01', photos: [], lifestyle: { food: 'veg', smoking: 'non_smoker', drinks: 'fine_at_home' }, mustHaves: {}, verified: false,
}
const profile: ProfileResponse = {
  ...card, id: testId(3), fullName: 'Riya Shah', age: 24, commuteAddress: 'goregaon', areas: ['bandra-santacruz'], budgetMin: null, budgetMax: 15000,
  lifestyle: { food: 'veg', smoking: 'non_smoker', drinks: 'none_at_home' }, mustHaves: { veg_kitchen: 'dealbreaker', near_station: 'prefer' },
  gender: 'female', religion: null, community: null, visibility: 'live', missing: [], hiddenForReview: false, completion: 80,
}
const stated = <V>(value: V) => ({ source: 'stated', value })

describe('the side that a detail compares with', () => {
  it('takes the stated values of the form, and the age and the commute of the profile', () => {
    const form = formA.parse({
      areas: stated(['bandra-west']), budget: stated({ min: null, max: 20000 }),
      lifestyle: { food: stated('veg'), smoking: stated('unclear') }, mustHaves: { non_smokers: stated('dealbreaker'), tidy_flatmates: stated('unclear') },
    })
    expect(sideOfForm(form, profile)).toEqual({
      areas: ['bandra-west'], budget: { min: null, max: 20000 }, lifestyle: { food: 'veg' }, mustHaves: ['non_smokers'], age: 24, commute: 'goregaon',
    })
    expect(sideOfForm(formA.parse({}), null)).toEqual({ areas: [], budget: null, lifestyle: {}, mustHaves: [], age: null, commute: null })
  })

  it('reads the profile, and makes a stated form of it for the label', () => {
    expect(sideOfProfile(profile)).toMatchObject({ areas: ['bandra-santacruz'], budget: { min: null, max: 15000 }, mustHaves: ['veg_kitchen', 'near_station'], age: 24 })
    expect(sideOfProfile({ ...profile, budgetMax: null }).budget).toBeNull()
    const form = formOfProfile(profile)!
    expect(form.intent).toEqual({ source: 'stated', value: ['flatmates'] })
    expect(form.budget).toEqual({ source: 'stated', value: { min: null, max: 15000 } })
    expect(form.mustHaves.veg_kitchen).toEqual({ source: 'stated', value: 'dealbreaker' })
    expect(formOfProfile({ ...profile, intent: 'unclear', areas: [] })!.areas).toEqual({ source: 'empty', value: null })
  })
})

describe('the box', () => {
  it('names the label of the best-match rule', () => {
    expect(matchTitle(true)).toBe('A great match')
    expect(matchTitle(false)).toBe('An average match')
  })

  it('gives what two people share, in one sentence', () => {
    const facts = personFacts(sideOfProfile(profile), card, areas)
    expect(facts).toEqual([
      'you both eat veg', 'neither of you smokes', 'you are 2 years apart in age', 'your budgets overlap', 'you both look in Bandra West', 'you both commute to Goregaon East',
    ])
    expect(factSentence(facts)).toBe('You both eat veg, neither of you smokes, you are 2 years apart in age, your budgets overlap, you both look in Bandra West and you both commute to Goregaon East.')
  })

  it('leaves out what the two people do not share', () => {
    const far = { ...profile, age: 30, budgetMin: 20000, budgetMax: null, areas: ['khar-west'], commuteAddress: 'Fort', lifestyle: { food: 'non_veg' as const } }
    expect(personFacts(sideOfProfile(far), card, areas)).toEqual([])
    expect(factSentence([])).toBeNull()
    expect(personFacts(sideOfProfile({ ...profile, age: 26 }), card, areas)).toContain('you are the same age')
  })

  it('gives what a place gives of the ask: the rent, the area, the must-haves and the walk to a station', () => {
    const room = listing({
      kind: 'room_in_flat', areaSlug: 'bandra-west', rates: [{ sharing: null, rent: 14000, deposit: null }], vegOnlyKitchen: true, smokingAllowed: false,
      nearestStation: 'Bandra', walkStation: '5_min',
    })
    const side = { ...sideOfProfile(profile), mustHaves: ['veg_kitchen' as const, 'non_smokers' as const, 'near_station' as const] }
    expect(factSentence(placeFacts(side, room, areas)))
      .toBe('The rent of ₹14,000 is inside your budget, it is in Bandra West as you asked, it has the veg kitchen and no-smoking rule you need and Bandra is a 5 minute walk.')
    const far = listing({ areaSlug: 'andheri-west', rates: [{ sharing: null, rent: 40000, deposit: null }], vegOnlyKitchen: false, walkStation: '15_min' })
    expect(placeFacts(side, far, areas)).toEqual([])
  })
})
