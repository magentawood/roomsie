/** "₹84", or "₹1.19" under ₹10. */
export const rupees = (amount: number) => `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: amount < 10 ? 2 : 0 })}`
/** A time as "1.4 s", or "—" with no time. */
export const seconds = (ms: number | null) => (ms === null ? '—' : `${(ms / 1000).toLocaleString('en-IN', { maximumFractionDigits: 1 })} s`)
/** A count in Indian digits: "1,23,456". */
export const inIndianDigits = (n: number | bigint) => n.toLocaleString('en-IN')
/** A share as "3.4%". */
export const percent = (share: number) => `${(share * 100).toLocaleString('en-IN', { maximumFractionDigits: 1 })}%`
