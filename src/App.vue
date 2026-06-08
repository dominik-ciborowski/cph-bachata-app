<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from './composables/useAuth'

const router = useRouter()
const { isAuthenticated, canManageEvents, logout } = useAuth()
const showMenu = ref(false)
const menuRef = ref(null)

async function handleLogout() {
  await logout()
  closeMenu()
  router.push('/')
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

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<template>
  <header class="topbar">
    <RouterLink to="/" class="brand" @click="closeMenu">Bachata CPH</RouterLink>

    <nav class="topnav" aria-label="Main navigation">
      <template v-if="!isAuthenticated">
        <RouterLink to="/login" class="button-link button-link--nav">Login</RouterLink>
        <RouterLink to="/register" class="button-link button-link--nav">Register</RouterLink>
      </template>
      <button v-else-if="!canManageEvents" class="button-link button-link--nav" type="button" @click="handleLogout">Logout</button>

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
          <button class="menu-item logout-item" type="button" role="menuitem" @click="handleLogout">Logout</button>
        </div>
      </div>
    </nav>
  </header>

  <main class="container">
    <RouterView />
  </main>
</template>
