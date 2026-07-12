<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { CalendarPlus, Plus } from 'lucide-vue-next'
import OrganizerSelector from '../components/OrganizerSelector.vue'
import PriceFields from '../components/PriceFields.vue'
import { normalizeEvent } from '../lib/events'
import { supabase } from '../lib/supabase'
import {
  applyBulkEventUpdates,
  applyBulkStatusUpdates,
  filterManageableEvents,
  getBulkChangeSummary,
  selectAllVisibleEventIds,
  toggleSelectedEventId
} from '../lib/bulkEventActions'
import { fetchOrganizers, resolveOrganizerForEvent } from '../lib/organizers'
import { createDefaultPrice } from '../lib/pricing'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { user, role, isAdmin, isOrganizer, canManageEvents } = useAuth()
const events = ref([])
const creatorProfiles = ref({})
const searchQuery = ref('')
const activeView = ref('upcoming')
const loading = ref(true)
const error = ref('')
const flashMessage = ref('')
const organizers = ref([])
const selectedEventIds = ref(new Set())
const bulkEditOpen = ref(false)
const bulkConfirmOpen = ref(false)
const bulkSaving = ref(false)
const bulkChangeSummary = ref([])
const bulkPayloadPreview = ref(null)

const bulkForm = ref(createDefaultBulkForm())

const today = new Date()
today.setHours(0, 0, 0, 0)

onMounted(async () => {
  const storedFlashMessage = sessionStorage.getItem('flash_message')
  if (storedFlashMessage) {
    flashMessage.value = storedFlashMessage
    sessionStorage.removeItem('flash_message')
  }

  if (!canManageEvents.value) {
    loading.value = false
    error.value = 'You do not have access to event management.'
    return
  }

  await loadOrganizers()
  await loadEvents()
})

const upcomingEvents = computed(() =>
  events.value.filter((event) => new Date(event.start_time) >= today)
)

const pastEvents = computed(() =>
  events.value.filter((event) => new Date(event.start_time) < today)
)

const viewEvents = computed(() => (activeView.value === 'past' ? pastEvents.value : upcomingEvents.value))

const filteredEvents = computed(() => {
  const term = searchQuery.value.trim().toLowerCase()
  if (!term) return viewEvents.value

  return viewEvents.value.filter((event) => [
    event.title,
    event.organizer_display,
    event.organizer_name,
    event.organizer,
    event.location
  ].some((value) => String(value || '').toLowerCase().includes(term)))
})

const viewLabel = computed(() => (activeView.value === 'past' ? 'past' : 'upcoming'))
const selectedEvents = computed(() => filterManageableEvents(
  events.value.filter((event) => selectedEventIds.value.has(String(event.id))),
  user.value,
  role.value
))
const selectedCount = computed(() => selectedEvents.value.length)
const visibleSelectedCount = computed(() => filteredEvents.value.filter((event) => selectedEventIds.value.has(String(event.id))).length)
const allVisibleSelected = computed(() => filteredEvents.value.length > 0 && visibleSelectedCount.value === filteredEvents.value.length)
const canBulkCancel = computed(() => selectedEvents.value.some((event) => event.status !== 'cancelled'))
const canBulkRestore = computed(() => selectedEvents.value.some((event) => event.status === 'cancelled'))
const bulkConfirmEvents = computed(() => selectedEvents.value)

watch([activeView, searchQuery], () => {
  clearSelection()
})

function createDefaultBulkForm() {
  return {
    changeStartTime: false,
    start_time: '',
    changeEndTime: false,
    end_time: '',
    changeLocation: false,
    location: '',
    changeOrganizer: false,
    organizer_id: '',
    organizer: '',
    newOrganizerName: '',
    changeCategory: false,
    category: 'social',
    changeRecurring: false,
    is_recurring: 'weekly',
    changePricing: false,
    price: createDefaultPrice()
  }
}

async function loadOrganizers() {
  try {
    organizers.value = await fetchOrganizers()
  } catch {
    organizers.value = []
  }
}

