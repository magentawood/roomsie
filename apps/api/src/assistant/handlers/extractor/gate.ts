import type { Token } from '../../../models/models'

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** The probability that the model gave to the string value of a JSON key, from the tokens of its answer (PD7). Null when the tokens do not hold the pair. */
export function probabilityOf(tokens: Token[], key: string, value: string): number | null {
  const text = tokens.map((t) => t.token).join('')
  const match = new RegExp(`"${escape(key)}"\\s*:\\s*"(${escape(value)})"`).exec(text)
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
  return Math.exp(logprob)
}
