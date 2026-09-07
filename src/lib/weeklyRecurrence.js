export const WEEKDAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' }
]

function parseDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDate(date) {
  return date.toISOString().slice(0, 10)
}

export function getWeeklyOccurrenceDates(startDate, endDate, weekdays) {
  const start = parseDate(startDate)
  const end = parseDate(endDate)
  const selectedDays = new Set((weekdays || []).map(Number))
  if (!start || !end || start > end || selectedDays.size === 0) return []

  const dates = []
  for (const date = new Date(start); date <= end; date.setUTCDate(date.getUTCDate() + 1)) {
    if (selectedDays.has(date.getUTCDay())) dates.push(formatDate(date))
  }
  return dates
}
