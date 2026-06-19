<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Check, Pencil, X } from 'lucide-vue-next'
import { useAuth } from '../composables/useAuth'
import { normalizeEvent } from '../lib/events'
import { supabase } from '../lib/supabase'

const { user } = useAuth()
const submissions = ref([])
const loading = ref(true)
const error = ref('')
const reviewingId = ref(null)

onMounted(loadSubmissions)

async function loadSubmissions() {
  loading.value = true
  error.value = ''

  const { data, error: queryError } = await supabase
    .from('events')
    .select('*, organizer_record:organizers(id,name,verified)')
    .eq('status', 'pending')
    .order('submitted_at', { ascending: true })

  if (queryError) {
    error.value = queryError.message
    submissions.value = []
    loading.value = false
    return
  }

  submissions.value = (data || []).map(normalizeEvent)
  loading.value = false
}

async function reviewSubmission(event, nextStatus) {
  if (!user.value || reviewingId.value) return

  reviewingId.value = event.id
  error.value = ''

  const { error: updateError } = await supabase
    .from('events')
    .update({
      status: nextStatus,
      reviewed_by: user.value.id,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', event.id)

  if (updateError) {
    error.value = updateError.message
    reviewingId.value = null
    return
  }

  submissions.value = submissions.value.filter((submission) => submission.id !== event.id)
  reviewingId.value = null
  showToast(nextStatus === 'approved' ? 'Submission approved and added to the calendar.' : 'Submission rejected.')
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
    </section>

    <p v-if="loading" class="empty-state">Loading submissions...</p>
    <p v-else-if="error" class="empty-state">Could not load submissions: {{ error }}</p>
    <p v-else-if="submissions.length === 0" class="empty-state">All caught up — there are no community submissions to review.</p>

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
            @click="reviewSubmission(event, 'approved')"
          >
            <Check class="icon icon--sm" />Approve
          </button>
          <button
            class="button danger button--compact icon-text"
            type="button"
            :disabled="reviewingId === event.id"
            @click="reviewSubmission(event, 'rejected')"
          >
            <X class="icon icon--sm" />Reject
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
