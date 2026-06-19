<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Check, Pencil, RotateCcw, X } from 'lucide-vue-next'
import { useAuth } from '../composables/useAuth'
import { normalizeEvent } from '../lib/events'
import { supabase } from '../lib/supabase'

const { user } = useAuth()
const submissions = ref([])
const loading = ref(true)
const error = ref('')
const reviewingId = ref(null)
const activeStatus = ref('pending')

const activeStatusLabel = computed(() => activeStatus.value === 'pending' ? 'Pending' : 'Rejected')

onMounted(loadSubmissions)

async function loadSubmissions() {
  loading.value = true
  error.value = ''

  const { data, error: queryError } = await supabase
    .from('events')
    .select('*, organizer_record:organizers(id,name,verified)')
    .eq('status', activeStatus.value)
    .order(activeStatus.value === 'pending' ? 'submitted_at' : 'reviewed_at', { ascending: true })

  if (queryError) {
    error.value = queryError.message
    submissions.value = []
    loading.value = false
    return
  }

  submissions.value = (data || []).map(normalizeEvent)
  loading.value = false
}

async function updateSubmissionStatus(event, nextStatus) {
  if (!user.value || reviewingId.value) return

  reviewingId.value = event.id
  error.value = ''

  const payload = nextStatus === 'pending'
    ? { status: 'pending', reviewed_by: null, reviewed_at: null }
    : { status: nextStatus, reviewed_by: user.value.id, reviewed_at: new Date().toISOString() }

  const { error: updateError } = await supabase
    .from('events')
    .update(payload)
    .eq('id', event.id)

  if (updateError) {
    error.value = updateError.message
    reviewingId.value = null
    return
  }

  submissions.value = submissions.value.filter((submission) => submission.id !== event.id)
  reviewingId.value = null
  showToast(getStatusMessage(nextStatus))
}

async function changeStatus(status) {
  if (activeStatus.value === status) return
  activeStatus.value = status
  await loadSubmissions()
}

function getStatusMessage(nextStatus) {
  if (nextStatus === 'approved') return 'Submission approved and added to the calendar.'
  if (nextStatus === 'rejected') return 'Submission rejected.'
  return 'Submission restored to pending review.'
}

function showToast(message) {
  window.dispatchEvent(new CustomEvent('app-toast', { detail: { message } }))
}

function formatDate(value) {
  if (!value) return 'Date missing'
  return new Intl.DateTimeFormat('en-DK', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value))
}

function formatSubmittedDate(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-DK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value))
}
</script>

<template>
  <div class="management-page">
    <section class="hero">
      <h1>Pending Submissions</h1>
      <p>Review community-submitted events before adding them to the public calendar.</p>
      <div class="form-actions" role="tablist" aria-label="Submission status">
        <button
          class="button button--compact"
          :class="{ secondary: activeStatus !== 'pending' }"
          type="button"
          role="tab"
          :aria-selected="activeStatus === 'pending' ? 'true' : 'false'"
          @click="changeStatus('pending')"
        >
          Pending
        </button>
        <button
          class="button button--compact"
          :class="{ secondary: activeStatus !== 'rejected' }"
          type="button"
          role="tab"
          :aria-selected="activeStatus === 'rejected' ? 'true' : 'false'"
          @click="changeStatus('rejected')"
        >
          Rejected
        </button>
      </div>
    </section>

    <p v-if="loading" class="empty-state">Loading {{ activeStatusLabel.toLowerCase() }} submissions...</p>
    <p v-else-if="error" class="empty-state">Could not update submissions: {{ error }}</p>
    <p v-else-if="submissions.length === 0" class="empty-state">{{ activeStatus === 'pending' ? 'All caught up — there are no community submissions to review.' : 'No rejected submissions.' }}</p>

    <section v-else class="management-list">
      <article v-for="event in submissions" :key="event.id" class="card management-card">
        <div class="management-card__content">
          <h2 class="management-card__title">{{ event.title }}</h2>
          <p class="management-card__meta">
            {{ formatDate(event.start_time) }}
            <span v-if="event.location">• {{ event.location }}</span>
            <span v-if="event.organizer_display || event.organizer">• {{ event.organizer_display || event.organizer }}</span>
          </p>
          <p v-if="event.submitted_by || event.submitted_at" class="management-card__meta">
            <span v-if="event.submitted_by">Submitted by {{ event.submitted_by }}</span>
            <span v-if="event.submitted_by && event.submitted_at"> • </span>
            <span v-if="event.submitted_at">Submitted {{ formatSubmittedDate(event.submitted_at) }}</span>
          </p>
        </div>

        <div class="management-card__actions">
          <button
            class="button button--compact icon-text"
            type="button"
            :disabled="reviewingId === event.id"
            @click="updateSubmissionStatus(event, 'approved')"
          >
            <Check class="icon icon--sm" />Approve
          </button>
          <button
            v-if="activeStatus === 'pending'"
            class="button danger button--compact icon-text"
            type="button"
            :disabled="reviewingId === event.id"
            @click="updateSubmissionStatus(event, 'rejected')"
          >
            <X class="icon icon--sm" />Reject
          </button>
          <button
            v-if="activeStatus === 'rejected'"
            class="button secondary button--compact icon-text"
            type="button"
            :disabled="reviewingId === event.id"
            @click="updateSubmissionStatus(event, 'pending')"
          >
            <RotateCcw class="icon icon--sm" />Restore to Pending
          </button>
          <RouterLink
            :to="{ path: `/admin/${event.id}`, query: { review: 'submission' } }"
            class="button secondary button--compact icon-text"
          >
            <Pencil class="icon icon--sm" />Edit
          </RouterLink>
        </div>
      </article>
    </section>
  </div>
</template>
