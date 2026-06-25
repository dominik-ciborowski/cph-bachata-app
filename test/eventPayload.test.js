import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildBulkEventPayloads, buildEventPayload, buildNewEventPayload, buildSubmittedEventPayload } from '../src/lib/eventPayload.js'
import { normalizeEvent } from '../src/lib/events.js'
import { formatPriceDisplay, getPriceDetails, getPriceNote, isFreePrice } from '../src/lib/eventPresentation.js'

const form = {
  title: 'Friday Social',
  organizer: 'DanceManiacs',
  organizer_id: 'organizer-123',
  category: 'social',
  location: 'Copenhagen',
  description: '',
  price: { type: 'free', amount: '', options: [{ label: '', amount: '' }], note: '' },
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
    assert.equal(payload.price_text, JSON.stringify({ type: 'free' }))
    assert.equal(payload.organizer_id, form.organizer_id)
    assert.equal(payload.status, 'approved')
  })

  it('adds created_by to every bulk-created event payload', () => {
    const rows = buildBulkEventPayloads(form, ['2026-06-12', '2026-06-19'], 'user-456')

    assert.equal(rows.length, 2)
    assert.deepEqual(rows.map((row) => row.created_by), ['user-456', 'user-456'])
    assert.deepEqual(rows.map((row) => row.status), ['approved', 'approved'])
  })

  it('marks community submissions as pending with submitter metadata', () => {
    const payload = buildSubmittedEventPayload(form, 'user-789')

    assert.equal(payload.status, 'pending')
    assert.equal(payload.created_by, 'user-789')
    assert.equal(payload.submitted_by, 'user-789')
    assert.match(payload.submitted_at, /T/)
  })

  it('preserves the existing created_by ownership field when normalizing events', () => {
    assert.equal(normalizeEvent({ created_by: 'user-789' }).created_by, 'user-789')
  })

  it('formats organizer names from organizer records and marks unverified organizers', () => {
    const event = normalizeEvent({
      organizer: 'Fallback Organizer',
      organizer_record: { name: 'Record Organizer', verified: false }
    })

    assert.equal(event.organizer_name, 'Record Organizer')
    assert.equal(event.organizer_display, 'Record Organizer (Unverified)')
  })

  it('falls back to organizer text when an organizer record is missing', () => {
    const event = normalizeEvent({ organizer: 'Fallback Organizer' })

    assert.equal(event.organizer_name, 'Fallback Organizer')
    assert.equal(event.organizer_display, 'Fallback Organizer')
  })
})

it('matches admin and organizer ownership rules for event management permissions', async () => {
  const { canManageEvent } = await import('../src/lib/permissions.js')
  const event = { created_by: 'organizer-1' }

  assert.equal(canManageEvent(event, { id: 'admin-1' }, 'admin'), true)
  assert.equal(canManageEvent(event, { id: 'organizer-1' }, 'organizer'), true)
  assert.equal(canManageEvent(event, { id: 'organizer-2' }, 'organizer'), false)
  assert.equal(canManageEvent(event, { id: 'user-1' }, 'user'), false)
  assert.equal(canManageEvent(event, null, 'admin'), false)
})


describe('free price detection', () => {
  it('matches prices displayed as free by the current price formatter', () => {
    for (const priceText of [null, '', ' ', '0', '0.0', '0,0', '0 DKK', '0 kr', 'free', 'gratis']) {
      assert.equal(isFreePrice(priceText), true)
    }
  })

  it('does not include paid prices in the free filter', () => {
    for (const priceText of ['50', '50 DKK', '100 kr', '0-50 DKK', 'donation']) {
      assert.equal(isFreePrice(priceText), false)
    }
  })
})


describe('structured price presentation', () => {
  it('formats multiple prices as a compact range', () => {
    const priceText = JSON.stringify({
      type: 'multiple',
      options: [
        { label: '1 workshop', amount: '150' },
        { label: '2 workshops', amount: '250' },
        { label: '3 workshops', amount: '400' }
      ]
    })

    assert.equal(formatPriceDisplay(priceText), '150–400 DKK')
    assert.deepEqual(getPriceDetails(priceText), [
      { label: '1 workshop', amount: '150' },
      { label: '2 workshops', amount: '250' },
      { label: '3 workshops', amount: '400' }
    ])
  })

  it('collapses identical multiple prices to one price', () => {
    const priceText = JSON.stringify({
      type: 'multiple',
      options: [
        { label: 'Member', amount: '140' },
        { label: 'Guest', amount: '140' }
      ]
    })

    assert.equal(formatPriceDisplay(priceText), '140 DKK')
  })

  it('formats fixed, free, and see-link structured prices', () => {
    assert.equal(formatPriceDisplay(JSON.stringify({ type: 'fixed', amount: '140' })), '140 DKK')
    assert.equal(formatPriceDisplay(JSON.stringify({ type: 'free' })), 'FREE')
    assert.equal(formatPriceDisplay(JSON.stringify({ type: 'link', note: 'Ticket options available on the event page.' })), 'SEE LINK')
    assert.equal(getPriceNote(JSON.stringify({ type: 'link', note: 'Ticket options available on the event page.' })), 'Ticket options available on the event page.')
  })
})
