<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { FileUp } from 'lucide-vue-next'
import PriceFields from '../components/PriceFields.vue'
import { buildNewEventPayload } from '../lib/eventPayload.js'
import {
  copenhagenDateTimeToIso,
  getIcsImportErrors,
  getImportableOrganizers,
  isPossibleIcsDuplicate,
  parseIcsEvents
} from '../lib/icsImport.js'
import { fetchOrganizers } from '../lib/organizers.js'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../composables/useAuth.js'

const router = useRouter()
const { user, role, canManageEvents } = useAuth()
const fileInput = ref(null)
const previewEvents = ref([])
const existingEvents = ref([])
const organizers = ref([])
const status = ref('')
const saving = ref(false)

const importableOrganizers = computed(() => getImportableOrganizers(
  organizers.value,
  user.value,
  role.value,
  existingEvents.value
))
const validationErrors = computed(() => previewEvents.value.map(getIcsImportErrors))
const hasInvalidEvents = computed(() => validationErrors.value.some((errors) => errors.length > 0))

onMounted(async () => {
  if (!canManageEvents.value || !user.value) {
    status.value = 'You do not have access to import events.'
    return
  }

  try {
    const organizerRows = await fetchOrganizers()
    let eventQuery = supabase
      .from('events')
      .select('id,title,start_time,organizer_id,created_by')
      .in('status', ['approved', 'cancelled'])

    if (role.value === 'organizer') eventQuery = eventQuery.eq('created_by', user.value.id)
    const eventResult = await eventQuery

    if (eventResult.error) throw eventResult.error
    organizers.value = organizerRows
    existingEvents.value = eventResult.data || []
  } catch (loadError) {
    status.value = loadError.message || 'Could not load import options.'
  }
})

function chooseFile() {
  fileInput.value?.click()
}

async function handleFileSelection(event) {
  const [file] = event.target.files || []
  previewEvents.value = []
  status.value = ''
  if (!file) return

  if (!file.name.toLowerCase().endsWith('.ics')) {
    status.value = 'Choose a valid .ics calendar file.'
    event.target.value = ''
    return
  }

  try {
    previewEvents.value = parseIcsEvents(await file.text())
    status.value = `Found ${previewEvents.value.length} event${previewEvents.value.length === 1 ? '' : 's'}. Review the details before importing.`
  } catch (parseError) {
    status.value = parseError.message || 'The ICS file could not be parsed.'
  } finally {
    event.target.value = ''
  }
}

function updateOrganizer(importedEvent) {
  const organizer = importableOrganizers.value.find((item) => String(item.id) === String(importedEvent.organizer_id))
  importedEvent.organizer = organizer?.name || ''
}

function hasDuplicate(importedEvent) {
  return isPossibleIcsDuplicate(importedEvent, existingEvents.value)
}

async function confirmImport() {
  if (!user.value || !canManageEvents.value || previewEvents.value.length === 0 || hasInvalidEvents.value) return

  const allowedIds = new Set(importableOrganizers.value.map((organizer) => String(organizer.id)))
  if (previewEvents.value.some((event) => !allowedIds.has(String(event.organizer_id)))) {
    status.value = 'One or more selected organizers are not available to your account.'
    return
  }

  const rows = previewEvents.value.map((event) => ({
    ...buildNewEventPayload({ ...event, status: 'approved' }, user.value.id),
    start_time: copenhagenDateTimeToIso(event.date, event.start_time),
    end_time: event.end_time ? copenhagenDateTimeToIso(event.end_date || event.date, event.end_time) : null
  }))
  saving.value = true
  status.value = 'Importing events...'
  const { error } = await supabase.from('events').insert(rows)
  saving.value = false

  if (error) {
    status.value = error.message
    return
  }

  sessionStorage.setItem('flash_message', `Imported ${rows.length} event${rows.length === 1 ? '' : 's'} successfully.`)
  router.push('/management')
}
</script>

