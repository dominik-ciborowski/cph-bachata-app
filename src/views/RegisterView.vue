<script setup>
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { authMessages, getAuthRedirectUrl, logAuthError } from '../lib/authMessages'

const router = useRouter()
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const status = ref('')
const isSuccess = ref(false)

function validateForm() {
  if (!email.value) return 'Email is required.'
  if (!password.value) return 'Password is required.'
  if (password.value !== confirmPassword.value) return authMessages.passwordsDoNotMatch
  return ''
}

async function register() {
  isSuccess.value = false
  const validationError = validateForm()

  if (validationError) {
    status.value = validationError
    return
  }

  status.value = 'Submitting registration...'

  const { data, error } = await supabase.auth.signUp({
    email: email.value,
    password: password.value,
    options: {
      emailRedirectTo: getAuthRedirectUrl('/')
    }
  })

  if (error) {
    logAuthError('Registration failed', error)
    status.value = authMessages.registrationFailed
    return
  }

  isSuccess.value = true

  if (data.session) {
    status.value = 'Registration complete. Redirecting...'
    router.push('/')
    return
  }

  status.value = authMessages.registrationCheckEmail
}

</script>

<template>
  <div class="management-page">
    <section class="hero">
      <h1>Register</h1>
      <p>Create a user account for the Copenhagen Bachata Calendar.</p>
    </section>

    <form class="card form" @submit.prevent="register">
      <div class="field">
        <label for="register-email">Email</label>
        <input id="register-email" v-model="email" type="email" required autocomplete="email" />
      </div>

      <div class="field">
        <label for="register-password">Password</label>
        <input id="register-password" v-model="password" type="password" required autocomplete="new-password" />
      </div>

      <div class="field">
        <label for="register-confirm-password">Confirm password</label>
        <input id="register-confirm-password" v-model="confirmPassword" type="password" required autocomplete="new-password" />
      </div>

      <button class="button" type="submit">Register</button>
      <p v-if="status" class="status" :class="{ 'status--success': isSuccess }">{{ status }}</p>
      <p class="auth-switch">Already have an account? <RouterLink to="/login">Login</RouterLink></p>
    </form>
  </div>
</template>
