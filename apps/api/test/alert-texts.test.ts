import { describe, expect, it } from 'vitest'
import { alertMail } from '../src/alerts/texts'

describe('the texts of the alerts', () => {
  it('gives the link and the way to turn the emails off, in the text and the HTML', () => {
    const mail = alertMail({ kind: 'message', name: 'Divya', link: 'https://roomsie.in/messages/abc' }, 'https://roomsie.in/profile')
    expect(mail.subject).toBe('Divya sent you a message')
    for (const part of [mail.text, mail.html]) {
      expect(part).toContain('https://roomsie.in/messages/abc')
      expect(part).toContain('https://roomsie.in/profile')
      expect(part).toContain('Turn off these emails in Profile and Settings')
    }
  })

  it('escapes a name in the HTML', () => {
    const mail = alertMail({ kind: 'request', name: '<img src=x onerror=alert(1)>', link: 'https://roomsie.in/messages/requests' }, 'https://roomsie.in/profile')
    expect(mail.html).not.toContain('<img')
    expect(mail.html).toContain('&#60;img')
  })
})

describe('the texts of the ID check alerts', () => {
  it('tells the result and opens Settings, with no reason', () => {
    const verified = alertMail({ kind: 'verified', link: 'https://roomsie.in/profile' }, 'https://roomsie.in/profile')
    expect(verified.subject).toBe('You’re verified on roomsie')
    const rejected = alertMail({ kind: 'rejected', link: 'https://roomsie.in/profile' }, 'https://roomsie.in/profile')
    expect(rejected.subject).toBe('Your ID check needs a new photo')
    for (const part of [rejected.text, rejected.html]) {
      expect(part).toContain('https://roomsie.in/profile')
      expect(part).toContain('We never put the reason in an email')
      expect(part).not.toContain('messages in an email')
    }
  })
})
