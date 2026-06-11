<script setup>
import { onMounted, ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuth } from '../composables/useAuth'

const editableRoles = ['user', 'organizer']
const { user } = useAuth()
const profiles = ref([])
const loading = ref(true)
const error = ref('')
const status = ref('')
const updatingProfileId = ref('')

onMounted(async () => {
  await loadProfiles()
})

async function loadProfiles() {
  loading.value = true
  error.value = ''

  const { data, error: queryError } = await supabase
    .from('profiles')
    .select('id,email,role')
    .order('email', { ascending: true })

  if (queryError) {
    profiles.value = []
    error.value = queryError.message
    loading.value = false
    return
  }

  profiles.value = data || []
  loading.value = false
}

function isEditableProfile(profile) {
  if (!profile) return false
  if (profile.id === user.value?.id) return false
  return editableRoles.includes(profile.role)
}

async function changeRole(profile, nextRole) {
  status.value = ''
  error.value = ''

  if (!editableRoles.includes(nextRole)) {
    error.value = 'Only user and organizer roles can be assigned from this page.'
    await loadProfiles()
    return
  }

  if (!isEditableProfile(profile)) {
    error.value = 'This profile cannot be edited from User Management.'
    await loadProfiles()
    return
  }

  if (profile.role === nextRole) return

  updatingProfileId.value = profile.id

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ role: nextRole })
    .eq('id', profile.id)

  updatingProfileId.value = ''

  if (updateError) {
    error.value = updateError.message
    await loadProfiles()
    return
  }

  status.value = `${profile.email || 'Profile'} role updated to ${nextRole}.`
  await loadProfiles()
}
</script>

<template>
  <div class="management-page">
    <section class="management-toolbar">
      <div class="management-toolbar__heading">
        <h1>User Management</h1>
        <p>Update non-admin users between user and organizer roles.</p>
      </div>
    </section>

    <p v-if="status" class="flash-message">{{ status }}</p>
    <p v-if="loading" class="empty-state">Loading users...</p>
    <p v-else-if="error" class="empty-state">Could not update users: {{ error }}</p>

    <section v-else class="card user-management-section">
      <p class="field-help">Admin roles are manually managed in Supabase. This page cannot assign admin or edit admin profiles.</p>

      <div v-if="profiles.length === 0" class="empty-state">No users found.</div>

      <div v-else class="user-management-list">
        <article v-for="profile in profiles" :key="profile.id" class="user-management-row">
          <div class="user-management-row__details">
            <h2>{{ profile.email || 'No email recorded' }}</h2>
            <p>
              Current role: <strong>{{ profile.role || 'user' }}</strong>
              <span v-if="profile.id === user?.id">• Your account</span>
              <span v-else-if="profile.role === 'admin'">• Managed in Supabase</span>
            </p>
          </div>

          <div class="field user-management-row__control">
            <label :for="`profile-role-${profile.id}`">Role</label>
            <select
              v-if="isEditableProfile(profile)"
              :id="`profile-role-${profile.id}`"
              :value="profile.role"
              :disabled="updatingProfileId === profile.id"
              @change="changeRole(profile, $event.target.value)"
            >
              <option value="user">user</option>
              <option value="organizer">organizer</option>
            </select>
            <span v-else class="role-readonly">{{ profile.role || 'user' }}</span>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>
