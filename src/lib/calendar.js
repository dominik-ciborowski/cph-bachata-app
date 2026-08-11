export function getDateKey(value) {
  const date = new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function startOfWeek(value) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  return date
}

export function addWeeks(value, amount) {
  const date = startOfWeek(value)
  date.setDate(date.getDate() + amount * 7)
  return date
}

export function getWeekRange(value) {
  const start = startOfWeek(value)
  const end = addWeeks(start, 1)
  return { start, end }
}

export function isEventPast(event, now = new Date()) {
  return new Date(event.end_time || event.start_time) < now
}

export function getWeekDays(value, events = [], today = new Date()) {
  const weekStart = startOfWeek(value)
  const groups = events.reduce((result, event) => {
    const key = getDateKey(event.start_time)
    ;(result[key] ||= []).push(event)
    return result
  }, {})

  Object.values(groups).forEach(dayEvents => {
    dayEvents.sort((first, second) => new Date(first.start_time) - new Date(second.start_time))
  })

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + index)
    const dateKey = getDateKey(date)
    return { date, dateKey, events: groups[dateKey] || [], isToday: dateKey === getDateKey(today) }
  })
}
