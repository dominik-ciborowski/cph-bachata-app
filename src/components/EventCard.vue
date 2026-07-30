<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { CalendarDays, Heart, MapPin } from 'lucide-vue-next'
import { trackEventOpened } from '../analytics/eventTracking'
import { trackCalendarEventClicked } from '../analytics/interactionTracking'
import { formatPriceDisplay, getCategoryMeta, isFreePrice } from '../lib/eventPresentation'

const props = defineProps({
  event: {
    type: Object,
    required: true
  },
  favoriteBusy: {
    type: Boolean,
    default: false
  },
  source: {
    type: String,
    required: true
  }
})

defineEmits(['toggle-favorite'])

const cancellationReason = computed(() => String(props.event.cancellation_reason || '').trim())

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

function openEvent(navigate) {
  if (props.source === 'calendar') trackCalendarEventClicked(props.event)
  trackEventOpened(props.event, props.source)
  navigate()
}
</script>

<template>
  <RouterLink v-slot="{ navigate }" custom :to="`/events/${event.id}`">
    <article
      class="event-card"
      :class="{ 'event-card--cancelled': event.status === 'cancelled' }"
      role="link"
      tabindex="0"
      @click="openEvent(navigate)"
      @keydown.enter.prevent="openEvent(navigate)"
      @keydown.space.prevent="openEvent(navigate)"
    >
      <div class="event-card__date">
        <span class="icon-text"><CalendarDays class="icon icon--sm" />{{ formatDate(event.start_time) }}</span>
        <strong>{{ formatTimeRange(event.start_time, event.end_time) }}</strong>
      </div>

      <div class="event-card__body">
        <div class="event-card__topline">
          <div class="event-card__badges">
            <span class="pill" :class="getCategoryMeta(event.category).className">
              <component :is="getCategoryMeta(event.category).icon" class="icon icon--sm" />
              {{ getCategoryMeta(event.category).label }}
            </span>
            <span v-if="event.is_recurring" class="pill recurring-badge">↻ Weekly</span>
            <span v-if="event.status === 'cancelled'" class="pill cancelled-badge">Cancelled</span>
          </div>
          <div class="event-card__actions">
            <span class="price-badge" :class="{ free: isFreePrice(event.price_text) }">{{ formatPriceDisplay(event.price_text) }}</span>
            <button
              class="favorite-button"
              :class="{ 'favorite-button--active': event.is_favorited }"
              type="button"
              :disabled="favoriteBusy"
              :aria-label="event.is_favorited ? `Remove ${event.title} from My Events` : `Save ${event.title} to My Events`"
              :aria-pressed="event.is_favorited ? 'true' : 'false'"
              @click.stop="$emit('toggle-favorite', event)"
            >
              <Heart class="icon" :fill="event.is_favorited ? 'currentColor' : 'none'" />
            </button>
          </div>
        </div>

        <h2>{{ event.title }}</h2>

        <div class="event-card__meta">
          <span v-if="event.location" class="icon-text"><MapPin class="icon icon--sm" />{{ event.location }}</span>
          <span v-if="event.organizer_display" class="event-card__organizer">Hosted by <strong>{{ event.organizer_display }}</strong></span>
          <span v-if="event.status === 'cancelled' && cancellationReason" class="event-card__cancellation-reason">⚠ Cancelled: {{ cancellationReason }}</span>
        </div>
      </div>
    </article>
  </RouterLink>
</template>
