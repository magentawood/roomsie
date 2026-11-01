/** The number words of Hindi and Marathi in Latin script, as people type them for rent. */
export const numberWords: Record<string, number> = Object.fromEntries(Object.entries({
  1: 'ek', 2: 'do don', 3: 'teen tin', 4: 'char chaar', 5: 'paanch panch pach', 6: 'chhe chhah che saha', 7: 'saat sat', 8: 'aath aat', 9: 'nau nav',
  10: 'das dus daha', 11: 'gyarah gyara akra', 12: 'barah baara bara', 13: 'terah tera', 14: 'chaudah chauda chaudha', 15: 'pandrah pandra pandhra',
  16: 'solah sola', 17: 'satrah satra', 18: 'atharah athara', 19: 'unnis unees ekonis', 20: 'bees bis vees vis', 25: 'pachees pachchis pachis panchvees pachvis',
  30: 'tees tis', 35: 'paintees paitis patis pastis', 40: 'chalis chaalis challis', 45: 'paintalis pantalis', 50: 'pachas pachaas pannas',
  60: 'saath', 70: 'sattar', 80: 'assi ainshi', 90: 'nabbe', 100: 'sau shambhar', 1.5: 'dedh', 2.5: 'dhai adhai',
}).flatMap(([n, words]) => words.split(' ').map((w) => [w, Number(n)])))