async function loadEvents() {
  loading.value = true
  error.value = ''

  if (!canManageEvents.value || !user.value) {
    error.value = 'You do not have access to event management.'
    events.value = []
    loading.value = false
    return
  }

  let query = supabase
    .from('events')
    .select('*, organizer_record:organizers(id,name,verified)')
    .in('status', ['approved', 'cancelled'])

  if (isOrganizer.value && !isAdmin.value) {
    query = query.eq('created_by', user.value.id)
  }

  const { data, error: queryError } = await query.order('start_time', { ascending: true })

  if (queryError) {
    error.value = queryError.message
    events.value = []
    loading.value = false
    return
  }

  events.value = (data || []).map(normalizeEvent)

  if (isAdmin.value) {
    await loadCreatorProfiles(events.value)
  } else {
    creatorProfiles.value = {}
  }

  loading.value = false
}

async function loadCreatorProfiles(eventRows) {
  const creatorIds = [...new Set(eventRows.map((event) => event.created_by).filter(Boolean))]
  if (creatorIds.length === 0) {
    creatorProfiles.value = {}
    return
  }

  const { data, error: profileError } = await supabase
    .from('profiles')
    .select('id,email')
    .in('id', creatorIds)

  if (profileError) {
    creatorProfiles.value = {}
    return
  }

  creatorProfiles.value = Object.fromEntries((data || []).map((profile) => [profile.id, profile]))
}

function clearSelection() {
  selectedEventIds.value = new Set()
  closeBulkEdit()
}

function toggleEventSelection(event, checked) {
  selectedEventIds.value = toggleSelectedEventId(selectedEventIds.value, event.id, checked)
}

function toggleSelectAllVisible(checked) {
  selectedEventIds.value = checked ? selectAllVisibleEventIds(selectedEventIds.value, filteredEvents.value) : new Set()
}

function openBulkEdit() {
  bulkForm.value = createDefaultBulkForm()
  bulkEditOpen.value = true
  bulkConfirmOpen.value = false
  bulkChangeSummary.value = []
  bulkPayloadPreview.value = null
}

function closeBulkEdit() {
  bulkEditOpen.value = false
  bulkConfirmOpen.value = false
  bulkSaving.value = false
  bulkChangeSummary.value = []
  bulkPayloadPreview.value = null
}

function getCreatorLabel(event) {
  return creatorProfiles.value[event.created_by]?.email || event.created_by || 'Unknown'
}

function formatStart(value) {
  return new Intl.DateTimeFormat('en-DK', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value))
}

async function cancelEvent(event) {
  const reason = window.prompt('Cancellation reason (optional):', event.cancellation_reason || '')
  if (reason === null) return

  const { error: updateError } = await supabase
    .from('events')
    .update({ status: 'cancelled', cancellation_reason: reason.trim() || null })
    .eq('id', event.id)

  if (updateError) {
    error.value = updateError.message
    return
  }

  flashMessage.value = 'Event cancelled.'
  await loadOrganizers()
  await loadEvents()
}

async function applyBulkOperation(targetEvents, payload, successActionLabel) {
  bulkSaving.value = true
  const result = await applyBulkStatusUpdates(targetEvents, payload, async (event, updatePayload) => (
    supabase.from('events').update(updatePayload).eq('id', event.id)
  ))
  bulkSaving.value = false

  result.results.filter((item) => !item.ok).forEach((item) => console.error('[bulk events] update failed', item.event?.id, item.error))
  flashMessage.value = result.failed
    ? `${result.succeeded} events ${successActionLabel}; ${result.failed} failed.`
    : `${result.succeeded} events ${successActionLabel}.`
  await loadEvents()
  clearSelection()
}

async function bulkCancelSelected() {
  const targetEvents = selectedEvents.value.filter((event) => event.status !== 'cancelled')
  if (targetEvents.length === 0) return
  if (!confirm(`Cancel ${targetEvents.length} selected events?`)) return

  const reason = window.prompt('Cancellation reason (optional):', '')
  if (reason === null) return

  await applyBulkOperation(targetEvents, { status: 'cancelled', cancellation_reason: reason.trim() || null }, 'cancelled')
}

