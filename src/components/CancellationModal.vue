<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  eventCount: {
    type: Number,
    default: 1
  },
  initialReason: {
    type: String,
    default: ''
  },
  busy: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'confirm'])
const reason = ref(props.initialReason || '')

const title = computed(() => (props.eventCount === 1 ? 'Cancel Event' : `Cancel ${props.eventCount} events`))
const description = computed(() => (
  props.eventCount === 1
    ? 'This event will remain visible in the calendar and will be marked as Cancelled.'
    : 'These events will remain visible in the calendar and will be marked as Cancelled.'
))

watch(
  () => props.initialReason,
  (nextReason) => {
    reason.value = nextReason || ''
  }
)

function closeModal() {
  if (!props.busy) emit('close')
}

function confirmCancel() {
  emit('confirm', reason.value)
}

function handleKeydown(event) {
  if (event.key === 'Escape') closeModal()
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="modal-backdrop" @click.self="closeModal">
    <section class="modal-dialog cancellation-modal" role="dialog" aria-modal="true" aria-labelledby="cancellation-modal-title">
      <h2 id="cancellation-modal-title">{{ title }}</h2>
      <p class="field-help">{{ description }}</p>

      <div class="field">
        <label for="cancellation-reason">Cancellation reason (optional)</label>
        <textarea
          id="cancellation-reason"
          v-model="reason"
          placeholder="Heavy rain forecast&#10;Venue unavailable&#10;Organizer illness"
          :disabled="busy"
        />
      </div>

      <div class="form-actions">
        <button class="button secondary" type="button" :disabled="busy" @click="closeModal">Back</button>
        <button class="button danger" type="button" :disabled="busy" @click="confirmCancel">Cancel Event</button>
      </div>
    </section>
  </div>
</template>
