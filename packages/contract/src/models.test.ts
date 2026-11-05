import { describe, expect, it } from 'vitest'
import { aiOverviewView } from './models'

const stats = { calls: 2, failedShare: 0, fallbackShare: 0, p95Ms: 900, rupees: 0.1 }
const read = (numbers: object | null) => aiOverviewView.parse({
  switch: { geminiOnly: false, since: null, by: null }, spend: { today: 1, dailyAmount: 500 }, numbers,
  settings: { models: null, spendAlertPercents: [70, 100], routerMinProbability: 0.8, limits: { turnCap: 5, turnBackstop: 15, sessionsPerDevice: 10, sessionsPerIp: 100, sessionsPerIpRange: 500, typedTurnsPerMinute: 10 } },
}).numbers
const numbers = (roles: object[], bands: Record<string, number>) => ({ today: { calls: 2, failedShare: 0, fallbackShare: 0, p95Ms: 900 }, lastQuarterHour: { calls: 0, failedShare: 0, fallbackShare: 0 }, roles, bands })

describe('the AI pipeline of the web', () => {
  it('drops a role that it does not know', () => {
    expect(read(numbers([{ ...stats, role: 'router' }, { ...stats, role: 'planner' }], {}))!.roles.map((r) => r.role)).toEqual(['router'])
  })

  it('drops a band that it does not know, and gives 0 to a band with no count', () => {
    expect(read(numbers([], { core: 3, wellbeing: 1 }))!.bands).toEqual({ core: 3, general: 0, consequential: 0, out_of_scope: 0, adversarial: 0, sensitive: 0 })
  })

  it('reads no numbers', () => {
    expect(read(null)).toBeNull()
  })
})
