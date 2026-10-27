import { describe, expect, it } from 'vitest'
import type { AreasResponse } from '@roomsie/contract'
import { areaTree, chipState, pickArea, pickLabel, subAreaChoice } from './areas'

const area = (slug: string, name: string, parent: string | null, aliases: string[] = []) => ({ slug, name, parent, aliases })
const tree = areaTree([
  area('andheri-goregaon', 'Andheri–Goregaon', null),
  area('andheri-west', 'Andheri West', 'andheri-goregaon', ['Andheri W', 'Andheri']),
  area('lokhandwala', 'Lokhandwala', 'andheri-west'),
  area('versova', 'Versova', 'andheri-west'),
  area('andheri-east', 'Andheri East', 'andheri-goregaon', ['Andheri']),
  area('malad-borivali', 'Malad–Borivali', null),
  area('kandivali-east', 'Kandivali East', 'malad-borivali', ['Kandivli', 'Kandivali E']),
  area('thakur-village', 'Thakur Village', 'kandivali-east', ['Thakur Complex']),
  area('thane', 'Thane', null),
  area('ghodbunder-road', 'Ghodbunder Road', 'thane', ['GB Road']),
] satisfies AreasResponse['areas'])

describe('the label of an area', () => {
  it('gives a sub-area and a group by name, and a pocket with its parent', () => {
    expect(tree.label('andheri-west')).toBe('Andheri West')
    expect(tree.label('versova')).toBe('Versova, Andheri West')
    expect(tree.label('andheri-goregaon')).toBe('Andheri–Goregaon')
    expect(tree.label('atlantis')).toBeUndefined()
  })
})

describe('the Where step', () => {
  it('finds the group, the sub-area and the pocket of the saved area', () => {
    expect(subAreaChoice(tree, 'versova')).toEqual({ group: 'andheri-goregaon', subArea: 'andheri-west', pocket: 'versova' })
    expect(subAreaChoice(tree, 'andheri-east')).toEqual({ group: 'andheri-goregaon', subArea: 'andheri-east', pocket: null })
    expect(subAreaChoice(tree, 'andheri-goregaon')).toEqual({ group: 'andheri-goregaon', subArea: null, pocket: null })
    expect(subAreaChoice(tree, null)).toEqual({ group: null, subArea: null, pocket: null })
  })
})

describe('the search', () => {
  it('finds an area by its name or another name, with case, spaces and punctuation ignored', () => {
    expect(tree.search('kandivli').map((a) => a.slug)).toEqual(['kandivali-east'])
    expect(tree.search('Kandiv').map((a) => a.slug)).toEqual(['kandivali-east'])
    expect(tree.search('gb-road').map((a) => a.slug)).toEqual(['ghodbunder-road'])
    expect(tree.search('andheri').map((a) => a.slug)).toEqual(['andheri-goregaon', 'andheri-west', 'andheri-east'])
    expect(tree.search('thakur complex').map((a) => a.slug)).toEqual(['thakur-village'])
    expect(tree.search('  ')).toEqual([])
  })
})

describe('the profile picks', () => {
  it('removes the picks under a wider pick, and removes a pick on a second tap', () => {
    expect(pickArea(tree, ['andheri-west', 'versova', 'kandivali-east'], 'andheri-goregaon')).toEqual(['kandivali-east', 'andheri-goregaon'])
    expect(pickArea(tree, ['andheri-goregaon'], 'andheri-goregaon')).toEqual([])
  })

  it('shows a pick under a wider pick as covered, and changes nothing when it is tapped', () => {
    expect(chipState(tree, ['andheri-goregaon'], 'versova')).toBe('covered')
    expect(pickArea(tree, ['andheri-goregaon'], 'versova')).toEqual(['andheri-goregaon'])
    expect(chipState(tree, ['andheri-goregaon'], 'andheri-goregaon')).toBe('picked')
    expect(chipState(tree, ['andheri-west'], 'andheri-east')).toBe('free')
  })

  it('shows a group pick as "All of" the group, and an area that is not loaded yet by its slug', () => {
    expect(pickLabel(tree, 'andheri-goregaon')).toBe('All of Andheri–Goregaon')
    expect(pickLabel(tree, 'versova')).toBe('Versova, Andheri West')
    expect(pickLabel(areaTree([]), 'powai')).toBe('powai')
  })

  it('stops at 20 picks, and still removes one', () => {
    const twenty = Array.from({ length: 20 }, (_, i) => `place-${i}`)
    expect(chipState(tree, twenty, 'thane')).toBe('full')
    expect(pickArea(tree, twenty, 'thane')).toEqual(twenty)
    expect(pickArea(tree, twenty, 'place-3')).toHaveLength(19)
  })
})
