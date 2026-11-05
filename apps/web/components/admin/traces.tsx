'use client'

import { useState } from 'react'
import Link from 'next/link'
import { slowTurnMs, traceDays, type AdminTurnResponse, type AdminTurnRow, type AdminTurnsQuery, type ScopeBand, type TraceFilter } from '@roomsie/contract'
import { errorText } from '../../lib/api'
import { dateAndTime, istDay } from '../../lib/ist'
import { rupees, seconds } from '../../lib/numbers'
import { useTurn, useTurns } from '../../lib/queries'
import { Badge, type Tone } from '../ui/badge'
import { cardClass, pageBody, SubjectHeader } from './admin-page'
import { Search } from './directory'

type Call = AdminTurnResponse['attempts'][number]
const capital = (word: string) => `${word[0]!.toUpperCase()}${word.slice(1)}`
const bandLabels: Record<ScopeBand, string> = { core: 'Core', general: 'General', consequential: 'Consequential', out_of_scope: 'Out of scope', adversarial: 'Adversarial', sensitive: 'Sensitive' }
/** Hindi in Latin letters is Hinglish, as the router hears it. */
function languageOf({ language, script }: Pick<AdminTurnRow, 'language' | 'script'>) {
  if (!language) return '—'
  const name = language === 'hindi' && script === 'latin' ? 'Hinglish' : capital(language)
  return script ? `${name} · ${capital(script)}` : name
}
const results: Record<AdminTurnRow['result'], { tone: Tone; label: (role: string) => string }> = {
  ok: { tone: 'success', label: () => 'OK' },
  failed: { tone: 'error', label: (role) => `${capital(role)} failed` },
  fallback: { tone: 'warning', label: (role) => `${capital(role)} to Gemini` },
}
const Result = ({ row }: { row: Pick<AdminTurnRow, 'result' | 'resultRole'> }) => (
  <Badge tone={results[row.result].tone} dot={false}>{results[row.result].label(row.resultRole ?? '')}</Badge>
)

