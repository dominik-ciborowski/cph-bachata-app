<script setup>
import { computed, onMounted, ref } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import WeekEventCard from './WeekEventCard.vue'
import { addWeeks, getDateKey, getWeekDays, getWeekRange, isEventPast, startOfWeek } from '../lib/calendar'

const props = defineProps({
  events: { type: Array, default: () => [] },
  favoriteBusyId: { type: [String, Number], default: null },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' }
})
const emit = defineEmits(['toggle-favorite', 'week-change'])
const now = new Date()
const today = new Date(now)
today.setHours(0, 0, 0, 0)
const currentWeek = startOfWeek(today)
const visibleWeek = ref(new Date(currentWeek))

const days = computed(() => getWeekDays(visibleWeek.value, props.events, today))
const isCurrentWeek = computed(() => getDateKey(visibleWeek.value) === getDateKey(currentWeek))
const weekLabel = computed(() => {
  const end = new Date(visibleWeek.value)
  end.setDate(end.getDate() + 6)
  const startText = new Intl.DateTimeFormat('en-DK', { day: 'numeric', month: 'short' }).format(visibleWeek.value)
  const endText = new Intl.DateTimeFormat('en-DK', { day: 'numeric', month: 'short', year: 'numeric' }).format(end)
  return `${startText} – ${endText}`
})

function notifyWeekChange() {
  emit('week-change', getWeekRange(visibleWeek.value))
}

function changeWeek(amount) {
  visibleWeek.value = addWeeks(visibleWeek.value, amount)
  notifyWeekChange()
}

function showCurrentWeek() {
  visibleWeek.value = new Date(currentWeek)
  notifyWeekChange()
}

function isPast(event) {
  return isEventPast(event, now)
}

onMounted(notifyWeekChange)
</script>

<template>
  <div class="calendar-week">
    <div class="calendar-view__header calendar-week__header">
      <button class="calendar-nav-button" type="button" aria-label="Previous week" @click="changeWeek(-1)"><ChevronLeft class="icon icon--sm" /></button>
      <div>
        <h2>{{ weekLabel }}</h2>
        <button v-if="!isCurrentWeek" class="calendar-week__today-button" type="button" @click="showCurrentWeek">Back to current week</button>
        <span v-else class="calendar-week__current-label">Current week</span>
      </div>
      <button class="calendar-nav-button" type="button" aria-label="Next week" @click="changeWeek(1)"><ChevronRight class="icon icon--sm" /></button>
    </div>

    <p v-if="loading" class="empty-state">Loading week…</p>
    <p v-else-if="error" class="empty-state">Could not load this week: {{ error }}</p>
    <div v-else class="calendar-week__viewport" aria-label="Week calendar">
      <div class="calendar-week__grid">
        <section v-for="day in days" :key="day.dateKey" class="calendar-week__day" :class="{ 'calendar-week__day--today': day.isToday }">
          <header class="calendar-week__day-header">
            <span class="calendar-week__weekday">{{ new Intl.DateTimeFormat('en-DK', { weekday: 'short' }).format(day.date) }}</span>
            <strong>{{ day.date.getDate() }}</strong>
            <span v-if="day.isToday" class="calendar-week__today-label">Today</span>
          </header>
          <p v-if="day.events.length === 0" class="calendar-week__empty">No events</p>
          <div v-else class="calendar-week__events">
            <WeekEventCard v-for="event in day.events" :key="event.id" :event="event" :past="isPast(event)" :favorite-busy="favoriteBusyId === event.id" @toggle-favorite="emit('toggle-favorite', $event)" />
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
