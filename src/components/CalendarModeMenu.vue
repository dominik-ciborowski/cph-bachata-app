<script setup>
import { ref } from 'vue'

defineProps({ mode: { type: String, required: true } })
const emit = defineEmits(['select'])
const menu = ref(null)

function select(mode) {
  emit('select', mode)
  menu.value?.removeAttribute('open')
}
</script>

<template>
  <details ref="menu" class="calendar-mode-menu">
    <summary aria-label="Change calendar presentation">{{ mode === 'week' ? 'Week' : 'Month' }}</summary>
    <div class="calendar-mode-menu__options" role="menu">
      <button type="button" role="menuitemradio" :aria-checked="mode === 'month'" @click="select('month')"><span>Month</span><span v-if="mode === 'month'" aria-hidden="true">✓</span></button>
      <button type="button" role="menuitemradio" :aria-checked="mode === 'week'" @click="select('week')"><span>Week</span><span v-if="mode === 'week'" aria-hidden="true">✓</span></button>
    </div>
  </details>
</template>
