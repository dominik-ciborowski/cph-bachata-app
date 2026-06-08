import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildBulkEventPayloads, buildEventPayload, buildNewEventPayload } from '../src/lib/eventPayload.js'
import { normalizeEvent } from '../src/lib/events.js'

const form = {
  title: 'Friday Social',
  organizer: 'DanceManiacs',
  category: 'social',
  location: 'Copenhagen',
  description: '',
  price_text: '0',
  event_link: 'https://example.com/event',
  date: '2026-06-12',
  start_time: '18:30',
  end_time: '21:30'
}

describe('event payload ownership', () => {
  it('omits ownerId from update payloads', () => {
    assert.equal('ownerId' in buildEventPayload(form), false)
  })

  it('adds authenticated user id as ownerId for new single events', () => {
    const payload = buildNewEventPayload(form, 'user-123')

    assert.equal(payload.ownerId, 'user-123')
    assert.equal(payload.title, form.title)
    assert.equal(payload.event_link, form.event_link)
  })

  it('adds ownerId to every bulk-created event payload', () => {
    const rows = buildBulkEventPayloads(form, ['2026-06-12', '2026-06-19'], 'user-456')

    assert.equal(rows.length, 2)
    assert.deepEqual(rows.map((row) => row.ownerId), ['user-456', 'user-456'])
  })

  it('normalizes legacy ownership fields to ownerId', () => {
    assert.equal(normalizeEvent({ created_by: 'legacy-user' }).ownerId, 'legacy-user')
    assert.equal(normalizeEvent({ owner_id: 'snake-user' }).ownerId, 'snake-user')
    assert.equal(normalizeEvent({ ownerId: 'camel-user' }).ownerId, 'camel-user')
  })
})
