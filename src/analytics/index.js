import { AnalyticsService } from './analyticsService.js'
import { UmamiProvider } from './umamiProvider.js'

const isAnalyticsEnabled = import.meta.env?.VITE_ANALYTICS_ENABLED === 'true'
const umamiProvider = new UmamiProvider(
  import.meta.env?.VITE_UMAMI_HOST,
  import.meta.env?.VITE_UMAMI_WEBSITE_ID
)

export const analytics = new AnalyticsService([umamiProvider], isAnalyticsEnabled)

export { AnalyticsEvents } from './types.js'