async function bulkRestoreSelected() {
  const targetEvents = selectedEvents.value.filter((event) => event.status === 'cancelled')
  if (targetEvents.length === 0) return
  if (!confirm(`Restore ${targetEvents.length} selected events?`)) return

  await applyBulkOperation(targetEvents, { status: 'approved', cancellation_reason: null }, 'restored')
}

async function restoreEvent(event) {
  if (!confirm('Restore this event?')) return

  const { error: updateError } = await supabase
    .from('events')
    .update({ status: 'approved', cancellation_reason: null })
    .eq('id', event.id)

  if (updateError) {
    error.value = updateError.message
    return
  }

  flashMessage.value = 'Event restored.'
  await loadOrganizers()
  await loadEvents()
}

async function prepareBulkEditConfirmation() {
  error.value = ''
  let changes = { ...bulkForm.value }

  if (changes.changeOrganizer) {
    try {
      const organizer = await resolveOrganizerForEvent(changes, user.value.id, organizers.value)
      changes = {
        ...changes,
        organizer_id: organizer?.id || null,
        organizer: organizer?.name || changes.organizer || null
      }
    } catch (organizerError) {
      error.value = organizerError.message
      return
    }
  }

  const summary = getBulkChangeSummary(changes)
  if (summary.length === 0) {
    error.value = 'Select at least one field to update.'
    return
  }

  bulkPayloadPreview.value = changes
  bulkChangeSummary.value = summary
  bulkConfirmOpen.value = true
}

async function confirmBulkEdit() {
  if (!bulkPayloadPreview.value || selectedEvents.value.length === 0) return

  bulkSaving.value = true
  const result = await applyBulkEventUpdates(selectedEvents.value, bulkPayloadPreview.value, async (event, payload) => {
    if (Object.keys(payload).length === 0) return {}
    return supabase.from('events').update(payload).eq('id', event.id)
  })
  bulkSaving.value = false

  result.results.filter((item) => !item.ok).forEach((item) => console.error('[bulk events] edit failed', item.event?.id, item.error))
  flashMessage.value = result.failed
    ? `${result.succeeded} events updated; ${result.failed} failed.`
    : `${result.succeeded} events updated successfully.`
  await loadEvents()
  clearSelection()
}


function editEvent(id) {
  router.push(`/admin/${id}`)
}

function duplicateEvent(id) {
  router.push({ path: '/admin', query: { duplicateId: id } })
}

function gotoAddEvent() {
  router.push('/admin')
}

function gotoBulkAdd() {
  router.push('/management/bulk')
}
</script>

