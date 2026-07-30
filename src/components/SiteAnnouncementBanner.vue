<script setup>
import { computed, onMounted, ref } from 'vue'
import { X } from 'lucide-vue-next'
import {
  dismissAnnouncementId,
  fetchActiveAnnouncements,
  readDismissedAnnouncementIds
} from '../lib/siteAnnouncements'
import { trackAnnouncement } from '../analytics/interactionTracking'
import { AnalyticsEvents } from '../analytics/types'

const announcements = ref([])
const dismissedIds = ref(new Set())
const loading = ref(false)

const visibleAnnouncement = computed(() => (
  announcements.value.find((announcement) => !dismissedIds.value.has(String(announcement.id))) || null
))

onMounted(async () => {
  dismissedIds.value = readDismissedAnnouncementIds()
  loading.value = true

  try {
    announcements.value = await fetchActiveAnnouncements()
  } catch (error) {
    console.warn('[announcements] Could not load site announcement', error)
    announcements.value = []
  } finally {
    loading.value = false
  }
})

function dismissBanner() {
  if (!visibleAnnouncement.value) return

  trackAnnouncement(AnalyticsEvents.ANNOUNCEMENT_DISMISSED, visibleAnnouncement.value.id)
  dismissedIds.value = dismissAnnouncementId(visibleAnnouncement.value.id)
}

function clickAnnouncement() {
  if (!visibleAnnouncement.value) return
  trackAnnouncement(AnalyticsEvents.ANNOUNCEMENT_CLICKED, visibleAnnouncement.value.id)
}
</script>

<template>
  <section
    v-if="!loading && visibleAnnouncement"
    class="site-announcement"
    :class="`site-announcement--${visibleAnnouncement.type}`"
    role="status"
    aria-live="polite"
    @click="clickAnnouncement"
  >
    <div class="site-announcement__content">
      <p v-if="visibleAnnouncement.title" class="site-announcement__title">{{ visibleAnnouncement.title }}</p>
      <p class="site-announcement__message">{{ visibleAnnouncement.message }}</p>
    </div>

    <button class="site-announcement__dismiss" type="button" aria-label="Dismiss announcement" @click.stop="dismissBanner">
      <X class="icon icon--sm" />
    </button>
  </section>
</template>
