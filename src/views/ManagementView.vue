<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { normalizeEvent } from '../lib/events'
import { supabase } from '../lib/supabase'

const router = useRouter()
const events = ref([])
const loading = ref(true)
const error = ref('')
const flashMessage = ref('')

const today = new Date()
today.setHours(0, 0, 0, 0)

onMounted(async () => {
  const storedFlashMessage = sessionStorage.getItem('flash_message')
  if (storedFlashMessage) {
    flashMessage.value = storedFlashMessage
    sessionStorage.removeItem('flash_message')
  }

  await loadEvents()
})

const upcomingEvents = computed(() =>
  events.value.filter((event) => new Date(event.start_time) >= today)
)

async function loadEvents() {
  loading.value = true
  error.value = ''

  const { data, error: queryError } = await supabase
    .from('events')
    .select('*')
    .order('start_time', { ascending: true })

  if (queryError) {
    error.value = queryError.message
    events.value = []
    loading.value = false
    return
  }

  events.value = (data || []).map(normalizeEvent)
  loading.value = false
}

function formatStart(value) {
  return new Intl.DateTimeFormat('en-DK', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value))
}

async function removeEvent(id) {
  if (!confirm('Delete this event? This cannot be undone.')) return

  const { error: deleteError } = await supabase.from('events').delete().eq('id', id)

  if (deleteError) {
    error.value = deleteError.message
    return
  }

  flashMessage.value = 'Event deleted.'
  await loadEvents()
}

function editEvent(id) {
  router.push(`/admin/${id}`)
}

function duplicateEvent(id) {
  router.push({ path: '/admin', query: { duplicateId: id } })
}

function gotoAddEvent() {
  router.push('/admin')
}

function gotoBulkAdd() {
  router.push('/management/bulk')
}
</script>

<template>
  <div class="management-page">
    <section class="management-toolbar">
      <div class="management-toolbar__heading">
        <h1>Event Management</h1>
        <p>Upcoming Events ({{ upcomingEvents.length }})</p>
      </div>

      <div class="management-toolbar__actions">
        <button class="button button--compact" type="button" @click="gotoAddEvent">+ Add Event</button>
        <button class="button secondary button--compact" type="button" @click="gotoBulkAdd">+ Bulk Add Events</button>
      </div>
    </section>

    <p v-if="flashMessage" class="flash-message">{{ flashMessage }}</p>
    <p v-if="loading" class="empty-state">Loading events...</p>
    <p v-else-if="error" class="empty-state">Could not load events: {{ error }}</p>
    <p v-else-if="upcomingEvents.length === 0" class="empty-state">No upcoming events yet.</p>

    <section v-else class="management-list">
      <div v-for="event in upcomingEvents" :key="event.id" class="card management-card">
        <div class="management-card__content">
          <h2 class="management-card__title">{{ event.title }}</h2>
          <p class="management-card__meta">
            {{ formatStart(event.start_time) }}
            <span v-if="event.location">• {{ event.location }}</span>
            <span v-if="event.organizer">• {{ event.organizer }}</span>
          </p>
        </div>

        <div class="management-card__actions">
          <button class="button button--compact" type="button" @click="editEvent(event.id)">Edit</button>
          <button class="button secondary button--compact" type="button" @click="duplicateEvent(event.id)">Duplicate</button>
          <button class="button danger button--compact" type="button" @click="removeEvent(event.id)">Delete</button>
        </div>
      </div>
    </section>
  </div>
</template>
