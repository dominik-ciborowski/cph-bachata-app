<script setup>
import { RouterLink } from 'vue-router'
import { CalendarDays, MapPin, User } from 'lucide-vue-next'
import { formatPriceDisplay, getCategoryMeta, isFreePrice } from '../lib/eventPresentation'

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
      <span class="icon-text"><CalendarDays class="icon icon--sm" />{{ formatDate(event.start_time) }}</span>
      <strong>{{ formatTimeRange(event.start_time, event.end_time) }}</strong>
    </div>

    <div class="event-card__body">
      <div class="event-card__topline">
        <span class="pill" :class="getCategoryMeta(event.category).className">
          <component :is="getCategoryMeta(event.category).icon" class="icon icon--sm" />
          {{ getCategoryMeta(event.category).label }}
        </span>
        <span class="price-badge" :class="{ free: isFreePrice(event.price_text) }">{{ formatPriceDisplay(event.price_text) }}</span>
      </div>

      <h2>{{ event.title }}</h2>

      <div class="event-card__meta">
        <span v-if="event.location" class="icon-text"><MapPin class="icon icon--sm" />{{ event.location }}</span>
        <span v-if="event.organizer" class="icon-text"><User class="icon icon--sm" />{{ event.organizer }}</span>
      </div>

      <p v-if="event.description">{{ event.description }}</p>
    </div>
  </RouterLink>
</template>
