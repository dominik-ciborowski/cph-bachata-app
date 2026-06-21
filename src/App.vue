<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from './composables/useAuth'
import logo from '@/assets/logo.png'
import { authMessages, loginSuccessStorageKey } from './lib/authMessages'

const router = useRouter()
const { isAuthenticated, isAdmin, canManageEvents, logout } = useAuth()
const mobileMenuOpen = ref(false)
const navRef = ref(null)
const authToastVisible = ref(false)
const authToastMessage = ref('')
let authToastTimeoutId = null

async function handleLogout() {
  await logout()
  closeNavigation()
  router.push('/')
  showAuthToast(authMessages.logoutSuccess)
}

function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value
}

function closeNavigation() {
  mobileMenuOpen.value = false
}

function handleDocumentClick(event) {
  if (!mobileMenuOpen.value) return
  if (navRef.value?.contains(event.target)) return
  closeNavigation()
}

function handleAppToast(event) {
  const message = event.detail?.message
  if (!message) return
  showAuthToast(message)
}

function showAuthToast(message) {
  authToastMessage.value = message
  authToastVisible.value = true
  if (authToastTimeoutId) window.clearTimeout(authToastTimeoutId)
  authToastTimeoutId = window.setTimeout(() => {
    authToastVisible.value = false
  }, 3500)
}

function dismissAuthToast() {
  authToastVisible.value = false
  if (authToastTimeoutId) {
    window.clearTimeout(authToastTimeoutId)
    authToastTimeoutId = null
  }
}

function consumeLoginSuccessToast() {
  if (!isAuthenticated.value) return
  if (sessionStorage.getItem(loginSuccessStorageKey) !== 'true') return

  sessionStorage.removeItem(loginSuccessStorageKey)
  showAuthToast(authMessages.loginSuccess)
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
  window.addEventListener('app-toast', handleAppToast)
  consumeLoginSuccessToast()
})

watch(isAuthenticated, () => {
  closeNavigation()
  consumeLoginSuccessToast()
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
  window.removeEventListener('app-toast', handleAppToast)
  if (authToastTimeoutId) window.clearTimeout(authToastTimeoutId)
})
</script>

<template>
  <header class="topbar">
    <RouterLink to="/" class="brand" aria-label="Copenhagen Bachata Calendar home" @click="closeNavigation">
      <img
        class="brand__logo"
        :src="logo"
        alt="Copenhagen Bachata Calendar logo"
      />
      <span class="brand__text">
        <span class="brand__name">Copenhagen Bachata Calendar</span>
        <span class="brand__attribution">by Dancemaniacs</span>
      </span>
    </RouterLink>

    <nav ref="navRef" class="topnav" aria-label="Main navigation">
      <button
        class="mobile-menu-toggle"
        type="button"
        :aria-expanded="mobileMenuOpen ? 'true' : 'false'"
        aria-controls="main-navigation-menu"
        :aria-label="mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'"
        @click.stop="toggleMobileMenu"
      >
        <span aria-hidden="true">{{ mobileMenuOpen ? '×' : '☰' }}</span>
      </button>

      <div v-if="mobileMenuOpen" id="main-navigation-menu" class="mobile-menu-panel">
        <template v-if="!isAuthenticated">
          <section class="mobile-menu-section">
            <RouterLink to="/login" class="mobile-menu-item" @click="closeNavigation">Login / Register</RouterLink>
            <RouterLink to="/help" class="mobile-menu-item" @click="closeNavigation">Help & About</RouterLink>
          </section>
        </template>

        <template v-else>
          <section class="mobile-menu-section">
            <RouterLink to="/favorites" class="mobile-menu-item" @click="closeNavigation">My Events</RouterLink>
            <RouterLink to="/submit-event" class="mobile-menu-item" @click="closeNavigation">Submit Event</RouterLink>
            <RouterLink to="/help" class="mobile-menu-item" @click="closeNavigation">Help & About</RouterLink>
            <button class="mobile-menu-item logout-item" type="button" @click="handleLogout">Logout</button>
          </section>

          <section v-if="canManageEvents" class="mobile-menu-section">
            <h2>Manage</h2>
            <RouterLink to="/management" class="mobile-menu-item" @click="closeNavigation">Dashboard</RouterLink>
            <RouterLink to="/admin" class="mobile-menu-item" @click="closeNavigation">Add Event</RouterLink>
            <RouterLink to="/management/bulk" class="mobile-menu-item" @click="closeNavigation">Bulk Add Event</RouterLink>
          </section>

          <section v-if="isAdmin" class="mobile-menu-section">
            <h2>Administration</h2>
            <RouterLink to="/management/organizers" class="mobile-menu-item" @click="closeNavigation">Organizer Management</RouterLink>
            <RouterLink to="/admin/submissions" class="mobile-menu-item" @click="closeNavigation">Pending Submissions</RouterLink>
            <RouterLink to="/management/users" class="mobile-menu-item" @click="closeNavigation">User Management</RouterLink>
          </section>
        </template>
      </div>
    </nav>
  </header>

  <div v-if="authToastVisible" class="toast" role="status" aria-live="polite">
    <span>{{ authToastMessage }}</span>
    <button class="toast__dismiss" type="button" aria-label="Dismiss notification" @click="dismissAuthToast">×</button>
  </div>

  <main class="container">
    <RouterView />
  </main>
</template>
