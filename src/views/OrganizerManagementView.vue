<script setup>
import { computed, onMounted, ref } from 'vue'
import { fetchOrganizers, findOrganizerByNameInDatabase } from '../lib/organizers'
import { findOrganizerByName, normalizeOrganizerName, sortOrganizersByName } from '../lib/organizerDisplay'
import { supabase } from '../lib/supabase'
import { useAuth } from '../composables/useAuth'

const { user, isAdmin } = useAuth()
const organizers = ref([])
const loading = ref(true)
const error = ref('')
const status = ref('')
const filter = ref('all')
const selectedSourceIds = ref([])
const targetOrganizerId = ref('')
const adminOrganizerName = ref('')

onMounted(async () => {
  if (!isAdmin.value) {
    loading.value = false
    error.value = 'You do not have access to organizer management.'
    return
  }

  await loadOrganizers()
})

const filteredOrganizers = computed(() => {
  return sortOrganizersByName(organizers.value).filter((organizer) => {
    if (filter.value === 'verified') return organizer.verified === true
    if (filter.value === 'unverified') return organizer.verified === false
    return true
  })
})

const targetOptions = computed(() => {
  const sourceIds = new Set(selectedSourceIds.value)
  return sortOrganizersByName(organizers.value).filter((organizer) => !sourceIds.has(organizer.id))
})

async function loadOrganizers() {
  loading.value = true
  error.value = ''

  try {
    organizers.value = await fetchOrganizers()
  } catch (queryError) {
    error.value = queryError.message
    organizers.value = []
  }

  loading.value = false
}

async function addOrganizer() {
  const name = normalizeOrganizerName(adminOrganizerName.value)

  if (!name) {
    status.value = 'Organizer name is required.'
    return
  }

  if (!user.value) {
    status.value = 'You must be logged in to add organizers.'
    return
  }

  if (findOrganizerByName(organizers.value, name)) {
    status.value = 'An organizer with this name already exists.'
    return
  }

  let existingOrganizer

  try {
    existingOrganizer = await findOrganizerByNameInDatabase(name)
  } catch (queryError) {
    status.value = queryError.message
    return
  }

  if (existingOrganizer) {
    status.value = 'An organizer with this name already exists.'
    return
  }

  status.value = 'Adding organizer...'

  const { error: insertError } = await supabase
    .from('organizers')
    .insert({
      name,
      verified: true,
      created_by: user.value.id
    })

  if (insertError) {
    status.value = insertError.message
    return
  }

  adminOrganizerName.value = ''
  status.value = 'Organizer added.'
  await loadOrganizers()
}

async function approveOrganizer(organizer) {
  status.value = 'Approving organizer...'

  const { error: updateError } = await supabase
    .from('organizers')
    .update({ verified: true })
    .eq('id', organizer.id)

  if (updateError) {
    status.value = updateError.message
    return
  }

  status.value = 'Organizer approved.'
  await loadOrganizers()
}

async function renameOrganizer(organizer) {
  const nextName = prompt('Rename organizer', organizer.name)?.trim()
  if (!nextName || nextName === organizer.name) return

  status.value = 'Renaming organizer...'

  const { error: updateError } = await supabase
    .from('organizers')
    .update({ name: nextName })
    .eq('id', organizer.id)

  if (updateError) {
    status.value = updateError.message
    return
  }

  await supabase
    .from('events')
    .update({ organizer: nextName })
    .eq('organizer_id', organizer.id)

  status.value = 'Organizer renamed.'
  await loadOrganizers()
}

async function deleteOrganizer(organizer) {
  if (!confirm(`Delete ${organizer.name}? Only organizers without events can be deleted.`)) return

  status.value = 'Checking organizer events...'

  const { count, error: countError } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('organizer_id', organizer.id)

  if (countError) {
    status.value = countError.message
    return
  }

  if (count > 0) {
    status.value = 'This organizer still has events and cannot be deleted safely.'
    return
  }

  const { error: deleteError } = await supabase
    .from('organizers')
    .delete()
    .eq('id', organizer.id)

  if (deleteError) {
    status.value = deleteError.message
    return
  }

  selectedSourceIds.value = selectedSourceIds.value.filter((id) => id !== organizer.id)
  if (targetOrganizerId.value === organizer.id) targetOrganizerId.value = ''
  status.value = 'Organizer deleted.'
  await loadOrganizers()
}

