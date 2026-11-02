#!/usr/bin/env node
// The abuse test of PD9 (T-29), against the live API: node tools/abuse-test.mjs [api origin] [device limit]
// One fixed user agent uses up only its own device count, not the count of a browser on the same network.

const origin = process.argv[2] ?? 'https://api.roomsie.in'
const deviceLimit = Number(process.argv[3] ?? 10)
const asks = 100

let failed = 0
const check = (ok, line) => {
  console.log(`${ok ? 'pass' : 'FAIL'}  ${line}`)
  if (!ok) failed++
}
const post = async (path, body, key) => {
  const res = await fetch(`${origin}/v1${path}`, {
    method: 'POST',
    headers: { 'user-agent': 'roomsie-abuse-test', ...(key && { 'x-visitor-key': key }), ...(body && { 'content-type': 'application/json' }) },
    body: body && JSON.stringify(body),
  })
  return { status: res.status, body: await res.json().catch(() => null) }
}

// 1. The device limit: 100 asks for a new visitor session from one device.
const opened = []
const refusals = {}
for (let i = 0; i < asks; i++) {
  const { status, body } = await post('/goals')
  if (status === 201) opened.push({ id: body.id, key: body.visitorKey, cap: body.typedTurnsLeft })
  else {
    const reason = `${status} ${body?.limit ?? body?.error}`
    refusals[reason] = (refusals[reason] ?? 0) + 1
  }
}
console.log(`asked ${asks}: ${opened.length} opened, refused ${JSON.stringify(refusals)}`)
check(opened.length <= deviceLimit, `at most ${deviceLimit} sessions open from one device (a run in the last 24 hours uses up some)`)
check(refusals['429 too_many_chats'] === asks - opened.length, 'each other ask gets 429 too_many_chats')

// 2. The turn cap: chips to results, then typed turns until the wall.
if (!opened.length) check(false, 'no session opened, so the cap is not checked: run again in 24 hours')
else {
  const { id, key, cap } = opened[0]
  for (const tap of [{ slot: 'intent', value: 'room' }, { slot: 'areas', value: ['thane'] }, { slot: 'budget', value: 'under_25k' }]) {
    const { status } = await post(`/goals/${id}/turns`, { tap }, key)
    check(status === 200, `the chip ${tap.slot} passes (got ${status})`)
  }
  const left = []
  for (let i = 0; i < cap; i++) left.push((await post(`/goals/${id}/turns`, { text: `a quiet flat, message ${i + 1}` }, key)).body?.typedTurnsLeft)
  check(left.at(-1) === 0, `${cap} typed turns count down to 0: ${JSON.stringify(left)}`)
  const capped = await post(`/goals/${id}/turns`, { text: 'one more' }, key)
  check(capped.status === 403 && capped.body?.limit === 'turn_cap', `the next typed turn gets 403 turn_cap (got ${capped.status} ${capped.body?.limit})`)
}

console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed')
process.exitCode = failed ? 1 : 0
