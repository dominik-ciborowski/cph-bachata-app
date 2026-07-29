export class AnalyticsService {
  /**
   * @param {import('./types.js').AnalyticsProvider[]} providers
   * @param {boolean} enabled
   */
  constructor(providers = [], enabled = false) {
    this.providers = providers
    this.enabled = enabled
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
    if (!this.enabled) return

    console.debug('[Analytics]', event, properties ?? {})

    this.providers.forEach((provider) => {
      try {
        provider.track(event, properties)
      } catch (error) {
        console.warn('[Analytics] Provider tracking failed', error)
      }
    })
  }
}
