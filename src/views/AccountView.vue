<script setup>
import { computed, onMounted, ref } from 'vue'
import { supabase } from '../lib/supabase'
import { authMessages, logAuthError } from '../lib/authMessages'
import { useAuth } from '../composables/useAuth'
import { fetchOrganizers } from '../lib/organizers'
import { saveDefaultOrganizer } from '../lib/profile'

const { user, profile, isOrganizer, loadCurrentUserProfile } = useAuth()
const password = ref('')
const confirmPassword = ref('')
const status = ref('')
const isSuccess = ref(false)
const organizers = ref([])
const defaultOrganizer = ref('')
const organizerStatus = ref('')

onMounted(async () => {
  if (!isOrganizer.value) return
  defaultOrganizer.value = profile.value?.default_organizer || ''
  try {
    organizers.value = await fetchOrganizers()
  } catch (error) {
    organizerStatus.value = error.message || 'Could not load organizers.'
  }
})

async function updateDefaultOrganizer() {
  if (!user.value || !isOrganizer.value) return
  organizerStatus.value = 'Saving...'
  try {
    await saveDefaultOrganizer(user.value.id, defaultOrganizer.value, supabase)
    await loadCurrentUserProfile(user.value)
    organizerStatus.value = 'Default organizer saved.'
  } catch (error) {
    organizerStatus.value = error.message || 'Could not save default organizer.'
  }
}
const providerLabels = {
  email: 'Email & Password',
  google: 'Google'
}

const loginProviders = computed(() => {
  const providers = new Set()

  if (user.value?.app_metadata?.provider) {
    providers.add(user.value.app_metadata.provider)
  }

  for (const provider of user.value?.app_metadata?.providers || []) {
    providers.add(provider)
  }

  for (const identity of user.value?.identities || []) {
    if (identity.provider) providers.add(identity.provider)
  }

  return [...providers]
})

const loginMethod = computed(() => {
  if (loginProviders.value.length === 0) return 'Unknown'

  return loginProviders.value
    .map((provider) => providerLabels[provider] || humanizeProvider(provider))
    .join(', ')
})

const canChangePassword = computed(() => {
  if (loginProviders.value.length === 0) return true
  return loginProviders.value.includes('email')
})

function humanizeProvider(provider) {
  return provider
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function validateForm() {
  if (!password.value) return authMessages.passwordRequired
  if (password.value !== confirmPassword.value) return authMessages.passwordsDoNotMatch
  return ''
}

async function changePassword() {
  isSuccess.value = false

  if (!canChangePassword.value) {
    status.value = 'Password is managed by Google.'
    return
  }

  const validationError = validateForm()

  if (validationError) {
    status.value = validationError
    return
  }

  const confirmed = window.confirm('Change password?\n\nYou will need to use the new password the next time you log in.')

  if (!confirmed) {
    return
  }

  status.value = 'Updating password...'
  const { error } = await supabase.auth.updateUser({ password: password.value })

  if (error) {
    logAuthError('Logged-in password change failed', error)
    status.value = authMessages.changePasswordFailed
    return
  }

  password.value = ''
  confirmPassword.value = ''
  isSuccess.value = true
  status.value = authMessages.passwordUpdateSuccess
}
</script>

<template>
  <div class="management-page">
    <section class="hero">
      <h1>Account</h1>
      <p>Manage your login settings.</p>
    </section>

    <section v-if="isOrganizer" class="card form auth-panel">
      <div>
        <h2>Event defaults</h2>
        <p class="field-help">Choose the organizer that should be pre-filled when you add events.</p>
      </div>
      <form class="form" @submit.prevent="updateDefaultOrganizer">
        <div class="field">
          <label for="account-default-organizer">Default organizer</label>
          <select id="account-default-organizer" v-model="defaultOrganizer">
            <option value="">No default organizer</option>
            <option v-for="organizer in organizers" :key="organizer.id" :value="organizer.name">{{ organizer.name }}</option>
          </select>
        </div>
        <button class="button" type="submit">Save</button>
        <p v-if="organizerStatus" class="status" aria-live="polite">{{ organizerStatus }}</p>
      </form>
    </section>

    <section class="card form auth-panel">
      <div>
        <h2>Account information</h2>
        <dl class="account-info-list">
          <div>
            <dt>Email</dt>
            <dd>{{ user?.email || 'Not available' }}</dd>
          </div>
          <div>
            <dt>Login method</dt>
            <dd>{{ loginMethod }}</dd>
          </div>
        </dl>
      </div>
    </section>

    <section class="card form auth-panel">
      <div>
        <h2>Change password</h2>
        <p v-if="canChangePassword" class="field-help">Choose a new password for {{ user?.email }}.</p>
        <p v-else class="field-help">Password is managed by Google.</p>
      </div>

      <form v-if="canChangePassword" class="form" @submit.prevent="changePassword">
        <div class="field">
          <label for="account-new-password">New password</label>
          <input id="account-new-password" v-model="password" type="password" required autocomplete="new-password" />
        </div>

        <div class="field">
          <label for="account-confirm-new-password">Confirm new password</label>
          <input id="account-confirm-new-password" v-model="confirmPassword" type="password" required autocomplete="new-password" />
        </div>

        <button class="button" type="submit">Update password</button>
        <p v-if="status" class="status" :class="{ 'status--success': isSuccess }">{{ status }}</p>
      </form>
    </section>
  </div>
</template>
