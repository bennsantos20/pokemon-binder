import { test } from 'node:test'
import assert from 'node:assert/strict'
import { searchCards, getCardById } from '../src/services/tcgdex.ts'

test('TCGdex forwards optional signals, encodes queries, and preserves response data', async () => {
  const original = globalThis.fetch
  const calls: Array<[unknown, RequestInit | undefined]> = []
  const payload = { id: 'set/card', name: 'Pikachu', localId: '1', variants_detailed: [{ variantId: 'holo', type: 'holo', size: 'normal' }], extra: true }
  globalThis.fetch = (async (url, options) => { calls.push([url, options]); return { ok: true, json: async () => String(url).includes("?name=") ? [payload] : payload } }) as typeof fetch
  try {
    const controller = new AbortController()
    assert.deepEqual(await searchCards('Mr. Mime & friends', controller.signal), [payload])
    assert.deepEqual(await getCardById('set/card', controller.signal), payload)
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

const valid = { id: 'base1-58', name: 'Pikachu', localId: '58' }
async function withResponse(value: unknown, run: () => Promise<void>) {
  const original = globalThis.fetch
  globalThis.fetch = (async () => ({ ok: true, json: async () => value })) as typeof fetch
  try { await run() } finally { globalThis.fetch = original }
}

test('malformed HTTP-200 search structures and card identities are rejected before entering state', async () => {
  for (const value of [null, {}, 'cards', [null], [valid, {}], [{ ...valid, name: {} }], [{ ...valid, localId: null }], [{ ...valid, id: ' ' }]]) {
    await withResponse(value, async () => { await assert.rejects(searchCards('Pikachu'), /invalid/) })
  }
  await withResponse([], async () => { assert.deepEqual(await searchCards('none'), []) })
})

test('malformed HTTP-200 details and mismatched card IDs are rejected', async () => {
  for (const value of [null, [], {}, { ...valid, name: null }, { ...valid, id: 'different' }]) {
    await withResponse(value, async () => { await assert.rejects(getCardById(valid.id), /invalid|wrong card/) })
  }
})

test('optional metadata is normalized without rejecting usable cards or losing extras and printings', async () => {
  for (const metadata of [undefined, null, [], {}, [{ invalid: true }]]) {
    const payload = { ...valid, image: null, rarity: {}, set: { name: {} }, variants_detailed: metadata, custom: { preserved: true } }
    await withResponse(payload, async () => {
      const card = await getCardById(valid.id)
      assert.equal(card.image, undefined); assert.equal(card.rarity, undefined); assert.equal(card.set, undefined)
      assert.deepEqual(card.variants_detailed, metadata)
      assert.deepEqual((card as any).custom, payload.custom)
      assert.equal(payload.image, null)
    })
  }
  const payload = { ...valid, image: 'https://assets.tcgdex.net/en/base/base1/58', set: { id: 'base1', name: 'Base Set', extra: true }, variants_detailed: [{ variantId: 'normal', type: 'normal', size: 'normal', extra: true }] }
  await withResponse(payload, async () => { assert.deepEqual(await getCardById(valid.id), payload) })
})

test('invalid JSON and cancellation while parsing propagate without converting cancellation into errors', async () => {
  const original = globalThis.fetch
  try {
    for (const error of [new SyntaxError('Invalid JSON'), new DOMException('Canceled', 'AbortError')]) {
      globalThis.fetch = (async () => ({ ok: true, json: async () => { throw error } })) as typeof fetch
      await assert.rejects(searchCards('Pikachu'), error)
      await assert.rejects(getCardById(valid.id), error)
    }
  } finally { globalThis.fetch = original }
})