function validateMerge() {
  if (selectedSourceIds.value.length === 0) return 'Select at least one source organizer.'
  if (!targetOrganizerId.value) return 'Select a target organizer.'
  if (selectedSourceIds.value.includes(targetOrganizerId.value)) {
    return 'The target organizer cannot be one of the selected source organizers.'
  }

  return ''
}

async function mergeOrganizers() {
  const validationError = validateMerge()
  if (validationError) {
    status.value = validationError
    return
  }

  if (!confirm('This will move all events from selected organizers to the target organizer. This cannot be undone!')) {
    return
  }

  const targetOrganizer = organizers.value.find((organizer) => organizer.id === targetOrganizerId.value)
  if (!targetOrganizer) {
    status.value = 'Target organizer was not found.'
    return
  }

  status.value = 'Merging organizers...'

  const { error: updateError } = await supabase
    .from('events')
    .update({ organizer_id: targetOrganizer.id, organizer: targetOrganizer.name })
    .in('organizer_id', selectedSourceIds.value)

  if (updateError) {
    status.value = updateError.message
    return
  }

  const { error: deleteError } = await supabase
    .from('organizers')
    .delete()
    .in('id', selectedSourceIds.value)

  if (deleteError) {
    status.value = deleteError.message
    return
  }

  selectedSourceIds.value = []
  targetOrganizerId.value = ''
  status.value = 'Organizers merged.'
  await loadOrganizers()
}
</script>

<template>
  <div class="management-page">
    <section class="management-toolbar">
      <div class="management-toolbar__heading">
        <h1>Organizer Management</h1>
        <p>Review organizers created from event forms.</p>
      </div>
    </section>

    <p v-if="loading" class="empty-state">Loading organizers...</p>
    <p v-else-if="error" class="empty-state">Could not load organizers: {{ error }}</p>

    <template v-else>
      <section class="card organizer-admin-section">
        <h2>Add Organizer</h2>
        <form class="organizer-admin-form" @submit.prevent="addOrganizer">
          <div class="field">
            <label for="admin-organizer-name">Organizer name</label>
            <input id="admin-organizer-name" v-model="adminOrganizerName" placeholder="Organizer name" />
          </div>
          <button class="button" type="submit">Add Organizer</button>
        </form>
      </section>

      <section class="card organizer-admin-section">
        <div class="filters" aria-label="Organizer filters">
          <button type="button" class="filter-button" :class="{ active: filter === 'all' }" @click="filter = 'all'">All</button>
          <button type="button" class="filter-button" :class="{ active: filter === 'verified' }" @click="filter = 'verified'">Verified</button>
          <button type="button" class="filter-button" :class="{ active: filter === 'unverified' }" @click="filter = 'unverified'">Unverified</button>
        </div>

        <p v-if="filteredOrganizers.length === 0" class="empty-state">No organizers match this filter.</p>
        <div v-else class="management-list">
          <article v-for="organizer in filteredOrganizers" :key="organizer.id" class="organizer-admin-row">
            <label class="organizer-admin-row__select">
              <input v-model="selectedSourceIds" type="checkbox" :value="organizer.id" :disabled="organizer.id === targetOrganizerId" />
              <span class="organizer-admin-row__name">{{ organizer.name }}</span>
              <span v-if="organizer.verified === false" class="organizer-admin-row__meta">(Unverified)</span>
            </label>

            <div class="management-card__actions">
              <button v-if="organizer.verified === false" class="button button--compact" type="button" @click="approveOrganizer(organizer)">Approve</button>
              <button class="button secondary button--compact" type="button" @click="renameOrganizer(organizer)">Rename</button>
              <button class="button danger button--compact" type="button" @click="deleteOrganizer(organizer)">Delete</button>
            </div>
          </article>
        </div>
      </section>

      <section class="card organizer-admin-section">
        <h2>Bulk merge duplicate organizers</h2>
        <p class="field-help">Select one or more source organizers above, then choose the organizer to keep.</p>

        <div class="field">
          <label for="merge-target">Target organizer</label>
          <select id="merge-target" v-model="targetOrganizerId">
            <option value="">Select target organizer</option>
            <option v-for="organizer in targetOptions" :key="organizer.id" :value="organizer.id">
              {{ organizer.name }}
            </option>
          </select>
        </div>

        <button class="button" type="button" @click="mergeOrganizers">Merge selected organizers</button>
      </section>
    </template>

    <p v-if="status" class="status">{{ status }}</p>
  </div>
</template>
