import { createApp } from 'vue'
import App from './App.vue'
import { analytics } from '@/analytics'
import router from './router'
import './style.css'

analytics.initialize()

if (import.meta.env.MODE === 'playground') {
  import('./analytics-debug/register')
}

createApp(App).use(router).mount('#app')
