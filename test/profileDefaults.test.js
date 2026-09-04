import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { findDefaultOrganizer, normalizeDefaultOrganizer, saveDefaultOrganizer } from '../src/lib/profile.js'

test('normalizes, reads and matches an organizer profile default against existing organizers', () => {
  const organizers = [{ id: 'house', name: 'Bachata House' }, { id: 'club', name: 'Dance Club' }]

  assert.equal(normalizeDefaultOrganizer('  Bachata House  '), 'Bachata House')
  assert.equal(normalizeDefaultOrganizer('  '), null)
  assert.deepEqual(findDefaultOrganizer(organizers, { default_organizer: 'bachata house' }, 'organizer'), organizers[0])
  assert.equal(findDefaultOrganizer(organizers, { default_organizer: 'Bachata House' }, 'admin'), null)
})

test('saves the nullable default organizer to the current profile', async () => {
  let updatePayload
  let matchedId
  const profile = { id: 'user-1', role: 'organizer', default_organizer: 'Bachata House' }
  const client = {
    from(table) {
      assert.equal(table, 'profiles')
      return {
        update(payload) {
          updatePayload = payload
          return {
            eq(column, value) {
              assert.equal(column, 'id')
              matchedId = value
              return { select: () => ({ single: async () => ({ data: profile, error: null }) }) }
            }
          }
        }
      }
    }
  }

  assert.deepEqual(await saveDefaultOrganizer('user-1', ' Bachata House ', client), profile)
  assert.deepEqual(updatePayload, { default_organizer: 'Bachata House' })
  assert.equal(matchedId, 'user-1')
})

test('organizer management saves defaults while account settings do not expose them', async () => {
  const organizerManagementSource = await readFile(new URL('../src/views/OrganizerManagementView.vue', import.meta.url), 'utf8')
  const accountSource = await readFile(new URL('../src/views/AccountView.vue', import.meta.url), 'utf8')

  assert.match(organizerManagementSource, /select\('id,email,role,default_organizer'\)/)
  assert.match(organizerManagementSource, /@change="updateDefaultOrganizer\(profile, \$event\.target\.value\)"/)
  assert.match(organizerManagementSource, /v-for="organizer in organizerOptions"/)
  assert.doesNotMatch(accountSource, /defaultOrganizer|Default organizer|Event defaults/)
})

test('add event and ICS import continue to use the organizer profile default', async () => {
  const addEventSource = await readFile(new URL('../src/views/AdminView.vue', import.meta.url), 'utf8')
  const importSource = await readFile(new URL('../src/views/IcsImportView.vue', import.meta.url), 'utf8')

  assert.match(addEventSource, /findDefaultOrganizer\(organizers\.value, profile\.value, role\.value\)/)
  assert.match(importSource, /findDefaultOrganizer\(importableOrganizers\.value, profile\.value, role\.value\)/)
  assert.match(importSource, /applyOrganizerToImportedEvents\(previewEvents\.value, defaultOrganizer\)/)
})
