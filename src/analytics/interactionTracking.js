import { isFreePrice } from '../lib/eventPresentation.js'
import { analytics } from './index.js'
import { AnalyticsEvents } from './types.js'

export function trackViewSelected(view) {
  const event = view === 'calendar'
    ? AnalyticsEvents.CALENDAR_VIEW_SELECTED
    : AnalyticsEvents.LIST_VIEW_SELECTED
  analytics.track(event)
}

/** @param {string} selectedDate */
export function trackCalendarDateSelected(selectedDate) {
  /** @type {import('./types.js').CalendarDateSelectedProperties} */
  const properties = { selectedDate }
  analytics.track(AnalyticsEvents.CALENDAR_DATE_SELECTED, properties)
}

/** @param {string} month */
export function trackCalendarMonthChanged(month) {
  /** @type {import('./types.js').CalendarMonthChangedProperties} */
  const properties = { month }
  analytics.track(AnalyticsEvents.CALENDAR_MONTH_CHANGED, properties)
}

export function trackCalendarEventClicked(event) {
  const organizerId = event.organizer_id || event.organizer_record?.id
  /** @type {import('./types.js').CalendarEventClickedProperties} */
  const properties = {
    eventId: event.id,
    ...(organizerId ? { organizerId } : {}),
    ...(event.category ? { eventType: event.category } : {}),
    isFree: isFreePrice(event.price_text)
  }
  analytics.track(AnalyticsEvents.CALENDAR_EVENT_CLICKED, properties)
}

export function trackLoginClicked() {
  analytics.track(AnalyticsEvents.LOGIN_CLICKED)
}

export function trackLoginSucceeded() {
  analytics.track(AnalyticsEvents.LOGIN_SUCCEEDED)
}

export function trackRegisterClicked() {
  analytics.track(AnalyticsEvents.REGISTER_CLICKED)
}

export function trackRegisterSucceeded() {
  analytics.track(AnalyticsEvents.REGISTER_SUCCEEDED)
}

export function trackLogoutClicked() {
  analytics.track(AnalyticsEvents.LOGOUT_CLICKED)
}

export function trackSearchPerformed(queryLength, resultCount) {
  /** @type {import('./types.js').SearchPerformedProperties} */
  const properties = { queryLength, resultCount }
  analytics.track(AnalyticsEvents.SEARCH_PERFORMED, properties)
}

export function trackFilterChanged(filterType, selectedValue) {
  /** @type {import('./types.js').FilterChangedProperties} */
  const properties = { filterType, selectedValue }
  analytics.track(AnalyticsEvents.FILTER_CHANGED, properties)
}

export function trackFiltersCleared() {
  analytics.track(AnalyticsEvents.FILTERS_CLEARED)
}
