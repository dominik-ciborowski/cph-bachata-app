<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'

const router = useRouter()
const status = ref('')
const user = ref(null)

const form = ref({
  title: '',
  organizer: '',
  facebook_url: '',
  location: '',
  date: '',
  start_time: '18:30',
  end_time: '21:30',
  category: 'social',
  price_text: 'Free',
  description: '',
  recurrence: 'single',
  repeat_until: ''
})

onMounted(async () => {
  const { data } = await supabase.auth.getUser()
  user.value = data.user
  if (!user.value) router.push('/login')
})

function toDateTime(date, time) {
  return new Date(`${date}T${time}:00`).toISOString()
}

function generateDates() {
  const dates = []
  const start = new Date(`${form.value.date}T00:00:00`)
  const end = form.value.repeat_until
    ? new Date(`${form.value.repeat_until}T00:00:00`)
    : start

  const cursor = new Date(start)
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10))
    cursor.setDate(cursor.getDate() + 7)
  }
  return dates
}

async function saveEvent() {
  status.value = 'Saving...'

  const dates = form.value.recurrence === 'weekly' ? generateDates() : [form.value.date]
  const rows = dates.map(date => ({
    title: form.value.title,
    organizer: form.value.organizer,
    facebook_url: form.value.facebook_url,
    location: form.value.location,
    start_time: toDateTime(date, form.value.start_time),
    end_time: toDateTime(date, form.value.end_time),
    category: form.value.category,
    price_text: form.value.price_text,
    description: form.value.description,
    approved: true
  }))

  const { error } = await supabase.from('events').insert(rows)

  if (error) {
    status.value = error.message
    return
  }

  sessionStorage.setItem('flash_message', `Saved ${rows.length} event(s).`)
  router.push('/')
}

async function logout() {
  await supabase.auth.signOut()
  router.push('/')
}
</script>

<template>
  <section class="hero">
    <h1>Add event</h1>
    <p>Paste Facebook link, add date details, publish it to the public list.</p>
  </section>

  <form class="card form" @submit.prevent="saveEvent">
    <div class="grid-two">
      <div class="field">
        <label>Event title</label>
        <input v-model="form.title" required placeholder="Bachata Friday at BLOX" />
      </div>

      <div class="field">
        <label>Organizer / school</label>
        <input v-model="form.organizer" placeholder="Dancemaniacs" />
      </div>
    </div>

    <div class="field">
      <label>Facebook event link</label>
      <input v-model="form.facebook_url" type="url" required placeholder="https://facebook.com/events/..." />
    </div>

    <div class="grid-two">
      <div class="field">
        <label>Location</label>
        <input v-model="form.location" placeholder="BLOX, Copenhagen" />
      </div>

      <div class="field">
        <label>Category</label>
        <select v-model="form.category">
          <option value="social">Social</option>
          <option value="class">Class</option>
          <option value="party">Party</option>
          <option value="festival">Festival</option>
          <option value="workshop">Workshop</option>
        </select>
      </div>
    </div>

    <div class="grid-two">
      <div class="field">
        <label>Date</label>
        <input v-model="form.date" type="date" required />
      </div>

      <div class="field">
        <label>Recurrence</label>
        <select v-model="form.recurrence">
          <option value="single">Single event</option>
          <option value="weekly">Repeat weekly</option>
        </select>
      </div>
    </div>

    <div v-if="form.recurrence === 'weekly'" class="field">
      <label>Repeat until</label>
      <input v-model="form.repeat_until" type="date" required />
    </div>

    <div class="grid-two">
      <div class="field">
        <label>Start time</label>
        <input v-model="form.start_time" type="time" required />
      </div>

      <div class="field">
        <label>End time</label>
        <input v-model="form.end_time" type="time" />
      </div>
    </div>

    <div class="field">
      <label>Price</label>
      <input v-model="form.price_text" placeholder="Free / 80 DKK / donation based" />
    </div>

    <div class="field">
      <label>Description</label>
      <textarea v-model="form.description" placeholder="Short note visible on the public page"></textarea>
    </div>

    <button class="button" type="submit">Save event</button>
    <button class="button secondary" type="button" @click="logout">Log out</button>
    <p v-if="status" class="status">{{ status }}</p>
  </form>
</template>
