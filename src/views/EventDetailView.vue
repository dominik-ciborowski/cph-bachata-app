<script setup>
import { onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { CalendarDays, MapPin, Pencil, Trash2 } from 'lucide-vue-next'
import { useAuth } from '../composables/useAuth'
import { normalizeEvent } from '../lib/events'
import { EventLinkIcon, formatPriceDisplay, getCategoryMeta } from '../lib/eventPresentation'
import { supabase } from '../lib/supabase'

const route = useRoute()
const router = useRouter()
const { isAuthenticated } = useAuth()
const event = ref(null)
const loading = ref(true)
const error = ref('')

function getBackTarget() {
  return route.query.from === 'management' ? '/management' : '/'
}

function getBackLabel() {
  return route.query.from === 'management' ? 'Back to management' : 'Back to events'
}

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
    .select('*, organizer_record:organizers(id,name,verified)')
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

function getMapsUrl(location) {
  if (!location) return ''
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`
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
    <RouterLink :to="getBackTarget()" class="button">{{ getBackLabel() }}</RouterLink>
  </section>

  <section v-else-if="event" class="detail">
    <RouterLink :to="getBackTarget()" class="detail-back">← {{ getBackLabel() }}</RouterLink>

    <section class="hero detail-hero">
      <p class="eyebrow detail-category" :class="getCategoryMeta(event.category).className">
        <component :is="getCategoryMeta(event.category).icon" class="icon icon--sm" />
        {{ getCategoryMeta(event.category).label }}
      </p>
      <h1>{{ event.title }}</h1>
      <p v-if="event.organizer_display" class="detail-organizer-line">Hosted by <span class="detail-organizer-name">{{ event.organizer_display }}</span></p>
    </section>

    <section class="card detail-summary">
      <div class="detail-summary__place">
        <span>Where</span>
        <strong v-if="event.location">
          <a
            class="detail-location-link icon-text"
            :href="getMapsUrl(event.location)"
            target="_blank"
            rel="noopener noreferrer"
          >
            <MapPin class="icon icon--sm" />
            {{ event.location }}
            <EventLinkIcon class="icon icon--sm" />
          </a>
        </strong>
        <strong v-else>Location not listed yet</strong>
      </div>

      <div class="detail-summary__facts">
        <div class="detail-fact">
          <span>When</span>
          <strong class="icon-text"><CalendarDays class="icon icon--sm" />{{ formatDate(event.start_time) }}</strong>
          <p>
            {{ formatTime(event.start_time) }}
            <template v-if="event.end_time"> until {{ formatTime(event.end_time) }}</template>
          </p>
        </div>

        <div class="detail-fact">
          <span>Price</span>
          <strong>{{ formatPriceDisplay(event.price_text) }}</strong>
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
      <a class="button detail-cta__button icon-text" :href="event.event_link" target="_blank" rel="noreferrer">
        <EventLinkIcon class="icon icon--sm" />
        Open event link
      </a>
    </section>

    <section v-if="isAuthenticated" class="card detail-actions">
      <RouterLink :to="`/admin/${event.id}`" class="button icon-text"><Pencil class="icon icon--sm" />Edit event</RouterLink>
      <button class="button danger icon-text" @click="deleteEvent"><Trash2 class="icon icon--sm" />Delete event</button>
    </section>
  </section>

  <section v-else class="hero">
    <p class="eyebrow">Event</p>
    <h1>Event not found</h1>
    <p>This event is not available or is no longer approved.</p>
    <RouterLink :to="getBackTarget()" class="button">{{ getBackLabel() }}</RouterLink>
  </section>
</template>
