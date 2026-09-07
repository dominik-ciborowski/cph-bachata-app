<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Pencil, Plus, Trash2 } from 'lucide-vue-next'
import CancellationModal from '../components/CancellationModal.vue'
import ConfirmationModal from '../components/ConfirmationModal.vue'
import OrganizerSelector from '../components/OrganizerSelector.vue'
import PriceFields from '../components/PriceFields.vue'
import { normalizeEvent } from '../lib/events'
import { buildEventPayload, buildNewEventPayload } from '../lib/eventPayload'
import { fetchOrganizers, resolveOrganizerForEvent } from '../lib/organizers'
import { createDefaultPrice, normalizePrice } from '../lib/pricing'
import { supabase } from '../lib/supabase'
import { trackBulkEventsCreated, trackOrganizerEvent } from '../analytics/interactionTracking'
import { AnalyticsEvents } from '../analytics/types'
import { useAuth } from '../composables/useAuth'
import { findDefaultOrganizer } from '../lib/profile'
import { getWeeklyOccurrenceDates, WEEKDAYS } from '../lib/weeklyRecurrence'

const router = useRouter()
const route = useRoute()
const { user, profile, role, isAdmin, canManageEventRecord } = useAuth()
const status = ref('')
const organizers = ref([])
const isEditing = ref(false)
const eventId = ref(null)
const reviewMode = ref(false)
const isDuplicating = ref(false)
const reviewStatus = ref('')
const eventStatus = ref('approved')
const cancellationModalOpen = ref(false)
const cancellationReason = ref('')
const confirmationModal = ref(null)
const occurrence = ref('once')
const selectedWeekdays = ref([])
const recurrenceStartDate = ref('')
const recurrenceEndDate = ref('')
const recurringDates = computed(() => getWeeklyOccurrenceDates(
  recurrenceStartDate.value,
  recurrenceEndDate.value,
  selectedWeekdays.value
))

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
  end_time: ''
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
    price: normalizePrice(event.price_text),
    is_recurring: Boolean(event.is_recurring),
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

  const event = normalizeEvent(data)

  if (!canManageEventRecord(event)) {
    status.value = 'You do not have access to manage this event.'
    return
  }

  applyEventToForm(event)

  if (options.duplicate) {
    isDuplicating.value = true
    form.value.date = ''
    isEditing.value = false
    eventId.value = null
    eventStatus.value = 'approved'
    status.value = 'Duplicating event. Choose a new date/time before saving.'
    return
  }

  eventId.value = data.id
  isEditing.value = true
  eventStatus.value = data.status || 'approved'
  reviewStatus.value = data.status || ''
  reviewMode.value = route.query.review === 'submission' && ['pending', 'rejected'].includes(data.status)
}

