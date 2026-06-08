<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Pencil, Plus, Trash2 } from 'lucide-vue-next'
import { normalizeEvent } from '../lib/events'
import { buildEventPayload, buildNewEventPayload } from '../lib/eventPayload'
import { isFreePrice } from '../lib/eventPresentation'
import { supabase } from '../lib/supabase'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const route = useRoute()
const { user } = useAuth()
const status = ref('')
const isEditing = ref(false)
const eventId = ref(null)

const form = ref({
  title: '',
  organizer: '',
  category: 'social',
  location: '',
  description: '',
  price_text: '',
  event_link: '',
  date: '',
  start_time: '18:30',
  end_time: '21:30'
})

onMounted(async () => {
  if (route.params.id) {
    await loadEvent(route.params.id)
    return
  }

  if (route.query.duplicateId) {
    await loadEvent(route.query.duplicateId, { duplicate: true })
  }
})

function applyEventToForm(data) {
  const event = normalizeEvent(data)
  const startDate = new Date(event.start_time)

  form.value = {
    title: event.title || '',
    organizer: event.organizer || '',
    category: event.category || 'social',
    location: event.location || '',
    description: event.description || '',
    price_text: isFreePrice(event.price_text) ? '0' : (event.price_text || ''),
    event_link: event.event_link || '',
    date: startDate.toISOString().slice(0, 10),
    start_time: startDate.toTimeString().slice(0, 5),
    end_time: event.end_time ? new Date(event.end_time).toTimeString().slice(0, 5) : ''
  }
}

async function loadEvent(id, options = {}) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) {
    status.value = 'Could not load event.'
    return
  }

  applyEventToForm(data)

  if (options.duplicate) {
    isEditing.value = false
    eventId.value = null
    status.value = 'Duplicating event. Update the date or details before saving.'
    return
  }

  eventId.value = data.id
  isEditing.value = true
}

async function saveEvent() {
  status.value = 'Saving...'

  if (!user.value) {
    status.value = 'You must be logged in to save events.'
    return
  }

  const payload = isEditing.value
    ? buildEventPayload(form.value)
    : buildNewEventPayload(form.value, user.value.id)
  const query = isEditing.value
    ? supabase.from('events').update(payload).eq('id', eventId.value)
    : supabase.from('events').insert(payload)

  const { error } = await query

  if (error) {
    status.value = error.message
    return
  }

  sessionStorage.setItem('flash_message', isEditing.value ? 'Event updated successfully.' : 'Event created successfully.')
  router.push('/management')
}

async function deleteEvent() {
  if (!confirm('Delete this event? This cannot be undone.')) return

  status.value = 'Deleting...'

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId.value)

  if (error) {
    status.value = error.message
    return
  }

  sessionStorage.setItem('flash_message', 'Event deleted.')
  router.push('/management')
}
</script>

<template>
  <div class="management-page">
    <section class="hero">
      <h1>{{ isEditing ? 'Edit event' : 'Add event' }}</h1>
      <p>{{ isEditing ? 'Update the event details and save changes.' : 'Add one event occurrence to the public calendar.' }}</p>
    </section>

    <form class="card form" @submit.prevent="saveEvent">
      <p class="required-note">Fields marked with * are required.</p>

      <div class="grid-two">
        <div class="field">
          <label for="event-title">Title *</label>
          <input id="event-title" v-model="form.title" required />
        </div>

        <div class="field">
          <label for="event-organizer">Organizer</label>
          <input id="event-organizer" v-model="form.organizer" />
        </div>
      </div>

      <div class="grid-two">
        <div class="field">
          <label for="event-category">Category</label>
          <select id="event-category" v-model="form.category">
            <option value="social">Social</option>
            <option value="class">Class</option>
            <option value="festival">Festival</option>
            <option value="workshop">Workshop</option>
          </select>
        </div>

        <div class="field">
          <label for="event-location">Location</label>
          <input id="event-location" v-model="form.location" />
        </div>
      </div>

      <div class="field">
        <label for="event-description">Description</label>
        <textarea id="event-description" v-model="form.description" placeholder="Short note visible on the public page" />
      </div>

      <div class="grid-two">
        <div class="field">
          <label for="event-price">Price (DKK)</label>
          <input id="event-price" v-model="form.price_text" placeholder="0, 80, 120" />
          <p class="field-help">If the event is free, enter 0.</p>
        </div>

        <div class="field">
          <label for="event-link">Event Link</label>
          <input id="event-link" v-model="form.event_link" type="url" placeholder="https://..." />
        </div>
      </div>

      <div class="field">
        <label for="event-date">Date *</label>
        <input id="event-date" v-model="form.date" type="date" required />
      </div>

      <div class="grid-two">
        <div class="field">
          <label for="event-start">Start Time *</label>
          <input id="event-start" v-model="form.start_time" type="time" required />
        </div>

        <div class="field">
          <label for="event-end">End Time</label>
          <input id="event-end" v-model="form.end_time" type="time" />
        </div>
      </div>

      <div class="form-actions">
        <button class="button icon-text" type="submit">
          <component :is="isEditing ? Pencil : Plus" class="icon icon--sm" />
          {{ isEditing ? 'Save changes' : 'Create event' }}
        </button>
        <RouterLink to="/management" class="button secondary">Cancel</RouterLink>
        <button v-if="isEditing" class="button danger icon-text" type="button" @click="deleteEvent"><Trash2 class="icon icon--sm" />Delete event</button>
      </div>

      <p v-if="status" class="status">{{ status }}</p>
    </form>
  </div>
</template>
