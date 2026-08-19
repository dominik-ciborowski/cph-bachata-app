import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { compileTemplate, parse } from '@vue/compiler-sfc'
import { createSSRApp } from 'vue'
import * as Vue from 'vue'
import { renderToString } from '@vue/server-renderer'

const viewSource = readFileSync(new URL('../src/views/EventListView.vue', import.meta.url), 'utf8')
const { descriptor } = parse(viewSource)
const { code, errors } = compileTemplate({
  source: descriptor.template.content,
  filename: 'EventListView.vue',
  id: 'homepage-category-rendering-test',
  compilerOptions: { mode: 'function' }
})

assert.deepEqual(errors, [])
const render = new Function('Vue', code)(Vue)
const noop = () => {}
const stubComponent = { template: '<i></i>' }

async function renderHomepage({
  returningUser,
  category = 'all',
  organizer = 'all',
  organizerExpanded = false,
  searchQuery = '',
  searchExpanded = false
}) {
  const state = {
    isFavoritesView: false,
    isReturningHomepage: returningUser,
    hasSeenHomepageIntroduction: returningUser,
    flashMessage: '',
    showLoginBenefitsBanner: false,
    savedUpcomingEvents: [],
    calendarExportError: '',
    viewMode: 'list',
    organizerExpanded,
    organizer,
    organizers: organizer === 'all' ? [] : [organizer],
    searchExpanded,
    searchQuery,
    homepageCategories: ['social', 'class', 'workshop', 'festival'],
    category,
    filter: 'all',
    loading: true,
    error: '',
    showListBackToTop: false,
    favoriteBusyId: null,
    calendarView: 'month',
    weekEvents: [],
    weekLoading: false,
    weekError: '',
    calendarFiltersOpen: false,
    activeFilterCount: 0,
    visibleEvents: [],
    visibleWeekEvents: [],
    getCategoryMeta: value => ({ label: `${value[0].toUpperCase()}${value.slice(1)}` }),
    setCategoryFilter: noop,
    toggleCategoryFilter: noop,
    setOrganizerFilter: noop,
    selectHomepageOrganizer: noop,
    toggleOrganizer: noop,
    clearOrCloseOrganizer: noop,
    toggleSearch: noop,
    clearOrCloseSearch: noop,
    setQuickFilter: noop,
    handleScroll: noop
  }

  const app = createSSRApp({ setup: () => state, render })
  for (const name of ['Users', 'Search', 'X', 'CalendarPlus', 'RouterLink', 'EventCalendarView', 'EventListResultsView']) {
    app.component(name, stubComponent)
  }

  return renderToString(app)
}

test('returning-user homepage renders the category dropdown without category chips', async () => {
  const html = await renderHomepage({ returningUser: true })

  assert.match(html, /class="category-filter homepage-category-select"/)
  assert.match(html, /<option value="all">All categories<\/option>/)
  assert.match(html, /<option value="social">Social<\/option>/)
  assert.match(html, /<option value="class">Class<\/option>/)
  assert.match(html, /<option value="workshop">Workshop<\/option>/)
  assert.match(html, /<option value="festival">Festival<\/option>/)
  assert.doesNotMatch(html, /class="category-chip-filter"/)
})

test('first-time homepage keeps the existing category chips', async () => {
  const html = await renderHomepage({ returningUser: false })

  assert.match(html, /class="category-chip-filter"/)
  assert.doesNotMatch(html, />All categories<\/option>/)
})

test('returning-user category dropdown reflects the active category state', async () => {
  const html = await renderHomepage({ returningUser: true, category: 'social' })

  assert.match(html, /<select value="social">/)
})

test('returning-user lookup buttons communicate active collapsed filters', async () => {
  const html = await renderHomepage({
    returningUser: true,
    organizer: 'Dancemaniacs',
    searchQuery: 'workshop'
  })

  assert.match(html, /Dancemaniacs<\/button>/)
  assert.match(html, /Search active<\/button>/)
  assert.doesNotMatch(html, /class="organizer-field"/)
  assert.doesNotMatch(html, /class="search-field"/)
})

test('returning-user expanded search keeps its trigger and active query visible', async () => {
  const html = await renderHomepage({
    returningUser: true,
    searchQuery: 'workshop',
    searchExpanded: true
  })

  assert.match(html, /aria-expanded="true"[^>]*>.*Search active<\/button>/)
  assert.match(html, /class="search-field"/)
  assert.match(html, /value="workshop"/)
})
