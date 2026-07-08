<script setup>
import { computed, onMounted, ref } from 'vue'
import { supabase } from '../lib/supabase'

const announcement = ref(null)

function getDismissedKey(id) {
  return `site_announcement_dismissed_${id}`
}

function isDismissed(id) {
  try {
    return localStorage.getItem(getDismissedKey(id)) === 'true'
  } catch {
    return false
  }
}

function isCurrentlyVisible(item, now = new Date()) {
  if (!item?.is_active) return false

  const startsAt = item.starts_at ? new Date(item.starts_at) : null
  const endsAt = item.ends_at ? new Date(item.ends_at) : null

  return (!startsAt || startsAt <= now) && (!endsAt || endsAt >= now)
}

function normalizeType(type) {
  return ['info', 'warning', 'maintenance', 'success'].includes(type) ? type : 'info'
}

async function loadAnnouncement() {
  const { data, error } = await supabase
    .from('site_announcements')
    .select('id,title,message,type,is_active,starts_at,ends_at,created_at')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    announcement.value = null
    return
  }

  const now = new Date()
  announcement.value = (data || []).find((item) => isCurrentlyVisible(item, now) && !isDismissed(item.id)) || null
}

function dismissAnnouncement() {
  if (!announcement.value?.id) return

  try {
    localStorage.setItem(getDismissedKey(announcement.value.id), 'true')
  } catch {
    // Ignore storage failures; dismissal still works for the current session.
  }

  announcement.value = null
}

const bannerClass = computed(() => {
  return announcement.value ? `site-announcement--${normalizeType(announcement.value.type)}` : ''
})

onMounted(loadAnnouncement)
</script>

<template>
  <aside v-if="announcement" class="site-announcement" :class="bannerClass" role="status" aria-live="polite">
    <div class="site-announcement__content">
      <strong v-if="announcement.title" class="site-announcement__title">{{ announcement.title }}</strong>
      <p>{{ announcement.message }}</p>
    </div>
    <button class="site-announcement__dismiss" type="button" aria-label="Dismiss announcement" @click="dismissAnnouncement">×</button>
  </aside>
</template>
