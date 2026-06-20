<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from './composables/useAuth'
import logo from '@/assets/logo.png'
import { authMessages, loginSuccessStorageKey } from './lib/authMessages'

const router = useRouter()
const { isAuthenticated, isAdmin, canManageEvents, logout } = useAuth()
const activeDesktopMenu = ref('')
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

function toggleDesktopMenu(menuName) {
  activeDesktopMenu.value = activeDesktopMenu.value === menuName ? '' : menuName
}

function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value
  activeDesktopMenu.value = ''
}

function closeNavigation() {
  activeDesktopMenu.value = ''
  mobileMenuOpen.value = false
}

function handleDocumentClick(event) {
  if (!activeDesktopMenu.value && !mobileMenuOpen.value) return
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
      <div class="desktop-nav">
        <RouterLink to="/help" class="button-link button-link--nav">Help & About</RouterLink>
        <RouterLink v-if="!isAuthenticated" to="/login" class="button-link button-link--nav">Login / Register</RouterLink>

        <template v-else>
          <div v-if="canManageEvents" class="nav-menu-wrapper">
            <button
              class="button-link button-link--nav"
              type="button"
              :aria-expanded="activeDesktopMenu === 'manage' ? 'true' : 'false'"
              aria-haspopup="menu"
              @click.stop="toggleDesktopMenu('manage')"
            >
              Manage <span class="menu-caret">▼</span>
            </button>

            <div v-if="activeDesktopMenu === 'manage'" class="nav-menu" role="menu">
              <RouterLink to="/management" class="menu-item" role="menuitem" @click="closeNavigation">Dashboard</RouterLink>
              <RouterLink to="/admin" class="menu-item" role="menuitem" @click="closeNavigation">Add Event</RouterLink>
              <RouterLink to="/management/bulk" class="menu-item" role="menuitem" @click="closeNavigation">Bulk Add Event</RouterLink>
            </div>
          </div>

          <div v-if="isAdmin" class="nav-menu-wrapper">
            <button
              class="button-link button-link--nav"
              type="button"
              :aria-expanded="activeDesktopMenu === 'admin' ? 'true' : 'false'"
              aria-haspopup="menu"
              @click.stop="toggleDesktopMenu('admin')"
            >
              Admin <span class="menu-caret">▼</span>
            </button>

            <div v-if="activeDesktopMenu === 'admin'" class="nav-menu" role="menu">
              <RouterLink to="/management/organizers" class="menu-item" role="menuitem" @click="closeNavigation">Organizer Management</RouterLink>
              <RouterLink to="/admin/submissions" class="menu-item" role="menuitem" @click="closeNavigation">Pending Submissions</RouterLink>
              <RouterLink to="/management/users" class="menu-item" role="menuitem" @click="closeNavigation">User Management</RouterLink>
            </div>
          </div>

          <div class="nav-menu-wrapper">
            <button
              class="button-link button-link--nav"
              type="button"
              :aria-expanded="activeDesktopMenu === 'account' ? 'true' : 'false'"
              aria-haspopup="menu"
              @click.stop="toggleDesktopMenu('account')"
            >
              My Account <span class="menu-caret">▼</span>
            </button>

            <div v-if="activeDesktopMenu === 'account'" class="nav-menu" role="menu">
              <RouterLink to="/favorites" class="menu-item" role="menuitem" @click="closeNavigation">My Events</RouterLink>
              <RouterLink to="/submit-event" class="menu-item" role="menuitem" @click="closeNavigation">Submit Event</RouterLink>
              <RouterLink to="/account" class="menu-item" role="menuitem" @click="closeNavigation">Account</RouterLink>
              <button class="menu-item logout-item" type="button" role="menuitem" @click="handleLogout">Logout</button>
            </div>
          </div>
        </template>
      </div>

      <RouterLink v-if="!isAuthenticated" to="/help" class="button-link button-link--nav mobile-login-link">Help</RouterLink>

      <RouterLink v-if="!isAuthenticated" to="/login" class="button-link button-link--nav mobile-login-link">Login / Register</RouterLink>

      <button
        v-else
        class="mobile-menu-toggle"
        type="button"
        :aria-expanded="mobileMenuOpen ? 'true' : 'false'"
        aria-controls="mobile-navigation"
        :aria-label="mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'"
        @click.stop="toggleMobileMenu"
      >
        <span aria-hidden="true">{{ mobileMenuOpen ? '×' : '☰' }}</span>
      </button>

      <div v-if="mobileMenuOpen && isAuthenticated" id="mobile-navigation" class="mobile-menu-panel">
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

          <section class="mobile-menu-section">
            <h2>Help</h2>
            <RouterLink to="/help" class="mobile-menu-item" @click="closeNavigation">Help & About</RouterLink>
          </section>

          <section class="mobile-menu-section">
            <h2>Account</h2>
            <RouterLink to="/favorites" class="mobile-menu-item" @click="closeNavigation">My Events</RouterLink>
            <RouterLink to="/submit-event" class="mobile-menu-item" @click="closeNavigation">Submit Event</RouterLink>
            <RouterLink to="/account" class="mobile-menu-item" @click="closeNavigation">Account</RouterLink>
            <button class="mobile-menu-item logout-item" type="button" @click="handleLogout">Logout</button>
          </section>
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
