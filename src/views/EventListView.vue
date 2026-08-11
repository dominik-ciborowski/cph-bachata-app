<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CalendarPlus, X } from 'lucide-vue-next'
import EventCalendarView from '../components/EventCalendarView.vue'
import EventListResultsView from '../components/EventListView.vue'
import { useAuth } from '../composables/useAuth'
import { normalizeEvent } from '../lib/events'
import { applyFavoriteState, favoriteEvent, loadFavoriteEventIds, unfavoriteEvent } from '../lib/favorites'
import { downloadIcsCalendar } from '../lib/calendarExport'
import { getCategoryMeta, isFreePrice } from '../lib/eventPresentation'
import { getCalendarView, readAppPreferences, updateAppPreferences } from '../lib/appPreferences'
import { supabase } from '../lib/supabase'
import {
  trackFilterChanged,
  trackFiltersCleared,
  trackCalendarModeChanged,
  trackSavedEvent,
  trackSearchNoResults,
  trackSearchPerformed,
  trackViewSelected
} from '../analytics/interactionTracking'

const route = useRoute()
const router = useRouter()
const { user, isAuthenticated, loading: authLoading } = useAuth()

const filter = ref('all')
const category = ref('all')
const organizer = ref('all')
const searchQuery = ref('')
const events = ref([])
const weekEvents = ref([])
const weekLoading = ref(false)
const weekError = ref('')
const loading = ref(true)
const error = ref('')
const flashMessage = ref('')
const favoriteIds = ref(new Set())
const favoriteBusyId = ref(null)
const calendarExportError = ref('')
const calendarFiltersOpen = ref(false)
const discoveryControls = ref(null)
const showListBackToTop = ref(false)
const showLoginBenefitsBanner = ref(false)
let searchAnalyticsTimeoutId = null
let lastNoResultsSearchState = ''
let lastPerformedSearchQuery = ''
let weekRequestId = 0

const loginBenefitsDismissedUntilKey = 'login_benefits_dismissed_until'
const loginBenefitsDismissDurationMs = 7 * 24 * 60 * 60 * 1000
const validMainViewModes = new Set(['list', 'calendar'])

const isFavoritesView = computed(() => route.path === '/favorites')
const viewMode = ref(getStoredPreferredView())
const calendarView = ref(getCalendarView())

const today = new Date()
today.setHours(0, 0, 0, 0)

onMounted(async () => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  const storedFlashMessage = sessionStorage.getItem('flash_message')
  if (storedFlashMessage) {
    flashMessage.value = storedFlashMessage
    sessionStorage.removeItem('flash_message')
    setTimeout(() => {
      flashMessage.value = ''
    }, 4000)
  }

  updateLoginBenefitsBannerVisibility()
  await loadEvents()
})

watch(user, async () => {
  updateLoginBenefitsBannerVisibility()
  await loadEvents()
})

watch(authLoading, () => {
  updateLoginBenefitsBannerVisibility()
})

watch(isFavoritesView, async () => {
  updateLoginBenefitsBannerVisibility()
  handleScroll()
  await loadEvents()
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  if (searchAnalyticsTimeoutId) window.clearTimeout(searchAnalyticsTimeoutId)
})

watch([searchQuery, filter, category, organizer, loading], (nextState, previousState) => {
  if (nextState.every((value, index) => value === previousState[index])) return
  if (searchAnalyticsTimeoutId) window.clearTimeout(searchAnalyticsTimeoutId)
  if (loading.value) return

  const normalizedQuery = searchQuery.value.trim()
  const analyticsFilterCount = getAnalyticsActiveFilterCount()
  if (!normalizedQuery) lastPerformedSearchQuery = ''
  if (!normalizedQuery && analyticsFilterCount === 0) {
    lastNoResultsSearchState = ''
    return
  }

  searchAnalyticsTimeoutId = window.setTimeout(() => {
    if (normalizedQuery && normalizedQuery !== lastPerformedSearchQuery) {
      lastPerformedSearchQuery = normalizedQuery
      trackSearchPerformed(normalizedQuery.length, visibleEvents.value.length)
    }

    if (visibleEvents.value.length > 0) {
      lastNoResultsSearchState = ''
      return
    }

    const searchState = JSON.stringify([normalizedQuery, filter.value, category.value, organizer.value])
    if (searchState === lastNoResultsSearchState) return
    lastNoResultsSearchState = searchState
    trackSearchNoResults(normalizedQuery.length, analyticsFilterCount)
  }, 400)
})


