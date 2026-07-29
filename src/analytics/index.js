import { reactive } from 'vue'
import { AnalyticsService } from './analyticsService'
import { UmamiProvider } from './umamiProvider'

const isAnalyticsEnabled = import.meta.env?.VITE_ANALYTICS_ENABLED === 'true'
const umamiHost = import.meta.env?.VITE_UMAMI_HOST
const umamiWebsiteId = import.meta.env?.VITE_UMAMI_WEBSITE_ID

// TEMPORARY: State displayed by the global analytics debug card.
export const analyticsDebug = reactive({
  enabled: isAnalyticsEnabled,
  umamiHost: umamiHost || 'Not configured',
  umamiStatus: isAnalyticsEnabled && umamiHost && umamiWebsiteId ? 'Loading' : 'Disabled'
})

const umamiProvider = new UmamiProvider(
  umamiHost,
  umamiWebsiteId,
  (status) => { analyticsDebug.umamiStatus = status }
)

export const analytics = new AnalyticsService([umamiProvider], isAnalyticsEnabled)

export { AnalyticsEvents } from './types'
