import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyBulkEventUpdates,
  applyBulkStatusUpdates,
  buildBulkEventUpdatePayload,
  filterManageableEvents,
  selectAllVisibleEventIds,
  toggleSelectedEventId
} from '../src/lib/bulkEventActions.js'

const event = {
  id: 'event-1',
  start_time: '2026-07-10T18:00:00.000Z',
  end_time: '2026-07-10T20:00:00.000Z',
  created_by: 'organizer-1'
}

test('selects individual events', () => {
  let selected = new Set()
  selected = toggleSelectedEventId(selected, '1', true)
  selected = toggleSelectedEventId(selected, '2', true)
  selected = toggleSelectedEventId(selected, '1', false)

  assert.deepEqual([...selected], ['2'])
})

test('select all only adds visible events', () => {
  const selected = selectAllVisibleEventIds(new Set(['hidden']), [{ id: 'visible-1' }, { id: 'visible-2' }])

  assert.deepEqual([...selected].sort(), ['hidden', 'visible-1', 'visible-2'])
})

test('only enabled bulk fields are included in update payload', () => {
  const payload = buildBulkEventUpdatePayload(event, {
    changeStartTime: true,
    start_time: '19:00',
    changeLocation: false,
    location: 'BLOX',
    changeCategory: true,
    category: 'class'
  })

  assert.equal(payload.start_time, '2026-07-10T19:00:00.000Z')
  assert.equal(payload.category, 'class')
  assert.equal('location' in payload, false)
  assert.equal('end_time' in payload, false)
})

test('supports weekly true and false updates', () => {
  assert.equal(buildBulkEventUpdatePayload(event, { changeRecurring: true, is_recurring: true }).is_recurring, true)
  assert.equal(buildBulkEventUpdatePayload(event, { changeRecurring: true, is_recurring: false }).is_recurring, false)
  assert.equal('is_recurring' in buildBulkEventUpdatePayload(event, { changeRecurring: false, is_recurring: false }), false)
})

test('filters manageable events by organizer and admin permissions', () => {
  const events = [{ id: '1', created_by: 'organizer-1' }, { id: '2', created_by: 'organizer-2' }]

  assert.deepEqual(filterManageableEvents(events, { id: 'organizer-1' }, 'organizer').map((item) => item.id), ['1'])
  assert.deepEqual(filterManageableEvents(events, { id: 'admin-1' }, 'admin').map((item) => item.id), ['1', '2'])
})

test('reports partial failures for bulk edits', async () => {
  const result = await applyBulkEventUpdates([{ ...event, id: '1' }, { ...event, id: '2' }], { changeCategory: true, category: 'social' }, async (item) => (
    item.id === '2' ? { error: new Error('failed') } : {}
  ))

  assert.equal(result.succeeded, 1)
  assert.equal(result.failed, 1)
})

test('bulk cancel and restore payloads are applied as provided', async () => {
  const cancelResult = await applyBulkStatusUpdates([event], { status: 'cancelled', cancellation_reason: 'Weather' }, async (item, payload) => {
    assert.deepEqual(payload, { status: 'cancelled', cancellation_reason: 'Weather' })
    return {}
  })
  const restoreResult = await applyBulkStatusUpdates([event], { status: 'approved', cancellation_reason: null }, async (item, payload) => {
    assert.deepEqual(payload, { status: 'approved', cancellation_reason: null })
    return {}
  })

  assert.equal(cancelResult.succeeded, 1)
  assert.equal(restoreResult.succeeded, 1)
})
