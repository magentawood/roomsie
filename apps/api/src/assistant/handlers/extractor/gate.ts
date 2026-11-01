import type { Token } from '../../../models/models'

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * The probability that the model gave to the string value of a JSON key, from the tokens of its answer (PD7).
 * `from` skips the earlier text, for a key that comes more than one time. Null when the tokens do not hold the pair.
 */
export function probabilityOf(tokens: Token[], key: string, value: string, from = 0): { probability: number; end: number } | null {
  const text = tokens.map((t) => t.token).join('')
  const pair = new RegExp(`"${escape(key)}"\\s*:\\s*"(${escape(value)})"`, 'g')
  pair.lastIndex = from
  const match = pair.exec(text)
  if (!match) return null
  const start = match.index + match[0].length - value.length - 1
  const end = start + value.length
  let at = 0
  let logprob = 0
  for (const token of tokens) {
    const next = at + token.token.length
    if (next > start && at < end) logprob += token.logprob
    at = next
  }
  return { probability: Math.exp(logprob), end }
}
