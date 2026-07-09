<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from './composables/useAuth'
import logo from '@/assets/logo.png'
import { authMessages, loginSuccessStorageKey } from './lib/authMessages'
import SiteAnnouncementBanner from './components/SiteAnnouncementBanner.vue'

const themeStorageKey = 'copenhagen-bachata-app-theme'
const themeOptions = ['light', 'dark', 'system']

const router = useRouter()
const { isAuthenticated, isAdmin, canManageEvents, logout } = useAuth()
const mobileMenuOpen = ref(false)
const adminMenuOpen = ref(false)
const navRef = ref(null)
const authToastVisible = ref(false)
const authToastMessage = ref('')
const selectedTheme = ref(getStoredTheme())
let authToastTimeoutId = null
let colorSchemeQuery = null

async function handleLogout() {
  await logout()
  closeNavigation()
  router.push('/')
  showAuthToast(authMessages.logoutSuccess)
}

function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value
  if (!mobileMenuOpen.value) adminMenuOpen.value = false
}

function toggleAdminMenu() {
  adminMenuOpen.value = !adminMenuOpen.value
}

function closeNavigation() {
  mobileMenuOpen.value = false
  adminMenuOpen.value = false
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

function getStoredTheme() {
  try {
    const storedTheme = localStorage.getItem(themeStorageKey)
    return themeOptions.includes(storedTheme) ? storedTheme : 'system'
  } catch {
    return 'system'
  }
}

function getResolvedTheme(themePreference = selectedTheme.value) {
  if (themePreference !== 'system') return themePreference
  return colorSchemeQuery?.matches ? 'dark' : 'light'
}

function applyTheme(themePreference = selectedTheme.value) {
  document.documentElement.dataset.theme = getResolvedTheme(themePreference)
  document.documentElement.dataset.themePreference = themePreference
}

function setTheme(themePreference) {
  selectedTheme.value = themeOptions.includes(themePreference) ? themePreference : 'system'

  try {
    localStorage.setItem(themeStorageKey, selectedTheme.value)
  } catch {
    // Ignore storage failures; the selected theme still applies for this session.
  }

  applyTheme()
}

function handleSystemThemeChange() {
  if (selectedTheme.value === 'system') applyTheme()
}

onMounted(() => {
  colorSchemeQuery = window.matchMedia?.('(prefers-color-scheme: dark)') || null
  colorSchemeQuery?.addEventListener?.('change', handleSystemThemeChange)
  applyTheme()
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
  colorSchemeQuery?.removeEventListener?.('change', handleSystemThemeChange)
  if (authToastTimeoutId) window.clearTimeout(authToastTimeoutId)
})
</script>

<template>
  <header class="topbar">
    <RouterLink to="/" class="brand" aria-label="Copenhagen Bachata App home" @click="closeNavigation">
      <img
        class="brand__logo"
        :src="logo"
        alt="Copenhagen Bachata App logo"
      />
      <span class="brand__text">
        <span class="brand__name">Copenhagen Bachata App</span>
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

          <section class="mobile-menu-section mobile-menu-section--appearance">
            <h2>Appearance</h2>
            <div class="theme-options" role="radiogroup" aria-label="Appearance">
              <button
                v-for="themeOption in themeOptions"
                :key="themeOption"
                class="theme-option"
                type="button"
                role="radio"
                :aria-checked="selectedTheme === themeOption ? 'true' : 'false'"
                :class="{ active: selectedTheme === themeOption }"
                @click="setTheme(themeOption)"
              >
                {{ themeOption }}
              </button>
            </div>
          </section>
        </template>

        <template v-else>
          <section class="mobile-menu-section">
            <RouterLink to="/favorites" class="mobile-menu-item" @click="closeNavigation">My Events</RouterLink>
            <RouterLink to="/submit-event" class="mobile-menu-item" @click="closeNavigation">Submit Event</RouterLink>
            <RouterLink to="/account" class="mobile-menu-item" @click="closeNavigation">Account</RouterLink>
            <RouterLink to="/help" class="mobile-menu-item" @click="closeNavigation">Help & About</RouterLink>
          </section>

          <section class="mobile-menu-section mobile-menu-section--appearance">
            <h2>Appearance</h2>
            <div class="theme-options" role="radiogroup" aria-label="Appearance">
              <button
                v-for="themeOption in themeOptions"
                :key="themeOption"
                class="theme-option"
                type="button"
                role="radio"
                :aria-checked="selectedTheme === themeOption ? 'true' : 'false'"
                :class="{ active: selectedTheme === themeOption }"
                @click="setTheme(themeOption)"
              >
                {{ themeOption }}
              </button>
            </div>
          </section>

          <section class="mobile-menu-section">
            <button class="mobile-menu-item logout-item" type="button" @click="handleLogout">Logout</button>
          </section>

          <section v-if="canManageEvents" class="mobile-menu-section">
            <h2>Manage</h2>
            <RouterLink to="/management" class="mobile-menu-item" @click="closeNavigation">Dashboard</RouterLink>
            <RouterLink to="/admin" class="mobile-menu-item" @click="closeNavigation">Add Event</RouterLink>
            <RouterLink to="/management/bulk" class="mobile-menu-item" @click="closeNavigation">Bulk Add Event</RouterLink>
          </section>

          <section v-if="isAdmin" class="mobile-menu-section">
            <button
              class="mobile-menu-section__toggle"
              type="button"
              :aria-expanded="adminMenuOpen ? 'true' : 'false'"
              aria-controls="admin-navigation-links"
              @click="toggleAdminMenu"
            >
              <span>Administration</span>
              <span class="menu-caret" aria-hidden="true">{{ adminMenuOpen ? '▴' : '▾' }}</span>
            </button>

            <div v-if="adminMenuOpen" id="admin-navigation-links" class="mobile-menu-section__links">
              <RouterLink to="/management/organizers" class="mobile-menu-item" @click="closeNavigation">Organizer Management</RouterLink>
              <RouterLink to="/admin/submissions" class="mobile-menu-item" @click="closeNavigation">Pending Submissions</RouterLink>
              <RouterLink to="/management/users" class="mobile-menu-item" @click="closeNavigation">User Management</RouterLink>
            </div>
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
    <SiteAnnouncementBanner />
    <RouterView />
  </main>
</template>
