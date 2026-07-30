import { analyticsVersion } from './types.js'

export function normalizeAnalyticsProperties(properties) {
  const normalized = {}

  if (properties && typeof properties === 'object' && !Array.isArray(properties)) {
    try {
      Object.entries(properties).forEach(([key, value]) => {
        const isAllowedPrimitive = value == null || ['string', 'boolean'].includes(typeof value) ||
          (typeof value === 'number' && Number.isFinite(value))

        if (isAllowedPrimitive) normalized[key] = value
      })
    } catch (error) {
      console.warn('[Analytics] Event properties could not be normalized', error)
    }
  }

  normalized.analyticsVersion = analyticsVersion
  return normalized
}

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

    const normalizedProperties = normalizeAnalyticsProperties(properties)
    console.debug('[Analytics]', event, normalizedProperties)

    this.providers.forEach((provider) => {
      try {
        provider.track(event, normalizedProperties)
      } catch (error) {
        console.warn('[Analytics] Provider tracking failed', error)
      }
    })
  }
}