async function loadOrganizers() {
  try {
    organizers.value = await fetchOrganizers()
    if (!route.params.id && !route.query.duplicateId) {
      const defaultOrganizer = findDefaultOrganizer(organizers.value, profile.value, role.value)
      if (defaultOrganizer) {
        form.value.organizer_id = defaultOrganizer.id
        form.value.organizer = defaultOrganizer.name
      }
    }
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

  if (!isEditing.value && occurrence.value === 'weekly' && recurringDates.value.length === 0) {
    status.value = 'Select at least one weekday and a valid start and end date.'
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
    status: reviewMode.value ? reviewStatus.value : eventStatus.value
  }
  const isWeeklyCreation = !isEditing.value && occurrence.value === 'weekly'
  const payload = isEditing.value
    ? buildEventPayload(eventForm)
    : (isWeeklyCreation
        ? recurringDates.value.map((date) => buildNewEventPayload({ ...eventForm, date, is_recurring: true }, user.value.id))
        : buildNewEventPayload({ ...eventForm, is_recurring: false }, user.value.id))
  const query = isEditing.value
    ? supabase.from('events').update(payload).eq('id', eventId.value)
    : supabase.from('events').insert(payload)

  const { error } = await query

  if (error) {
    status.value = error.message
    return
  }

  const analyticsEvent = { ...(Array.isArray(payload) ? payload[0] : payload), ...(isEditing.value ? { id: eventId.value } : {}) }
  const analyticsEventName = isEditing.value
    ? AnalyticsEvents.EVENT_UPDATED
    : (isDuplicating.value ? AnalyticsEvents.EVENT_DUPLICATED : AnalyticsEvents.EVENT_CREATED)
  if (isWeeklyCreation) trackBulkEventsCreated(analyticsEvent, payload.length)
  else trackOrganizerEvent(analyticsEventName, analyticsEvent)

  sessionStorage.setItem('flash_message', isEditing.value
    ? 'Event updated successfully.'
    : `${isWeeklyCreation ? payload.length : 1} event${isWeeklyCreation && payload.length !== 1 ? 's' : ''} created successfully.`)
  router.push(reviewMode.value ? '/admin/submissions' : '/management')
}

async function restoreSubmission() {
  if (!isAdmin.value || !eventId.value) return

  status.value = 'Restoring submission to pending review...'

  const { error } = await supabase
    .from('events')
    .update({
      status: 'pending',
      reviewed_by: null,
      reviewed_at: null
    })
    .eq('id', eventId.value)

  if (error) {
    status.value = error.message
    return
  }

  sessionStorage.setItem('flash_message', 'Submission restored to pending review.')
  router.push('/admin/submissions')
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

function openCancellationModal() {
  cancellationReason.value = ''
  cancellationModalOpen.value = true
}

function closeCancellationModal() {
  if (status.value === 'Cancelling...') return
  cancellationModalOpen.value = false
  cancellationReason.value = ''
}

async function cancelEvent(reason) {
  status.value = 'Cancelling...'
  const cancellationReason = reason?.trim() || null

  const { error } = await supabase
    .from('events')
    .update({ status: 'cancelled', cancellation_reason: cancellationReason })
    .eq('id', eventId.value)

  if (error) {
    status.value = error.message
    return
  }

  cancellationModalOpen.value = false
  sessionStorage.setItem('flash_message', 'Event cancelled.')
  router.push('/management')
}

function openRestoreModal() {
  confirmationModal.value = 'restore'
}

function openDeleteModal() {
  confirmationModal.value = 'delete'
}

function closeConfirmationModal() {
  if (status.value === 'Restoring...' || status.value === 'Deleting...') return
  confirmationModal.value = null
}

async function restoreEvent() {
  status.value = 'Restoring...'

  const { error } = await supabase
    .from('events')
    .update({ status: 'approved', cancellation_reason: null })
    .eq('id', eventId.value)

  if (error) {
    status.value = error.message
    return
  }

  confirmationModal.value = null
  sessionStorage.setItem('flash_message', 'Event restored.')
  router.push('/management')
}

async function deleteEvent() {
  status.value = 'Deleting...'

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId.value)

  if (error) {
    status.value = error.message
    return
  }

  trackOrganizerEvent(AnalyticsEvents.EVENT_DELETED, {
    ...buildEventPayload(form.value),
    id: eventId.value
  })

  confirmationModal.value = null
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

      <PriceFields v-model="form.price" />

      <div class="field">
        <label for="event-link">Event Link</label>
        <input id="event-link" v-model="form.event_link" type="url" placeholder="https://..." />
      </div>

      <fieldset v-if="!isEditing" class="field">
        <legend>Occurs</legend>
        <label class="checkbox-field__label">
          <input v-model="occurrence" type="radio" value="once" /> Once
        </label>
        <label class="checkbox-field__label">
          <input v-model="occurrence" type="radio" value="weekly" /> Repeats weekly
        </label>
      </fieldset>

      <template v-if="!isEditing && occurrence === 'weekly'">
        <fieldset class="field">
          <legend>Repeats on *</legend>
          <div class="date-chip-list">
            <label v-for="weekday in WEEKDAYS" :key="weekday.value" class="date-chip">
              <input v-model="selectedWeekdays" type="checkbox" :value="weekday.value" />
              {{ weekday.label }}
            </label>
          </div>
        </fieldset>

        <div class="grid-two">
          <div class="field">
            <label for="recurrence-start-date">Start date *</label>
            <input id="recurrence-start-date" v-model="recurrenceStartDate" type="date" required />
          </div>
          <div class="field">
            <label for="recurrence-end-date">End date *</label>
            <input id="recurrence-end-date" v-model="recurrenceEndDate" type="date" required />
          </div>
        </div>
        <p class="field-help" aria-live="polite">
          {{ recurringDates.length }} event{{ recurringDates.length === 1 ? '' : 's' }} will be created.
        </p>
      </template>

      <div v-else class="field">
        <label for="event-date">{{ isEditing ? 'Date' : 'Date *' }}</label>
        <input id="event-date" v-model="form.date" type="date" required />
      </div>

      <div class="grid-two">
        <div class="field">
          <label for="event-start">Start Time *</label>
          <input id="event-start" v-model="form.start_time" type="time" required />
        </div>

        <div class="field">
          <label for="event-end">End Time (optional)</label>
          <input id="event-end" v-model="form.end_time" type="time" />
        </div>
      </div>

      <div class="form-actions">
        <button class="button icon-text" type="submit">
          <component :is="isEditing ? Pencil : Plus" class="icon icon--sm" />
          {{ reviewMode ? 'Save edits' : (isEditing ? 'Save changes' : (occurrence === 'weekly' ? `Create ${recurringDates.length} Events` : 'Create Event')) }}
        </button>
        <RouterLink :to="reviewMode ? '/admin/submissions' : '/management'" class="button secondary">Cancel</RouterLink>
        <button v-if="reviewMode && isAdmin" class="button" type="button" @click="reviewSubmission('approved')">Approve submission</button>
        <button v-if="reviewMode && isAdmin && reviewStatus === 'pending'" class="button danger" type="button" @click="reviewSubmission('rejected')">Reject submission</button>
        <button v-if="reviewMode && isAdmin && reviewStatus === 'rejected'" class="button secondary" type="button" @click="restoreSubmission">Restore to Pending</button>
        <button v-if="isEditing && !reviewMode && eventStatus === 'cancelled'" class="button secondary" type="button" @click="openRestoreModal">Restore event</button>
        <button v-if="isEditing && !reviewMode && eventStatus !== 'cancelled'" class="button danger" type="button" @click="openCancellationModal">Cancel event</button>
        <button v-if="isEditing && !reviewMode" class="button danger icon-text" type="button" @click="openDeleteModal"><Trash2 class="icon icon--sm" />Delete event</button>
      </div>

      <p v-if="status" class="status">{{ status }}</p>
    </form>

    <CancellationModal
      v-if="cancellationModalOpen"
      :busy="status === 'Cancelling...'"
      @close="closeCancellationModal"
      @confirm="cancelEvent"
    />

    <ConfirmationModal
      v-if="confirmationModal === 'restore'"
      title="Restore Event"
      description="This event will be marked as active again and the cancellation reason will be removed."
      confirm-label="Restore Event"
      :busy="status === 'Restoring...'"
      @close="closeConfirmationModal"
      @confirm="restoreEvent"
    />

    <ConfirmationModal
      v-if="confirmationModal === 'delete'"
      title="Delete Event Permanently?"
      description="This event will be permanently removed. This action cannot be undone."
      confirm-label="Delete Event"
      danger
      :busy="status === 'Deleting...'"
      @close="closeConfirmationModal"
      @confirm="deleteEvent"
    />
  </div>
</template>
