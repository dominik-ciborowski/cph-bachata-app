<script setup>
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { authMessages, logAuthError } from '../lib/authMessages'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
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

async function updatePassword() {
  isSuccess.value = false
  const validationError = validateForm()

  if (validationError) {
    status.value = validationError
    return
  }

  if (!user.value) {
    status.value = authMessages.loginRequiredForPasswordUpdate
    return
  }

  status.value = 'Updating password...'
  const { error } = await supabase.auth.updateUser({ password: password.value })

  if (error) {
    logAuthError('Password reset update failed', error)
    status.value = authMessages.resetPasswordFailed
    return
  }

  isSuccess.value = true
  status.value = `${authMessages.passwordUpdateSuccess} Redirecting to login...`
  await supabase.auth.signOut()

  window.setTimeout(() => {
    router.push('/login')
  }, 1200)
}
</script>

<template>
  <div class="management-page">
    <section class="hero">
      <h1>Choose a new password</h1>
      <p>Enter and confirm your new password.</p>
    </section>

    <form class="card form" @submit.prevent="updatePassword">
      <div class="field">
        <label for="new-password">New password</label>
        <input id="new-password" v-model="password" type="password" required autocomplete="new-password" />
      </div>

      <div class="field">
        <label for="confirm-new-password">Confirm new password</label>
        <input id="confirm-new-password" v-model="confirmPassword" type="password" required autocomplete="new-password" />
      </div>

      <div class="form-actions">
        <button class="button" type="submit">Update password</button>
        <RouterLink to="/login" class="button secondary">Back to login</RouterLink>
      </div>
      <p v-if="status" class="status" :class="{ 'status--success': isSuccess }">{{ status }}</p>
    </form>
  </div>
</template>
