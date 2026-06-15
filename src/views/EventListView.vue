<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import EventCard from '../components/EventCard.vue'
import { useAuth } from '../composables/useAuth'
import { normalizeEvent } from '../lib/events'
import { applyFavoriteState, favoriteEvent, loadFavoriteEventIds, unfavoriteEvent } from '../lib/favorites'
import { getCategoryMeta, isFreePrice } from '../lib/eventPresentation'
import { supabase } from '../lib/supabase'

const route = useRoute()
const router = useRouter()
const { user, isAuthenticated } = useAuth()

const filter = ref('all')
const category = ref('all')
const searchQuery = ref('')
const events = ref([])
const loading = ref(true)
const error = ref('')
const flashMessage = ref('')
const favoriteIds = ref(new Set())
const favoriteBusyId = ref(null)

const isFavoritesView = computed(() => route.path === '/favorites')

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

watch(user, async () => {
  await loadEvents()
})

watch(isFavoritesView, async () => {
  await loadEvents()
})

async function loadEvents() {
  loading.value = true
  error.value = ''

  if (user.value) {
    try {
      favoriteIds.value = await loadFavoriteEventIds(user.value.id)
    } catch (favoriteError) {
      error.value = favoriteError.message
      events.value = []
      loading.value = false
      return
    }
  } else {
    favoriteIds.value = new Set()
  }

  const { data, error: queryError } = await supabase
    .from('events')
    .select('*, organizer_record:organizers(id,name,verified)')
    .eq('approved', true)
    .gte('start_time', today.toISOString())
    .order('start_time', { ascending: true })

  if (queryError) {
    error.value = queryError.message
    events.value = []
    loading.value = false
    return
  }

  events.value = applyFavoriteState((data || []).map(normalizeEvent), favoriteIds.value)
  loading.value = false
}

function askLoginToFavorite() {
  sessionStorage.setItem('flash_message', 'Log in first to save events to My Events.')
  router.push('/login')
}

async function toggleFavorite(event) {
  if (!isAuthenticated.value || !user.value) {
    askLoginToFavorite()
    return
  }

  favoriteBusyId.value = event.id
  error.value = ''

  try {
    if (event.is_favorited) {
      await unfavoriteEvent(user.value.id, event.id)
      favoriteIds.value.delete(String(event.id))
    } else {
      await favoriteEvent(user.value.id, event.id)
      favoriteIds.value.add(String(event.id))
    }

    events.value = applyFavoriteState(events.value, favoriteIds.value)
  } catch (favoriteError) {
    error.value = favoriteError.message
  } finally {
    favoriteBusyId.value = null
  }
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
    (event.organizer_display || event.organizer || '').toLowerCase().includes(query) ||
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

function setQuickFilter(nextFilter) {
  filter.value = filter.value === nextFilter && nextFilter !== 'all' ? 'all' : nextFilter
}

const categories = computed(() => {
  return ['all', ...new Set(events.value.map(event => event.category))]
})

const visibleEvents = computed(() => {
  return events.value
    .filter(event => new Date(event.start_time) >= today)
    .filter(event => filter.value !== 'today' || isToday(event))
    .filter(event => filter.value !== 'weekend' || isThisWeekend(event))
    .filter(event => !isFavoritesView.value || event.is_favorited)
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
      <p class="eyebrow">Copenhagen Bachata Calendar</p>
      <h1>{{ isFavoritesView ? 'My Events' : 'Find your next dance night.' }}</h1>
      <p>
        {{ isFavoritesView
          ? 'Your saved upcoming bachata events in Copenhagen.'
          : 'Created by Dancemaniacs for the Copenhagen bachata community — a shared calendar for socials, classes, workshops and parties from all local organizers.'
        }}
      </p>
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
      <button type="button" class="filter-button" :class="{ active: filter === 'all' }" :aria-pressed="filter === 'all'" @click="setQuickFilter('all')">All Events</button>
      <button type="button" class="filter-button" :class="{ active: filter === 'today' }" :aria-pressed="filter === 'today'" @click="setQuickFilter('today')">Today</button>
      <button type="button" class="filter-button" :class="{ active: filter === 'weekend' }" :aria-pressed="filter === 'weekend'" @click="setQuickFilter('weekend')">This Weekend</button>
      <button type="button" class="filter-button" :class="{ active: filter === 'free' }" :aria-pressed="filter === 'free'" @click="setQuickFilter('free')">Free</button>
      <RouterLink v-if="!isFavoritesView" to="/favorites" class="filter-button filter-button--link">My Events</RouterLink>
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

    <p v-else-if="groupedEvents.length === 0" class="empty-state">{{ isFavoritesView ? 'No saved upcoming events yet.' : 'No events match these filters yet.' }}</p>

    <section v-else aria-label="Bachata event results">
      <div v-for="group in groupedEvents" :key="group.date.toISOString()" class="event-date-group">
        <h2 class="event-date-header">{{ group.dateLabel }}</h2>
        <div class="event-list">
          <EventCard
            v-for="event in group.events"
            :key="event.id"
            :event="event"
            :favorite-busy="favoriteBusyId === event.id"
            @toggle-favorite="toggleFavorite"
          />
        </div>
      </div>
    </section>
  </div>
</template>
