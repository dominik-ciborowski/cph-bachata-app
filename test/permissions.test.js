import { describe, expect, it } from 'vitest'
import { canManageEvent } from '../src/lib/permissions.js'

describe('canManageEvent', () => {
  it('allows admins to manage any event', () => {
    expect(canManageEvent({ created_by: 'organizer-1' }, { id: 'admin-1' }, 'admin')).toBe(true)
  })

  it('allows organizers to manage their own events only', () => {
    expect(canManageEvent({ created_by: 'organizer-1' }, { id: 'organizer-1' }, 'organizer')).toBe(true)
    expect(canManageEvent({ created_by: 'organizer-2' }, { id: 'organizer-1' }, 'organizer')).toBe(false)
  })

  it('does not allow normal or unauthorized users to manage events', () => {
    expect(canManageEvent({ created_by: 'organizer-1' }, { id: 'user-1' }, 'user')).toBe(false)
    expect(canManageEvent({ created_by: 'organizer-1' }, null, null)).toBe(false)
  })
})
