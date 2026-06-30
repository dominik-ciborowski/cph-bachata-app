<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { CalendarPlus } from 'lucide-vue-next'
import OrganizerSelector from '../components/OrganizerSelector.vue'
import PriceFields from '../components/PriceFields.vue'
import { buildBulkEventPayloads } from '../lib/eventPayload'
import { fetchOrganizers, resolveOrganizerForEvent } from '../lib/organizers'
import { createDefaultPrice } from '../lib/pricing'
import { supabase } from '../lib/supabase'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { user } = useAuth()
const status = ref('')
const organizers = ref([])
const dateInput = ref('')
const selectedDates = ref([])

const form = ref({
  title: '',
  organizer: '',
  organizer_id: '',
  newOrganizerName: '',
  category: 'social',
  location: '',
  description: '',
  price: createDefaultPrice(),
  is_recurring: false,
  event_link: '',
  start_time: '18:30',
  end_time: '21:30'
})

onMounted(async () => {
  await loadOrganizers()
})

async function loadOrganizers() {
  try {
    organizers.value = await fetchOrganizers()
  } catch (organizerError) {
    status.value = organizerError.message
    organizers.value = []
  }
}

function handleDateChange(value) {
  if (!value || selectedDates.value.includes(value)) {
    dateInput.value = ''
    return
  }

  selectedDates.value = [...selectedDates.value, value].sort()
  dateInput.value = ''
}

function removeDate(date) {
  selectedDates.value = selectedDates.value.filter((item) => item !== date)
}

function formatDateForChip(dateStr) {
  return new Intl.DateTimeFormat('en-DK', {
    day: '2-digit',
    month: 'short'
  }).format(new Date(`${dateStr}T00:00:00`))
}

async function saveBulk() {
  if (!form.value.title) {
    status.value = 'Title is required.'
    return
  }

  if (selectedDates.value.length === 0) {
    status.value = 'Select at least one date.'
    return
  }

  if (!user.value) {
    status.value = 'You must be logged in to save events.'
    return
  }

  status.value = 'Saving...'

  let organizer

  try {
    organizer = await resolveOrganizerForEvent(form.value, user.value.id, organizers.value)
  } catch (organizerError) {
    status.value = organizerError.message
    return
  }

  const eventForm = {
    ...form.value,
    organizer_id: organizer?.id || null,
    organizer: organizer?.name || form.value.organizer || null
  }
  const rows = buildBulkEventPayloads(eventForm, selectedDates.value, user.value.id)

  const { error } = await supabase.from('events').insert(rows)

  if (error) {
    status.value = error.message
    return
  }

  sessionStorage.setItem('flash_message', `Saved ${rows.length} event(s).`)
  router.push('/management')
}
</script>

<template>
  <div class="management-page">
    <section class="hero">
      <h1>Bulk add events</h1>
      <p>Add shared event details once, then choose multiple dates to create separate event rows.</p>
    </section>

    <form class="card form" @submit.prevent="saveBulk">
      <p class="required-note">Fields marked with * are required.</p>

      <div class="grid-two">
        <div class="field">
          <label for="bulk-title">Title *</label>
          <input id="bulk-title" v-model="form.title" required placeholder="Friday Social" />
        </div>

        <OrganizerSelector
          v-model:organizer-id="form.organizer_id"
          v-model:organizer-name="form.organizer"
          v-model:new-organizer-name="form.newOrganizerName"
          :organizers="organizers"
          select-id="bulk-organizer"
          new-input-id="bulk-new-organizer"
        />
      </div>

      <div class="grid-two">
        <div class="field">
          <label for="bulk-category">Category</label>
          <select id="bulk-category" v-model="form.category">
            <option value="social">Social</option>
            <option value="class">Class</option>
            <option value="festival">Festival</option>
            <option value="workshop">Workshop</option>
          </select>
        </div>

        <div class="field">
          <label for="bulk-location">Location</label>
          <input id="bulk-location" v-model="form.location" placeholder="BLOX, Copenhagen" />
        </div>
      </div>

      <div class="field">
        <label for="bulk-description">Description</label>
        <textarea id="bulk-description" v-model="form.description" placeholder="Short note visible on the public page" />
      </div>

      <div class="grid-two">
        <PriceFields v-model="form.price" />

        <div class="field">
          <label for="bulk-link">Event Link</label>
          <input id="bulk-link" v-model="form.event_link" type="url" placeholder="https://..." />
        </div>
      </div>

      <div class="field checkbox-field">
        <label class="checkbox-field__label">
          <input v-model="form.is_recurring" type="checkbox" />
          Weekly event
        </label>
        <p class="field-help">Show this when the event repeats weekly.</p>
      </div>

      <div class="grid-two">
        <div class="field">
          <label for="bulk-start">Start Time *</label>
          <input id="bulk-start" v-model="form.start_time" type="time" required />
        </div>

        <div class="field">
          <label for="bulk-end">End Time</label>
          <input id="bulk-end" v-model="form.end_time" type="time" />
        </div>
      </div>

      <div class="field">
        <label for="bulk-dates">Dates *</label>
        <input
          id="bulk-dates"
          :value="dateInput"
          type="date"
          @change="(event) => handleDateChange(event.target.value)"
        />

        <div v-if="selectedDates.length" class="date-chip-list">
          <button
            v-for="date in selectedDates"
            :key="date"
            type="button"
            class="date-chip"
            @click="removeDate(date)"
          >
            {{ formatDateForChip(date) }} <span aria-hidden="true">✕</span>
          </button>
        </div>
      </div>

      <div class="form-actions">
        <button class="button icon-text" type="submit"><CalendarPlus class="icon icon--sm" />Create events</button>
        <RouterLink to="/management" class="button secondary">Cancel</RouterLink>
      </div>

      <p v-if="status" class="status">{{ status }}</p>
    </form>
  </div>
</template>
