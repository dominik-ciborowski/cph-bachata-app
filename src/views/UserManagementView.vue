<script setup>
import { computed, onMounted, ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuth } from '../composables/useAuth'

const editableRoles = ['user', 'organizer']
const { user } = useAuth()
const profiles = ref([])
const roleDrafts = ref({})
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const status = ref('')

onMounted(async () => {
  await loadProfiles()
})

const pendingChanges = computed(() =>
  profiles.value
    .filter((profile) => isEditableProfile(profile))
    .map((profile) => ({
      profile,
      fromRole: profile.role || 'user',
      toRole: roleDrafts.value[profile.id] || profile.role || 'user'
    }))
    .filter((change) => change.fromRole !== change.toRole)
)

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
  resetRoleDrafts()
  loading.value = false
}

function isEditableProfile(profile) {
  if (!profile) return false
  if (profile.id === user.value?.id) return false
  return editableRoles.includes(profile.role)
}

function resetRoleDrafts() {
  roleDrafts.value = Object.fromEntries(
    profiles.value.map((profile) => [profile.id, profile.role || 'user'])
  )
}

function setDraftRole(profile, nextRole) {
  status.value = ''
  error.value = ''

  if (!editableRoles.includes(nextRole)) {
    error.value = 'Only user and organizer roles can be selected from this page.'
    roleDrafts.value[profile.id] = profile.role || 'user'
    return
  }

  if (!isEditableProfile(profile)) {
    error.value = 'This profile cannot be edited from User Management.'
    roleDrafts.value[profile.id] = profile.role || 'user'
    return
  }

  roleDrafts.value[profile.id] = nextRole
}

function discardChanges() {
  status.value = ''
  error.value = ''
  resetRoleDrafts()
}

function getChangeSummary(change) {
  return `${change.profile.email || 'Profile'}: ${change.fromRole} → ${change.toRole}`
}

function validatePendingChanges() {
  const invalidChange = pendingChanges.value.find((change) => (
    !editableRoles.includes(change.toRole) || !isEditableProfile(change.profile)
  ))

  if (invalidChange) {
    return 'One or more selected role changes are not allowed. Discard changes and try again.'
  }

  return ''
}

async function saveChanges() {
  status.value = ''
  error.value = ''

  if (pendingChanges.value.length === 0) return

  const validationError = validatePendingChanges()
  if (validationError) {
    error.value = validationError
    return
  }

  const summary = pendingChanges.value.map(getChangeSummary).join('\n')
  if (!confirm(`Save these role changes?

${summary}`)) return

  saving.value = true

  let results

  try {
    results = await Promise.all(
      pendingChanges.value.map((change) => supabase
        .from('profiles')
        .update({ role: change.toRole })
        .eq('id', change.profile.id))
    )
  } catch {
    saving.value = false
    error.value = 'Could not save role changes right now. No local changes were discarded, so you can review and try again.'
    return
  }

  saving.value = false

  const failedResult = results.find((result) => result.error)
  if (failedResult) {
    error.value = 'Could not save all role changes. No local changes were discarded, so you can review and try again.'
    return
  }

  status.value = `Saved ${pendingChanges.value.length} role change${pendingChanges.value.length === 1 ? '' : 's'}.`
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
    <p v-if="error" class="empty-state">Could not update users: {{ error }}</p>

    <section v-if="!loading" class="card user-management-section">
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
              :value="roleDrafts[profile.id] || profile.role || 'user'"
              :disabled="saving"
              @change="setDraftRole(profile, $event.target.value)"
            >
              <option value="user">user</option>
              <option value="organizer">organizer</option>
            </select>
            <span v-else class="role-readonly">{{ profile.role || 'user' }}</span>
          </div>
        </article>
      </div>
    </section>

    <section v-if="pendingChanges.length > 0" class="card unsaved-changes-section">
      <div>
        <h2>Unsaved changes</h2>
        <p class="field-help">Review staged role changes before saving them to Supabase.</p>
      </div>

      <ul class="pending-change-list">
        <li v-for="change in pendingChanges" :key="change.profile.id">
          {{ getChangeSummary(change) }}
        </li>
      </ul>

      <div class="form-actions">
        <button class="button" type="button" :disabled="saving" @click="saveChanges">Save Changes</button>
        <button class="button secondary" type="button" :disabled="saving" @click="discardChanges">Discard Changes</button>
      </div>
    </section>
  </div>
</template>
