/**
 * Shared analytics contracts. Providers can be added without exposing their
 * platform-specific APIs to the application.
 */

/**
 * @typedef {string | number | boolean | null | undefined} AnalyticsPropertyValue
 * @typedef {Record<string, AnalyticsPropertyValue>} AnalyticsProperties
 * @typedef {{ initialize: () => void, track: (event: AnalyticsEvent, properties?: AnalyticsProperties) => void }} AnalyticsProvider
 */

export const AnalyticsEvents = {
  EVENT_OPENED: 'event_opened',
  MAPS_CLICKED: 'maps_clicked',
  EVENT_LINK_CLICKED: 'event_link_clicked',
  FAVORITE_ADDED: 'favorite_added',
  FAVORITE_REMOVED: 'favorite_removed',
  SEARCH_USED: 'search_used',
  FILTER_USED: 'filter_used',
  VIEW_LIST: 'view_list',
  VIEW_CALENDAR: 'view_calendar',
  VIEW_WEEK: 'view_week',
  LIST_VIEW_SELECTED: 'list_view_selected',
  CALENDAR_VIEW_SELECTED: 'calendar_view_selected',
  CALENDAR_DATE_SELECTED: 'calendar_date_selected',
  CALENDAR_EVENT_CLICKED: 'calendar_event_clicked',
  CALENDAR_MONTH_CHANGED: 'calendar_month_changed',
  LOGIN_CLICKED: 'login_clicked',
  LOGIN_SUCCEEDED: 'login_succeeded',
  REGISTER_CLICKED: 'register_clicked',
  REGISTER_SUCCEEDED: 'register_succeeded',
  LOGOUT_CLICKED: 'logout_clicked',
  HOME_LOGO_CLICKED: 'home_logo_clicked',
  EVENT_SAVED: 'event_saved',
  EVENT_UNSAVED: 'event_unsaved',
  CALENDAR_EXPORT_CLICKED: 'calendar_export_clicked',
  EVENT_CREATED: 'event_created',
  EVENT_UPDATED: 'event_updated',
  EVENT_DELETED: 'event_deleted',
  EVENT_DUPLICATED: 'event_duplicated',
  BULK_EVENTS_CREATED: 'bulk_events_created',
  SEARCH_PERFORMED: 'search_performed',
  FILTER_CHANGED: 'filter_changed',
  FILTERS_CLEARED: 'filters_cleared'
}

/** @typedef {typeof AnalyticsEvents[keyof typeof AnalyticsEvents]} AnalyticsEvent */

/**
 * @typedef {{ selectedDate: string }} CalendarDateSelectedProperties
 * @typedef {{ month: string }} CalendarMonthChangedProperties
 * @typedef {{ eventId: string | number, organizerId?: string | number, eventType?: string, isFree: boolean }} CalendarEventClickedProperties
 * @typedef {{ queryLength: number, resultCount: number }} SearchPerformedProperties
 * @typedef {{ filterType: string, selectedValue: string }} FilterChangedProperties
 * @typedef {{ sourcePage: string }} HomeLogoClickedProperties
 * @typedef {{ eventId?: string | number, organizerId?: string | number, eventType?: string, isFree: boolean, source: string }} EventActionProperties
 * @typedef {{ organizerId?: string | number, eventType?: string, isFree: boolean, source: string, createdCount: number }} BulkEventsCreatedProperties
 */
