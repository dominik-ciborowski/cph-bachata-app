import { reactive } from 'vue'

export class AnalyticsService {
  /**
   * @param {import('./types.js').AnalyticsProvider[]} providers
   * @param {boolean} enabled
   */
  constructor(providers = [], enabled = false) {
    this.providers = providers
    this.enabled = enabled
    // TEMPORARY: In-memory history for the analytics debug card.
    this.debugEvents = reactive([])
  }

  initialize() {
    if (!this.enabled) return

    this.providers.forEach((provider) => {
      try {
        provider.initialize()
      } catch (error) {
        console.warn('[Analytics] Provider initialization failed', error)
      }
    })
  }

  /**
   * @param {import('./types.js').AnalyticsEvent} event
   * @param {import('./types.js').AnalyticsProperties} [properties]
   */
  track(event, properties) {
    this.debugEvents.unshift({ event, ...(properties === undefined ? {} : { properties }) })
    if (this.debugEvents.length > 10) this.debugEvents.length = 10

    if (!this.enabled) return

    console.debug('[Analytics]', event, properties ?? {})
  }
}