function updateLoginBenefitsBannerVisibility() {
  if (authLoading.value || isAuthenticated.value || isFavoritesView.value) {
    showLoginBenefitsBanner.value = false
    return
  }

  const dismissedUntil = getLoginBenefitsDismissedUntil()
  showLoginBenefitsBanner.value = !dismissedUntil || dismissedUntil <= Date.now()
}

function getLoginBenefitsDismissedUntil() {
  try {
    return Number(localStorage.getItem(loginBenefitsDismissedUntilKey) || 0)
  } catch {
    return 0
  }
}

function dismissLoginBenefitsBanner() {
  showLoginBenefitsBanner.value = false

  try {
    localStorage.setItem(loginBenefitsDismissedUntilKey, String(Date.now() + loginBenefitsDismissDurationMs))
  } catch {
    // Ignore storage failures; the banner is still dismissed for this session.
  }
}

async function loadEvents() {
  loading.value = true
  error.value = ''

  if (user.value) {
    try {
      favoriteIds.value = await loadFavoriteEventIds(user.value.id)
    } catch (favoriteError) {
      error.value = favoriteError.message
      events.value = []
      loading.value = false
      return
    }
  } else {
    favoriteIds.value = new Set()
  }

  const { data, error: queryError } = await supabase
    .from('events')
    .select('*, organizer_record:organizers(id,name,verified)')
    .in('status', ['approved', 'cancelled'])
    .gte('start_time', today.toISOString())
    .order('start_time', { ascending: true })

  if (queryError) {
    error.value = queryError.message
    events.value = []
    loading.value = false
    return
  }

  events.value = applyFavoriteState((data || []).map(normalizeEvent), favoriteIds.value)
  loading.value = false
}

function showToast(message) {
  window.dispatchEvent(new CustomEvent('app-toast', { detail: { message } }))
}

function handleScroll() {
  if (viewMode.value !== 'list') {
    showListBackToTop.value = false
    return
  }

  const controlsRect = discoveryControls.value?.getBoundingClientRect()
  showListBackToTop.value = Boolean(controlsRect && controlsRect.bottom < 80)
}

function askLoginToFavorite() {
  sessionStorage.setItem('flash_message', 'Log in first to save events to My Events.')
  router.push('/login')
}

async function toggleFavorite(event) {
  if (!isAuthenticated.value || !user.value) {
    askLoginToFavorite()
    return
  }

  favoriteBusyId.value = event.id
  error.value = ''

  try {
    if (event.is_favorited) {
      await unfavoriteEvent(user.value.id, event.id)
      favoriteIds.value.delete(String(event.id))
      trackSavedEvent(event, isFavoritesView.value ? 'saved_events' : viewMode.value, false)
      showToast('Removed from My Events.')
    } else {
      await favoriteEvent(user.value.id, event.id)
      favoriteIds.value.add(String(event.id))
      trackSavedEvent(event, isFavoritesView.value ? 'saved_events' : viewMode.value, true)
      showToast('Added to My Events.')
    }

    events.value = applyFavoriteState(events.value, favoriteIds.value)
    weekEvents.value = applyFavoriteState(weekEvents.value, favoriteIds.value)
  } catch (favoriteError) {
    error.value = 'Could not update My Events right now. Please try again.'
  } finally {
    favoriteBusyId.value = null
  }
}

async function loadWeekEvents({ start, end }) {
  const requestId = ++weekRequestId
  weekLoading.value = true
  weekError.value = ''

  const { data, error: queryError } = await supabase
    .from('events')
    .select('*, organizer_record:organizers(id,name,verified)')
    .in('status', ['approved', 'cancelled'])
    .gte('start_time', start.toISOString())
    .lt('start_time', end.toISOString())
    .order('start_time', { ascending: true })

  if (requestId !== weekRequestId) return
  weekLoading.value = false
  if (queryError) {
    weekError.value = queryError.message
    weekEvents.value = []
    return
  }
  weekEvents.value = applyFavoriteState((data || []).map(normalizeEvent), favoriteIds.value)
}

function isThisWeekend(event) {
  const eventDate = new Date(event.start_time)
  const weekendRange = getWeekendRange()
  return eventDate >= weekendRange.start && eventDate < weekendRange.end
}

function getWeekendRange() {
  const day = today.getDay()
  const start = new Date(today)

  if (day >= 1 && day <= 4) {
    start.setDate(today.getDate() + (5 - day))
  }

  if (day === 0) {
    start.setDate(today.getDate())
  }

  const end = new Date(start)

  if (day === 0) {
    end.setDate(start.getDate() + 1)
  } else if (day === 6) {
    end.setDate(start.getDate() + 2)
  } else {
    end.setDate(start.getDate() + 3)
  }

  return { start, end }
}

