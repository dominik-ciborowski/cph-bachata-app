import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { deleteSelectedEvents } from '../src/lib/bulkEventActions.js'
import { groupManagementEvents, selectSeriesEventIds } from '../src/lib/eventManagementGroups.js'

const events = [
  { id: 'one', title: 'Weekly social', series_id: 10, start_time: '2026-09-29T18:30:00Z' },
  { id: 'two', title: 'Weekly social', series_id: 10, start_time: '2026-10-06T18:30:00Z' },
  { id: 'solo', title: 'Halloween', series_id: null, start_time: '2026-10-31T20:00:00Z' }
]

test('groups matching concrete events by series and leaves standalone events alone', () => {
  const grouped = groupManagementEvents(events)
  assert.equal(grouped[0].type, 'series')
  assert.deepEqual(grouped[0].events.map((event) => event.id), ['one', 'two'])
  assert.equal(grouped[0].events.length, 2)
  assert.equal(grouped[1].type, 'event')
  assert.equal(grouped[1].event.id, 'solo')
})

test('series count derives from current concrete rows after an occurrence is removed', () => {
  const grouped = groupManagementEvents(events.filter((event) => event.id !== 'one'))
  assert.equal(grouped.find((item) => item.type === 'series').events.length, 1)
})

test('filtered grouping and Select series operate only on represented concrete rows', () => {
  const visible = events.filter((event) => event.id === 'two')
  const [series] = groupManagementEvents(visible)
  assert.deepEqual([...selectSeriesEventIds(new Set(), series.events)], ['two'])
})

test('bulk delete passes selected concrete IDs to the destructive operation', async () => {
  let deletedIds
  const result = await deleteSelectedEvents(events.slice(0, 2), async (ids) => {
    deletedIds = ids
    return { error: null }
  })
  assert.deepEqual(deletedIds, ['one', 'two'])
  assert.deepEqual(result, { deleted: 2, error: null })
})

test('Event Management offers grouping, expansion, and destructive confirmation', async () => {
  const management = await readFile(new URL('../src/views/ManagementView.vue', import.meta.url), 'utf8')
  const navigation = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')

  assert.match(navigation, />Event Management<\/RouterLink>/)
  assert.doesNotMatch(navigation, />Dashboard<\/RouterLink>/)
  assert.match(management, /Individual events/)
  assert.match(management, /Group by series/)
  assert.match(management, /Select series/)
  assert.match(management, /isSeriesExpanded/)
  assert.match(management, /Permanently delete.*selected event/)
  assert.match(management, /description="This cannot be undone\."/)
  assert.match(management, /count: 'exact', head: true/)
  assert.match(management, /count === 0.*event_series/s)
})
