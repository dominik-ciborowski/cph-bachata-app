import test from 'node:test'
import assert from 'node:assert/strict'

import { buildEventIcs, escapeIcsText } from '../src/lib/calendarExport.js'

test('escapeIcsText escapes calendar special characters', () => {
  assert.equal(escapeIcsText('Line 1\nComma, semi; slash\\'), 'Line 1\\nComma\\, semi\\; slash\\\\')
})

test('buildEventIcs creates a single Copenhagen timezone event', () => {
  const ics = buildEventIcs({
    id: 'event-1',
    title: 'Bachata, Social; Night',
    start_time: '2026-06-20T18:00:00.000Z',
    end_time: '2026-06-20T21:30:00.000Z',
    location: 'Copenhagen, DK',
    organizer_display: 'CPH Bachata',
    description: 'Dance with us',
    event_link: 'https://example.com/event'
  })

  const unfoldedIcs = ics.replace(/\r\n[ \t]/g, '')

  assert.match(unfoldedIcs, /^BEGIN:VCALENDAR\r\nVERSION:2.0/m)
  assert.match(unfoldedIcs, /BEGIN:VEVENT/)
  assert.match(unfoldedIcs, /UID:event-1@copenhagen-bachata\.app/)
  assert.match(unfoldedIcs, /DTSTART;TZID=Europe\/Copenhagen:20260620T200000/)
  assert.match(unfoldedIcs, /DTEND;TZID=Europe\/Copenhagen:20260620T233000/)
  assert.match(unfoldedIcs, /SUMMARY:Bachata\\, Social\\; Night/)
  assert.match(unfoldedIcs, /DESCRIPTION:Dance with us\\n\\nOrganizer: CPH Bachata\\n\\nEvent link: https:\/\/example.com\/event/)
  assert.match(unfoldedIcs, /LOCATION:Copenhagen\\, DK/)
  assert.match(unfoldedIcs, /URL:https:\/\/example.com\/event/)
  assert.match(ics, /END:VCALENDAR\r\n$/)
})
