<script setup>
import { computed, onMounted, ref } from 'vue'
import EventCard from '../components/EventCard.vue'
import { supabase } from '../lib/supabase'

const filter = ref('upcoming')
const category = ref('all')
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

  events.value = data || []
  loading.value = false
}

function isThisWeekend(event) {
  const date = new Date(event.start_time)
  const day = date.getDay()
  return day === 5 || day === 6 || day === 0
}

function isToday(event) {
  const date = new Date(event.start_time)
  return date.toDateString() === today.toDateString()
}

function isFree(event) {
  return (event.price_text || '').toLowerCase().includes('free')
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
    .sort((first, second) => new Date(first.start_time) - new Date(second.start_time))
})
</script>

<template>
  <section class="hero app-hero">
    <p class="eyebrow">Copenhagen bachata calendar</p>
    <h1>Find your next dance night.</h1>
    <p>Socials, classes, workshops and parties from local organizers in one simple list.</p>
  </section>

  <p v-if="flashMessage" class="flash-message">{{ flashMessage }}</p>

  <section class="filters" aria-label="Event filters">
    <button class="filter-button" :class="{ active: filter === 'upcoming' }" @click="filter = 'upcoming'">Upcoming</button>
    <button class="filter-button" :class="{ active: filter === 'today' }" @click="filter = 'today'">Today</button>
    <button class="filter-button" :class="{ active: filter === 'weekend' }" @click="filter = 'weekend'">Weekend</button>
    <button class="filter-button" :class="{ active: filter === 'free' }" @click="filter = 'free'">Free</button>
  </section>

  <label class="category-filter">
    <span>Category</span>
    <select v-model="category">
      <option v-for="item in categories" :key="item" :value="item">
        {{ item === 'all' ? 'All categories' : item }}
      </option>
    </select>
  </label>

  <p v-if="loading" class="empty-state">Loading events...</p>

  <p v-else-if="error" class="empty-state">Could not load events: {{ error }}</p>

  <p v-else-if="visibleEvents.length === 0" class="empty-state">No events match these filters yet.</p>

  <section v-else class="event-list" aria-label="Upcoming bachata events">
    <EventCard v-for="event in visibleEvents" :key="event.id" :event="event" />
  </section>
</template>
