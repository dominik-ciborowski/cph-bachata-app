<script setup>
import { RouterLink } from 'vue-router'

defineProps({
  event: {
    type: Object,
    required: true
  }
})

function formatDate(value) {
  return new Intl.DateTimeFormat('en-DK', {
    weekday: 'short',
    day: '2-digit',
    month: 'short'
  }).format(new Date(value))
}

function formatTimeRange(startValue, endValue) {
  const formatter = new Intl.DateTimeFormat('en-DK', {
    hour: '2-digit',
    minute: '2-digit'
  })

  if (!endValue) return formatter.format(new Date(startValue))
  return `${formatter.format(new Date(startValue))} - ${formatter.format(new Date(endValue))}`
}
</script>

<template>
  <RouterLink class="event-card" :to="`/events/${event.id}`">
    <div class="event-card__date">
      <span>{{ formatDate(event.start_time) }}</span>
      <strong>{{ formatTimeRange(event.start_time, event.end_time) }}</strong>
    </div>

    <div class="event-card__body">
      <div class="event-card__topline">
        <span class="pill">{{ event.category }}</span>
        <span class="price">{{ event.price_text }}</span>
      </div>

      <h2>{{ event.title }}</h2>

      <div class="event-card__meta">
        <span>{{ event.location }}</span>
        <span>{{ event.organizer }}</span>
      </div>

      <p v-if="event.description">{{ event.description }}</p>
    </div>
  </RouterLink>
</template>