<template>
  <div class="management-page">
    <section class="hero">
      <h1>Import ICS</h1>
      <p>Upload a calendar file, review the event details, then confirm the import.</p>
    </section>

    <section class="card form ics-import-upload" aria-labelledby="ics-upload-title">
      <h2 id="ics-upload-title">Choose calendar file</h2>
      <input ref="fileInput" class="visually-hidden" type="file" accept=".ics,text/calendar" @change="handleFileSelection" />
      <div class="form-actions">
        <button class="button secondary icon-text" type="button" @click="chooseFile">
          <FileUp class="icon icon--sm" />Select .ics file
        </button>
        <RouterLink to="/management" class="button secondary">Cancel</RouterLink>
      </div>
      <p v-if="status" class="status" aria-live="polite">{{ status }}</p>
    </section>

    <form v-if="previewEvents.length" class="ics-import-preview" @submit.prevent="confirmImport">
      <div class="management-toolbar__heading">
        <h2>Import preview</h2>
        <p>Nothing will be saved until you confirm below.</p>
      </div>

      <article v-for="(event, index) in previewEvents" :key="event.importId" class="card form ics-import-event">
        <h3>Event {{ index + 1 }}</h3>
        <div class="grid-two">
          <div class="field">
            <label :for="`${event.importId}-title`">Title *</label>
            <input :id="`${event.importId}-title`" v-model="event.title" required />
          </div>
          <div class="field">
            <label :for="`${event.importId}-organizer`">Organizer *</label>
            <select :id="`${event.importId}-organizer`" v-model="event.organizer_id" required @change="updateOrganizer(event)">
              <option value="">Select organizer</option>
              <option v-for="organizer in importableOrganizers" :key="organizer.id" :value="String(organizer.id)">{{ organizer.name }}</option>
            </select>
          </div>
        </div>

        <div class="grid-two">
          <div class="field">
            <label :for="`${event.importId}-category`">Category *</label>
            <select :id="`${event.importId}-category`" v-model="event.category" required>
              <option value="">Select category</option>
              <option value="social">Social</option>
              <option value="class">Class</option>
              <option value="festival">Festival</option>
              <option value="workshop">Workshop</option>
            </select>
          </div>
          <PriceFields v-model="event.price" :id-prefix="`${event.importId}-price`" require-confirmation />
        </div>

        <div class="grid-two">
          <div class="field">
            <label :for="`${event.importId}-date`">Date *</label>
            <input :id="`${event.importId}-date`" v-model="event.date" type="date" required />
          </div>
          <div class="field">
            <label :for="`${event.importId}-start`">Start time *</label>
            <input :id="`${event.importId}-start`" v-model="event.start_time" type="time" required />
          </div>
        </div>

        <div class="grid-two">
          <div class="field">
            <label :for="`${event.importId}-end-date`">End date</label>
            <input :id="`${event.importId}-end-date`" v-model="event.end_date" type="date" />
          </div>
          <div class="field">
            <label :for="`${event.importId}-end`">End time</label>
            <input :id="`${event.importId}-end`" v-model="event.end_time" type="time" />
          </div>
        </div>

        <div class="field">
          <label :for="`${event.importId}-location`">Location</label>
          <input :id="`${event.importId}-location`" v-model="event.location" />
        </div>
        <div class="field">
          <label :for="`${event.importId}-description`">Description</label>
          <textarea :id="`${event.importId}-description`" v-model="event.description" />
        </div>
        <div class="field">
          <label :for="`${event.importId}-link`">Event link</label>
          <input :id="`${event.importId}-link`" v-model="event.event_link" type="url" />
        </div>

        <p v-if="event.allDay" class="field-help">This was an all-day ICS event. Confirm the start and end times before importing.</p>
        <p v-if="hasDuplicate(event)" class="status ics-import-warning">Possible duplicate: an event with the same title, date, time and organizer already exists.</p>
        <ul v-if="validationErrors[index].length" class="status ics-import-errors">
          <li v-for="message in validationErrors[index]" :key="message">{{ message }}</li>
        </ul>
      </article>

      <div class="form-actions">
        <button class="button icon-text" type="submit" :disabled="saving || hasInvalidEvents">
          <FileUp class="icon icon--sm" />Import {{ previewEvents.length }} event{{ previewEvents.length === 1 ? '' : 's' }}
        </button>
        <RouterLink to="/management" class="button secondary">Cancel</RouterLink>
      </div>
    </form>
  </div>
</template>
