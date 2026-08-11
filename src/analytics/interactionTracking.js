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

/**
 * @param {import('./types.js').CalendarMode} mode
 * @param {import('./types.js').CalendarMode} previousMode
 */
export function trackCalendarModeChanged(mode, previousMode) {
  if (mode === previousMode) return
  /** @type {import('./types.js').CalendarModeChangedProperties} */
  const properties = { mode, previousMode }
  analytics.track(AnalyticsEvents.CALENDAR_MODE_CHANGED, properties)
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

export function trackHomeLogoClicked(sourcePage) {
  /** @type {import('./types.js').HomeLogoClickedProperties} */
  const properties = { sourcePage }
  analytics.track(AnalyticsEvents.HOME_LOGO_CLICKED, properties)
}

function getEventActionProperties(event, source) {
  const organizerId = event.organizer_id || event.organizer_record?.id
  /** @type {import('./types.js').EventActionProperties} */
  const properties = {
    ...(event.id != null ? { eventId: event.id } : {}),
    ...(organizerId != null ? { organizerId } : {}),
    ...(event.category ? { eventType: event.category } : {}),
    isFree: isFreePrice(event.price_text),
    source
  }
  return properties
}

export function trackSavedEvent(event, source, wasSaved) {
  analytics.track(
    wasSaved ? AnalyticsEvents.EVENT_SAVED : AnalyticsEvents.EVENT_UNSAVED,
    getEventActionProperties(event, source)
  )
}

export function trackCalendarExportClicked(event, source) {
  analytics.track(AnalyticsEvents.CALENDAR_EXPORT_CLICKED, getEventActionProperties(event, source))
}

export function trackOrganizerEvent(eventName, event, source = 'management') {
  analytics.track(eventName, getEventActionProperties(event, source))
}

export function trackBulkEventsCreated(event, createdCount) {
  const organizerId = event.organizer_id || event.organizer_record?.id
  /** @type {import('./types.js').BulkEventsCreatedProperties} */
  const properties = {
    ...(organizerId != null ? { organizerId } : {}),
    ...(event.category ? { eventType: event.category } : {}),
    isFree: isFreePrice(event.price_text),
    source: 'management',
    createdCount
  }
  analytics.track(AnalyticsEvents.BULK_EVENTS_CREATED, properties)
}

export function trackEventSubmission(eventName, eventType, isFree, errorType) {
  /** @type {import('./types.js').EventSubmissionProperties} */
  const properties = {
    ...(eventType ? { eventType } : {}),
    isFree,
    ...(errorType ? { errorType } : {})
  }
  analytics.track(eventName, properties)
}

export function trackAnnouncement(eventName, announcementId) {
  /** @type {import('./types.js').AnnouncementProperties} */
  const properties = { announcementId, source: 'site_banner' }
  analytics.track(eventName, properties)
}

export function trackSearchNoResults(queryLength, activeFilterCount) {
  /** @type {import('./types.js').SearchNoResultsProperties} */
  const properties = { queryLength, activeFilterCount }
  analytics.track(AnalyticsEvents.SEARCH_NO_RESULTS, properties)
}
