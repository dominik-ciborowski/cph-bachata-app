import { describe, expect, it } from 'vitest'
import { buildBulkEventPayloads, buildEventPayload, buildNewEventPayload } from '../src/lib/eventPayload.js'
import { normalizeEvent } from '../src/lib/events.js'
import { isFreePrice } from '../src/lib/eventPresentation.js'
import { canManageEvent } from '../src/lib/permissions.js'

const form = {
  title: 'Friday Social',
  organizer: 'DanceManiacs',
  organizer_id: 'organizer-123',
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
    expect('created_by' in buildEventPayload(form)).toBe(false)
  })

  it('adds authenticated user id as created_by for new single events', () => {
    const payload = buildNewEventPayload(form, 'user-123')

    expect(payload.created_by).toBe('user-123')
    expect(payload.title).toBe(form.title)
    expect(payload.event_link).toBe(form.event_link)
    expect(payload.organizer_id).toBe(form.organizer_id)
  })

  it('adds created_by to every bulk-created event payload', () => {
    const rows = buildBulkEventPayloads(form, ['2026-06-12', '2026-06-19'], 'user-456')

    expect(rows).toHaveLength(2)
    expect(rows.map((row) => row.created_by)).toEqual(['user-456', 'user-456'])
  })

  it('preserves the existing created_by ownership field when normalizing events', () => {
    expect(normalizeEvent({ created_by: 'user-789' }).created_by).toBe('user-789')
  })

  it('formats organizer names from organizer records and marks unverified organizers', () => {
    const event = normalizeEvent({
      organizer: 'Fallback Organizer',
      organizer_record: { name: 'Record Organizer', verified: false }
    })

    expect(event.organizer_name).toBe('Record Organizer')
    expect(event.organizer_display).toBe('Record Organizer (Unverified)')
  })

  it('falls back to organizer text when an organizer record is missing', () => {
    const event = normalizeEvent({ organizer: 'Fallback Organizer' })

    expect(event.organizer_name).toBe('Fallback Organizer')
    expect(event.organizer_display).toBe('Fallback Organizer')
  })
})

describe('event management permissions', () => {
  it('matches admin and organizer ownership rules', () => {
    const event = { created_by: 'organizer-1' }

    expect(canManageEvent(event, { id: 'admin-1' }, 'admin')).toBe(true)
    expect(canManageEvent(event, { id: 'organizer-1' }, 'organizer')).toBe(true)
    expect(canManageEvent(event, { id: 'organizer-2' }, 'organizer')).toBe(false)
    expect(canManageEvent(event, { id: 'user-1' }, 'user')).toBe(false)
    expect(canManageEvent(event, null, 'admin')).toBe(false)
  })
})

describe('free price detection', () => {
  it('matches prices displayed as free by the current price formatter', () => {
    for (const priceText of [null, '', ' ', '0', '0.0', '0,0', '0 DKK', '0 kr', 'free', 'gratis']) {
      expect(isFreePrice(priceText)).toBe(true)
    }
  })

  it('does not include paid prices in the free filter', () => {
    for (const priceText of ['50', '50 DKK', '100 kr', '0-50 DKK', 'donation']) {
      expect(isFreePrice(priceText)).toBe(false)
    }
  })
})
