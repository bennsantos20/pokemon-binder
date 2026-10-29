import { test } from 'node:test'
import assert from 'node:assert/strict'
import { searchCards, getCardById } from '../src/services/tcgdex.ts'

test('TCGdex forwards optional signals, encodes queries, and preserves response data', async () => {
  const original = globalThis.fetch
  const calls: Array<[unknown, RequestInit | undefined]> = []
  const payload = { id: 'test', variants_detailed: [{ variantId: 'holo', type: 'holo', size: 'normal' }], extra: true }
  globalThis.fetch = (async (url, options) => { calls.push([url, options]); return { ok: true, json: async () => payload } }) as typeof fetch
  try {
    const controller = new AbortController()
    assert.equal(await searchCards('Mr. Mime & friends', controller.signal), payload)
    assert.equal(await getCardById('set/card', controller.signal), payload)
    assert.equal(calls[0][0], 'https://api.tcgdex.net/v2/en/cards?name=Mr.%20Mime%20%26%20friends')
    assert.equal(calls[1][0], 'https://api.tcgdex.net/v2/en/cards/set%2Fcard')
    assert.equal(calls[0][1]?.signal, controller.signal)
    assert.equal(calls[1][1]?.signal, controller.signal)
    await searchCards('Pikachu'); assert.equal(calls[2][1]?.signal, undefined)
  } finally { globalThis.fetch = original }
})

test('TCGdex rejects HTTP failures, network failures, and cancellation', async () => {
  const original = globalThis.fetch
  try {
    globalThis.fetch = (async () => ({ ok: false })) as typeof fetch
    await assert.rejects(searchCards('Pikachu'), /Failed to search/)
    await assert.rejects(getCardById('id'), /Failed to load/)
    globalThis.fetch = async () => { throw Error('offline') }
    await assert.rejects(searchCards('Pikachu'), /offline/)
    globalThis.fetch = async () => { throw new DOMException('Canceled', 'AbortError') }
    await assert.rejects(getCardById('id'), { name: 'AbortError' })
  } finally { globalThis.fetch = original }
})
