<script setup>
defineProps({ mode: { type: String, required: true } })
defineEmits(['select'])
</script>

<template>
  <div class="calendar-mode-toggle" role="group" aria-label="Calendar presentation">
    <button type="button" :class="{ active: mode === 'month' }" :aria-pressed="mode === 'month'" @click="$emit('select', 'month')">Month</button>
    <button type="button" :class="{ active: mode === 'week' }" :aria-pressed="mode === 'week'" @click="$emit('select', 'week')">Week</button>
  </div>
</template>
