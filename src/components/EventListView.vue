<script setup>
import { computed } from 'vue'
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

function formatDateGroup(date) {
  return new Intl.DateTimeFormat('en-DK', {
    weekday: 'long',
    day: '2-digit',
    month: 'long'
  }).format(date)
}

const groupedEvents = computed(() => {
  const groups = {}

  props.events.forEach(event => {
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
  <section aria-label="Bachata event results">
    <div v-for="group in groupedEvents" :key="group.date.toISOString()" class="event-date-group">
      <h2 class="event-date-header">{{ group.dateLabel }}</h2>
      <div class="event-list">
        <EventCard
          v-for="event in group.events"
          :key="event.id"
          :event="event"
          :favorite-busy="favoriteBusyId === event.id"
          @toggle-favorite="emit('toggle-favorite', $event)"
        />
      </div>
    </div>
  </section>
</template>
