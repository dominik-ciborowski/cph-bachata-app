import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { buildEventSeriesPayload, SERIES_GENERATION_TYPES } from '../src/lib/eventSeries.js'
import { buildNewEventPayload } from '../src/lib/eventPayload.js'

const baseForm = {
  title: 'Weekly class', organizer: 'Studio', organizer_id: 'organizer-1', category: 'class',
  price: { type: 'free' }, start_time: '19:00', end_time: '', is_recurring: true
}

test('one-off events have concrete dates and no series', () => {
  const event = buildNewEventPayload({ ...baseForm, date: '2026-09-09', end_date: '' }, 'user-1')
  assert.equal(event.series_id, null)
  assert.equal(event.start_date, '2026-09-09')
  assert.equal(event.end_date, '2026-09-09')
  assert.equal(event.end_time, null)
})

test('series metadata is descriptive and belongs to the events organizer', () => {
  const series = buildEventSeriesPayload({
    title: 'Weekly class', generation_type: SERIES_GENERATION_TYPES.WEEKLY,
    recurrence_start_date: '2026-09-09', recurrence_end_date: '2026-09-30', weekdays: [3]
  }, 'organizer-1', 'user-1')

  assert.deepEqual(series, {
    organizer_id: 'organizer-1', title: 'Weekly class', generation_type: 'WEEKLY',
    recurrence_start_date: '2026-09-09', recurrence_end_date: '2026-09-30', weekdays: [3], event_duration_days: 1, created_by: 'user-1'
  })
})

test('all concrete occurrences can share one series and organizer', () => {
  const events = ['2026-09-09', '2026-09-16'].map((date) => buildNewEventPayload({
    ...baseForm, date, end_date: date, series_id: 'series-1'
  }, 'user-1'))

  assert.deepEqual(events.map((event) => event.series_id), ['series-1', 'series-1'])
  assert.deepEqual(events.map((event) => event.organizer_id), ['organizer-1', 'organizer-1'])
})

test('event listing and individual editing continue to use concrete event rows', async () => {
  const management = await readFile(new URL('../src/views/ManagementView.vue', import.meta.url), 'utf8')
  const addEvent = await readFile(new URL('../src/views/AdminView.vue', import.meta.url), 'utf8')

  assert.match(management, /\.from\('events'\)/)
  assert.doesNotMatch(management, /\.from\('event_series'\)/)
  assert.match(addEvent, /supabase\.from\('events'\)\.update\(payload\)\.eq\('id', eventId\.value\)/)
})