function isToday(event) {
  const date = new Date(event.start_time)
  return date.toDateString() === today.toDateString()
}

function isFree(event) {
  return isFreePrice(event.price_text)
}

function getOrganizerFilterName(event) {
  return event.organizer_name || event.organizer || event.organizer_display || ''
}

function matchesOrganizer(event) {
  return organizer.value === 'all' || getOrganizerFilterName(event) === organizer.value
}

function matchesSearch(event) {
  if (!searchQuery.value) return true
  const query = searchQuery.value.toLowerCase()
  return (
    (event.title || '').toLowerCase().includes(query) ||
    (event.organizer_display || event.organizer || '').toLowerCase().includes(query) ||
    (event.location || '').toLowerCase().includes(query)
  )
}

function setQuickFilter(nextFilter) {
  const selectedFilter = filter.value === nextFilter && nextFilter !== 'all' ? 'all' : nextFilter
  if (selectedFilter === filter.value) return
  filter.value = selectedFilter
  trackFilterChanged('quick_filter', selectedFilter)
}

function setViewMode(nextViewMode) {
  if (!validMainViewModes.has(nextViewMode)) {
    nextViewMode = 'list'
  }

  if (viewMode.value === nextViewMode) return

  viewMode.value = nextViewMode
  trackViewSelected(nextViewMode)
  savePreferredView(nextViewMode)
  calendarFiltersOpen.value = false
  handleScroll()
}

function getStoredPreferredView() {
  try {
    const storedPreferences = readAppPreferences()
    return validMainViewModes.has(storedPreferences.preferredView) ? storedPreferences.preferredView : 'list'
  } catch {
    return 'list'
  }
}

function savePreferredView(preferredView) {
  try {
    updateAppPreferences({ preferredView })
  } catch {
    // Ignore storage failures; the selected view still changes for this session.
  }
}

function setCalendarView(nextCalendarView) {
  const mode = nextCalendarView === 'week' ? 'week' : 'month'
  const previousMode = calendarView.value
  if (mode === previousMode) return

  calendarView.value = mode
  trackCalendarModeChanged(mode, previousMode)
  updateAppPreferences({ calendarView: mode })
}

function toggleCalendarFilters() {
  calendarFiltersOpen.value = !calendarFiltersOpen.value
}

function setCalendarFilter(nextFilter) {
  if (filter.value === nextFilter) return
  filter.value = nextFilter
  trackFilterChanged('quick_filter', nextFilter)
}

function isCalendarFilterActive(currentFilter) {
  if (currentFilter === 'all') return filter.value !== 'free'
  return filter.value === currentFilter
}

function clearFilters() {
  if (filter.value === 'all' && category.value === 'all' && organizer.value === 'all') return
  filter.value = 'all'
  category.value = 'all'
  organizer.value = 'all'
  trackFiltersCleared()
}

function setCategoryFilter(selectedCategory) {
  if (category.value === selectedCategory) return
  category.value = selectedCategory
  trackFilterChanged('category', selectedCategory)
}

function setOrganizerFilter(selectedOrganizer) {
  if (organizer.value === selectedOrganizer) return
  organizer.value = selectedOrganizer
  trackFilterChanged('organizer', selectedOrganizer)
}

