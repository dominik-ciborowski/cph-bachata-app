<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'

const router = useRouter()
const email = ref('')
const password = ref('')
const status = ref('')

async function login() {
  status.value = 'Logging in...'
  const { error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value
  })

  if (error) {
    status.value = error.message
    return
  }

  router.push('/admin')
}
</script>

<template>
  <section class="hero">
    <h1>Admin login</h1>
    <p>Log in to add or manage events.</p>
  </section>

  <form class="card form" @submit.prevent="login">
    <div class="field">
      <label>Email</label>
      <input v-model="email" type="email" required />
    </div>

    <div class="field">
      <label>Password</label>
      <input v-model="password" type="password" required />
    </div>

    <button class="button" type="submit">Log in</button>
    <p v-if="status" class="status">{{ status }}</p>
  </form>
</template>
