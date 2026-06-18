<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import EventCard from './EventCard.vue'

const props = defineProps({
  events: {
    type: Array,
    default: () => []
  },
  favoriteBusyId: {
    type: [String, Number],
    default: null
  }
})

const emit = defineEmits(['toggle-favorite'])

const today = new Date()
today.setHours(0, 0, 0, 0)

const visibleMonth = ref(new Date(today.getFullYear(), today.getMonth(), 1))
const selectedDate = ref(new Date(today))
const calendarSection = ref(null)
const selectedEventsSection = ref(null)
const showBackToCalendar = ref(false)

function getDateKey(value) {
  const date = new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isSameMonth(date, monthDate) {
  return date.getFullYear() === monthDate.getFullYear() && date.getMonth() === monthDate.getMonth()
}

function changeMonth(offset) {
  visibleMonth.value = new Date(visibleMonth.value.getFullYear(), visibleMonth.value.getMonth() + offset, 1)
}

async function selectDate(date) {
  selectedDate.value = new Date(date)
  await nextTick()
  selectedEventsSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  updateBackToCalendarVisibility()
}

function scrollToCalendar() {
  calendarSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  showBackToCalendar.value = false
}

function updateBackToCalendarVisibility() {
  const calendarRect = calendarSection.value?.getBoundingClientRect()
  const selectedEventsRect = selectedEventsSection.value?.getBoundingClientRect()

  if (!calendarRect || !selectedEventsRect) {
    showBackToCalendar.value = false
    return
  }

  showBackToCalendar.value = calendarRect.bottom < 80 && selectedEventsRect.top < window.innerHeight
}

onMounted(() => {
  window.addEventListener('scroll', updateBackToCalendarVisibility, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', updateBackToCalendarVisibility)
})

const monthLabel = computed(() => new Intl.DateTimeFormat('en-DK', {
  month: 'long',
  year: 'numeric'
}).format(visibleMonth.value))

const weekdayLabels = computed(() => {
  const monday = new Date(2024, 0, 1)

  return Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat('en-DK', {
    weekday: 'short'
  }).format(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index)))
})

const eventsByDate = computed(() => {
  return props.events.reduce((groups, event) => {
    const dateKey = getDateKey(event.start_time)

    if (!groups[dateKey]) {
      groups[dateKey] = []
    }

    groups[dateKey].push(event)
    return groups
  }, {})
})

const calendarDays = computed(() => {
  const monthStart = visibleMonth.value
  const firstGridDate = new Date(monthStart)
  const mondayOffset = (monthStart.getDay() + 6) % 7
  firstGridDate.setDate(monthStart.getDate() - mondayOffset)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstGridDate)
    date.setDate(firstGridDate.getDate() + index)

    const dateKey = getDateKey(date)
    const dayEvents = eventsByDate.value[dateKey] || []

    return {
      date,
      dateKey,
      dayNumber: date.getDate(),
      eventCount: dayEvents.length,
      isCurrentMonth: isSameMonth(date, visibleMonth.value),
      isToday: dateKey === getDateKey(today),
      isSelected: dateKey === getDateKey(selectedDate.value)
    }
  })
})

const selectedDateEvents = computed(() => eventsByDate.value[getDateKey(selectedDate.value)] || [])

const selectedDateLabel = computed(() => new Intl.DateTimeFormat('en-DK', {
  weekday: 'long',
  day: '2-digit',
  month: 'long'
}).format(selectedDate.value))

const currentMonthEventCount = computed(() => props.events.filter(event => isSameMonth(new Date(event.start_time), visibleMonth.value)).length)

watch(visibleMonth, (month) => {
  if (!isSameMonth(selectedDate.value, month)) {
    selectedDate.value = new Date(month)
  }
})
</script>

<template>
  <section ref="calendarSection" class="calendar-view" aria-label="Calendar event results">
    <div class="calendar-view__header">
      <button class="calendar-nav-button" type="button" aria-label="Previous month" @click="changeMonth(-1)">
        <ChevronLeft class="icon icon--sm" />
      </button>
      <div>
        <h2>{{ monthLabel }}</h2>
        <p>{{ currentMonthEventCount > 0 ? `${currentMonthEventCount} event${currentMonthEventCount === 1 ? '' : 's'} this month` : 'No events this month' }}</p>
      </div>
      <button class="calendar-nav-button" type="button" aria-label="Next month" @click="changeMonth(1)">
        <ChevronRight class="icon icon--sm" />
      </button>
    </div>

    <div class="calendar-grid" role="grid" aria-label="Month calendar">
      <div v-for="weekday in weekdayLabels" :key="weekday" class="calendar-weekday">{{ weekday }}</div>
      <button
        v-for="day in calendarDays"
        :key="day.dateKey"
        class="calendar-day"
        :class="{
          'calendar-day--muted': !day.isCurrentMonth,
          'calendar-day--today': day.isToday,
          'calendar-day--selected': day.isSelected,
          'calendar-day--has-events': day.eventCount > 0,
          'calendar-day--has-multiple-events': day.eventCount > 1
        }"
        type="button"
        role="gridcell"
        :aria-pressed="day.isSelected ? 'true' : 'false'"
        @click="selectDate(day.date)"
      >
        <span class="calendar-day__number">{{ day.dayNumber }}</span>
        <span v-if="day.eventCount > 1" class="calendar-day__event-count" :aria-label="`${day.eventCount} events`">{{ day.eventCount }}</span>
      </button>
    </div>

    <section ref="selectedEventsSection" class="calendar-selected-events" aria-live="polite">
      <div class="calendar-selected-events__header">
        <h3>{{ selectedDateLabel }}</h3>
      </div>
      <p v-if="selectedDateEvents.length === 0" class="empty-state calendar-empty-state">No events on this date.</p>
      <div v-else class="event-list">
        <EventCard
          v-for="event in selectedDateEvents"
          :key="event.id"
          :event="event"
          :favorite-busy="favoriteBusyId === event.id"
          @toggle-favorite="emit('toggle-favorite', $event)"
        />
      </div>
    </section>

    <button
      v-if="showBackToCalendar"
      class="scroll-action-button scroll-action-button--floating"
      type="button"
      @click="scrollToCalendar"
    >
      ↑ Calendar
    </button>
  </section>
</template>