/** The tab Turns of the AI pipeline (T-64, drafts section 39). */
export function TurnsList() {
  const [query, setQuery] = useState<AdminTurnsQuery>({})
  const turns = useTurns(query)
  const counts = turns.data?.counts
  const labels: Record<TraceFilter, string> = {
    failed: `Failed${counts ? ` · ${counts.failed}` : ''}`, fallback: `To Gemini${counts ? ` · ${counts.fallback}` : ''}`,
    slow: `Slower than ${seconds(slowTurnMs)}${counts ? ` · ${counts.slow}` : ''}`,
  }
  return (
    <>
      <Search label="Search turns" placeholder="Search by session code" labels={labels} all="All" onSearch={setQuery} />
      <p className="rounded-lg bg-secondary px-3 py-2.5 text-sm text-tertiary">{`Each open of a turn goes in the audit log, and a trace goes ${traceDays} days after its call.`}</p>
      {turns.isError && <p role="alert" className="text-sm text-error-primary">{errorText(turns.error)}</p>}
      {turns.isPending && <p className="text-sm text-tertiary">Loading…</p>}
      {turns.data && (
        <div className="overflow-x-auto rounded-xl border border-secondary">
          <table className="w-full text-left text-sm md:min-w-200">
            <thead className="bg-secondary text-xs font-medium text-tertiary">
              <tr>{['Time', 'Session', 'Band', 'Language', 'Calls', 'Time taken', 'Result', ''].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="text-secondary">
              {turns.data.turns.map((t) => (
                <tr key={t.key} className="border-t border-secondary">
                  <td className="px-4 py-3 text-tertiary">{dateAndTime(t.at)}</td>
                  <td className="px-4 py-3 font-semibold text-primary">{`${t.sessionCode} · turn ${t.turn}`}</td>
                  <td className="px-4 py-3">{t.band ? bandLabels[t.band] : '—'}</td>
                  <td className="px-4 py-3">{languageOf(t)}</td>
                  <td className="px-4 py-3">{t.calls}</td>
                  <td className="px-4 py-3">{seconds(t.ms)}</td>
                  <td className="px-4 py-3"><Result row={t} /></td>
                  <td className="px-4 py-3 text-right"><Link href={`/admin/ai/turns/${t.key}`} className="font-semibold text-primary hover:underline">Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!turns.data.turns.length && <p className="px-4 py-3 text-sm text-tertiary">No turn matches.</p>}
        </div>
      )}
    </>
  )
}

const outcomes: Record<Call['outcome'], { tone: Tone; label: string }> = { ok: { tone: 'success', label: 'OK' }, invalid: { tone: 'warning', label: 'Not valid' }, failed: { tone: 'error', label: 'Failed' } }
const stepName = (call: Call) => `${capital(call.role)}${call.fallback ? ' · fallback' : call.attempt > 1 ? ' · retry' : ''}${call.role === 'observer' ? ' · after the reply' : ''}`

/** Each call as a bar from its start to its end, on one scale for the turn. SVG attributes, as the policy of the page has no inline style. */
function Waterfall({ call, start, span }: { call: Call; start: number; span: number }) {
  const from = ((Date.parse(call.startedAt) - start) / span) * 1000
  return (
    <svg viewBox="0 0 1000 12" preserveAspectRatio="none" className="h-3 w-full rounded-sm bg-secondary text-primary" aria-hidden>
      <rect x={from} y={0} width={Math.max((call.ms / span) * 1000, 4)} height={12} rx={3} className="fill-current" />
    </svg>
  )
}

function pretty(answer: string) {
  try {
    return JSON.stringify(JSON.parse(answer), null, 2)
  } catch {
    return answer
  }
}

function CallDetail({ call }: { call: Call }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <section aria-label="The prompt" className={`${cardClass} min-w-0 lg:flex-1`}>
        <h2 className="text-lg font-semibold text-primary">{`${stepName(call)} · the prompt`}</h2>
        <details className="text-sm text-tertiary">
          <summary className="cursor-pointer">{`System prompt: ${call.systemPrompt.name} (${call.tokensIn.toLocaleString('en-IN')} tokens in, ${call.cachedTokensIn.toLocaleString('en-IN')} from the cache)`}</summary>
          <pre className="mt-2 max-h-80 overflow-auto rounded-lg bg-secondary p-3 text-xs whitespace-pre-wrap">{call.systemPrompt.text}</pre>
        </details>
        <div className="flex flex-col gap-2 rounded-lg bg-secondary p-3 text-sm">
          {call.messages.map((m, i) => <p key={i} className="break-words whitespace-pre-wrap text-secondary"><span className="font-semibold">{`${m.role}: `}</span>{m.content}</p>)}
        </div>
      </section>
      <section aria-label="The raw answer" className={`${cardClass} min-w-0 lg:flex-1`}>
        <h2 className="text-lg font-semibold text-primary">The raw answer</h2>
        <p className="text-sm text-tertiary">{`${call.model} · ${call.tokensOut.toLocaleString('en-IN')} tokens out · ${seconds(call.ms)} · ${outcomes[call.outcome].label}`}</p>
        {call.answer === null
          ? <p className="text-sm text-tertiary">The vendor gave no answer.</p>
          : <pre className="max-h-96 overflow-auto rounded-lg bg-secondary p-3 text-xs whitespace-pre-wrap">{pretty(call.answer)}</pre>}
      </section>
    </div>
  )
}

const toTurns = { label: 'Turns', href: '/admin/ai/turns' }

/** One turn: its calls on a timeline, and the prompt and the raw answer of the selected call (T-64, drafts section 39). */
export function TurnView({ turnKey }: { turnKey: string }) {
  const turn = useTurn(turnKey)
  const [selected, setSelected] = useState(0)
  if (turn.isError || turn.isPending) {
    return (
      <>
        <SubjectHeader title="Turn" back={toTurns} />
        <main className={pageBody}>{turn.isError ? <p role="alert" className="text-sm text-error-primary">{errorText(turn.error)}</p> : <p className="text-sm text-tertiary">Loading…</p>}</main>
      </>
    )
  }
  const t = turn.data
  const start = Math.min(...t.attempts.map((c) => Date.parse(c.startedAt)))
  const span = Math.max(...t.attempts.map((c) => Date.parse(c.startedAt) + c.ms)) - start || 1
  const call = t.attempts[selected] ?? t.attempts[0]!
  return (
    <>
      <SubjectHeader title={`Session ${t.sessionCode} · turn ${t.turn}`} back={toTurns}
        intro={`${dateAndTime(t.at)} IST · ${t.band ? `${bandLabels[t.band]} band` : 'No band'} · ${languageOf(t)} · ${t.calls} calls · ${seconds(t.ms)} · ${rupees(t.rupees)}`} />
      <main className={pageBody}>
        <p className="flex flex-wrap items-center gap-2 rounded-lg bg-secondary px-3 py-2.5 text-sm text-tertiary">
          <Badge tone="gray" dot={false}>Audit log</Badge>
          {`${t.lastView ? `${t.lastView.by ?? 'A deleted account'} opened this turn on ${dateAndTime(t.lastView.at)}.` : 'Nobody opened this turn before you.'} Your open is in the log. The traces go on ${istDay(t.goneOn, 'long')}.`}
        </p>
        <section aria-label="Timeline" className={cardClass}>
          <h2 className="text-lg font-semibold text-primary">Timeline</h2>
          <ol className="flex flex-col">
            {t.attempts.map((c, i) => (
              <li key={c.id}>
                <button type="button" onClick={() => setSelected(i)} aria-pressed={c === call}
                  className={`grid w-full grid-cols-1 items-center gap-2 rounded-lg px-2 py-2.5 text-left text-sm md:grid-cols-[14rem_1fr_4rem_6rem] md:gap-4 ${c === call ? 'bg-secondary' : 'hover:bg-primary_hover'}`}>
                  <span className="flex flex-col"><span className="font-semibold text-primary">{stepName(c)}</span><span className="text-tertiary">{c.model}</span></span>
                  <Waterfall call={c} start={start} span={span} />
                  <span className="text-tertiary">{seconds(c.ms)}</span>
                  <span className="justify-self-start"><Badge tone={outcomes[c.outcome].tone} dot={false}>{outcomes[c.outcome].label}</Badge></span>
                </button>
              </li>
            ))}
          </ol>
        </section>
        <CallDetail call={call} />
      </main>
    </>
  )
}
