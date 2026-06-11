/**
 * @typedef {Object} Event
 * @property {string} id
 * @property {string} title
 * @property {string} created_by Authenticated user id for the organizer who owns the event.
 * @property {string | null} organizer
 * @property {string | null} organizer_id
 * @property {string | null} event_link
 * @property {string} start_time
 * @property {string | null} end_time
 * @property {string} category
 * @property {string | null} location
 * @property {string | null} description
 * @property {string | null} price_text
 * @property {boolean} approved
 */

import { formatOrganizerDisplay, getOrganizerDisplayName, getOrganizerRecord } from './organizerDisplay.js'

export function normalizeEvent(row) {
  if (!row) return row

  const organizerRecord = getOrganizerRecord(row)

  return {
    ...row,
    organizer_record: organizerRecord,
    organizer: row.organizer || organizerRecord?.name || null,
    organizer_name: getOrganizerDisplayName(row),
    organizer_display: formatOrganizerDisplay(row),
    event_link: row.event_link || row.facebook_url || null
  }
}
