export const APP_PREFERENCES_STORAGE_KEY = 'copenhagen-bachata-app-preferences'

export function readAppPreferences(storage = localStorage) {
  try {
    return JSON.parse(storage.getItem(APP_PREFERENCES_STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

export function updateAppPreferences(changes, storage = localStorage) {
  try {
    const preferences = { ...readAppPreferences(storage), ...changes }
    storage.setItem(APP_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences))
  } catch {
    // A preference is non-critical; in-memory state remains available this session.
  }
}

export function getCalendarView(storage = localStorage) {
  const value = readAppPreferences(storage).calendarView
  return value === 'week' ? 'week' : 'month'
}
