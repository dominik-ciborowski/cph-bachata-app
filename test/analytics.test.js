import test from 'node:test'
import assert from 'node:assert/strict'

import { AnalyticsService } from '../src/analytics/analyticsService.js'
import { analytics } from '../src/analytics/index.js'
import { trackEventLinkClicked, trackEventOpened, trackMapsClicked } from '../src/analytics/eventTracking.js'
import {
  trackCalendarDateSelected,
  trackCalendarEventClicked,
  trackCalendarExportClicked,
  trackCalendarMonthChanged,
  trackBulkEventsCreated,
  trackFilterChanged,
  trackFiltersCleared,
  trackLoginClicked,
  trackLoginSucceeded,
  trackLogoutClicked,
  trackHomeLogoClicked,
  trackOrganizerEvent,
  trackRegisterClicked,
  trackRegisterSucceeded,
  trackSearchPerformed,
  trackSavedEvent,
  trackViewSelected
} from '../src/analytics/interactionTracking.js'
import { AnalyticsEvents } from '../src/analytics/types.js'
import { UmamiProvider } from '../src/analytics/umamiProvider.js'

test('disabled analytics does not initialize providers', () => {
  let initialized = false
  const service = new AnalyticsService([{ initialize: () => { initialized = true }, track: () => {} }], false)

  service.initialize()

  assert.equal(initialized, false)
})

test('disabled analytics does not track events', () => {
  const service = new AnalyticsService([], false)
  const originalDebug = console.debug
  let logged = false
  console.debug = () => { logged = true }

  try {
    service.track('event_opened')
  } finally {
    console.debug = originalDebug
  }

  assert.equal(logged, false)
})

test('enabled analytics initializes all providers', () => {
  let initializationCount = 0
  const provider = { initialize: () => { initializationCount += 1 }, track: () => {} }
  const service = new AnalyticsService([provider, provider], true)

  service.initialize()

  assert.equal(initializationCount, 2)
})

test('analytics continues when a provider fails to initialize', () => {
  let initialized = false
  const service = new AnalyticsService([
    { initialize: () => { throw new Error('unavailable') }, track: () => {} },
    { initialize: () => { initialized = true }, track: () => {} }
  ], true)
  const originalWarn = console.warn
  console.warn = () => {}

  try {
    assert.doesNotThrow(() => service.initialize())
  } finally {
    console.warn = originalWarn
  }

  assert.equal(initialized, true)
})

test('track logs custom events and forwards them to providers', () => {
  let tracked = false
  const service = new AnalyticsService([{ initialize: () => {}, track: () => { tracked = true } }], true)
  const originalDebug = console.debug
  const calls = []
  console.debug = (...args) => calls.push(args)

  try {
    service.track('event_opened', { eventId: 'event-1' })
  } finally {
    console.debug = originalDebug
  }

  assert.deepEqual(calls, [['[Analytics]', 'event_opened', { eventId: 'event-1' }]])
  assert.equal(tracked, true)
})

test('enabled analytics forwards unchanged properties to every provider', () => {
  const calls = []
  const properties = { eventId: 'event-1', isFree: true }
  const service = new AnalyticsService([
    { initialize: () => {}, track: (event, props) => calls.push([event, props]) },
    { initialize: () => {}, track: (event, props) => calls.push([event, props]) }
  ], true)
  const originalDebug = console.debug
  console.debug = () => {}

  try {
    service.track('event_opened', properties)
  } finally {
    console.debug = originalDebug
  }

  assert.deepEqual(calls, [
    ['event_opened', properties],
    ['event_opened', properties]
  ])
  assert.equal(calls[0][1], properties)
})

test('disabled analytics does not forward events', () => {
  let tracked = false
  const service = new AnalyticsService([{ initialize: () => {}, track: () => { tracked = true } }], false)

  service.track('event_opened', { eventId: 'event-1' })

  assert.equal(tracked, false)
})

