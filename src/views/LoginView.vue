<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { authMessages, getAuthRedirectUrl, loginSuccessStorageKey, logAuthError } from '../lib/authMessages'

const router = useRouter()
const route = useRoute()
const email = ref(typeof route.query.email === 'string' ? route.query.email : '')
const password = ref('')
const status = ref('')

onMounted(() => {
  const storedFlashMessage = sessionStorage.getItem('flash_message')
  if (!storedFlashMessage) return
  status.value = storedFlashMessage
  sessionStorage.removeItem('flash_message')
})

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

  sessionStorage.setItem(loginSuccessStorageKey, 'true')
  router.push(typeof route.query.redirect === 'string' ? route.query.redirect : '/management')
}

async function loginWithGoogle() {
  status.value = 'Redirecting to Google...'
  sessionStorage.setItem(loginSuccessStorageKey, 'true')

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getAuthRedirectUrl('/')
    }
  })

  if (error) {
    sessionStorage.removeItem(loginSuccessStorageKey)
    logAuthError('Google login failed', error)
    status.value = authMessages.googleLoginFailed
  }
}

function goToForgotPassword() {
  router.push({
    path: '/forgot-password',
    query: email.value ? { email: email.value } : {}
  })
}
</script>

<template>
  <div class="management-page">
    <section class="hero">
      <h1>Login</h1>
      <p>Log in to manage events.</p>
    </section>

    <form class="card form" @submit.prevent="login">
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
      <button class="text-button" type="button" @click="goToForgotPassword">Forgot password?</button>
      <p class="auth-switch">Don't have an account? <RouterLink to="/register">Register</RouterLink></p>

      <div class="auth-divider"><span>or continue with</span></div>

      <button class="button secondary auth-oauth-button" type="button" @click="loginWithGoogle">
        <svg class="auth-oauth-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z" />
        </svg>
        Continue with Google
      </button>
    </form>
  </div>
</template>
