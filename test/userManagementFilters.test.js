import assert from 'node:assert/strict'
import test from 'node:test'
import { filterProfiles, getUserRoleCounts, sortProfilesByEmail } from '../src/lib/userManagementFilters.js'

const profiles = [
  { id: '3', email: 'zoe@example.com', role: 'organizer' },
  { id: '1', email: 'admin@example.com', role: 'admin' },
  { id: '2', email: 'anna@example.com', role: 'user' },
  { id: '4', email: 'no-role@example.com', role: null }
]

test('sorts profiles alphabetically by email', () => {
  assert.deepEqual(sortProfilesByEmail(profiles).map((profile) => profile.email), [
    'admin@example.com',
    'anna@example.com',
    'no-role@example.com',
    'zoe@example.com'
  ])
})

test('counts profiles by role with missing roles treated as users', () => {
  assert.deepEqual(getUserRoleCounts(profiles), { all: 4, user: 2, organizer: 1, admin: 1 })
})

test('filters profiles by email and role', () => {
  assert.deepEqual(filterProfiles(profiles, 'example', 'organizer').map((profile) => profile.email), ['zoe@example.com'])
  assert.deepEqual(filterProfiles(profiles, 'anna', 'all').map((profile) => profile.email), ['anna@example.com'])
  assert.deepEqual(filterProfiles(profiles, 'missing', 'all'), [])
})
