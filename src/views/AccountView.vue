<script setup>
import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { authMessages, logAuthError } from '../lib/authMessages'
import { useAuth } from '../composables/useAuth'

const { user } = useAuth()
const password = ref('')
const confirmPassword = ref('')
const status = ref('')
const isSuccess = ref(false)

function validateForm() {
  if (!password.value) return authMessages.passwordRequired
  if (password.value !== confirmPassword.value) return authMessages.passwordsDoNotMatch
  return ''
}

async function changePassword() {
  isSuccess.value = false
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

    <section class="card form auth-panel">
      <div>
        <h2>Change password</h2>
        <p class="field-help">Signed in as {{ user?.email }}.</p>
      </div>

      <form class="form" @submit.prevent="changePassword">
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
