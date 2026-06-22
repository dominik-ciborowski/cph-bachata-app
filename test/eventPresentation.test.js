import { describe, expect, it } from 'vitest'
import { canManageEvent } from '../src/lib/permissions.js'
import { formatPriceDisplay, getCategoryMeta, isFreePrice } from '../src/lib/eventPresentation.js'

describe('event presentation helpers', () => {
  it('detects free prices used by the free event filter', () => {
    for (const priceText of [null, '', ' ', '0', '0.0', '0,0', '0 DKK', '0 kr', 'free', 'gratis']) {
      expect(isFreePrice(priceText)).toBe(true)
    }

    for (const priceText of ['50', '50 DKK', '100 kr', '0-50 DKK', 'donation']) {
      expect(isFreePrice(priceText)).toBe(false)
    }
  })

  it('formats empty and numeric prices consistently for event cards', () => {
    expect(formatPriceDisplay('')).toBe('FREE')
    expect(formatPriceDisplay('0 kr')).toBe('FREE')
    expect(formatPriceDisplay('75')).toBe('75 DKK')
    expect(formatPriceDisplay('Pay at door')).toBe('Pay at door')
  })

  it('normalizes known category labels and falls back for unknown categories', () => {
    expect(getCategoryMeta(' Workshop ').label).toBe('Workshop')
    expect(getCategoryMeta('special social').label).toBe('special social')
  })
})

describe('event management permissions', () => {
  const event = { created_by: 'organizer-1' }

  it('allows admins and owning organizers to manage events', () => {
    expect(canManageEvent(event, { id: 'admin-1' }, 'admin')).toBe(true)
    expect(canManageEvent(event, { id: 'organizer-1' }, 'organizer')).toBe(true)
  })

  it('denies other users and incomplete auth state', () => {
    expect(canManageEvent(event, { id: 'organizer-2' }, 'organizer')).toBe(false)
    expect(canManageEvent(event, { id: 'user-1' }, 'user')).toBe(false)
    expect(canManageEvent(event, null, 'admin')).toBe(false)
  })
})
