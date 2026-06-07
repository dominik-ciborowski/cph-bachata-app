<script setup>
import { onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { supabase } from '../lib/supabase'

const route = useRoute()
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

  event.value = data
  loading.value = false
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat('en-DK', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value))
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
          <strong>{{ event.price_text || 'Check Facebook event' }}</strong>
        </div>
      </div>
    </section>

    <section v-if="event.description" class="card detail-section">
      <h2>About this event</h2>
      <p>{{ event.description }}</p>
    </section>

    <section class="card detail-cta">
      <div>
        <h2>How to join</h2>
        <p>Open the Facebook event for the latest updates, attendance info, and event link.</p>
      </div>
      <a class="button detail-cta__button" :href="event.facebook_url" target="_blank" rel="noreferrer">Open Facebook event</a>
    </section>
  </section>

  <section v-else class="hero">
    <p class="eyebrow">Event</p>
    <h1>Event not found</h1>
    <p>This event is not available or is no longer approved.</p>
    <RouterLink to="/" class="button">Back to events</RouterLink>
  </section>
</template>
