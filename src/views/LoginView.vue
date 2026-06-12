<script setup>
import { ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { authMessages, getAuthRedirectUrl, logAuthError } from '../lib/authMessages'

const router = useRouter()
const route = useRoute()
const email = ref(typeof route.query.email === 'string' ? route.query.email : '')
const password = ref('')
const status = ref('')

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
      <button class="text-button" type="button" @click="goToForgotPassword">Forgot password?</button>
      <p class="auth-switch">Don't have an account? <RouterLink to="/register">Register</RouterLink></p>
    </form>
  </div>
</template>
