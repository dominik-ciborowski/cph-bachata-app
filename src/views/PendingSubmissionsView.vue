<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { normalizeEvent } from '../lib/events'
import { supabase } from '../lib/supabase'

const submissions = ref([])
const loading = ref(true)
const error = ref('')

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
</script>

<template>
  <div class="management-page">
    <section class="hero">
      <h1>Pending Submissions</h1>
      <p>Review community-submitted events before adding them to the public calendar.</p>
    </section>

    <p v-if="loading" class="empty-state">Loading submissions...</p>
    <p v-else-if="error" class="empty-state">Could not load submissions: {{ error }}</p>
    <p v-else-if="submissions.length === 0" class="empty-state">No pending submissions.</p>

    <div v-else class="management-list">
      <article v-for="event in submissions" :key="event.id" class="management-card">
        <RouterLink :to="{ path: `/admin/${event.id}`, query: { review: 'submission' } }" class="management-card__content management-card__link">
          <h2>{{ event.title }}</h2>
          <p>{{ formatDate(event.start_time) }}</p>
          <p>{{ event.organizer_display || event.organizer || 'Organizer not set' }}</p>
        </RouterLink>
      </article>
    </div>
  </div>
</template>
