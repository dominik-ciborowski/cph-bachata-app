export function normalizeEvent(row) {
  if (!row) return row

  return {
    ...row,
    event_link: row.event_link || row.facebook_url || null
  }
}
