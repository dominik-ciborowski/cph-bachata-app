import { reactive } from 'vue'
import { analytics } from '@/analytics'

export const analyticsDebugState = reactive({
  enabled: import.meta.env.VITE_ANALYTICS_ENABLED === 'true',
  umamiHost: import.meta.env.VITE_UMAMI_HOST || 'Not configured',
  umamiStatus: 'Disabled',
  events: []
})

export function startAnalyticsDebug() {
  const originalTrack = analytics.track.bind(analytics)

  analytics.track = (event, properties) => {
    analyticsDebugState.events.unshift({
      event,
      ...(properties === undefined ? {} : { properties })
    })
    if (analyticsDebugState.events.length > 10) analyticsDebugState.events.length = 10

    return originalTrack(event, properties)
  }

  watchUmamiScript()
}

function watchUmamiScript() {
  if (!analyticsDebugState.enabled) return

  const script = document.getElementById('umami-script')
  if (!script) return

  analyticsDebugState.umamiStatus = window.umami ? 'Loaded' : 'Loading'
  script.addEventListener('load', () => { analyticsDebugState.umamiStatus = 'Loaded' })
  script.addEventListener('error', () => { analyticsDebugState.umamiStatus = 'Failed' })
}
