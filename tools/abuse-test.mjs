#!/usr/bin/env node
// The abuse test of PD9 (T-29), against the live API: node tools/abuse-test.mjs [api origin]
// One fixed user agent uses up only its own device count, not the count of a browser on the same network.
import assert from 'node:assert/strict'
import { test } from 'node:test'

const origin = process.argv[2] ?? 'https://api.roomsie.in'
// The first values of PD9 in the API: VISITOR_SESSIONS_PER_DEVICE and VISITOR_TURN_CAP.
const deviceLimit = 10
const turnCap = 5
const asks = 100

const post = async (path, body, key) => {
  const res = await fetch(`${origin}/v1${path}`, {
    method: 'POST',
    headers: { 'user-agent': 'roomsie-abuse-test', ...(key && { 'x-visitor-key': key }), ...(body && { 'content-type': 'application/json' }) },
    body: body && JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  })
  return { status: res.status, body: await res.json().catch(() => null) }
}

const opened = []

test(`the device limit refuses each new visitor session after the first ${deviceLimit}`, async () => {
  const refusals = []
  for (let i = 0; i < asks; i++) {
    const { status, body } = await post('/goals')
    if (status === 201) opened.push(body)
    else refusals.push(`${status} ${body?.limit ?? body?.error}`)
  }
  // Fewer sessions open when a run in the last 24 hours used up some of the count of this device.
  assert.equal(opened.length, deviceLimit)
  assert.deepEqual(new Set(refusals), new Set(['429 too_many_chats']))
})

test(`the turn cap refuses the typed turn after the first ${turnCap}`, async () => {
  assert.ok(opened.length, 'no session opened: run again in 24 hours')
  const { id, visitorKey: key, typedTurnsLeft } = opened[0]
  assert.equal(typedTurnsLeft, turnCap)
  for (const tap of [{ slot: 'intent', value: 'room' }, { slot: 'areas', value: ['thane'] }, { slot: 'budget', value: 'under_25k' }]) {
    assert.equal((await post(`/goals/${id}/turns`, { tap }, key)).status, 200)
  }
  const left = []
  for (let i = 0; i < turnCap; i++) left.push((await post(`/goals/${id}/turns`, { text: `a quiet flat, message ${i + 1}` }, key)).body?.typedTurnsLeft)
  assert.deepEqual(left, Array.from({ length: turnCap }, (_, i) => turnCap - 1 - i))
  const capped = await post(`/goals/${id}/turns`, { text: 'one more' }, key)
  assert.deepEqual([capped.status, capped.body?.limit], [403, 'turn_cap'])
})