function scrollToDiscoveryControls() {
  discoveryControls.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const categories = computed(() => {
  return ['all', ...new Set(events.value.map(event => event.category))]
})

const organizers = computed(() => {
  return [...new Set(events.value.map(getOrganizerFilterName).filter(Boolean))]
    .sort((first, second) => first.localeCompare(second))
})

const activeFilterCount = computed(() => {
  let count = 0
  if (filter.value === 'free') count += 1
  if (category.value !== 'all') count += 1
  if (organizer.value !== 'all') count += 1
  return count
})

function getAnalyticsActiveFilterCount() {
  let count = 0
  if (filter.value !== 'all') count += 1
  if (category.value !== 'all') count += 1
  if (organizer.value !== 'all') count += 1
  return count
}

const savedUpcomingEvents = computed(() => {
  const now = new Date()

  return events.value
    .filter(event => event.is_favorited)
    .filter(event => new Date(event.start_time) >= now)
    .sort((first, second) => new Date(first.start_time) - new Date(second.start_time))
})

const visibleEvents = computed(() => {
  const shouldApplyListFilters = viewMode.value === 'list' || isFavoritesView.value

  return events.value
    .filter(event => new Date(event.start_time) >= today)
    .filter(event => !shouldApplyListFilters || filter.value !== 'today' || isToday(event))
    .filter(event => !shouldApplyListFilters || filter.value !== 'weekend' || isThisWeekend(event))
    .filter(event => !isFavoritesView.value || event.is_favorited)
    .filter(event => filter.value !== 'free' || isFree(event))
    .filter(event => category.value === 'all' || event.category === category.value)
    .filter(matchesOrganizer)
    .filter(event => !shouldApplyListFilters || matchesSearch(event))
    .sort((first, second) => new Date(first.start_time) - new Date(second.start_time))
})

const visibleWeekEvents = computed(() => weekEvents.value
  .filter(event => filter.value !== 'free' || isFree(event))
  .filter(event => category.value === 'all' || event.category === category.value)
  .filter(matchesOrganizer)
  .sort((first, second) => new Date(first.start_time) - new Date(second.start_time)))

function exportMyEvents() {
  calendarExportError.value = ''

  if (savedUpcomingEvents.value.length === 0) {
    calendarExportError.value = 'No saved upcoming events to export yet.'
    return
  }

  try {
    downloadIcsCalendar(savedUpcomingEvents.value, 'copenhagen-bachata-my-events.ics')
    showToast('My Events calendar file downloaded.')
  } catch (exportError) {
    console.error('[calendar] My Events export failed', exportError)
    calendarExportError.value = 'Could not create the calendar file. Please try again.'
  }
}

</script>

<template>
  <div class="public-page">
    <section class="hero app-hero">
      <p v-if="isFavoritesView" class="eyebrow">Copenhagen Bachata App</p>
      <h1>{{ isFavoritesView ? 'My Events' : 'Find your next dance event.' }}</h1>
      <p>
        {{ isFavoritesView
          ? 'Your saved upcoming bachata events in Copenhagen.'
          : 'Discover bachata socials, classes and workshops across Copenhagen.'
        }}
      </p>
      <p v-if="!isFavoritesView" class="app-hero__attribution">Created by Dancemaniacs for the Copenhagen bachata community.</p>
    </section>

    <p v-if="flashMessage" class="flash-message">{{ flashMessage }}</p>

    <section v-if="showLoginBenefitsBanner" class="card login-benefits-banner" aria-labelledby="login-benefits-title">
      <div class="login-benefits-banner__content">
        <h2 id="login-benefits-title">✨ Unlock more features</h2>
        <ul class="login-benefits-banner__list">
          <li>❤️ Save favorite events</li>
          <li>📅 Export events to your calendar</li>
          <li>📝 Submit missing events</li>
        </ul>
      </div>
      <button class="login-benefits-banner__dismiss" type="button" aria-label="Dismiss login benefits" @click="dismissLoginBenefitsBanner">
        <X class="icon icon--sm" />
      </button>
      <div class="login-benefits-banner__actions">
        <RouterLink to="/login" class="button button--compact">Login / Register</RouterLink>
      </div>
    </section>

    <section v-if="isFavoritesView && savedUpcomingEvents.length > 0" class="card my-events-export">
      <div>
        <h2>Export My Events</h2>
        <p>Download your saved upcoming events as one calendar file.</p>
      </div>
      <button class="button secondary icon-text" type="button" @click="exportMyEvents">
        <CalendarPlus class="icon icon--sm" />
        Export My Events
      </button>
      <p v-if="calendarExportError" class="detail-action-error my-events-export__error">{{ calendarExportError }}</p>
    </section>

    <p v-else-if="isFavoritesView && calendarExportError" class="empty-state">{{ calendarExportError }}</p>

    <section ref="discoveryControls" class="discovery-controls" aria-label="Event discovery controls">
      <template v-if="viewMode === 'list' || isFavoritesView">
        <label class="category-filter">
          <span>Category</span>
          <select :value="category" @change="setCategoryFilter($event.target.value)">
            <option v-for="item in categories" :key="item" :value="item">
              {{ item === 'all' ? 'All categories' : getCategoryMeta(item).label }}
            </option>
          </select>
        </label>

        <label class="category-filter">
          <span>Organizer</span>
          <select :value="organizer" @change="setOrganizerFilter($event.target.value)">
            <option value="all">All organizers</option>
            <option v-for="item in organizers" :key="item" :value="item">
              {{ item }}
            </option>
          </select>
        </label>

        <div class="search-section">
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            placeholder="Search by title, organizer, or location..."
          />
        </div>

        <section class="filters" aria-label="Event filters">
          <button type="button" class="filter-button" :class="{ active: filter === 'all' }" :aria-pressed="filter === 'all'" @click="setQuickFilter('all')">All Events</button>
          <button type="button" class="filter-button" :class="{ active: filter === 'today' }" :aria-pressed="filter === 'today'" @click="setQuickFilter('today')">Today</button>
          <button type="button" class="filter-button" :class="{ active: filter === 'weekend' }" :aria-pressed="filter === 'weekend'" @click="setQuickFilter('weekend')">This Weekend</button>
          <button type="button" class="filter-button" :class="{ active: filter === 'free' }" :aria-pressed="filter === 'free'" @click="setQuickFilter('free')">Free</button>
        </section>
      </template>

      <section v-else class="calendar-filter-panel" aria-label="Calendar filters">
        <button
          class="calendar-filter-toggle"
          type="button"
          :aria-expanded="calendarFiltersOpen ? 'true' : 'false'"
          @click="toggleCalendarFilters"
        >
          <span>Filters</span>
          <span v-if="activeFilterCount > 0" class="calendar-filter-toggle__count">{{ activeFilterCount }}</span>
        </button>

        <div v-if="calendarFiltersOpen" class="calendar-filter-panel__content">
          <section class="filters" aria-label="Calendar quick filters">
            <button type="button" class="filter-button" :class="{ active: isCalendarFilterActive('all') }" :aria-pressed="isCalendarFilterActive('all') ? 'true' : 'false'" @click="setCalendarFilter('all')">All Events</button>
            <button type="button" class="filter-button" :class="{ active: isCalendarFilterActive('free') }" :aria-pressed="isCalendarFilterActive('free') ? 'true' : 'false'" @click="setCalendarFilter('free')">Free</button>
          </section>

          <label class="category-filter">
            <span>Category</span>
            <select :value="category" @change="setCategoryFilter($event.target.value)">
              <option v-for="item in categories" :key="item" :value="item">
                {{ item === 'all' ? 'All categories' : getCategoryMeta(item).label }}
              </option>
            </select>
          </label>

          <label class="category-filter">
            <span>Organizer</span>
            <select :value="organizer" @change="setOrganizerFilter($event.target.value)">
              <option value="all">All organizers</option>
              <option v-for="item in organizers" :key="item" :value="item">
                {{ item }}
              </option>
            </select>
          </label>

          <button class="button secondary button--compact" type="button" @click="clearFilters">Clear Filters</button>
        </div>
      </section>

      <div v-if="!isFavoritesView" class="view-toggle-row">
        <div class="view-toggle" aria-label="Event view">
          <button
            type="button"
            class="view-toggle__button"
            :class="{ active: viewMode === 'list' }"
            :aria-pressed="viewMode === 'list' ? 'true' : 'false'"
            @click="setViewMode('list')"
          >
            List
          </button>
          <button
            type="button"
            class="view-toggle__button"
            :class="{ active: viewMode === 'calendar' }"
            :aria-pressed="viewMode === 'calendar' ? 'true' : 'false'"
            @click="setViewMode('calendar')"
          >
            Calendar
          </button>
        </div>
      </div>
    </section>

    <p v-if="loading" class="empty-state">Loading events...</p>

    <p v-else-if="error" class="empty-state">Could not load events: {{ error }}</p>

    <p v-else-if="visibleEvents.length === 0 && (isFavoritesView || viewMode !== 'calendar')" class="empty-state">{{ isFavoritesView ? 'No saved upcoming events yet.' : 'No events match these filters yet.' }}</p>

    <EventCalendarView
      v-else-if="!isFavoritesView && viewMode === 'calendar'"
      :events="visibleEvents"
      :favorite-busy-id="favoriteBusyId"
      :calendar-view="calendarView"
      :week-events="visibleWeekEvents"
      :week-loading="weekLoading"
      :week-error="weekError"
      @update:calendar-view="setCalendarView"
      @week-change="loadWeekEvents"
      @toggle-favorite="toggleFavorite"
    />

    <EventListResultsView
      v-else
      :events="visibleEvents"
      :favorite-busy-id="favoriteBusyId"
      @toggle-favorite="toggleFavorite"
    />

    <button
      v-if="showListBackToTop"
      class="scroll-action-button scroll-action-button--floating"
      type="button"
      @click="scrollToDiscoveryControls"
    >
      ↑ Top
    </button>
  </div>
</template>
