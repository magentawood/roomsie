import { describe, expect, it } from 'vitest'
import { alertMail, alertTitle } from '../src/alerts/texts'

describe('the texts of the alerts', () => {
  it('names the person and the event, with no text of a message', () => {
    expect(alertTitle('request', 'Rahul')).toBe('Rahul wants to say hi')
    expect(alertTitle('message', 'Divya')).toBe('Divya sent you a message')
    expect(alertTitle('accept', 'Sunrise PG')).toBe('Sunrise PG accepted your request')
  })

  it('gives the link and the way to turn the emails off, in the text and the HTML', () => {
    const mail = alertMail('message', 'Divya', 'https://roomsie.in/messages/abc', 'https://roomsie.in/profile')
    expect(mail.subject).toBe('Divya sent you a message')
    for (const part of [mail.text, mail.html]) {
      expect(part).toContain('https://roomsie.in/messages/abc')
      expect(part).toContain('https://roomsie.in/profile')
      expect(part).toContain('Turn off these emails in Profile and Settings')
    }
  })

  it('escapes a name in the HTML', () => {
    const mail = alertMail('request', '<img src=x onerror=alert(1)>', 'https://roomsie.in/messages/requests', 'https://roomsie.in/profile')
    expect(mail.html).not.toContain('<img')
    expect(mail.html).toContain('&#60;img')
  })
})
