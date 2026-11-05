'use client'

import { useState, type ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CpuChip01 } from '@untitledui/icons'
import { modelSwitchState, type AiOverviewResponse, type ModelSwitchBody } from '@roomsie/contract'
import { api, errorText } from '../../lib/api'
import { useUser } from '../../lib/auth'
import { dateAndTime } from '../../lib/ist'
import { percent, rupees } from '../../lib/numbers'
import { useAiOverview, useSwitchLog, useTraceViews } from '../../lib/queries'
import { ago } from '../../lib/reports'
import { Badge } from '../ui/badge'
import { Bar } from '../ui/bar'
import { Button } from '../ui/button'
import { Modal } from '../ui/modal'
import { Toggle } from '../ui/toggle'

type Numbers = NonNullable<AiOverviewResponse['numbers']>
const card = 'flex flex-col gap-3 rounded-xl border border-secondary bg-primary p-5'
const seconds = (ms: number | null) => (ms === null ? '—' : `${(ms / 1000).toLocaleString('en-IN', { maximumFractionDigits: 1 })} s`)
const bandLabels: Record<keyof Numbers['bands'], string> = {
  core: 'Core: the search', general: 'General questions', consequential: 'Consequential: law, tax',
  out_of_scope: 'Out of scope', sensitive: 'Sensitive', adversarial: 'Adversarial',
}

function Metric({ label, value, note, children }: { label: string; value: string; note?: string; children?: ReactNode }) {
  return (
    <section aria-label={label} className={card}>
      <p className="text-sm font-medium text-tertiary">{label}</p>
      <p className="text-display-xs font-semibold text-primary">{value}</p>
      {note && <p className="text-sm text-tertiary">{note}</p>}
      {children}
    </section>
  )
}

/** The switch of PD7: the fallback model answers each call alone while it is on (T-65). */
function GeminiSwitch({ state, fallback }: { state: AiOverviewResponse['switch']; fallback: string | undefined }) {
  const user = useUser()
  const queryClient = useQueryClient()
  const [asking, setAsking] = useState(false)
  const flip = useMutation({
    mutationFn: (body: ModelSwitchBody) => api(user, '/v1/admin/ai/switch', modelSwitchState, { method: 'PUT', body }),
    onSuccess: () => {
      setAsking(false)
      return queryClient.invalidateQueries({ queryKey: ['admin'] })
    },
  })
  return (
    <section className={`${card} bg-secondary`}>
      <Toggle title="Use Gemini for all calls" checked={state.geminiOnly} disabled={flip.isPending}
        help="Flip it when the main model is down or slow. It acts on the next call, with no deploy, and the team gets a Telegram message."
        problem={flip.isError ? errorText(flip.error) : null}
        onChange={(on) => (on ? setAsking(true) : flip.mutate({ geminiOnly: false }))} />
      {state.since && (
        <p className="text-sm text-tertiary">
          {`${state.geminiOnly ? 'On' : 'Off'} since ${ago(state.since)}${state.by ? `, by ${state.by}` : ''}.`}
        </p>
      )}
      {asking && (
        <Modal icon={CpuChip01} iconTone="neutral" title="Use Gemini for all calls?" onClose={() => setAsking(false)}
          actions={
            <>
              <Button variant="secondary" size="lg" className="flex-1" onClick={() => setAsking(false)}>Cancel</Button>
              <Button variant="primary" size="lg" className="flex-1" disabled={flip.isPending} onClick={() => flip.mutate({ geminiOnly: true })}>Switch all calls</Button>
            </>
          }>
          {`The next call of each role goes to the fallback model${fallback ? `, ${fallback}` : ''}. Replies can be slower, and in English more often. Switch back when the main model works again. The log keeps your name and the time.`}
        </Modal>
      )}
    </section>
  )
}

