<script setup>
import { computed, onMounted, ref } from 'vue'
import { Plus } from 'lucide-vue-next'
import { supabase } from '../lib/supabase'
import { announcementTypes, normalizeAnnouncement } from '../lib/siteAnnouncementUtils'

const typeOptions = announcementTypes
const emptyForm = {
  title: '',
  message: '',
  type: 'info',
  is_active: true,
  starts_at: '',
  ends_at: ''
}

const messages = ref([])
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const status = ref('')
const editingId = ref(null)
const formOpen = ref(false)
const form = ref({ ...emptyForm })

onMounted(async () => {
  await loadMessages()
})

const formTitle = computed(() => (editingId.value ? 'Edit message' : 'New message'))

async function loadMessages() {
  loading.value = true
  error.value = ''

  const { data, error: queryError } = await supabase
    .from('site_announcements')
    .select('id,title,message,type,is_active,starts_at,ends_at,created_at,updated_at')
    .order('created_at', { ascending: false })

  if (queryError) {
    messages.value = []
    error.value = queryError.message
    loading.value = false
    return
  }

  messages.value = (data || []).map(normalizeAnnouncement)
  loading.value = false
}

function toDatetimeLocal(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return offsetDate.toISOString().slice(0, 16)
}

function fromDatetimeLocal(value) {
  return value ? new Date(value).toISOString() : null
}

