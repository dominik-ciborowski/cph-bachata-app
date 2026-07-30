import { createApp } from 'vue'
import AnalyticsDebugCard from './AnalyticsDebugCard.vue'
import { startAnalyticsDebug } from './state'

const debugRoot = document.createElement('div')
debugRoot.id = 'analytics-debug-root'
document.body.appendChild(debugRoot)

startAnalyticsDebug()
createApp(AnalyticsDebugCard).mount(debugRoot)
