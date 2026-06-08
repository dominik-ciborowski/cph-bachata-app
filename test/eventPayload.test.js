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
  it('omits created_by from update payloads', () => {
    assert.equal('created_by' in buildEventPayload(form), false)
  })

  it('adds authenticated user id as created_by for new single events', () => {
    const payload = buildNewEventPayload(form, 'user-123')

    assert.equal(payload.created_by, 'user-123')
    assert.equal(payload.title, form.title)
    assert.equal(payload.event_link, form.event_link)
  })

  it('adds created_by to every bulk-created event payload', () => {
    const rows = buildBulkEventPayloads(form, ['2026-06-12', '2026-06-19'], 'user-456')

    assert.equal(rows.length, 2)
    assert.deepEqual(rows.map((row) => row.created_by), ['user-456', 'user-456'])
  })

  it('preserves the existing created_by ownership field when normalizing events', () => {
    assert.equal(normalizeEvent({ created_by: 'user-789' }).created_by, 'user-789')
  })
})
