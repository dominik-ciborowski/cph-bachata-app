import assert from 'node:assert/strict'
import test from 'node:test'
import {
  announcementDismissStorageKey,
  dismissAnnouncementId,
  isAnnouncementCurrentlyActive,
  normalizeAnnouncement,
  readDismissedAnnouncementIds
} from '../src/lib/siteAnnouncementUtils.js'

function createMemoryStorage(initialValue = null) {
  const values = new Map()
  if (initialValue !== null) values.set(announcementDismissStorageKey, initialValue)

  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null
    },
    setItem(key, value) {
      values.set(key, value)
    }
  }
}

test('normalizes unsupported announcement types to info', () => {
  const announcement = normalizeAnnouncement({ id: '1', message: 'Hello', type: 'urgent' })

  assert.equal(announcement.type, 'info')
  assert.equal(announcement.title, '')
  assert.equal(announcement.message, 'Hello')
})

test('checks announcement schedule windows', () => {
  const now = new Date('2026-07-09T12:00:00.000Z')

  assert.equal(isAnnouncementCurrentlyActive({ is_active: true }, now), true)
  assert.equal(isAnnouncementCurrentlyActive({ is_active: false }, now), false)
  assert.equal(isAnnouncementCurrentlyActive({ is_active: true, starts_at: '2026-07-09T13:00:00.000Z' }, now), false)
  assert.equal(isAnnouncementCurrentlyActive({ is_active: true, ends_at: '2026-07-09T11:00:00.000Z' }, now), false)
  assert.equal(isAnnouncementCurrentlyActive({
    is_active: true,
    starts_at: '2026-07-09T11:00:00.000Z',
    ends_at: '2026-07-09T13:00:00.000Z'
  }, now), true)
})

test('stores dismissed announcement ids per announcement', () => {
  const storage = createMemoryStorage()

  dismissAnnouncementId('announcement-1', storage)
  dismissAnnouncementId('announcement-2', storage)

  assert.deepEqual([...readDismissedAnnouncementIds(storage)].sort(), ['announcement-1', 'announcement-2'])
})

test('ignores malformed dismissed announcement storage', () => {
  const storage = createMemoryStorage('{bad json')

  assert.deepEqual([...readDismissedAnnouncementIds(storage)], [])
})
