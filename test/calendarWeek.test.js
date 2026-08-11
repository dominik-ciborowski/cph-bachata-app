import test from 'node:test'
import assert from 'node:assert/strict'

import { addWeeks, getDateKey, getWeekDays, getWeekRange, isEventPast, startOfWeek } from '../src/lib/calendar.js'
import { APP_PREFERENCES_STORAGE_KEY, getCalendarView, updateAppPreferences } from '../src/lib/appPreferences.js'

test('week boundaries run from Monday through Sunday', () => {
  const start = startOfWeek(new Date(2026, 7, 2, 12))
  const days = getWeekDays(start)
  assert.equal(getDateKey(start), '2026-07-27')
  assert.equal(days.length, 7)
  assert.equal(days[0].dateKey, '2026-07-27')
  assert.equal(days[6].dateKey, '2026-08-02')
})

test('week navigation moves exactly seven days in either direction', () => {
  const date = new Date(2026, 7, 2)
  assert.equal(getDateKey(addWeeks(date, -1)), '2026-07-20')
  assert.equal(getDateKey(addWeeks(date, 1)), '2026-08-03')
})

test('selected week range is Monday inclusive through the following Monday exclusive', () => {
  const range = getWeekRange(new Date(2026, 7, 2, 12))
  assert.equal(getDateKey(range.start), '2026-07-27')
  assert.equal(getDateKey(range.end), '2026-08-03')
})

test('events are grouped into their day and empty days remain present', () => {
  const events = [
    { id: 1, start_time: '2026-07-28T18:00:00' },
    { id: 2, start_time: '2026-07-28T20:00:00' },
    { id: 3, start_time: '2026-08-01T18:00:00' }
  ]
  const days = getWeekDays(new Date(2026, 6, 27), events, new Date(2026, 6, 29))
  assert.deepEqual(days.map(day => day.events.length), [0, 2, 0, 0, 0, 1, 0])
  assert.equal(days[2].isToday, true)
})

test('events within each day are ordered by start time', () => {
  const days = getWeekDays(new Date(2026, 6, 27), [
    { id: 'late', start_time: '2026-07-28T22:00:00' },
    { id: 'early', start_time: '2026-07-28T18:00:00' },
    { id: 'middle', start_time: '2026-07-28T20:00:00' }
  ])
  assert.deepEqual(days[1].events.map(event => event.id), ['early', 'middle', 'late'])
})

test('completed events earlier in the selected week are identified as past', () => {
  const now = new Date('2026-07-30T12:00:00')
  assert.equal(isEventPast({ start_time: '2026-07-28T18:00:00', end_time: '2026-07-28T20:00:00' }, now), true)
  assert.equal(isEventPast({ start_time: '2026-08-01T18:00:00' }, now), false)
})

test('calendar presentation persists independently while preserving preferences', () => {
  const values = new Map([[APP_PREFERENCES_STORAGE_KEY, JSON.stringify({ preferredView: 'calendar' })]])
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
  assert.equal(getCalendarView(storage), 'month')
  updateAppPreferences({ calendarView: 'week' }, storage)
  assert.equal(getCalendarView(storage), 'week')
  assert.equal(JSON.parse(values.get(APP_PREFERENCES_STORAGE_KEY)).preferredView, 'calendar')
})
