/**
 * @typedef {Object} Event
 * @property {string} id
 * @property {string} title
 * @property {string} created_by Authenticated user id for the organizer who owns the event.
 * @property {string | null} organizer
 * @property {string | null} event_link
 * @property {string} start_time
 * @property {string | null} end_time
 * @property {string} category
 * @property {string | null} location
 * @property {string | null} description
 * @property {string | null} price_text
 * @property {boolean} approved
 */

export function normalizeEvent(row) {
  if (!row) return row

  return {
    ...row,
    event_link: row.event_link || row.facebook_url || null
  }
}