test('provider tracking failure does not block another provider', () => {
  let tracked = false
  const service = new AnalyticsService([
    { initialize: () => {}, track: () => { throw new Error('unavailable') } },
    { initialize: () => {}, track: () => { tracked = true } }
  ], true)
  const originalDebug = console.debug
  const originalWarn = console.warn
  console.debug = () => {}
  console.warn = () => {}

  try {
    assert.doesNotThrow(() => service.track('event_opened'))
  } finally {
    console.debug = originalDebug
    console.warn = originalWarn
  }

  assert.equal(tracked, true)
})

function createDocument() {
  const scripts = []
  return {
    getElementById: (id) => scripts.find((script) => script.id === id),
    createElement: () => ({
      setAttribute(name, value) { this[name] = value },
      addEventListener(name, callback) { this[name] = callback }
    }),
    head: { appendChild: (script) => scripts.push(script) },
    scripts
  }
}

test('UmamiProvider inserts its script only once', () => {
  const originalDocument = global.document
  const document = createDocument()
  global.document = document

  try {
    const provider = new UmamiProvider('https://cloud.umami.is/', 'website-id')
    provider.initialize()
    provider.initialize()
  } finally {
    global.document = originalDocument
  }

  assert.equal(document.scripts.length, 1)
  assert.equal(document.scripts[0].src, 'https://cloud.umami.is/script.js')
  assert.equal(document.scripts[0]['data-website-id'], 'website-id')
  assert.equal(document.scripts[0].defer, true)
})

test('UmamiProvider skips script insertion without complete configuration', () => {
  const originalDocument = global.document
  const document = createDocument()
  global.document = document

  try {
    new UmamiProvider('', 'website-id').initialize()
    new UmamiProvider('https://cloud.umami.is', '').initialize()
  } finally {
    global.document = originalDocument
  }

  assert.equal(document.scripts.length, 0)
})

test('UmamiProvider forwards events to Umami unchanged', () => {
  const originalWindow = global.window
  const calls = []
  const properties = { eventId: 'event-1' }
  global.window = { umami: { track: (...args) => calls.push(args) } }

  try {
    new UmamiProvider('https://cloud.umami.is', 'website-id').track('event_opened', properties)
  } finally {
    global.window = originalWindow
  }

  assert.deepEqual(calls, [['event_opened', properties]])
  assert.equal(calls[0][1], properties)
})

test('UmamiProvider safely skips tracking before Umami is available', () => {
  const originalWindow = global.window
  global.window = {}

  try {
    assert.doesNotThrow(() => new UmamiProvider('https://cloud.umami.is', 'website-id').track('event_opened'))
  } finally {
    global.window = originalWindow
  }
})

function captureApplicationEvent(trackAction) {
  const originalTrack = analytics.track
  const calls = []
  analytics.track = (...args) => calls.push(args)

  try {
    trackAction()
  } finally {
    analytics.track = originalTrack
  }

  return calls
}

const analyticsEvent = {
  id: 'event-1',
  organizer_id: 'organizer-1',
  category: 'social',
  price_text: 'Free',
  event_link: 'https://example.com/event'
}

test('event_opened action tracks stable event properties', () => {
  const calls = captureApplicationEvent(() => trackEventOpened(analyticsEvent, 'list'))

  assert.deepEqual(calls, [['event_opened', {
    eventId: 'event-1',
    organizerId: 'organizer-1',
    eventType: 'social',
    isFree: true,
    hasExternalLink: true,
    source: 'list'
  }]])
})

test('maps_clicked action tracks the event details source', () => {
  const calls = captureApplicationEvent(() => trackMapsClicked(analyticsEvent))

  assert.equal(calls[0][0], 'maps_clicked')
  assert.equal(calls[0][1].source, 'event_details')
})

test('event_link_clicked action tracks the event details source', () => {
  const calls = captureApplicationEvent(() => trackEventLinkClicked(analyticsEvent))

  assert.equal(calls[0][0], 'event_link_clicked')
  assert.equal(calls[0][1].source, 'event_details')
})

test('discovery view selection uses the selected view event', () => {
  assert.deepEqual(captureApplicationEvent(() => trackViewSelected('list')), [['list_view_selected']])
  assert.deepEqual(captureApplicationEvent(() => trackViewSelected('calendar')), [['calendar_view_selected']])
})

