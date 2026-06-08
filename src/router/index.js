import { createRouter, createWebHistory } from 'vue-router'
import EventListView from '../views/EventListView.vue'
import EventDetailView from '../views/EventDetailView.vue'
import AdminView from '../views/AdminView.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import ManagementView from '../views/ManagementView.vue'
import BulkAddView from '../views/BulkAddView.vue'
import { getAuthState } from '../composables/useAuth'

const routes = [
  { path: '/', component: EventListView },
  { path: '/events/:id', component: EventDetailView },
  { path: '/admin', component: AdminView, meta: { requiresManagement: true } },
  { path: '/admin/:id', component: AdminView, meta: { requiresManagement: true } },
  { path: '/management', component: ManagementView, meta: { requiresManagement: true } },
  { path: '/management/bulk', component: BulkAddView, meta: { requiresManagement: true } },
  { path: '/login', component: LoginView },
  { path: '/register', component: RegisterView }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// Route guard for protected management routes
router.beforeEach(async (to, from, next) => {
  const { user, role } = await getAuthState()
  const canManageEvents = role === 'organizer' || role === 'admin'

  if ((to.path === '/login' || to.path === '/register') && user) {
    next(canManageEvents ? '/management' : '/')
    return
  }

  if (to.meta.requiresManagement) {
    if (!user) {
      next('/login')
      return
    }

    if (!canManageEvents) {
      next('/')
      return
    }
  }

  next()
})

export default router
