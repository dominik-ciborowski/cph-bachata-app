import { isFreePrice } from '../lib/eventPresentation.js'
import { analytics } from './index.js'
import { AnalyticsEvents } from './types.js'

export function getEventAnalyticsProperties(event, source) {
  const organizerId = event.organizer_id || event.organizer_record?.id

  return {
    eventId: event.id,
    ...(organizerId ? { organizerId } : {}),
    ...(event.category ? { eventType: event.category } : {}),
    isFree: isFreePrice(event.price_text),
    hasExternalLink: Boolean(event.event_link),
    source
  }
}

export function trackEventOpened(event, source) {
  analytics.track(AnalyticsEvents.EVENT_OPENED, getEventAnalyticsProperties(event, source))
}

export function trackMapsClicked(event) {
  analytics.track(AnalyticsEvents.MAPS_CLICKED, getEventAnalyticsProperties(event, 'event_details'))
}

export function trackEventLinkClicked(event) {
  analytics.track(AnalyticsEvents.EVENT_LINK_CLICKED, getEventAnalyticsProperties(event, 'event_details'))
}
