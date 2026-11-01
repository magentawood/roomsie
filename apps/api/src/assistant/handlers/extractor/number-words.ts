const latin = {
  1: 'ek', 2: 'do don', 3: 'teen tin', 4: 'char chaar', 5: 'paanch panch pach', 6: 'chhe chhah che saha', 7: 'saat sat', 8: 'aath aat', 9: 'nau nav',
  10: 'das dus daha', 11: 'gyarah gyara akra', 12: 'barah baara bara', 13: 'terah tera', 14: 'chaudah chauda chaudha', 15: 'pandrah pandra pandhra',
  16: 'solah sola', 17: 'satrah satra', 18: 'atharah athara', 19: 'unnis unees ekonis', 20: 'bees bis vees vis',
  21: 'ikkees ekvis', 22: 'baais bais bavis', 23: 'teis tevis', 24: 'chaubis chobis chovis', 25: 'pachees pachchis pachis panchvees pachvis',
  26: 'chhabbis savvis', 27: 'sattais sattavis', 28: 'athais atthavis', 29: 'untees ekonatis', 30: 'tees tis', 31: 'iktees ekatis', 32: 'battis',
  33: 'taintees tettis', 34: 'chautees chautis', 35: 'paintees paitis patis pastis', 36: 'chhattis chattis', 37: 'saintees sadtis', 38: 'adtees adtis',
  39: 'untalis ekonchalis', 40: 'chalis chaalis challis', 42: 'bayalis betalis', 45: 'paintalis pantalis', 48: 'adtalis', 50: 'pachas pachaas pannas',
  60: 'saath', 70: 'sattar', 80: 'assi ainshi', 90: 'nabbe', 100: 'sau shambhar', 1.5: 'dedh', 2.5: 'dhai adhai',
}
/** Hindi, then Marathi where it differs. With no nukta: the parsers remove it. */
const devanagari = {
  1: 'एक', 2: 'दो दोन', 3: 'तीन', 4: 'चार', 5: 'पांच पाँच पाच', 6: 'छह सहा', 7: 'सात', 8: 'आठ', 9: 'नौ नऊ',
  10: 'दस दहा', 12: 'बारह बारा', 15: 'पंद्रह पंधरा', 18: 'अठारह अठरा', 20: 'बीस वीस', 22: 'बाईस बावीस', 24: 'चौबीस चोवीस', 25: 'पच्चीस पंचवीस',
  28: 'अट्ठाईस अठ्ठावीस', 30: 'तीस', 32: 'बत्तीस', 35: 'पैंतीस पस्तीस', 40: 'चालीस', 45: 'पैंतालीस', 50: 'पचास पन्नास', 1.5: 'डेढ दीड',
}

/** The number words of Hindi and Marathi, as people type them for rent. */
export const numberWords: Record<string, number> = Object.fromEntries([latin, devanagari]
  .flatMap((words) => Object.entries(words))
  .flatMap(([n, words]) => words.split(' ').map((w) => [w, Number(n)])))
