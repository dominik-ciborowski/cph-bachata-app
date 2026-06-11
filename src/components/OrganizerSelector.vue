<script setup>
import { computed } from 'vue'
import { ADD_NEW_ORGANIZER_VALUE, normalizeOrganizerName, sortOrganizersByName } from '../lib/organizerDisplay'

const props = defineProps({
  organizerId: {
    type: String,
    default: ''
  },
  organizerName: {
    type: String,
    default: ''
  },
  newOrganizerName: {
    type: String,
    default: ''
  },
  organizers: {
    type: Array,
    default: () => []
  },
  selectId: {
    type: String,
    required: true
  },
  newInputId: {
    type: String,
    required: true
  }
})

const emit = defineEmits([
  'update:organizerId',
  'update:organizerName',
  'update:newOrganizerName'
])

const sortedOrganizers = computed(() => sortOrganizersByName(props.organizers))

const selectValue = computed({
  get() {
    return props.newOrganizerName ? ADD_NEW_ORGANIZER_VALUE : (props.organizerId || '')
  },
  set(value) {
    if (value === ADD_NEW_ORGANIZER_VALUE) {
      emit('update:organizerId', '')
      emit('update:organizerName', '')
      emit('update:newOrganizerName', props.newOrganizerName || '')
      return
    }

    const organizer = sortedOrganizers.value.find((item) => item.id === value)
    emit('update:organizerId', value)
    emit('update:organizerName', organizer?.name || '')
    emit('update:newOrganizerName', '')
  }
})

function updateNewOrganizerName(value) {
  emit('update:newOrganizerName', value)
  emit('update:organizerName', normalizeOrganizerName(value))
}
</script>

<template>
  <div class="field organizer-selector">
    <label :for="selectId">Organizer</label>
    <select :id="selectId" v-model="selectValue">
      <option value="">No organizer selected</option>
      <option v-for="organizer in sortedOrganizers" :key="organizer.id" :value="organizer.id">
        {{ organizer.name }}
      </option>
      <option :value="ADD_NEW_ORGANIZER_VALUE">Add new organizer...</option>
    </select>

    <input
      v-if="selectValue === ADD_NEW_ORGANIZER_VALUE"
      :id="newInputId"
      :value="newOrganizerName"
      placeholder="New organizer name"
      @input="updateNewOrganizerName($event.target.value)"
    />
    <p v-if="!organizerId && organizerName && !newOrganizerName" class="field-help">Current fallback organizer: {{ organizerName }}</p>
    <p class="field-help">Choose an existing organizer or add a new one for review.</p>
  </div>
</template>
