<script setup>
import { ref } from 'vue'
import { CalendarPlus } from 'lucide-vue-next'
import PriceFields from '../components/PriceFields.vue'
import { buildSubmittedEventPayload } from '../lib/eventPayload'
import { createDefaultPrice } from '../lib/pricing'
import { supabase } from '../lib/supabase'
import { useAuth } from '../composables/useAuth'
import { trackEventSubmission } from '../analytics/interactionTracking'
import { AnalyticsEvents, EventSubmissionErrorTypes } from '../analytics/types'

const { user } = useAuth()
const status = ref('')
const success = ref(false)
const submissionStarted = ref(false)

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
  date: '',
  start_time: '18:30',
  end_time: '21:30'
})

function resetForm() {
  form.value = {
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
    date: '',
    start_time: '18:30',
    end_time: '21:30'
  }
}

function getSubmissionAnalyticsProperties() {
  return {
    eventType: form.value.category || undefined,
    isFree: form.value.price?.type === 'free'
  }
}

function startSubmission() {
  if (submissionStarted.value) return
  submissionStarted.value = true
  const properties = getSubmissionAnalyticsProperties()
  trackEventSubmission(AnalyticsEvents.EVENT_SUBMISSION_STARTED, properties.eventType, properties.isFree)
}

async function submitEvent() {
  startSubmission()
  status.value = 'Submitting...'
  success.value = false

  if (!user.value) {
    const properties = getSubmissionAnalyticsProperties()
    trackEventSubmission(
      AnalyticsEvents.EVENT_SUBMISSION_FAILED,
      properties.eventType,
      properties.isFree,
      EventSubmissionErrorTypes.AUTHENTICATION_REQUIRED
    )
    status.value = 'Please log in to submit an event.'
    return
  }

  const { error } = await supabase
    .from('events')
    .insert(buildSubmittedEventPayload(form.value, user.value.id))

  if (error) {
    const properties = getSubmissionAnalyticsProperties()
    trackEventSubmission(
      AnalyticsEvents.EVENT_SUBMISSION_FAILED,
      properties.eventType,
      properties.isFree,
      EventSubmissionErrorTypes.SUBMISSION_REQUEST_FAILED
    )
    status.value = error.message
    return
  }

  const properties = getSubmissionAnalyticsProperties()
  trackEventSubmission(AnalyticsEvents.EVENT_SUBMISSION_SUCCEEDED, properties.eventType, properties.isFree)
  resetForm()
  submissionStarted.value = false
  success.value = true
  status.value = "Thank you! Your event has been submitted. We'll review the information and add it to the calendar if everything looks correct."
}
</script>

<template>
  <div class="management-page">
    <section class="hero">
      <h1>Missing an event?</h1>
      <p>Help keep the calendar up to date by submitting events you think should be added.</p>
      <p>Our team will review the information and add the event to the calendar if everything looks correct.</p>
    </section>

    <form class="card form" @focusin="startSubmission" @submit.prevent="submitEvent">
      <p class="required-note">Fields marked with * are required.</p>

      <div class="grid-two">
        <div class="field">
          <label for="submit-title">Title *</label>
          <input id="submit-title" v-model="form.title" required />
        </div>

        <div class="field">
          <label for="submit-organizer">Organizer</label>
          <input id="submit-organizer" v-model="form.organizer" placeholder="Organizer name, if known" />
        </div>
      </div>

      <div class="grid-two">
        <div class="field">
          <label for="submit-category">Category</label>
          <select id="submit-category" v-model="form.category">
            <option value="social">Social</option>
            <option value="class">Class</option>
            <option value="festival">Festival</option>
            <option value="workshop">Workshop</option>
          </select>
        </div>

        <div class="field">
          <label for="submit-location">Location</label>
          <input id="submit-location" v-model="form.location" />
        </div>
      </div>

      <div class="field">
        <label for="submit-description">Description</label>
        <textarea id="submit-description" v-model="form.description" placeholder="Short note about the event" />
      </div>

      <PriceFields v-model="form.price" />

      <div class="field">
        <label for="submit-link">Event Link</label>
        <input id="submit-link" v-model="form.event_link" type="url" placeholder="https://..." />
      </div>

      <div class="field checkbox-field">
        <label class="checkbox-field__label">
          <input v-model="form.is_recurring" type="checkbox" />
          Weekly event
        </label>
        <p class="field-help">Show this when the event repeats weekly.</p>
      </div>

      <div class="field">
        <label for="submit-date">Date *</label>
        <input id="submit-date" v-model="form.date" type="date" required />
      </div>

      <div class="grid-two">
        <div class="field">
          <label for="submit-start">Start Time *</label>
          <input id="submit-start" v-model="form.start_time" type="time" required />
        </div>

        <div class="field">
          <label for="submit-end">End Time</label>
          <input id="submit-end" v-model="form.end_time" type="time" />
        </div>
      </div>

      <div class="form-actions">
        <button class="button icon-text" type="submit"><CalendarPlus class="icon icon--sm" />Submit Event</button>
      </div>

      <p v-if="status" class="status" :class="{ success }">{{ status }}</p>
    </form>
  </div>
</template>
