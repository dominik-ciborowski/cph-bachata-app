<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { CalendarPlus, Plus } from 'lucide-vue-next'
import { normalizeEvent } from '../lib/events'
import { supabase } from '../lib/supabase'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { user, isAdmin, isOrganizer, canManageEvents } = useAuth()
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

  if (!canManageEvents.value) {
    loading.value = false
    error.value = 'You do not have access to event management.'
    return
  }

  await loadEvents()
})

const upcomingEvents = computed(() =>
  events.value.filter((event) => new Date(event.start_time) >= today)
)

async function loadEvents() {
  loading.value = true
  error.value = ''

  if (!canManageEvents.value || !user.value) {
    error.value = 'You do not have access to event management.'
    events.value = []
    loading.value = false
    return
  }

  let query = supabase
    .from('events')
    .select('*, organizer_record:organizers(id,name,verified)')

  if (isOrganizer.value && !isAdmin.value) {
    query = query.eq('created_by', user.value.id)
  }

  const { data, error: queryError } = await query.order('start_time', { ascending: true })

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
        <p>{{ isAdmin ? 'All upcoming events' : 'Your upcoming events' }} ({{ upcomingEvents.length }})</p>
      </div>
    </section>

    <div class="management-toolbar__actions" aria-label="Management actions">
      <button class="button button--compact icon-text" type="button" @click="gotoAddEvent"><Plus class="icon icon--sm" />Add Event</button>
      <button class="button secondary button--compact icon-text" type="button" @click="gotoBulkAdd"><CalendarPlus class="icon icon--sm" />Bulk Add Events</button>
    </div>

    <p v-if="flashMessage" class="flash-message">{{ flashMessage }}</p>
    <p v-if="loading" class="empty-state">Loading events...</p>
    <p v-else-if="error" class="empty-state">Could not load events: {{ error }}</p>
    <p v-else-if="upcomingEvents.length === 0" class="empty-state">No upcoming events yet.</p>

    <section v-else class="management-list">
      <div v-for="event in upcomingEvents" :key="event.id" class="card management-card">
        <RouterLink :to="{ path: `/events/${event.id}`, query: { from: 'management' } }" class="management-card__content management-card__link">
          <h2 class="management-card__title">{{ event.title }}</h2>
          <p class="management-card__meta">
            {{ formatStart(event.start_time) }}
            <span v-if="event.location">• {{ event.location }}</span>
            <span v-if="event.organizer_display">• {{ event.organizer_display }}</span>
          </p>
        </RouterLink>

        <div class="management-card__actions">
          <button class="button button--compact" type="button" @click="editEvent(event.id)">Edit</button>
          <button class="button secondary button--compact" type="button" @click="duplicateEvent(event.id)">Duplicate</button>
          <button class="button danger button--compact" type="button" @click="removeEvent(event.id)">Delete</button>
        </div>
      </div>
    </section>
  </div>
</template>
