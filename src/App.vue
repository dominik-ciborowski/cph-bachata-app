<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from './composables/useAuth'
import logo from '@/assets/logo.png'
import { authMessages, loginSuccessStorageKey } from './lib/authMessages'

const router = useRouter()
const { isAuthenticated, isAdmin, canManageEvents, logout } = useAuth()
const showMenu = ref(false)
const menuRef = ref(null)
const authToastVisible = ref(false)
const authToastMessage = ref('')
let authToastTimeoutId = null

async function handleLogout() {
  await logout()
  closeMenu()
  router.push('/')
  showAuthToast(authMessages.logoutSuccess)
}

function toggleMenu() {
  showMenu.value = !showMenu.value
}

function closeMenu() {
  showMenu.value = false
}

function handleDocumentClick(event) {
  if (!showMenu.value) return
  if (menuRef.value?.contains(event.target)) return
  closeMenu()
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
    <RouterLink to="/" class="brand" aria-label="Copenhagen Bachata Calendar home" @click="closeMenu">
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

    <nav class="topnav" aria-label="Main navigation">
      <RouterLink v-if="!isAuthenticated" to="/login" class="button-link button-link--nav">Login</RouterLink>
      <template v-else-if="!canManageEvents">
        <RouterLink to="/favorites" class="button-link button-link--nav">My Events</RouterLink>
        <RouterLink to="/account" class="button-link button-link--nav">Account</RouterLink>
        <button class="button-link button-link--nav" type="button" @click="handleLogout">Logout</button>
      </template>

      <div v-else ref="menuRef" class="management-menu-wrapper">
        <button
          class="button-link button-link--nav"
          type="button"
          :aria-expanded="showMenu ? 'true' : 'false'"
          aria-haspopup="menu"
          @click.stop="toggleMenu"
        >
          Management <span class="menu-caret">▼</span>
        </button>

        <div v-if="showMenu" class="management-menu" role="menu">
          <RouterLink to="/management" class="menu-item" role="menuitem" @click="closeMenu">Dashboard</RouterLink>
          <RouterLink to="/admin" class="menu-item" role="menuitem" @click="closeMenu">Add Event</RouterLink>
          <RouterLink to="/management/bulk" class="menu-item" role="menuitem" @click="closeMenu">Bulk Add Event</RouterLink>
          <RouterLink v-if="isAdmin" to="/management/organizers" class="menu-item" role="menuitem" @click="closeMenu">Organizer Management</RouterLink>
          <RouterLink v-if="isAdmin" to="/management/users" class="menu-item" role="menuitem" @click="closeMenu">User Management</RouterLink>
          <RouterLink to="/favorites" class="menu-item" role="menuitem" @click="closeMenu">My Events</RouterLink>
          <RouterLink to="/account" class="menu-item" role="menuitem" @click="closeMenu">Account</RouterLink>
          <button class="menu-item logout-item" type="button" role="menuitem" @click="handleLogout">Logout</button>
        </div>
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
