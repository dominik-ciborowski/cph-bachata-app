import { describe, expect, it } from 'vitest'
import { filterEvents, getWeekendRange } from '../src/lib/eventFilters.js'

const referenceDate = new Date('2026-06-15T12:00:00.000Z')
const future = '2026-06-20T19:00:00.000Z'

function event(overrides) {
  return {
    id: overrides.id,
    title: overrides.title || `Event ${overrides.id}`,
    organizer_display: overrides.organizer_display || 'Dancemaniacs',
    location: overrides.location || 'Copenhagen',
    category: overrides.category || 'social',
    price_text: overrides.price_text,
    start_time: overrides.start_time || future,
    ...overrides
  }
}

describe('filterEvents', () => {
  it('shows free events when the Free filter is selected', () => {
    const result = filterEvents([
      event({ id: 'free-text', price_text: 'Free' }),
      event({ id: 'free-empty', price_text: '' }),
      event({ id: 'free-zero', price_text: '0 DKK' })
    ], { filter: 'free', referenceDate })

    expect(result.map(item => item.id)).toEqual(['free-text', 'free-empty', 'free-zero'])
  })

  it('does not show paid events when the Free filter is selected', () => {
    const result = filterEvents([
      event({ id: 'free', price_text: 'Gratis' }),
      event({ id: 'paid', price_text: '100 DKK' })
    ], { filter: 'free', referenceDate })

    expect(result.map(item => item.id)).toEqual(['free'])
  })

  it('filters by category and search query without changing sort order rules', () => {
    const result = filterEvents([
      event({ id: 'late', title: 'Bachata Social', category: 'social', start_time: '2026-06-22T20:00:00.000Z' }),
      event({ id: 'class', title: 'Technique Class', category: 'class', start_time: '2026-06-16T18:00:00.000Z' }),
      event({ id: 'early', title: 'Bachata Brunch', category: 'social', start_time: '2026-06-16T10:00:00.000Z' })
    ], { category: 'social', searchQuery: 'bachata', referenceDate })

    expect(result.map(item => item.id)).toEqual(['early', 'late'])
  })
})

describe('getWeekendRange', () => {
  it('returns the upcoming Friday-through-Monday range during the work week', () => {
    const range = getWeekendRange(new Date('2026-06-15T12:00:00.000Z'))

    expect(range.start.toISOString()).toBe('2026-06-19T00:00:00.000Z')
    expect(range.end.toISOString()).toBe('2026-06-22T00:00:00.000Z')
  })
})