test('calendar interactions track stable dates and event properties', () => {
  assert.deepEqual(
    captureApplicationEvent(() => trackCalendarDateSelected('2026-07-29')),
    [['calendar_date_selected', { selectedDate: '2026-07-29' }]]
  )
  assert.deepEqual(
    captureApplicationEvent(() => trackCalendarMonthChanged('2026-08')),
    [['calendar_month_changed', { month: '2026-08' }]]
  )
  assert.deepEqual(
    captureApplicationEvent(() => trackCalendarEventClicked(analyticsEvent)),
    [['calendar_event_clicked', {
      eventId: 'event-1',
      organizerId: 'organizer-1',
      eventType: 'social',
      isFree: true
    }]]
  )
})

test('authentication interactions contain no personal properties', () => {
  assert.deepEqual(captureApplicationEvent(trackLoginClicked), [['login_clicked']])
  assert.deepEqual(captureApplicationEvent(trackLoginSucceeded), [['login_succeeded']])
  assert.deepEqual(captureApplicationEvent(trackRegisterClicked), [['register_clicked']])
  assert.deepEqual(captureApplicationEvent(trackRegisterSucceeded), [['register_succeeded']])
  assert.deepEqual(captureApplicationEvent(trackLogoutClicked), [['logout_clicked']])
})

test('search and filter interactions track only aggregate and selected values', () => {
  assert.deepEqual(
    captureApplicationEvent(() => trackSearchPerformed(12, 4)),
    [['search_performed', { queryLength: 12, resultCount: 4 }]]
  )
  assert.deepEqual(
    captureApplicationEvent(() => trackFilterChanged('category', 'social')),
    [['filter_changed', { filterType: 'category', selectedValue: 'social' }]]
  )
  assert.deepEqual(captureApplicationEvent(trackFiltersCleared), [['filters_cleared']])
})

test('attendee actions track stable event data and source', () => {
  assert.deepEqual(
    captureApplicationEvent(() => trackHomeLogoClicked('/events/event-1')),
    [['home_logo_clicked', { sourcePage: '/events/event-1' }]]
  )
  assert.deepEqual(
    captureApplicationEvent(() => trackSavedEvent(analyticsEvent, 'list', true)),
    [['event_saved', {
      eventId: 'event-1',
      organizerId: 'organizer-1',
      eventType: 'social',
      isFree: true,
      source: 'list'
    }]]
  )
  assert.equal(captureApplicationEvent(() => trackSavedEvent(analyticsEvent, 'event_details', false))[0][0], 'event_unsaved')
  assert.equal(captureApplicationEvent(() => trackCalendarExportClicked(analyticsEvent, 'event_details'))[0][0], 'calendar_export_clicked')
})

test('successful organizer action helpers contain no free-text event content', () => {
  const event = { ...analyticsEvent, title: 'Not tracked', description: 'Not tracked' }
  const created = captureApplicationEvent(() => trackOrganizerEvent(AnalyticsEvents.EVENT_CREATED, event))

  assert.deepEqual(created, [['event_created', {
    eventId: 'event-1',
    organizerId: 'organizer-1',
    eventType: 'social',
    isFree: true,
    source: 'management'
  }]])
  assert.equal(captureApplicationEvent(() => trackOrganizerEvent(AnalyticsEvents.EVENT_UPDATED, event))[0][0], 'event_updated')
  assert.equal(captureApplicationEvent(() => trackOrganizerEvent(AnalyticsEvents.EVENT_DELETED, event))[0][0], 'event_deleted')
  assert.equal(captureApplicationEvent(() => trackOrganizerEvent(AnalyticsEvents.EVENT_DUPLICATED, event))[0][0], 'event_duplicated')
  assert.deepEqual(
    captureApplicationEvent(() => trackBulkEventsCreated(event, 3)),
    [['bulk_events_created', {
      organizerId: 'organizer-1',
      eventType: 'social',
      isFree: true,
      source: 'management',
      createdCount: 3
    }]]
  )
})
