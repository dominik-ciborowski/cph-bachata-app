<script setup>
import { onBeforeUnmount, onMounted } from 'vue'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  secondaryLabel: {
    type: String,
    default: 'Back'
  },
  confirmLabel: {
    type: String,
    default: 'Confirm'
  },
  busy: {
    type: Boolean,
    default: false
  },
  danger: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'confirm'])

function closeModal() {
  if (!props.busy) emit('close')
}

function confirmAction() {
  emit('confirm')
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
    <section class="modal-dialog confirmation-modal" role="dialog" aria-modal="true" aria-labelledby="confirmation-modal-title">
      <h2 id="confirmation-modal-title">{{ title }}</h2>
      <p v-if="description" class="field-help">{{ description }}</p>

      <slot />

      <div class="form-actions">
        <button class="button secondary" type="button" :disabled="busy" @click="closeModal">{{ secondaryLabel }}</button>
        <button class="button" :class="{ danger }" type="button" :disabled="busy" @click="confirmAction">{{ confirmLabel }}</button>
      </div>
    </section>
  </div>
</template>
