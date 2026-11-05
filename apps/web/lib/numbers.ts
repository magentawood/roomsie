/** "₹84", or "₹1.19" under ₹10. */
export const rupees = (amount: number) => `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: amount < 10 ? 2 : 0 })}`
/** A time as "1.4 s". */
export const seconds = (ms: number) => `${(ms / 1000).toLocaleString('en-IN', { maximumFractionDigits: 1 })} s`
/** A share as "3.4%". */
export const percent = (share: number) => `${(share * 100).toLocaleString('en-IN', { maximumFractionDigits: 1 })}%`
