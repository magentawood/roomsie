import { z } from 'zod'

/** The waitlist places: those of PD2, then the large cities. No name is also a Mumbai name (areas test). */
export const waitlistPlaceNames = {
  'vasai-virar': { name: 'Vasai–Virar', aliases: ['Vasai', 'Virar', 'Nalasopara', 'Nala Sopara', 'Vasai Road', 'Vasai West', 'Vasai East', 'Virar West', 'Virar East', 'वसई', 'विरार', 'नालासोपारा'] },
  'kalyan-dombivli': { name: 'Kalyan–Dombivli', aliases: ['Kalyan', 'Dombivli', 'Dombivali', 'Kalyan West', 'Kalyan East', 'Dombivli West', 'Dombivli East', 'Titwala', 'कल्याण', 'डोंबिवली', 'टिटवाळा'] },
  bhiwandi: { name: 'Bhiwandi', aliases: ['Bhivandi', 'भिवंडी'] },
  ulhasnagar: { name: 'Ulhasnagar', aliases: ['Ulhas Nagar', 'उल्हासनगर'] },
  ambernath: { name: 'Ambernath', aliases: ['Ambarnath', 'अंबरनाथ'] },
  badlapur: { name: 'Badlapur', aliases: ['बदलापूर', 'बदलापुर'] },
  karjat: { name: 'Karjat', aliases: ['Neral', 'कर्जत', 'नेरळ'] },
  uran: { name: 'Uran', aliases: ['उरण'] },
  pune: { name: 'Pune', aliases: ['Poona', 'Pimpri', 'Chinchwad', 'Pimpri Chinchwad', 'Hinjewadi', 'पुणे', 'पिंपरी', 'चिंचवड'] },
  nashik: { name: 'Nashik', aliases: ['Nasik', 'नाशिक'] },
  nagpur: { name: 'Nagpur', aliases: ['नागपूर', 'नागपुर'] },
  delhi: { name: 'Delhi', aliases: ['New Delhi', 'Delhi NCR', 'NCR', 'दिल्ली'] },
  gurugram: { name: 'Gurugram', aliases: ['Gurgaon', 'गुड़गांव', 'गुरुग्राम'] },
  noida: { name: 'Noida', aliases: ['Greater Noida', 'नोएडा'] },
  bengaluru: { name: 'Bengaluru', aliases: ['Bangalore', 'Banglore', 'बेंगलुरु', 'बंगलौर', 'बंगलोर'] },
  hyderabad: { name: 'Hyderabad', aliases: ['Secunderabad', 'हैदराबाद'] },
  chennai: { name: 'Chennai', aliases: ['Madras', 'चेन्नई'] },
  kolkata: { name: 'Kolkata', aliases: ['Calcutta', 'कोलकाता'] },
  ahmedabad: { name: 'Ahmedabad', aliases: ['Amdavad', 'अहमदाबाद'] },
  surat: { name: 'Surat', aliases: ['सूरत'] },
  jaipur: { name: 'Jaipur', aliases: ['जयपुर'] },
  indore: { name: 'Indore', aliases: ['इंदौर'] },
  goa: { name: 'Goa', aliases: ['Panaji', 'Panjim', 'गोवा'] },
  lucknow: { name: 'Lucknow', aliases: ['लखनऊ'] },
  kanpur: { name: 'Kanpur', aliases: ['कानपुर'] },
  patna: { name: 'Patna', aliases: ['पटना'] },
  bhopal: { name: 'Bhopal', aliases: ['भोपाल'] },
  visakhapatnam: { name: 'Visakhapatnam', aliases: ['Vizag', 'Vishakhapatnam', 'विशाखापत्तनम'] },
  vadodara: { name: 'Vadodara', aliases: ['Baroda', 'वडोदरा'] },
  chandigarh: { name: 'Chandigarh', aliases: ['चंडीगढ़'] },
  kochi: { name: 'Kochi', aliases: ['Cochin', 'Ernakulam', 'कोच्चि'] },
} satisfies Record<string, { name: string; aliases: readonly string[] }>
export type WaitlistPlace = keyof typeof waitlistPlaceNames
export const waitlistPlace = z.enum(Object.keys(waitlistPlaceNames) as [WaitlistPlace, ...WaitlistPlace[]])

/** One entry of the waitlist, from the chat that named its place. */
export const waitlistBody = z.strictObject({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  place: waitlistPlace,
})
