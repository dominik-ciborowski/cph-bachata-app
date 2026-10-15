import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { buildOccurrenceRanges, getWeeklyOccurrenceDates } from '../src/lib/weeklyRecurrence.js'

test('generates Wednesdays inclusively across a date range', () => {
  assert.deepEqual(
    getWeeklyOccurrenceDates('2026-09-09', '2026-09-30', [3]),
    ['2026-09-09', '2026-09-16', '2026-09-23', '2026-09-30']
  )
})

test('generates multiple selected weekdays and returns the preview count source', () => {
  const dates = getWeeklyOccurrenceDates('2026-09-01', '2026-09-10', [2, 4])
  assert.deepEqual(dates, ['2026-09-01', '2026-09-03', '2026-09-08', '2026-09-10'])
  assert.equal(dates.length, 4)
})

test('rejects incomplete or reversed weekly selections', () => {
  assert.deepEqual(getWeeklyOccurrenceDates('2026-09-10', '2026-09-01', [2]), [])
  assert.deepEqual(getWeeklyOccurrenceDates('2026-09-01', '2026-09-10', []), [])
})

test('builds a concrete multi-day range for every generated occurrence', () => {
  assert.deepEqual(buildOccurrenceRanges(['2026-09-11', '2026-09-18'], 3), [
    { startDate: '2026-09-11', endDate: '2026-09-13' },
    { startDate: '2026-09-18', endDate: '2026-09-20' }
  ])
})

test('Add Event owns weekly creation and separate bulk navigation is removed', async () => {
  const addEvent = await readFile(new URL('../src/views/AdminView.vue', import.meta.url), 'utf8')
  const navigation = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
  const management = await readFile(new URL('../src/views/ManagementView.vue', import.meta.url), 'utf8')

  assert.match(addEvent, /> Repeats weekly/)
  assert.match(addEvent, /occurrenceRanges\.map/)
  assert.match(addEvent, /> Multiple dates/)
  assert.match(addEvent, /recurringDates\.length : selectedDates\.length/)
  assert.doesNotMatch(navigation, /Bulk Add Event/)
  assert.doesNotMatch(management, /Bulk Add Events/)
})
