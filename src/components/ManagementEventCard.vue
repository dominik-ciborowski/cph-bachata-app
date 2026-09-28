<script setup>
import { RouterLink } from 'vue-router'
import { Trash2 } from 'lucide-vue-next'

defineProps({
  event: { type: Object, required: true },
  selected: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
  creatorLabel: { type: String, default: '' },
  formattedStart: { type: String, required: true }
})

defineEmits(['select', 'edit', 'duplicate', 'restore', 'cancel', 'delete'])
</script>

<template>
  <div class="card management-card" :class="{ 'management-card--cancelled': event.status === 'cancelled' }">
    <label class="management-card__select" :aria-label="`Select ${event.title}`">
      <input type="checkbox" :checked="selected" @change="$emit('select', $event.target.checked)" />
    </label>

    <RouterLink :to="{ path: `/events/${event.id}`, query: { from: 'management' } }" class="management-card__content management-card__link">
      <h2 class="management-card__title">{{ event.title }} <span v-if="event.status === 'cancelled'" class="pill cancelled-badge">Cancelled</span></h2>
      <p class="management-card__meta">
        {{ formattedStart }}
        <span v-if="event.location">• {{ event.location }}</span>
        <span v-if="event.organizer_display">• {{ event.organizer_display }}</span>
      </p>
      <p v-if="isAdmin" class="management-card__meta">Created by: {{ creatorLabel }}</p>
    </RouterLink>

    <div class="management-card__actions">
      <button class="button button--compact" type="button" @click="$emit('edit')">Edit</button>
      <button class="button secondary button--compact" type="button" @click="$emit('duplicate')">Duplicate</button>
      <button v-if="event.status === 'cancelled'" class="button secondary button--compact" type="button" @click="$emit('restore')">Restore</button>
      <button v-else class="button danger button--compact" type="button" @click="$emit('cancel')">Cancel</button>
      <button class="button button--compact management-card__delete icon-text" type="button" aria-label="Delete event" title="Delete event" @click="$emit('delete')">
        <Trash2 class="icon icon--sm" aria-hidden="true" />
        Delete
      </button>
    </div>
  </div>
</template>
