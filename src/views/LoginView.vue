<script setup>
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { authMessages, getAuthRedirectUrl, logAuthError } from '../lib/authMessages'

const router = useRouter()
const email = ref('')
const password = ref('')
const resetEmail = ref('')
const status = ref('')
const resetStatus = ref('')
const isResetSuccess = ref(false)
const showForgotPassword = ref(false)

async function login() {
  status.value = 'Logging in...'
  const { error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value
  })

  if (error) {
    logAuthError('Email login failed', error)
    status.value = authMessages.loginFailed
    return
  }

  router.push('/management')
}

async function sendPasswordReset() {
  isResetSuccess.value = false
  resetStatus.value = 'Sending reset link...'

  const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.value, {
    redirectTo: getAuthRedirectUrl('/reset-password')
  })

  if (error) {
    logAuthError('Password reset email failed', error)
    resetStatus.value = authMessages.forgotPasswordFailed
    return
  }

  isResetSuccess.value = true
  resetStatus.value = authMessages.forgotPasswordSuccess
}

async function loginWithGoogle() {
  status.value = 'Redirecting to Google...'

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getAuthRedirectUrl('/')
    }
  })

  if (error) {
    logAuthError('Google login failed', error)
    status.value = authMessages.googleLoginFailed
  }
}

function toggleForgotPassword() {
  showForgotPassword.value = !showForgotPassword.value
  resetStatus.value = ''
  isResetSuccess.value = false
  if (!resetEmail.value) resetEmail.value = email.value
}
</script>

<template>
  <div class="management-page">
    <section class="hero">
      <h1>Login</h1>
      <p>Log in to manage events.</p>
    </section>

    <form class="card form" @submit.prevent="login">
      <button class="button secondary auth-oauth-button" type="button" @click="loginWithGoogle">Continue with Google</button>

      <div class="auth-divider"><span>or log in with email</span></div>

      <div class="field">
        <label for="login-email">Email</label>
        <input id="login-email" v-model="email" type="email" required autocomplete="email" />
      </div>

      <div class="field">
        <label for="login-password">Password</label>
        <input id="login-password" v-model="password" type="password" required autocomplete="current-password" />
      </div>

      <div class="form-actions">
        <button class="button" type="submit">Log in</button>
        <RouterLink to="/register" class="button secondary">Register</RouterLink>
      </div>
      <p v-if="status" class="status">{{ status }}</p>
      <button class="text-button" type="button" @click="toggleForgotPassword">Forgot password?</button>
      <p class="auth-switch">Don't have an account? <RouterLink to="/register">Register</RouterLink></p>
    </form>

    <form v-if="showForgotPassword" class="card form auth-panel" @submit.prevent="sendPasswordReset">
      <div>
        <h2>Reset your password</h2>
        <p class="field-help">Enter your email and we’ll send a link you can use to choose a new password.</p>
      </div>

      <div class="field">
        <label for="reset-email">Email</label>
        <input id="reset-email" v-model="resetEmail" type="email" required autocomplete="email" />
      </div>

      <button class="button" type="submit">Send reset link</button>
      <p v-if="resetStatus" class="status" :class="{ 'status--success': isResetSuccess }">{{ resetStatus }}</p>
    </form>
  </div>
</template>
