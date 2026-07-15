<script setup>
import { computed, ref, watch } from 'vue'
import ConfirmationModal from './ConfirmationModal.vue'

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

const title = computed(() => (props.eventCount === 1 ? 'Cancel Event' : `Cancel ${props.eventCount} Events`))
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

function confirmCancel() {
  emit('confirm', reason.value)
}
</script>

<template>
  <ConfirmationModal
    :title="title"
    :description="description"
    confirm-label="Cancel Event"
    danger
    :busy="busy"
    @close="$emit('close')"
    @confirm="confirmCancel"
  >
    <div class="field">
      <label for="cancellation-reason">Cancellation reason (optional)</label>
      <textarea
        id="cancellation-reason"
        v-model="reason"
        placeholder="Heavy rain forecast&#10;Venue unavailable&#10;Organizer illness"
        :disabled="busy"
      />
    </div>
  </ConfirmationModal>
</template>