function CallMetrics({ numbers: { today, lastQuarterHour } }: { numbers: Numbers }) {
  return (
    <>
      <Metric label="Model calls today" value={today.calls.toLocaleString('en-IN')} note={`${lastQuarterHour.calls.toLocaleString('en-IN')} in the last 15 minutes`} />
      <Metric label="Calls failed" value={percent(today.failedShare)} note={`${percent(lastQuarterHour.failedShare)} in the last 15 minutes`} />
      <Metric label="Sent to the fallback" value={percent(today.fallbackShare)} note={`${percent(lastQuarterHour.fallbackShare)} in the last 15 minutes`} />
      <Metric label="Slowest 5% of calls" value={seconds(today.p95Ms)} note="Each call has its own time limit" />
    </>
  )
}

function RolesAndBands({ numbers }: { numbers: Numbers }) {
  const total = Object.values(numbers.bands).reduce((a, b) => a + b, 0)
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <section aria-label="By role, today" className={`${card} overflow-x-auto lg:flex-1`}>
        <h2 className="text-lg font-semibold text-primary">By role, today</h2>
        <table className="w-full min-w-120 text-left text-sm">
          <thead className="text-xs font-medium text-tertiary">
            <tr>{['Role', 'Calls', 'Failed', 'To the fallback', 'Slowest 5%', 'Spend'].map((h) => <th key={h} className="py-2 pr-3 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody className="text-secondary">
            {numbers.roles.map((r) => (
              <tr key={r.role} className="border-t border-secondary">
                <td className="py-2.5 pr-3 font-semibold text-primary capitalize">{r.role}</td>
                <td className="py-2.5 pr-3">{r.calls.toLocaleString('en-IN')}</td>
                <td className="py-2.5 pr-3">{percent(r.failedShare)}</td>
                <td className="py-2.5 pr-3">{percent(r.fallbackShare)}</td>
                <td className="py-2.5 pr-3">{seconds(r.p95Ms)}</td>
                <td className="py-2.5 pr-3">{rupees(r.rupees)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!numbers.roles.length && <p className="text-sm text-tertiary">No model call today.</p>}
      </section>
      <section aria-label="Router bands, today" className={`${card} lg:w-116`}>
        <h2 className="text-lg font-semibold text-primary">Router bands, today</h2>
        {(Object.keys(bandLabels) as (keyof Numbers['bands'])[]).map((band) => (
          <p key={band} className="grid grid-cols-[10rem_1fr_3rem] items-center gap-3 text-sm text-secondary">
            <span>{bandLabels[band]}</span>
            <Bar value={numbers.bands[band]} max={total} label={bandLabels[band]} />
            <span className="text-right font-medium text-tertiary">{numbers.bands[band]}</span>
          </p>
        ))}
      </section>
    </div>
  )
}

/** The overview of the AI pipeline: the switch, the spend, the calls of today and the bands (T-65, drafts section 39). */
export function AiOverview() {
  const ai = useAiOverview()
  if (ai.isError) return <p role="alert" className="text-sm text-error-primary">{errorText(ai.error)}</p>
  if (ai.isPending) return <p className="text-sm text-tertiary">Loading…</p>
  const { spend, numbers } = ai.data
  return (
    <>
      <GeminiSwitch state={ai.data.switch} fallback={ai.data.settings.models?.fallback} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Metric label="Spend today" value={rupees(spend.today)} note={`of ${rupees(spend.dailyAmount)} a day`}>
          <Bar value={spend.today} max={spend.dailyAmount} label="Spend today" />
        </Metric>
        {numbers && <CallMetrics numbers={numbers} />}
      </div>
      {numbers ? <RolesAndBands numbers={numbers} /> : <p className="text-sm text-tertiary">No numbers of the calls: the analytics database is not set, or it did not answer.</p>}
    </>
  )
}

function Setting({ name, value }: { name: string; value: string }) {
  return (
    <p className="flex flex-col gap-0.5 border-t border-secondary py-2.5 text-sm first-of-type:border-t-0 md:flex-row md:gap-3">
      <span className="font-medium text-tertiary md:w-56 md:shrink-0">{name}</span>
      <span className="text-primary">{value}</span>
    </p>
  )
}

/** The opens of a turn, newest first: the audit log of the traces (T-64). */
function TraceViews() {
  const views = useTraceViews()
  return (
    <section aria-label="Trace views" className={card}>
      <h2 className="text-lg font-semibold text-primary">Trace views</h2>
      {views.isError && <p role="alert" className="text-sm text-error-primary">{errorText(views.error)}</p>}
      {views.data && (views.data.views.length ? (
        <ul className="flex flex-col">
          {views.data.views.map((v, i) => (
            <li key={i} className="flex flex-col gap-0.5 border-t border-secondary py-2.5 first:border-t-0">
              <span className="text-sm font-semibold text-primary">{`${v.sessionCode} · turn ${v.turn}`}</span>
              <span className="text-sm text-tertiary">{`${v.by ?? 'A deleted account'} · ${dateAndTime(v.at)}`}</span>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-tertiary">Nobody opened a turn yet.</p>)}
    </section>
  )
}

/** The settings of the server, read-only, the log of the switch (T-65), and the log of the trace views (T-64). */
export function AiSettingsAndLog() {
  const ai = useAiOverview()
  const log = useSwitchLog()
  if (ai.isError || log.isError) return <p role="alert" className="text-sm text-error-primary">{errorText(ai.error ?? log.error)}</p>
  if (ai.isPending || log.isPending) return <p className="text-sm text-tertiary">Loading…</p>
  const { settings, spend } = ai.data
  const { limits } = settings
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <section aria-label="Settings of the server" className={`${card} lg:flex-1`}>
        <h2 className="text-lg font-semibold text-primary">Settings of the server</h2>
        <p className="text-sm text-tertiary">Read-only. A change of these is a deploy, and a change of a prompt runs the eval set first.</p>
        <div className="flex flex-col">
          <Setting name="Main model" value={settings.models?.primary ?? 'Not set'} />
          <Setting name="Fallback" value={settings.models ? `${settings.models.fallback}, after a failed call, and for each call while the switch is on` : 'Not set'} />
          <Setting name="Time limit of a call" value={settings.models ? seconds(settings.models.timeoutMs) : 'Not set'} />
          <Setting name="Daily spend amount" value={`${rupees(spend.dailyAmount)} · alerts at ${settings.spendAlertPercents.map((p) => `${p}%`).join(' and ')}`} />
          <Setting name="Router confidence" value={String(settings.routerMinProbability)} />
          <Setting name="Visitor messages" value={`${limits.turnCap} before the sign-in wall, ${limits.turnBackstop} at most`} />
          <Setting name="Visitor chats" value={`${limits.sessionsPerDevice} a device, ${limits.sessionsPerIp} a network, ${limits.sessionsPerIpRange} a network range`} />
          <Setting name="Typed messages" value={`${limits.typedTurnsPerMinute} a minute`} />
          <Setting name="Traces kept" value="30 days after the call · religion and community words masked" />
        </div>
      </section>
      <div className="flex flex-col gap-4 lg:w-136">
        <section aria-label="Gemini switch log" className={card}>
          <h2 className="text-lg font-semibold text-primary">Gemini switch log</h2>
          {log.data.flips.length ? (
            <ul className="flex flex-col">
              {log.data.flips.map((flip) => (
                <li key={flip.at} className="flex flex-col gap-0.5 border-t border-secondary py-2.5 first:border-t-0">
                  <span className="flex items-center gap-2 text-sm font-semibold text-primary">
                    {flip.geminiOnly ? 'Switched to the fallback model' : 'Switched back to the main model'}
                    {flip.geminiOnly && <Badge tone="warning" dot={false}>Fallback</Badge>}
                  </span>
                  <span className="text-sm text-tertiary">{`${flip.by ?? 'A deleted account'} · ${dateAndTime(flip.at)}`}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-tertiary">Nobody flipped the switch yet.</p>}
        </section>
        <TraceViews />
      </div>
    </div>
  )
}
