import { isFreePrice } from './eventPresentation.js'

export function getStartOfDay(date = new Date()) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  return start
}

export function getWeekendRange(referenceDate = new Date()) {
  const today = getStartOfDay(referenceDate)
  const day = today.getDay()
  const start = new Date(today)

  if (day >= 1 && day <= 4) {
    start.setDate(today.getDate() + (5 - day))
  }

  if (day === 0) {
    start.setDate(today.getDate())
  }

  const end = new Date(start)

  if (day === 0) {
    end.setDate(start.getDate() + 1)
  } else if (day === 6) {
    end.setDate(start.getDate() + 2)
  } else {
    end.setDate(start.getDate() + 3)
  }

  return { start, end }
}

export function isTodayEvent(event, referenceDate = new Date()) {
  const date = new Date(event.start_time)
  return date.toDateString() === getStartOfDay(referenceDate).toDateString()
}

export function isWeekendEvent(event, referenceDate = new Date()) {
  const eventDate = new Date(event.start_time)
  const weekendRange = getWeekendRange(referenceDate)
  return eventDate >= weekendRange.start && eventDate < weekendRange.end
}

export function matchesEventSearch(event, searchQuery = '') {
  if (!searchQuery) return true
  const query = searchQuery.toLowerCase()
  return (
    (event.title || '').toLowerCase().includes(query) ||
    (event.organizer_display || event.organizer || '').toLowerCase().includes(query) ||
    (event.location || '').toLowerCase().includes(query)
  )
}

export function filterEvents(events, options = {}) {
  const {
    filter = 'all',
    category = 'all',
    searchQuery = '',
    referenceDate = new Date()
  } = options
  const today = getStartOfDay(referenceDate)

  return [...events]
    .filter(event => new Date(event.start_time) >= today)
    .filter(event => filter !== 'today' || isTodayEvent(event, today))
    .filter(event => filter !== 'weekend' || isWeekendEvent(event, today))
    .filter(event => filter !== 'free' || isFreePrice(event.price_text))
    .filter(event => category === 'all' || event.category === category)
    .filter(event => matchesEventSearch(event, searchQuery))
    .sort((first, second) => new Date(first.start_time) - new Date(second.start_time))
}
