<script setup>
import { onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { normalizeEvent } from '../lib/events'
import { supabase } from '../lib/supabase'

const route = useRoute()
const router = useRouter()
const { isAuthenticated } = useAuth()
const event = ref(null)
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  await loadEvent()
})

watch(
  () => route.params.id,
  async () => {
    await loadEvent()
  }
)

async function loadEvent() {
  loading.value = true
  error.value = ''

  const { data, error: queryError } = await supabase
    .from('events')
    .select('*')
    .eq('approved', true)
    .eq('id', route.params.id)
    .maybeSingle()

  if (queryError) {
    error.value = queryError.message
    event.value = null
    loading.value = false
    return
  }

  event.value = normalizeEvent(data)
  loading.value = false
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-DK', {
    weekday: 'long',
    day: '2-digit',
    month: 'long'
  }).format(new Date(value))
}

function formatTime(value) {
  return new Intl.DateTimeFormat('en-DK', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value))
}

async function deleteEvent() {
  if (!confirm('Are you sure you want to delete this event?')) {
    return
  }

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', event.value.id)

  if (error) {
    alert('Error deleting event: ' + error.message)
    return
  }

  sessionStorage.setItem('flash_message', 'Event deleted.')
  router.push('/')
}

</script>

<template>
  <section v-if="loading" class="hero">
    <p class="eyebrow">Event</p>
    <h1>Loading event...</h1>
  </section>

  <section v-else-if="error" class="hero">
    <p class="eyebrow">Event</p>
    <h1>Could not load event</h1>
    <p>{{ error }}</p>
    <RouterLink to="/" class="button">Back to events</RouterLink>
  </section>

  <section v-else-if="event" class="detail">
    <RouterLink to="/" class="detail-back">← Back to events</RouterLink>

    <section class="hero detail-hero">
      <p class="eyebrow">{{ event.category }}</p>
      <h1>{{ event.title }}</h1>
      <p v-if="event.organizer">Hosted by {{ event.organizer }}</p>
    </section>

    <section class="card detail-summary">
      <div class="detail-summary__place">
        <span>Where</span>
        <strong>{{ event.location || 'Location not listed yet' }}</strong>
      </div>

      <div class="detail-summary__facts">
        <div class="detail-fact">
          <span>When</span>
          <strong>{{ formatDate(event.start_time) }}</strong>
          <p>
            {{ formatTime(event.start_time) }}
            <template v-if="event.end_time"> until {{ formatTime(event.end_time) }}</template>
          </p>
        </div>

        <div class="detail-fact">
          <span>Organizer</span>
          <strong>{{ event.organizer || 'Organizer not listed yet' }}</strong>
        </div>

        <div class="detail-fact">
          <span>Price</span>
          <strong>{{ event.price_text || 'Check event details' }}</strong>
        </div>
      </div>
    </section>

    <section v-if="event.description" class="card detail-section">
      <h2>About this event</h2>
      <p>{{ event.description }}</p>
    </section>

    <section v-if="event.event_link" class="card detail-cta">
      <div>
        <h2>More information</h2>
        <p>Open the event link for the latest updates, attendance info, and details.</p>
      </div>
      <a class="button detail-cta__button" :href="event.event_link" target="_blank" rel="noreferrer">Open event link</a>
    </section>

    <section v-if="isAuthenticated" class="card detail-actions">
      <RouterLink :to="`/admin/${event.id}`" class="button">Edit event</RouterLink>
      <button class="button danger" @click="deleteEvent">Delete event</button>
    </section>
  </section>

  <section v-else class="hero">
    <p class="eyebrow">Event</p>
    <h1>Event not found</h1>
    <p>This event is not available or is no longer approved.</p>
    <RouterLink to="/" class="button">Back to events</RouterLink>
  </section>
</template>
