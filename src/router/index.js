import { createRouter, createWebHistory } from 'vue-router'
import EventListView from '../views/EventListView.vue'
import EventDetailView from '../views/EventDetailView.vue'
import AdminView from '../views/AdminView.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import ForgotPasswordView from '../views/ForgotPasswordView.vue'
import ResetPasswordView from '../views/ResetPasswordView.vue'
import AccountView from '../views/AccountView.vue'
import ManagementView from '../views/ManagementView.vue'
import BulkAddView from '../views/BulkAddView.vue'
import OrganizerManagementView from '../views/OrganizerManagementView.vue'
import UserManagementView from '../views/UserManagementView.vue'
import SubmitEventView from '../views/SubmitEventView.vue'
import PendingSubmissionsView from '../views/PendingSubmissionsView.vue'
import HelpAboutView from '../views/HelpAboutView.vue'
import PrivacyView from '../views/PrivacyView.vue'
import TermsView from '../views/TermsView.vue'
import { getAuthState } from '../composables/useAuth'

const routes = [
  { path: '/', component: EventListView },
  { path: '/events/:id', component: EventDetailView },
  { path: '/favorites', component: EventListView, meta: { requiresAuth: true } },
  { path: '/help', component: HelpAboutView },
  { path: '/privacy', component: PrivacyView },
  { path: '/terms', component: TermsView },
  { path: '/submit-event', component: SubmitEventView, meta: { requiresAuth: true } },
  { path: '/admin', component: AdminView, meta: { requiresManagement: true } },
  { path: '/admin/submissions', component: PendingSubmissionsView, meta: { requiresAdmin: true } },
  { path: '/admin/:id', component: AdminView, meta: { requiresManagement: true } },
  { path: '/management', component: ManagementView, meta: { requiresManagement: true } },
  { path: '/management/bulk', component: BulkAddView, meta: { requiresManagement: true } },
  { path: '/management/organizers', component: OrganizerManagementView, meta: { requiresAdmin: true } },
  { path: '/management/users', component: UserManagementView, meta: { requiresAdmin: true } },
  { path: '/login', component: LoginView },
  { path: '/register', component: RegisterView },
  { path: '/forgot-password', component: ForgotPasswordView },
  { path: '/reset-password', component: ResetPasswordView },
  { path: '/account', component: AccountView, meta: { requiresAuth: true } }
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

  if (to.meta.requiresAuth) {
    if (!user) {
      next({ path: '/login', query: { redirect: to.fullPath } })
      return
    }
  }

  if (to.meta.requiresAdmin) {
    if (!user) {
      next('/login')
      return
    }

    if (role !== 'admin') {
      next('/')
      return
    }
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
