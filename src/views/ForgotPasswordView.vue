<script setup>
import { ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { supabase } from '../lib/supabase'
import { authMessages, getAuthRedirectUrl, logAuthError } from '../lib/authMessages'

const route = useRoute()
const email = ref(typeof route.query.email === 'string' ? route.query.email : '')
const status = ref('')
const isSuccess = ref(false)

async function sendPasswordReset() {
  isSuccess.value = false
  status.value = 'Sending reset link...'

  const { error } = await supabase.auth.resetPasswordForEmail(email.value, {
    redirectTo: getAuthRedirectUrl('/reset-password')
  })

  if (error) {
    logAuthError('Password reset email failed', error)
    status.value = authMessages.forgotPasswordFailed
    return
  }

  isSuccess.value = true
  status.value = authMessages.forgotPasswordSuccess
}
</script>

<template>
  <div class="management-page">
    <section class="hero">
      <h1>Forgot password?</h1>
      <p>Enter your email and we’ll send a link you can use to choose a new password.</p>
    </section>

    <form class="card form" @submit.prevent="sendPasswordReset">
      <div class="field">
        <label for="forgot-password-email">Email</label>
        <input id="forgot-password-email" v-model="email" type="email" required autocomplete="email" />
      </div>

      <div class="form-actions">
        <button class="button" type="submit">Send reset link</button>
        <RouterLink :to="{ path: '/login', query: email ? { email } : {} }" class="button secondary">Back to Login</RouterLink>
      </div>
      <p v-if="status" class="status" :class="{ 'status--success': isSuccess }">{{ status }}</p>
    </form>
  </div>
</template>
