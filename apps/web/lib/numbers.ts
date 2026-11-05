/** "₹84", or "₹1.19" under ₹10. */
export const rupees = (amount: number) => `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: amount < 10 ? 2 : 0 })}`
/** A share as "3.4%". */
export const percent = (share: number) => `${(share * 100).toLocaleString('en-IN', { maximumFractionDigits: 1 })}%`
