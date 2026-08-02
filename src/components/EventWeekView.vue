<script setup>
import { computed, ref } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import EventCard from './EventCard.vue'
import { addWeeks, getWeekDays, startOfWeek } from '../lib/calendar'

const props = defineProps({
  events: { type: Array, default: () => [] },
  favoriteBusyId: { type: [String, Number], default: null }
})
const emit = defineEmits(['toggle-favorite'])
const today = new Date()
today.setHours(0, 0, 0, 0)
const visibleWeek = ref(startOfWeek(today))

const days = computed(() => getWeekDays(visibleWeek.value, props.events, today))
const weekLabel = computed(() => {
  const end = new Date(visibleWeek.value)
  end.setDate(end.getDate() + 6)
  const startText = new Intl.DateTimeFormat('en-DK', { day: 'numeric', month: 'short' }).format(visibleWeek.value)
  const endText = new Intl.DateTimeFormat('en-DK', { day: 'numeric', month: 'short', year: 'numeric' }).format(end)
  return `${startText} – ${endText}`
})

function changeWeek(amount) {
  visibleWeek.value = addWeeks(visibleWeek.value, amount)
}

function showCurrentWeek() {
  visibleWeek.value = startOfWeek(today)
}
</script>

<template>
  <div class="calendar-week">
    <div class="calendar-view__header calendar-week__header">
      <button class="calendar-nav-button" type="button" aria-label="Previous week" @click="changeWeek(-1)"><ChevronLeft class="icon icon--sm" /></button>
      <div><h2>{{ weekLabel }}</h2><button class="calendar-week__today-button" type="button" @click="showCurrentWeek">Current week</button></div>
      <button class="calendar-nav-button" type="button" aria-label="Next week" @click="changeWeek(1)"><ChevronRight class="icon icon--sm" /></button>
    </div>

    <section v-for="day in days" :key="day.dateKey" class="calendar-week__day" :class="{ 'calendar-week__day--today': day.isToday }">
      <header class="calendar-week__day-header">
        <h3>{{ new Intl.DateTimeFormat('en-DK', { weekday: 'long', day: 'numeric', month: 'long' }).format(day.date) }}</h3>
        <span v-if="day.isToday" class="calendar-week__today-label">Today</span>
      </header>
      <p v-if="day.events.length === 0" class="calendar-week__empty">No events</p>
      <div v-else class="event-list">
        <EventCard v-for="event in day.events" :key="event.id" :event="event" source="calendar" :favorite-busy="favoriteBusyId === event.id" @toggle-favorite="emit('toggle-favorite', $event)" />
      </div>
    </section>
  </div>
</template>
