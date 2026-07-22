export const announcementDismissStorageKey = 'copenhagen-bachata-dismissed-announcements'
export const announcementTypes = ['info', 'warning', 'maintenance', 'success']

export function normalizeAnnouncement(row) {
  if (!row) return null

  const type = announcementTypes.includes(row.type) ? row.type : 'info'

  return {
    ...row,
    type,
    title: row.title || '',
    message: row.message || ''
  }
}

export function isAnnouncementCurrentlyActive(announcement, now = new Date()) {
  if (!announcement?.is_active) return false

  const startsAt = announcement.starts_at ? new Date(announcement.starts_at) : null
  const endsAt = announcement.ends_at ? new Date(announcement.ends_at) : null

  if (startsAt && startsAt > now) return false
  if (endsAt && endsAt < now) return false

  return true
}

export function readDismissedAnnouncementIds(storage = globalThis.localStorage) {
  try {
    const rawValue = storage?.getItem(announcementDismissStorageKey)
    const parsedValue = rawValue ? JSON.parse(rawValue) : []
    return new Set(Array.isArray(parsedValue) ? parsedValue.map(String) : [])
  } catch {
    return new Set()
  }
}

export function dismissAnnouncementId(id, storage = globalThis.localStorage) {
  const dismissedIds = readDismissedAnnouncementIds(storage)
  if (!id) return dismissedIds

  dismissedIds.add(String(id))

  try {
    storage?.setItem(announcementDismissStorageKey, JSON.stringify([...dismissedIds]))
  } catch {
    // Ignore storage failures; callers can still use the returned set for this session.
  }

  return dismissedIds
}
