const latin = {
  1: 'ek', 2: 'do don', 3: 'teen tin', 4: 'char chaar', 5: 'paanch panch pach', 6: 'chhe chhah che saha', 7: 'saat sat', 8: 'aath aat', 9: 'nau nav',
  10: 'das dus daha', 11: 'gyarah gyara akra', 12: 'barah baara bara', 13: 'terah tera', 14: 'chaudah chauda chaudha', 15: 'pandrah pandra pandhra',
  16: 'solah sola', 17: 'satrah satra', 18: 'atharah athara', 19: 'unnis unees ekonis', 20: 'bees bis vees vis', 25: 'pachees pachchis pachis panchvees pachvis',
  30: 'tees tis', 35: 'paintees paitis patis pastis', 40: 'chalis chaalis challis', 45: 'paintalis pantalis', 50: 'pachas pachaas pannas',
  60: 'saath', 70: 'sattar', 80: 'assi ainshi', 90: 'nabbe', 100: 'sau shambhar', 1.5: 'dedh', 2.5: 'dhai adhai',
}
/** Hindi, then Marathi where it differs. With no nukta: the parsers remove it. */
const devanagari = {
  10: 'दस दहा', 12: 'बारह बारा', 15: 'पंद्रह पंधरा', 18: 'अठारह अठरा', 20: 'बीस वीस', 25: 'पच्चीस पंचवीस',
  30: 'तीस', 35: 'पैंतीस पस्तीस', 40: 'चालीस', 50: 'पचास पन्नास', 1.5: 'डेढ दीड',
}

/** The number words of Hindi and Marathi, as people type them for rent. */
export const numberWords: Record<string, number> = Object.fromEntries([latin, devanagari]
  .flatMap((words) => Object.entries(words))
  .flatMap(([n, words]) => words.split(' ').map((w) => [w, Number(n)])))