function formatDate(value) {
  if (!value) return 'Not set'

  return new Intl.DateTimeFormat('en-DK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value))
}

function getMessageStatus(message) {
  if (!message?.is_active) return 'Inactive'

  const now = new Date()
  const startsAt = message.starts_at ? new Date(message.starts_at) : null
  const endsAt = message.ends_at ? new Date(message.ends_at) : null

  if (startsAt && startsAt > now) return 'Scheduled'
  if (endsAt && endsAt < now) return 'Expired'
  return 'Active'
}

function formatType(type) {
  return `${String(type || 'info').slice(0, 1).toUpperCase()}${String(type || 'info').slice(1)}`
}

function truncateMessage(message) {
  if (!message) return ''
  return message.length > 160 ? `${message.slice(0, 157)}...` : message
}

function openNewForm() {
  status.value = ''
  error.value = ''
  editingId.value = null
  form.value = { ...emptyForm }
  formOpen.value = true
}

function editMessage(message) {
  status.value = ''
  error.value = ''
  editingId.value = message.id
  form.value = {
    title: message.title || '',
    message: message.message || '',
    type: typeOptions.includes(message.type) ? message.type : 'info',
    is_active: Boolean(message.is_active),
    starts_at: toDatetimeLocal(message.starts_at),
    ends_at: toDatetimeLocal(message.ends_at)
  }
  formOpen.value = true
}

function cancelForm() {
  formOpen.value = false
  editingId.value = null
  form.value = { ...emptyForm }
}

function buildPayload() {
  return {
    title: form.value.title.trim() || null,
    message: form.value.message.trim(),
    type: typeOptions.includes(form.value.type) ? form.value.type : 'info',
    is_active: Boolean(form.value.is_active),
    starts_at: fromDatetimeLocal(form.value.starts_at),
    ends_at: fromDatetimeLocal(form.value.ends_at),
    updated_at: new Date().toISOString()
  }
}

async function saveMessage() {
  status.value = ''
  error.value = ''

  if (!form.value.message.trim()) {
    error.value = 'Message is required.'
    return
  }

  saving.value = true
  const payload = buildPayload()
  const query = editingId.value
    ? supabase.from('site_announcements').update(payload).eq('id', editingId.value)
    : supabase.from('site_announcements').insert(payload)

  const { error: saveError } = await query
  saving.value = false

  if (saveError) {
    error.value = saveError.message
    return
  }

  status.value = editingId.value ? 'Site message updated.' : 'Site message created.'
  cancelForm()
  await loadMessages()
}

async function toggleActive(message) {
  status.value = ''
  error.value = ''
  saving.value = true

  const { error: updateError } = await supabase
    .from('site_announcements')
    .update({ is_active: !message.is_active, updated_at: new Date().toISOString() })
    .eq('id', message.id)

  saving.value = false

  if (updateError) {
    error.value = updateError.message
    return
  }

  status.value = message.is_active ? 'Site message deactivated.' : 'Site message activated.'
  await loadMessages()
}
</script>

<template>
  <div class="management-page">
    <section class="management-toolbar">
      <div class="management-toolbar__heading">
        <h1>Site Messages</h1>
        <p>Manage announcement and maintenance messages shown in the public banner.</p>
      </div>
    </section>

    <div class="management-toolbar__actions" aria-label="Site message actions">
      <button class="button button--compact icon-text" type="button" @click="openNewForm"><Plus class="icon icon--sm" />New Message</button>
    </div>

    <p v-if="status" class="flash-message">{{ status }}</p>
    <p v-if="error" class="empty-state">{{ error }}</p>

    <section v-if="formOpen" class="card form site-message-form" aria-labelledby="site-message-form-title">
      <h2 id="site-message-form-title">{{ formTitle }}</h2>

      <div class="field">
        <label for="site-message-title">Title</label>
        <input id="site-message-title" v-model="form.title" placeholder="Optional short title" />
      </div>

      <div class="field">
        <label for="site-message-message">Message *</label>
        <textarea id="site-message-message" v-model="form.message" required placeholder="Short message shown to users" />
      </div>

      <div class="grid-two">
        <div class="field">
          <label for="site-message-type">Type</label>
          <select id="site-message-type" v-model="form.type">
            <option v-for="typeOption in typeOptions" :key="typeOption" :value="typeOption">{{ formatType(typeOption) }}</option>
          </select>
        </div>

        <div class="field checkbox-field site-message-active-field">
          <label class="checkbox-field__label">
            <input v-model="form.is_active" type="checkbox" />
            Active
          </label>
        </div>
      </div>

      <div class="grid-two">
        <div class="field">
          <label for="site-message-starts">Start date/time</label>
          <input id="site-message-starts" v-model="form.starts_at" type="datetime-local" />
        </div>

        <div class="field">
          <label for="site-message-ends">End date/time</label>
          <input id="site-message-ends" v-model="form.ends_at" type="datetime-local" />
        </div>
      </div>

      <div class="form-actions">
        <button class="button" type="button" :disabled="saving" @click="saveMessage">Save</button>
        <button class="button secondary" type="button" :disabled="saving" @click="cancelForm">Cancel</button>
      </div>
    </section>

    <p v-if="loading" class="empty-state">Loading site messages...</p>

    <section v-else class="site-message-list">
      <article v-if="messages.length === 0" class="empty-state">No site messages yet.</article>

      <template v-else>
      <article v-for="message in messages" :key="message.id" class="card site-message-row">
        <div class="site-message-row__content">
          <div class="site-message-row__header">
            <h2>{{ message.title || 'Untitled message' }}</h2>
            <span class="pill" :class="`site-message-type-badge--${message.type}`">{{ formatType(message.type) }}</span>
          </div>

          <p class="site-message-row__message">{{ truncateMessage(message.message) }}</p>

          <dl class="site-message-meta">
            <div>
              <dt>Status</dt>
              <dd>{{ getMessageStatus(message) }}</dd>
            </div>
            <div>
              <dt>Start date</dt>
              <dd>{{ formatDate(message.starts_at) }}</dd>
            </div>
            <div>
              <dt>End date</dt>
              <dd>{{ formatDate(message.ends_at) }}</dd>
            </div>
          </dl>
        </div>

        <div class="site-message-row__actions">
          <button class="button button--compact" type="button" :disabled="saving" @click="editMessage(message)">Edit</button>
          <button class="button secondary button--compact" type="button" :disabled="saving" @click="toggleActive(message)">{{ message.is_active ? 'Deactivate' : 'Activate' }}</button>
        </div>
      </article>
      </template>
    </section>
  </div>
</template>
