import test from 'node:test'
import assert from 'node:assert/strict'

import { AnalyticsService } from '../src/analytics/analyticsService.js'
import { UmamiProvider } from '../src/analytics/umamiProvider.js'

test('disabled analytics does not initialize providers', () => {
  let initialized = false
  const service = new AnalyticsService([{ initialize: () => { initialized = true }, track: () => {} }], false)

  service.initialize()

  assert.equal(initialized, false)
})

test('disabled analytics records debug events without logging', () => {
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
  assert.deepEqual(service.debugEvents, [{ event: 'event_opened' }])
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

test('track logs custom events without forwarding them to providers', () => {
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
  assert.equal(tracked, false)
})

test('track keeps only the 10 most recent debug events', () => {
  const service = new AnalyticsService([], false)

  for (let index = 1; index <= 12; index += 1) {
    service.track(`event_${index}`, { index })
  }

  assert.equal(service.debugEvents.length, 10)
  assert.deepEqual(service.debugEvents[0], { event: 'event_12', properties: { index: 12 } })
  assert.equal(service.debugEvents[9].event, 'event_3')
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

test('UmamiProvider reports script loading status', () => {
  const originalDocument = global.document
  const originalWarn = console.warn
  const document = createDocument()
  const statuses = []
  global.document = document
  console.warn = () => {}

  try {
    new UmamiProvider('https://cloud.umami.is', 'website-id', (status) => statuses.push(status)).initialize()
    document.scripts[0].load()
    document.scripts[0].error()
  } finally {
    global.document = originalDocument
    console.warn = originalWarn
  }

  assert.deepEqual(statuses, ['Loaded', 'Failed'])
})
