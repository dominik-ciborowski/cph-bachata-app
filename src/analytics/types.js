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
  VIEW_WEEK: 'view_week'
}

/** @typedef {typeof AnalyticsEvents[keyof typeof AnalyticsEvents]} AnalyticsEvent */
