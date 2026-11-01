const latin = {
  1: 'ek', 2: 'do don', 3: 'teen tin', 4: 'char chaar', 5: 'paanch panch pach', 6: 'chhe chhah che saha', 7: 'saat sat', 8: 'aath aat', 9: 'nau nav',
  10: 'das dus daha', 11: 'gyarah gyara akra', 12: 'barah baara bara', 13: 'terah tera', 14: 'chaudah chauda chaudha', 15: 'pandrah pandra pandhra',
  16: 'solah sola', 17: 'satrah satra', 18: 'atharah athara', 19: 'unnis unees ekonis', 20: 'bees bis vees vis',
  21: 'ikkees ekvis', 22: 'baais bais bavis', 23: 'teis tevis', 24: 'chaubis chobis chovis', 25: 'pachees pachchis pachis panchvees pachvis',
  26: 'chhabbis savvis', 27: 'sattais sattavis', 28: 'athais atthavis', 29: 'untees ekonatis', 30: 'tees tis', 31: 'iktees ekatis', 32: 'battis',
  33: 'taintees tettis', 34: 'chautees chautis', 35: 'paintees paitis patis pastis', 36: 'chhattis chattis', 37: 'saintees sadtis', 38: 'adtees adtis',
  39: 'untalis ekonchalis', 40: 'chalis chaalis challis', 41: 'iktalis ekechalis', 42: 'bayalis betalis', 43: 'taintalis trechalis', 44: 'chawalis chauvechalis',
  45: 'paintalis pantalis panchechalis', 46: 'chhiyalis sehechalis', 47: 'saintalis', 48: 'adtalis athrechalis', 49: 'unchas ekonpannas', 50: 'pachas pachaas pannas',
  52: 'bavan bavanna', 55: 'pachpan pachavanna', 58: 'atthavan', 60: 'saath', 65: 'painsath pasashta', 70: 'sattar', 75: 'pachattar panchyahattar',
  80: 'assi ainshi', 85: 'pachasi', 90: 'nabbe navvad', 95: 'pachanve', 100: 'sau shambhar', 1.5: 'dedh', 2.5: 'dhai adhai',
}
/** Hindi, then Marathi where it differs. With no nukta: the parsers remove it. */
const devanagari = {
  1: 'एक', 2: 'दो दोन', 3: 'तीन', 4: 'चार', 5: 'पांच पाँच पाच', 6: 'छह सहा', 7: 'सात', 8: 'आठ', 9: 'नौ नऊ',
  10: 'दस दहा', 11: 'ग्यारह अकरा', 12: 'बारह बारा', 13: 'तेरह तेरा', 14: 'चौदह चौदा', 15: 'पंद्रह पंधरा', 16: 'सोलह सोळा', 17: 'सत्रह सतरा',
  18: 'अठारह अठरा', 19: 'उन्नीस एकोणीस', 20: 'बीस वीस', 21: 'इक्कीस एकवीस', 22: 'बाईस बावीस', 23: 'तेईस तेवीस', 24: 'चौबीस चोवीस',
  25: 'पच्चीस पंचवीस', 26: 'छब्बीस सव्वीस', 27: 'सत्ताईस सत्तावीस', 28: 'अट्ठाईस अठ्ठावीस', 29: 'उनतीस एकोणतीस', 30: 'तीस', 31: 'इकतीस एकतीस',
  32: 'बत्तीस', 33: 'तैंतीस तेहतीस', 34: 'चौंतीस चौतीस', 35: 'पैंतीस पस्तीस', 36: 'छत्तीस', 37: 'सैंतीस सदतीस', 38: 'अड़तीस अडतीस',
  39: 'उनतालीस एकोणचाळीस', 40: 'चालीस चाळीस', 45: 'पैंतालीस पंचेचाळीस', 50: 'पचास पन्नास', 55: 'पचपन पंचावन्न', 60: 'साठ',
  70: 'सत्तर', 75: 'पचहत्तर पंच्याहत्तर', 80: 'अस्सी ऐंशी', 90: 'नब्बे नव्वद', 100: 'सौ शंभर', 1.5: 'डेढ दीड', 2.5: 'ढाई अडीच',
}

/** The number words of Hindi and Marathi, as people type them for rent. */
export const numberWords: Record<string, number> = Object.fromEntries([latin, devanagari]
  .flatMap((words) => Object.entries(words))
  .flatMap(([n, words]) => words.split(' ').map((w) => [w, Number(n)])))