<template>
  <div class="management-page">
    <section class="management-toolbar">
      <div class="management-toolbar__heading">
        <h1>Event Management</h1>
        <p>{{ isAdmin ? `All ${viewLabel} events` : `Your ${viewLabel} events` }} ({{ filteredEvents.length }})</p>
      </div>
    </section>

    <div class="management-controls">
      <input v-model="searchQuery" class="search-input" type="search" placeholder="Search events..." aria-label="Search managed events" />
      <div class="segmented-control" role="tablist" aria-label="Event timeframe">
        <button class="button button--compact" :class="{ secondary: activeView !== 'upcoming' }" type="button" role="tab" :aria-selected="activeView === 'upcoming'" @click="activeView = 'upcoming'">Upcoming</button>
        <button class="button button--compact" :class="{ secondary: activeView !== 'past' }" type="button" role="tab" :aria-selected="activeView === 'past'" @click="activeView = 'past'">Past</button>
      </div>
    </div>

    <div class="management-toolbar__actions" aria-label="Management actions">
      <button class="button button--compact icon-text" type="button" @click="gotoAddEvent"><Plus class="icon icon--sm" />Add Event</button>
      <button class="button secondary button--compact icon-text" type="button" @click="gotoBulkAdd"><CalendarPlus class="icon icon--sm" />Bulk Add Events</button>
    </div>

    <section v-if="!loading && filteredEvents.length > 0" class="card bulk-selection-bar" aria-label="Bulk event selection">
      <label class="bulk-selection-checkbox">
        <input type="checkbox" :checked="allVisibleSelected" @change="toggleSelectAllVisible($event.target.checked)" />
        Select all visible events
      </label>
      <span class="bulk-selection-count">{{ selectedCount }} event{{ selectedCount === 1 ? '' : 's' }} selected</span>
      <button class="button secondary button--compact" type="button" :disabled="selectedCount === 0" @click="clearSelection">Clear selection</button>
    </section>

    <section v-if="selectedCount > 0" class="card bulk-action-bar" aria-label="Bulk event actions">
      <strong>{{ selectedCount }} event{{ selectedCount === 1 ? '' : 's' }} selected</strong>
      <div class="bulk-action-bar__buttons">
        <button class="button button--compact" type="button" @click="openBulkEdit">Bulk Edit</button>
        <button v-if="canBulkCancel" class="button danger button--compact" type="button" :disabled="bulkSaving" @click="bulkCancelSelected">Cancel Selected</button>
        <button v-if="canBulkRestore" class="button secondary button--compact" type="button" :disabled="bulkSaving" @click="bulkRestoreSelected">Restore Selected</button>
        <button class="button secondary button--compact" type="button" :disabled="bulkSaving" @click="clearSelection">Clear Selection</button>
      </div>
    </section>

    <section v-if="bulkEditOpen" class="card form bulk-edit-panel" aria-labelledby="bulk-edit-title">
      <h2 id="bulk-edit-title">Bulk edit {{ selectedCount }} event{{ selectedCount === 1 ? '' : 's' }}</h2>
      <p class="field-help">Only checked fields will be updated. Dates, titles, descriptions, links, status, and ownership are not changed here.</p>

      <div class="grid-two">
        <div class="field bulk-edit-field">
          <label class="checkbox-field__label"><input v-model="bulkForm.changeStartTime" type="checkbox" />Change start time</label>
          <input v-model="bulkForm.start_time" type="time" :disabled="!bulkForm.changeStartTime" />
        </div>
        <div class="field bulk-edit-field">
          <label class="checkbox-field__label"><input v-model="bulkForm.changeEndTime" type="checkbox" />Change end time</label>
          <input v-model="bulkForm.end_time" type="time" :disabled="!bulkForm.changeEndTime" />
        </div>
      </div>

      <div class="field bulk-edit-field">
        <label class="checkbox-field__label"><input v-model="bulkForm.changeLocation" type="checkbox" />Change location</label>
        <input v-model="bulkForm.location" :disabled="!bulkForm.changeLocation" placeholder="Location name" />
      </div>

      <div class="bulk-edit-field" :class="{ 'bulk-edit-field--disabled': !bulkForm.changeOrganizer }">
        <label class="checkbox-field__label"><input v-model="bulkForm.changeOrganizer" type="checkbox" />Change organizer</label>
        <OrganizerSelector
          v-if="bulkForm.changeOrganizer"
          v-model:organizer-id="bulkForm.organizer_id"
          v-model:organizer-name="bulkForm.organizer"
          v-model:new-organizer-name="bulkForm.newOrganizerName"
          :organizers="organizers"
          select-id="bulk-event-organizer"
          new-input-id="bulk-event-new-organizer"
        />
      </div>

      <div class="grid-two">
        <div class="field bulk-edit-field">
          <label class="checkbox-field__label"><input v-model="bulkForm.changeCategory" type="checkbox" />Change category</label>
          <select v-model="bulkForm.category" :disabled="!bulkForm.changeCategory">
            <option value="social">Social</option>
            <option value="class">Class</option>
            <option value="festival">Festival</option>
            <option value="workshop">Workshop</option>
          </select>
        </div>

        <div class="field bulk-edit-field">
          <label class="checkbox-field__label"><input v-model="bulkForm.changeRecurring" type="checkbox" />Change weekly status</label>
          <select v-model="bulkForm.is_recurring" :disabled="!bulkForm.changeRecurring">
            <option value="weekly">Weekly</option>
            <option value="not_weekly">Not weekly</option>
          </select>
        </div>
      </div>

      <div class="bulk-edit-field" :class="{ 'bulk-edit-field--disabled': !bulkForm.changePricing }">
        <label class="checkbox-field__label"><input v-model="bulkForm.changePricing" type="checkbox" />Change pricing</label>
        <PriceFields v-if="bulkForm.changePricing" v-model="bulkForm.price" />
      </div>

      <div class="form-actions">
        <button class="button" type="button" :disabled="bulkSaving" @click="prepareBulkEditConfirmation">Review changes</button>
        <button class="button secondary" type="button" :disabled="bulkSaving" @click="closeBulkEdit">Cancel</button>
      </div>
    </section>

    <section v-if="bulkConfirmOpen" class="card bulk-confirm-panel" aria-labelledby="bulk-confirm-title">
      <h2 id="bulk-confirm-title">Confirm bulk update</h2>
      <p>You are about to update {{ selectedCount }} event{{ selectedCount === 1 ? '' : 's' }}.</p>

      <div class="bulk-confirm-grid">
        <div>
          <h3>Fields being changed</h3>
          <ul>
            <li v-for="change in bulkChangeSummary" :key="change">{{ change }}</li>
          </ul>
        </div>
        <div>
          <h3>Affected events</h3>
          <ul class="bulk-confirm-events">
            <li v-for="event in bulkConfirmEvents" :key="event.id">
              <strong>{{ event.title }}</strong>
              <span>{{ formatStart(event.start_time) }} • {{ event.status || 'approved' }}</span>
            </li>
          </ul>
        </div>
      </div>

      <div class="form-actions">
        <button class="button" type="button" :disabled="bulkSaving" @click="confirmBulkEdit">Update {{ selectedCount }} events</button>
        <button class="button secondary" type="button" :disabled="bulkSaving" @click="bulkConfirmOpen = false">Cancel</button>
      </div>
    </section>

    <p v-if="flashMessage" class="flash-message">{{ flashMessage }}</p>
    <p v-if="loading" class="empty-state">Loading events...</p>
    <p v-else-if="error" class="empty-state">Could not load events: {{ error }}</p>
    <p v-else-if="filteredEvents.length === 0" class="empty-state">No {{ viewLabel }} events match these filters.</p>

    <section v-else class="management-list">
      <div v-for="event in filteredEvents" :key="event.id" class="card management-card" :class="{ 'management-card--cancelled': event.status === 'cancelled' }">
        <label class="management-card__select" :aria-label="`Select ${event.title}`">
          <input type="checkbox" :checked="selectedEventIds.has(String(event.id))" @change="toggleEventSelection(event, $event.target.checked)" />
        </label>

        <RouterLink :to="{ path: `/events/${event.id}`, query: { from: 'management' } }" class="management-card__content management-card__link">
          <h2 class="management-card__title">{{ event.title }} <span v-if="event.status === 'cancelled'" class="pill cancelled-badge">Cancelled</span></h2>
          <p class="management-card__meta">
            {{ formatStart(event.start_time) }}
            <span v-if="event.location">• {{ event.location }}</span>
            <span v-if="event.organizer_display">• {{ event.organizer_display }}</span>
          </p>
          <p v-if="isAdmin" class="management-card__meta">Created by: {{ getCreatorLabel(event) }}</p>
        </RouterLink>

        <div class="management-card__actions">
          <button class="button button--compact" type="button" @click="editEvent(event.id)">Edit</button>
          <button class="button secondary button--compact" type="button" @click="duplicateEvent(event.id)">Duplicate</button>
          <button v-if="event.status === 'cancelled'" class="button secondary button--compact" type="button" @click="restoreEvent(event)">Restore</button>
          <button v-else class="button danger button--compact" type="button" @click="cancelEvent(event)">Cancel</button>
        </div>
      </div>
    </section>
  </div>
</template>
