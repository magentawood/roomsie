import { describe, expect, it } from 'vitest'
import { maskContacts } from '../src/text/mask-contacts'

describe('maskContacts', () => {
  it.each([
    ['9820012345', '••••'],
    ['Call 98200 12345 after 6', 'Call •••• after 6'],
    ['+91 98200-12345', '••••'],
    ['+919820012345 or 098200 12345', '•••• or ••••'],
    ['98.20.01.23.45', '••••'],
    ['Office: 022 2345 6789', 'Office: ••••'],
    ['+91 22 2345 6789', '••••'],
    ['Ping me on wa.me/919820012345?text=hi', 'Ping me on ••••'],
    ['https://chat.whatsapp.com/AbCdEf123 for the group', '•••• for the group'],
    ['api.whatsapp.com/send?phone=919820012345', '••••'],
    ['Text wa.me/919820012345.', 'Text ••••.'],
    ['(022) 2345 6789', '••••'],
    ['98200  12345', '••••'],
    ['Call 98200 - 12345', 'Call ••••'],
    ['Office 022 - 2345 6789', 'Office ••••'],
    ['Call 9867431000 or 9820010000', 'Call •••• or ••••'],
    ['Chat on wa.link/abc12 or web.whatsapp.com/send?phone=919820012345', 'Chat on •••• or ••••'],
  ])('masks %j', (text, masked) => {
    expect(maskContacts(text)).toBe(masked)
  })

  it.each([
    'Rent ₹15,000, deposit 30000',
    'Single 15000 12000 double',
    'Rent 65000-70000 negotiable',
    'Rent 70000 75000',
    'Rent 62500-67500',
    'Rent 60500 - 70500 a month',
    'Flat 1203, Wing B, 7th floor',
    'Pincode 400050',
    '2 BHK, 750 sq ft',
    'Deposit 1,50,000',
    'Available from 25/10/2026',
  ])('keeps %j', (text) => {
    expect(maskContacts(text)).toBe(text)
  })
})
