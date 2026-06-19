<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Pencil, Plus, Trash2 } from 'lucide-vue-next'
import OrganizerSelector from '../components/OrganizerSelector.vue'
import { normalizeEvent } from '../lib/events'
import { buildEventPayload, buildNewEventPayload } from '../lib/eventPayload'
import { fetchOrganizers, resolveOrganizerForEvent } from '../lib/organizers'
import { isFreePrice } from '../lib/eventPresentation'
import { supabase } from '../lib/supabase'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const route = useRoute()
const { user, isAdmin } = useAuth()
const status = ref('')
const organizers = ref([])
const isEditing = ref(false)
const eventId = ref(null)
const reviewMode = ref(false)

const form = ref({
  title: '',
  organizer: '',
  organizer_id: '',
  newOrganizerName: '',
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
  await loadOrganizers()

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
    organizer: event.organizer_name || event.organizer || '',
    organizer_id: event.organizer_id || '',
    newOrganizerName: '',
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
    .select('*, organizer_record:organizers(id,name,verified)')
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
  reviewMode.value = route.query.review === 'submission' && data.status === 'pending'
}

async function loadOrganizers() {
  try {
    organizers.value = await fetchOrganizers()
  } catch (organizerError) {
    status.value = organizerError.message
    organizers.value = []
  }
}

async function saveEvent() {
  status.value = 'Saving...'

  if (!user.value) {
    status.value = 'You must be logged in to save events.'
    return
  }

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
    organizer: organizer?.name || form.value.organizer || null,
    status: reviewMode.value ? 'pending' : 'approved'
  }
  const payload = isEditing.value
    ? buildEventPayload(eventForm)
    : buildNewEventPayload(eventForm, user.value.id)
  const query = isEditing.value
    ? supabase.from('events').update(payload).eq('id', eventId.value)
    : supabase.from('events').insert(payload)

  const { error } = await query

  if (error) {
    status.value = error.message
    return
  }

  sessionStorage.setItem('flash_message', isEditing.value ? 'Event updated successfully.' : 'Event created successfully.')
  router.push(reviewMode.value ? '/admin/submissions' : '/management')
}

async function reviewSubmission(nextStatus) {
  if (!isAdmin.value || !eventId.value || !user.value) return

  status.value = nextStatus === 'approved' ? 'Adding submission to calendar...' : 'Rejecting submission...'

  let reviewPayload = {}

  if (nextStatus === 'approved') {
    let organizer

    try {
      organizer = await resolveOrganizerForEvent(form.value, user.value.id, organizers.value)
    } catch (organizerError) {
      status.value = organizerError.message
      return
    }

    reviewPayload = buildEventPayload({
      ...form.value,
      organizer_id: organizer?.id || null,
      organizer: organizer?.name || form.value.organizer || null
    })
  }

  const { error } = await supabase
    .from('events')
    .update({
      ...reviewPayload,
      status: nextStatus,
      reviewed_by: user.value.id,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', eventId.value)

  if (error) {
    status.value = error.message
    return
  }

  sessionStorage.setItem('flash_message', nextStatus === 'approved' ? 'Submission approved and added to the calendar.' : 'Submission rejected.')
  router.push('/admin/submissions')
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
      <h1>{{ reviewMode ? 'Review submission' : (isEditing ? 'Edit event' : 'Add event') }}</h1>
      <p>{{ reviewMode ? 'Edit the submitted event details before adding it to the calendar or rejecting it.' : (isEditing ? 'Update the event details and save changes.' : 'Add one event occurrence to the public calendar.') }}</p>
    </section>

    <form class="card form" @submit.prevent="saveEvent">
      <p class="required-note">Fields marked with * are required.</p>

      <div class="grid-two">
        <div class="field">
          <label for="event-title">Title *</label>
          <input id="event-title" v-model="form.title" required />
        </div>

        <OrganizerSelector
          v-model:organizer-id="form.organizer_id"
          v-model:organizer-name="form.organizer"
          v-model:new-organizer-name="form.newOrganizerName"
          :organizers="organizers"
          select-id="event-organizer"
          new-input-id="event-new-organizer"
        />
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
          {{ reviewMode ? 'Save edits' : (isEditing ? 'Save changes' : 'Create event') }}
        </button>
        <RouterLink :to="reviewMode ? '/admin/submissions' : '/management'" class="button secondary">Cancel</RouterLink>
        <button v-if="reviewMode && isAdmin" class="button" type="button" @click="reviewSubmission('approved')">Approve submission</button>
        <button v-if="reviewMode && isAdmin" class="button danger" type="button" @click="reviewSubmission('rejected')">Reject submission</button>
        <button v-if="isEditing && !reviewMode" class="button danger icon-text" type="button" @click="deleteEvent"><Trash2 class="icon icon--sm" />Delete event</button>
      </div>

      <p v-if="status" class="status">{{ status }}</p>
    </form>
  </div>
</template>
