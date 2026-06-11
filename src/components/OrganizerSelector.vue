<script setup>
import { computed, ref, watch } from 'vue'
import { ADD_NEW_ORGANIZER_VALUE, normalizeOrganizerName, sortOrganizersByName } from '../lib/organizerDisplay'

const props = defineProps({
  organizerId: {
    type: [String, Number],
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

const isAddingNewOrganizer = ref(false)

const sortedOrganizers = computed(() => sortOrganizersByName(props.organizers))

const selectValue = computed({
  get() {
    return isAddingNewOrganizer.value ? ADD_NEW_ORGANIZER_VALUE : String(props.organizerId || '')
  },
  set(value) {
    if (value === ADD_NEW_ORGANIZER_VALUE) {
      isAddingNewOrganizer.value = true
      emit('update:organizerId', '')
      emit('update:organizerName', normalizeOrganizerName(props.newOrganizerName))
      return
    }

    isAddingNewOrganizer.value = false
    const organizer = sortedOrganizers.value.find((item) => String(item.id) === String(value))
    emit('update:organizerId', organizer?.id || '')
    emit('update:organizerName', organizer?.name || '')
    emit('update:newOrganizerName', '')
  }
})

watch(
  () => props.organizerId,
  (organizerId) => {
    if (organizerId) {
      isAddingNewOrganizer.value = false
    }
  }
)

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
      <option v-for="organizer in sortedOrganizers" :key="organizer.id" :value="String(organizer.id)">
        {{ organizer.name }}
      </option>
      <option :value="ADD_NEW_ORGANIZER_VALUE">Add new organizer...</option>
    </select>

    <input
      v-if="isAddingNewOrganizer"
      :id="newInputId"
      :value="newOrganizerName"
      placeholder="New organizer name"
      @input="updateNewOrganizerName($event.target.value)"
    />
    <p v-if="!isAddingNewOrganizer && !organizerId && organizerName" class="field-help">Current fallback organizer: {{ organizerName }}</p>
    <p class="field-help">Choose an existing organizer or add a new one for review.</p>
  </div>
</template>
