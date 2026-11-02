import { vendorOf, type Token } from '../../models/models'

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * The probability that the model gave to the first group of `pattern` in its answer, from the tokens of the answer (PD7).
 * Null when the tokens do not hold the pattern. `pattern` needs the flag `d`.
 */
export function probabilityAt(tokens: Token[], pattern: RegExp): number | null {
  const match = pattern.exec(tokens.map((t) => t.token).join(''))
  if (!match?.indices?.[1]) return null
  const [start, end] = match.indices[1]
  let at = 0
  let logprob = 0
  for (const token of tokens) {
    const next = at + token.token.length
    if (next > start && at < end) logprob += token.logprob
    at = next
  }
  return Math.exp(logprob)
}

/** The probability of the string value of a JSON key. */
export const probabilityOf = (tokens: Token[], key: string, value: string) => probabilityAt(tokens, new RegExp(`"${escape(key)}"\\s*:\\s*"(${escape(value)})"`, 'd'))

/** Gemini gives no token probabilities, so only an answer of DeepSeek can be unscored (T-12). */
export const unscoredDeepSeek = (tokens: Token[] | null, model: string) => !tokens && vendorOf(model) === 'deepseek'
