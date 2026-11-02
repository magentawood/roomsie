#!/usr/bin/env node
// The abuse test of PD9 (T-29): a script that acts as a bot against the live API. Run it before the launch:
//   node tools/abuse-test.mjs [api origin] [device limit] [turn cap]
// It asks for 100 visitor sessions from one device, and the device limit must refuse each one after the first few.
// In the first session, it taps the chips to results, then sends typed turns until the cap refuses one.
// It uses one fixed user agent, so it uses up only its own device count, not the count of a browser on the same network.

const [origin = 'https://api.roomsie.in', deviceLimit = '10', turnCap = '5'] = process.argv.slice(2)
const api = `${origin}/v1`
const userAgent = 'roomsie-abuse-test'
const asks = 100

const failures = []
const check = (ok, line) => {
  console.log(`${ok ? 'pass' : 'FAIL'}  ${line}`)
  if (!ok) failures.push(line)
}
const post = async (path, body, key) => {
  const res = await fetch(`${api}${path}`, {
    method: 'POST',
    headers: { 'user-agent': userAgent, ...(key && { 'x-visitor-key': key }), ...(body && { 'content-type': 'application/json' }) },
    body: body && JSON.stringify(body),
  })
  return { status: res.status, body: await res.json().catch(() => null) }
}

// 1. The device limit: 100 asks for a new visitor session from one device.
const opened = []
const refusals = {}
for (let i = 0; i < asks; i++) {
  const { status, body } = await post('/goals')
  if (status === 201) opened.push({ id: body.id, key: body.visitorKey })
  else refusals[`${status} ${body?.limit ?? body?.error}`] = (refusals[`${status} ${body?.limit ?? body?.error}`] ?? 0) + 1
}
console.log(`asked ${asks}: ${opened.length} opened, refused ${JSON.stringify(refusals)}`)
check(opened.length <= Number(deviceLimit), `at most ${deviceLimit} sessions open from one device (a run in the last 24 hours uses up some)`)
check(refusals['429 too_many_chats'] === asks - opened.length, 'each other ask gets 429 too_many_chats')

// 2. The turn cap: chips to results, then typed turns until the wall.
if (!opened.length) check(false, 'no session opened, so the cap is not checked: run again in 24 hours')
else {
  const { id, key } = opened[0]
  for (const tap of [{ slot: 'intent', value: 'room' }, { slot: 'areas', value: ['thane'] }, { slot: 'budget', value: 'under_25k' }]) {
    check((await post(`/goals/${id}/turns`, { tap }, key)).status === 200, `the chip ${tap.slot} passes`)
  }
  const left = []
  for (let i = 0; i < Number(turnCap); i++) left.push((await post(`/goals/${id}/turns`, { text: `a quiet flat, message ${i + 1}` }, key)).body?.typedTurnsLeft)
  check(left.at(-1) === 0, `${turnCap} typed turns count down to 0: ${JSON.stringify(left)}`)
  const capped = await post(`/goals/${id}/turns`, { text: 'one more' }, key)
  check(capped.status === 403 && capped.body?.limit === 'turn_cap', `the next typed turn gets 403 turn_cap (got ${capped.status} ${capped.body?.limit})`)
}

console.log(failures.length ? `\n${failures.length} check(s) failed` : '\nAll checks passed')
process.exit(failures.length ? 1 : 0)
