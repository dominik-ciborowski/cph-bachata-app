import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  applyOrganizerToImportedEvents,
  combineIcsFileResults,
  copenhagenDateTimeToIso,
  getIcsImportErrors,
  getImportableOrganizers,
  parseIcsEvents
} from '../src/lib/icsImport.js'

const singleEventIcs = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:event-1
SUMMARY:Friday Social
DTSTART;TZID=Europe/Copenhagen:20260821T193000
DTEND;TZID=Europe/Copenhagen:20260821T223000
LOCATION:BLOX\\, Copenhagen
DESCRIPTION:Social dancing\\nDoors open at 19:00
URL:https://example.com/friday
END:VEVENT
END:VCALENDAR`

test('parses a valid single-event ICS into an editable preview', () => {
  const [event] = parseIcsEvents(singleEventIcs)

  assert.equal(event.title, 'Friday Social')
  assert.equal(event.date, '2026-08-21')
  assert.equal(event.start_time, '19:30')
  assert.equal(event.end_time, '22:30')
  assert.equal(event.location, 'BLOX, Copenhagen')
  assert.equal(event.description, 'Social dancing\nDoors open at 19:00')
  assert.equal(event.event_link, 'https://example.com/friday')
  assert.equal(event.organizer_id, '')
  assert.equal(event.category, '')
  assert.equal(event.price.type, '')
})

test('parses multiple VEVENT entries', () => {
  const source = singleEventIcs.replace('END:VCALENDAR', `BEGIN:VEVENT
SUMMARY:Sunday Class
DTSTART:20260823T140000Z
END:VEVENT
END:VCALENDAR`)

  const events = parseIcsEvents(source)
  assert.equal(events.length, 2)
  assert.deepEqual(events.map((event) => event.title), ['Friday Social', 'Sunday Class'])
})

test('combines events from multiple ICS files and retains errors from failed files', () => {
  const secondFile = singleEventIcs.replace('Friday Social', 'Saturday Social')
  const result = combineIcsFileResults([
    { name: 'friday.ics', source: singleEventIcs },
    { name: 'broken.ics', source: 'not a calendar' },
    { name: 'saturday.ics', source: secondFile }
  ])

  assert.deepEqual(result.events.map((event) => event.title), ['Friday Social', 'Saturday Social'])
  assert.deepEqual(result.events.map((event) => event.importId), ['ics-event-1', 'ics-event-2'])
  assert.equal(result.errors.length, 1)
  assert.match(result.errors[0], /broken\.ics: No events were found/)
})

test('applies one organizer to all previews while preserving individual overrides', () => {
  const events = combineIcsFileResults([
    { name: 'one.ics', source: singleEventIcs },
    { name: 'two.ics', source: singleEventIcs.replace('Friday Social', 'Another Social') }
  ]).events

  applyOrganizerToImportedEvents(events, { id: 'house', name: 'Bachata House' })
  assert.deepEqual(events.map((event) => event.organizer_id), ['house', 'house'])
  assert.deepEqual(events.map((event) => event.organizer), ['Bachata House', 'Bachata House'])

  events[1].organizer_id = 'studio'
  events[1].organizer = 'Other Studio'
  assert.equal(events[0].organizer, 'Bachata House')
  assert.equal(events[1].organizer, 'Other Studio')
})

test('allows missing optional ICS fields without inventing values', () => {
  const [event] = parseIcsEvents(`BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:Simple Class
DTSTART:20260824T180000Z
END:VEVENT
END:VCALENDAR`)

  assert.equal(event.location, '')
  assert.equal(event.description, '')
  assert.equal(event.event_link, '')
  assert.equal(event.end_time, '')
})

test('reports missing required and organizer-confirmed fields before import', () => {
  const [event] = parseIcsEvents(`BEGIN:VCALENDAR
BEGIN:VEVENT
LOCATION:Copenhagen
END:VEVENT
END:VCALENDAR`)

  assert.deepEqual(getIcsImportErrors(event), [
    'Title is required.',
    'Date is required.',
    'Start time is required.',
    'Organizer must be selected.',
    'Category must be selected.',
    'Price must be confirmed.'
  ])
})

test('converts UTC and TZID date-times to Copenhagen local time', () => {
  const events = parseIcsEvents(`BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:UTC event
DTSTART:20260821T180000Z
END:VEVENT
BEGIN:VEVENT
SUMMARY:New York event
DTSTART;TZID=America/New_York:20260821T180000
END:VEVENT
END:VCALENDAR`)

  assert.deepEqual(
    events.map((event) => [event.date, event.start_time]),
    [['2026-08-21', '20:00'], ['2026-08-22', '00:00']]
  )
  assert.equal(copenhagenDateTimeToIso('2026-08-21', '20:00'), '2026-08-21T18:00:00.000Z')
})

test('limits organizer imports to organizers the current organizer can already manage', () => {
  const organizers = [
    { id: 'owned', name: 'Owned', created_by: 'user-1' },
    { id: 'used', name: 'Used before', created_by: 'user-2' },
    { id: 'other', name: 'Other', created_by: 'user-2' }
  ]
  const manageableEvents = [{ organizer_id: 'used', created_by: 'user-1' }]

  assert.deepEqual(
    getImportableOrganizers(organizers, { id: 'user-1' }, 'organizer', manageableEvents).map((item) => item.id),
    ['owned', 'used']
  )
  assert.equal(getImportableOrganizers(organizers, { id: 'user-1' }, 'user', manageableEvents).length, 0)
  assert.equal(getImportableOrganizers(organizers, { id: 'admin-1' }, 'admin', manageableEvents).length, 3)
})

test('rejects malformed ICS input with a useful error', () => {
  assert.throws(() => parseIcsEvents('not a calendar'), /No events were found/)
  assert.throws(() => parseIcsEvents('BEGIN:VEVENT\nSUMMARY:Broken'), /incomplete event/)
  assert.throws(() => parseIcsEvents('BEGIN:VEVENT\nSUMMARY:Broken\nDTSTART:nope\nEND:VEVENT'), /Unsupported ICS date\/time/)
})

test('preserves multi-day ICS event dates', () => {
  const [event] = parseIcsEvents(`BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:Overnight event
DTSTART;TZID=Europe/Copenhagen:20260821T220000
DTEND;TZID=Europe/Copenhagen:20260822T010000
END:VEVENT
END:VCALENDAR`)

  assert.equal(event.date, '2026-08-21')
  assert.equal(event.end_date, '2026-08-22')
  assert.equal(event.end_time, '01:00')
})

test('the management import flow renders a preview before its explicit save action', async () => {
  const source = await readFile(new URL('../src/views/IcsImportView.vue', import.meta.url), 'utf8')

  assert.match(source, /v-if="previewEvents\.length" class="ics-import-preview"/)
  assert.match(source, /Nothing will be saved until you confirm below\./)
  assert.match(source, /@submit\.prevent="confirmImport"/)
  assert.match(source, /Import \{\{ previewEvents\.length \}\} event/)
})

test('only admins receive multi-file and bulk import controls', async () => {
  const source = await readFile(new URL('../src/views/IcsImportView.vue', import.meta.url), 'utf8')

  assert.match(source, /:multiple="isAdmin"/)
  assert.match(source, /v-if="isAdmin" class="card form ics-import-bulk"/)
  assert.match(source, /if \(!isAdmin\.value\) return/)
  assert.match(source, /selectedFiles\.slice\(0, 1\)/)
})
