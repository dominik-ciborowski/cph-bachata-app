import { createApp } from 'vue'
import App from './App.vue'
import { analytics } from '@/analytics'
import router from './router'
import './style.css'

analytics.initialize()

createApp(App).use(router).mount('#app')
