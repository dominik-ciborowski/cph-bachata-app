<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Heart } from 'lucide-vue-next'
import { trackEventOpened } from '../analytics/eventTracking'
import { trackCalendarEventClicked } from '../analytics/interactionTracking'
import { formatPriceDisplay, getCategoryMeta, isFreePrice } from '../lib/eventPresentation'

const props = defineProps({
  event: { type: Object, required: true },
  favoriteBusy: { type: Boolean, default: false },
  past: { type: Boolean, default: false }
})
defineEmits(['toggle-favorite'])

const category = computed(() => getCategoryMeta(props.event.category))

function formatTimeRange(startValue, endValue) {
  const formatter = new Intl.DateTimeFormat('en-DK', { hour: '2-digit', minute: '2-digit' })
  return endValue ? `${formatter.format(new Date(startValue))}–${formatter.format(new Date(endValue))}` : formatter.format(new Date(startValue))
}

function openEvent(navigate) {
  trackCalendarEventClicked(props.event)
  trackEventOpened(props.event, 'calendar')
  navigate()
}
</script>

<template>
  <RouterLink v-slot="{ navigate }" custom :to="`/events/${event.id}`">
    <article class="week-event-card" :class="{ 'week-event-card--past': past, 'week-event-card--cancelled': event.status === 'cancelled' }" role="link" tabindex="0" @click="openEvent(navigate)" @keydown.enter.prevent="openEvent(navigate)" @keydown.space.prevent="openEvent(navigate)">
      <div class="week-event-card__topline">
        <span class="pill week-event-card__category" :class="category.className"><component :is="category.icon" class="icon icon--sm" />{{ category.label }}</span>
        <span v-if="past" class="week-event-card__past-label">Past</span>
      </div>
      <h4>{{ event.title }}</h4>
      <div class="week-event-card__details">
        <strong>{{ formatTimeRange(event.start_time, event.end_time) }}</strong>
        <span class="price-badge" :class="{ free: isFreePrice(event.price_text) }">{{ formatPriceDisplay(event.price_text) }}</span>
      </div>
      <div v-if="event.status === 'cancelled'" class="cancelled-badge week-event-card__cancelled">Cancelled</div>
      <button class="favorite-button week-event-card__favorite" :class="{ 'favorite-button--active': event.is_favorited }" type="button" :disabled="favoriteBusy" :aria-label="event.is_favorited ? `Remove ${event.title} from My Events` : `Save ${event.title} to My Events`" :aria-pressed="event.is_favorited ? 'true' : 'false'" @click.stop="$emit('toggle-favorite', event)">
        <Heart class="icon icon--sm" :fill="event.is_favorited ? 'currentColor' : 'none'" />
      </button>
    </article>
  </RouterLink>
</template>
