import { vendorOf, type Token } from '../../models/models'

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** The patterns of a JSON answer whose first group is the value to score. */
export const jsonString = (key: string, value: string) => new RegExp(`"${escape(key)}"\\s*:\\s*"(${escape(value)})"`)
export const jsonTrue = (key: string) => new RegExp(`"${escape(key)}"\\s*:\\s*(true)`)
export const jsonListItem = (key: string, value: string) => new RegExp(`"${escape(key)}"\\s*:\\s*\\[[^\\]]*"(${escape(value)})"`)

/** The probability that the model gave to the first group of `pattern`, from the tokens of its answer (PD7). Null: no match. */
export function probabilityOfMatch(tokens: Token[], pattern: RegExp): number | null {
  const match = new RegExp(pattern.source, 'd').exec(tokens.map((t) => t.token).join(''))
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

/** Gemini gives no token probabilities, so only an answer of DeepSeek can be unscored (T-12). */
export const unscoredDeepSeek = (tokens: Token[] | null, model: string) => !tokens && vendorOf(model) === 'deepseek'

/** A value of a scored answer passes at `min` or more. `unmatched`: the probability when the tokens do not hold the pattern. */
export function passes({ tokens, model }: { tokens: Token[] | null; model: string }, pattern: RegExp, min: number, unmatched = 0) {
  if (!tokens) return !unscoredDeepSeek(tokens, model)
  return (probabilityOfMatch(tokens, pattern) ?? unmatched) >= min
}
