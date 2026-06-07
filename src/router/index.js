import { createRouter, createWebHistory } from 'vue-router'
import EventListView from '../views/EventListView.vue'
import EventDetailView from '../views/EventDetailView.vue'
import AdminView from '../views/AdminView.vue'
import LoginView from '../views/LoginView.vue'
import ManagementView from '../views/ManagementView.vue'
import BulkAddView from '../views/BulkAddView.vue'
import { supabase } from '../lib/supabase'

const routes = [
  { path: '/', component: EventListView },
  { path: '/events/:id', component: EventDetailView },
  { path: '/admin', component: AdminView, meta: { requiresAuth: true } },
  { path: '/admin/:id', component: AdminView, meta: { requiresAuth: true } },
  { path: '/management', component: ManagementView, meta: { requiresAuth: true } },
  { path: '/management/bulk', component: BulkAddView, meta: { requiresAuth: true } },
  { path: '/login', component: LoginView }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Route guard for protected routes
router.beforeEach(async (to, from, next) => {
  const { data } = await supabase.auth.getUser()
  const currentUser = data.user

  if (to.path === '/login' && currentUser) {
    next('/management')
    return
  }

  if (to.meta.requiresAuth) {
    if (!currentUser) {
      next('/login')
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router
