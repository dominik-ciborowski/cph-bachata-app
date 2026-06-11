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

const isNewOrganizerDialogOpen = ref(false)
const pendingOrganizerName = ref('')
const modalError = ref('')
const selectedNewOrganizerValue = '__selected_new_organizer__'

const sortedOrganizers = computed(() => sortOrganizersByName(props.organizers))

const selectValue = computed({
  get() {
    if (isNewOrganizerDialogOpen.value) return ADD_NEW_ORGANIZER_VALUE
    if (props.newOrganizerName) return selectedNewOrganizerValue
    return String(props.organizerId || '')
  },
  set(value) {
    if (value === ADD_NEW_ORGANIZER_VALUE) {
      openNewOrganizerDialog()
      return
    }

    isNewOrganizerDialogOpen.value = false
    pendingOrganizerName.value = ''
    modalError.value = ''

    if (value === selectedNewOrganizerValue) {
      return
    }

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
      isNewOrganizerDialogOpen.value = false
      pendingOrganizerName.value = ''
      modalError.value = ''
    }
  }
)

function openNewOrganizerDialog() {
  isNewOrganizerDialogOpen.value = true
  pendingOrganizerName.value = props.newOrganizerName || ''
  modalError.value = ''
}

function cancelNewOrganizer() {
  isNewOrganizerDialogOpen.value = false
  pendingOrganizerName.value = ''
  modalError.value = ''
}

function addNewOrganizer() {
  const organizerName = normalizeOrganizerName(pendingOrganizerName.value)

  if (!organizerName) {
    modalError.value = 'Organizer name is required.'
    return
  }

  emit('update:organizerId', '')
  emit('update:organizerName', organizerName)
  emit('update:newOrganizerName', organizerName)
  isNewOrganizerDialogOpen.value = false
  pendingOrganizerName.value = organizerName
  modalError.value = ''
}
</script>

<template>
  <div class="field organizer-selector">
    <label :for="selectId">Organizer</label>
    <select :id="selectId" v-model="selectValue">
      <option value="">No organizer selected</option>
      <option v-if="newOrganizerName" :value="selectedNewOrganizerValue">{{ newOrganizerName }}</option>
      <option v-for="organizer in sortedOrganizers" :key="organizer.id" :value="String(organizer.id)">
        {{ organizer.name }}
      </option>
      <option :value="ADD_NEW_ORGANIZER_VALUE">Add new organizer...</option>
    </select>


    <div v-if="isNewOrganizerDialogOpen" class="modal-backdrop" @click.self="cancelNewOrganizer">
      <section
        class="modal-dialog"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`${newInputId}-title`"
      >
        <h2 :id="`${newInputId}-title`">Add new organizer</h2>
        <div class="field">
          <label :for="newInputId">Organizer name</label>
          <input
            :id="newInputId"
            v-model="pendingOrganizerName"
            placeholder="Organizer name"
            @keyup.enter="addNewOrganizer"
          />
        </div>
        <p v-if="modalError" class="status">{{ modalError }}</p>
        <div class="form-actions">
          <button class="button secondary" type="button" @click="cancelNewOrganizer">Cancel</button>
          <button class="button" type="button" @click="addNewOrganizer">Add organizer</button>
        </div>
      </section>
    </div>
  </div>
</template>
