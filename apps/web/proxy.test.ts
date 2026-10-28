import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server'
import { config, proxy } from './proxy'

function policyOf(url = 'https://roomsie.in/') {
  const res = proxy(new NextRequest(url))
  // NextResponse.next() gives the changed request headers to the render in these headers.
  return { sent: res.headers.get('content-security-policy') ?? '', toRender: res.headers.get('x-middleware-request-content-security-policy') }
}
const directive = (policy: string, name: string) => policy.split('; ').find((d) => d.startsWith(`${name} `)) ?? ''
const nonceOf = (policy: string) => /'nonce-([^']+)'/.exec(directive(policy, 'script-src'))?.[1]

describe('the Content-Security-Policy', () => {
  it('gives each page request a new nonce, and the render gets the same policy', () => {
    const first = policyOf()
    const second = policyOf('https://roomsie.in/messages')
    expect(nonceOf(first.sent)).toMatch(/^[A-Za-z0-9+/=]{20,}$/)
    expect(nonceOf(second.sent)).not.toBe(nonceOf(first.sent))
    expect(first.toRender).toBe(first.sent)
  })

  it('runs only the scripts with the nonce, and no inline script or eval, in production', () => {
    const { sent } = policyOf()
    expect(directive(sent, 'script-src')).toContain("'strict-dynamic'")
    expect(directive(sent, 'script-src')).not.toMatch(/unsafe-inline|unsafe-eval/)
    expect(directive(sent, 'style-src')).not.toContain('unsafe-inline')
    expect(directive(sent, 'object-src')).toBe("object-src 'none'")
    expect(directive(sent, 'base-uri')).toBe("base-uri 'self'")
    expect(directive(sent, 'frame-ancestors')).toBe("frame-ancestors 'none'")
  })

  it('runs for the pages, not for the static files and the link prefetches', () => {
    const runs = (url: string, headers?: Record<string, string>) => unstable_doesMiddlewareMatch({ config, url, headers })
    expect(runs('/')).toBe(true)
    expect(runs('/messages/0192f1a2-0000-7000-8000-000000000000')).toBe(true)
    expect(runs('/wp-login.php')).toBe(true)
    expect(runs('/_next/static/chunks/main.js')).toBe(false)
    expect(runs('/landing/hero.mp4')).toBe(false)
    expect(runs('/alerts-sw.js')).toBe(false)
    expect(runs('/places/0192f1a2-0000-7000-8000-000000000000', { 'next-router-prefetch': '1' })).toBe(false)
  })
})
