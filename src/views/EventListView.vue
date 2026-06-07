<script setup>
import { computed, onMounted, ref } from 'vue'
import EventCard from '../components/EventCard.vue'
import { normalizeEvent } from '../lib/events'
import { getCategoryMeta, isFreePrice } from '../lib/eventPresentation'
import { supabase } from '../lib/supabase'

const filter = ref('upcoming')
const category = ref('all')
const searchQuery = ref('')
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
    setTimeout(() => {
      flashMessage.value = ''
    }, 4000)
  }

  await loadEvents()
})

async function loadEvents() {
  loading.value = true
  error.value = ''

  const { data, error: queryError } = await supabase
    .from('events')
    .select('*')
    .eq('approved', true)
    .gte('start_time', today.toISOString())
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

function isThisWeekend(event) {
  const eventDate = new Date(event.start_time)
  const weekendRange = getWeekendRange()
  return eventDate >= weekendRange.start && eventDate < weekendRange.end
}

function getWeekendRange() {
  const day = today.getDay()
  const start = new Date(today)

  if (day >= 1 && day <= 4) {
    start.setDate(today.getDate() + (5 - day))
  }

  if (day === 0) {
    start.setDate(today.getDate())
  }

  const end = new Date(start)

  if (day === 0) {
    end.setDate(start.getDate() + 1)
  } else if (day === 6) {
    end.setDate(start.getDate() + 2)
  } else {
    end.setDate(start.getDate() + 3)
  }

  return { start, end }
}

function isToday(event) {
  const date = new Date(event.start_time)
  return date.toDateString() === today.toDateString()
}

function isFree(event) {
  return isFreePrice(event.price_text)
}

function matchesSearch(event) {
  if (!searchQuery.value) return true
  const query = searchQuery.value.toLowerCase()
  return (
    (event.title || '').toLowerCase().includes(query) ||
    (event.organizer || '').toLowerCase().includes(query) ||
    (event.location || '').toLowerCase().includes(query)
  )
}

function formatDateGroup(date) {
  return new Intl.DateTimeFormat('en-DK', {
    weekday: 'long',
    day: '2-digit',
    month: 'long'
  }).format(date)
}

const categories = computed(() => {
  return ['all', ...new Set(events.value.map(event => event.category))]
})

const visibleEvents = computed(() => {
  return events.value
    .filter(event => new Date(event.start_time) >= today)
    .filter(event => filter.value !== 'today' || isToday(event))
    .filter(event => filter.value !== 'weekend' || isThisWeekend(event))
    .filter(event => filter.value !== 'free' || isFree(event))
    .filter(event => category.value === 'all' || event.category === category.value)
    .filter(matchesSearch)
    .sort((first, second) => new Date(first.start_time) - new Date(second.start_time))
})

const groupedEvents = computed(() => {
  const groups = {}

  visibleEvents.value.forEach(event => {
    const dateKey = new Date(event.start_time).toDateString()
    if (!groups[dateKey]) {
      groups[dateKey] = []
    }
    groups[dateKey].push(event)
  })

  return Object.entries(groups).map(([dateStr, eventsInGroup]) => ({
    date: new Date(dateStr),
    dateLabel: formatDateGroup(new Date(dateStr)),
    events: eventsInGroup
  }))
})

</script>

<template>
  <div class="public-page">
    <section class="hero app-hero">
      <p class="eyebrow">Copenhagen bachata calendar</p>
      <h1>Find your next dance night.</h1>
      <p>Socials, classes, workshops and parties from local organizers in one simple list.</p>
    </section>

    <p v-if="flashMessage" class="flash-message">{{ flashMessage }}</p>

    <div class="search-section">
      <input
        v-model="searchQuery"
        type="text"
        class="search-input"
        placeholder="Search by title, organizer, or location..."
      />
    </div>

    <section class="filters" aria-label="Event filters">
      <button class="filter-button" :class="{ active: filter === 'upcoming' }" @click="filter = 'upcoming'">Upcoming</button>
      <button class="filter-button" :class="{ active: filter === 'today' }" @click="filter = 'today'">Today</button>
      <button class="filter-button" :class="{ active: filter === 'weekend' }" @click="filter = 'weekend'">This Weekend</button>
      <button class="filter-button" :class="{ active: filter === 'free' }" @click="filter = 'free'">Free</button>
    </section>

    <label class="category-filter">
      <span>Category</span>
      <select v-model="category">
      <option v-for="item in categories" :key="item" :value="item">
        {{ item === 'all' ? 'All categories' : getCategoryMeta(item).label }}
      </option>
    </select>
  </label>

    <p v-if="loading" class="empty-state">Loading events...</p>

    <p v-else-if="error" class="empty-state">Could not load events: {{ error }}</p>

    <p v-else-if="groupedEvents.length === 0" class="empty-state">No events match these filters yet.</p>

    <section v-else aria-label="Upcoming bachata events">
      <div v-for="group in groupedEvents" :key="group.date.toISOString()" class="event-date-group">
        <h2 class="event-date-header">{{ group.dateLabel }}</h2>
        <div class="event-list">
          <EventCard v-for="event in group.events" :key="event.id" :event="event" />
        </div>
      </div>
    </section>
  </div>
</template>
