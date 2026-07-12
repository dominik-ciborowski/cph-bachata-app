import { canManageEvent } from './permissions.js'
import { serializePrice } from './pricing.js'

function toDatePart(value) {
  const date = new Date(value)
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return offsetDate.toISOString().slice(0, 10)
}

function toDateTimeForEventDate(event, time) {
  return new Date(`${toDatePart(event.start_time)}T${time}:00`).toISOString()
}

export function getVisibleEventIds(events) {
  return events.map((event) => String(event.id))
}

export function toggleSelectedEventId(selectedIds, eventId, checked) {
  const nextIds = new Set([...selectedIds].map(String))
  const id = String(eventId)

  if (checked) nextIds.add(id)
  else nextIds.delete(id)

  return nextIds
}

export function selectAllVisibleEventIds(selectedIds, visibleEvents) {
  const nextIds = new Set([...selectedIds].map(String))
  getVisibleEventIds(visibleEvents).forEach((id) => nextIds.add(id))
  return nextIds
}

export function buildBulkEventUpdatePayload(event, changes) {
  const payload = {}

  if (changes.changeStartTime) payload.start_time = toDateTimeForEventDate(event, changes.start_time)
  if (changes.changeEndTime) payload.end_time = changes.end_time ? toDateTimeForEventDate(event, changes.end_time) : null
  if (changes.changeLocation) payload.location = changes.location || null
  if (changes.changeOrganizer) {
    payload.organizer_id = changes.organizer_id || null
    payload.organizer = changes.organizer || null
  }
  if (changes.changeCategory) payload.category = changes.category
  if (changes.changeRecurring) payload.is_recurring = changes.is_recurring === 'weekly'
  if (changes.changePricing) payload.price_text = serializePrice(changes.price)

  return payload
}

export function getBulkChangeSummary(changes) {
  const summary = []
  if (changes.changeStartTime) summary.push(`Start time → ${changes.start_time}`)
  if (changes.changeEndTime) summary.push(`End time → ${changes.end_time || 'No end time'}`)
  if (changes.changeLocation) summary.push(`Location → ${changes.location || 'Not listed'}`)
  if (changes.changeOrganizer) summary.push(`Organizer → ${changes.organizer || 'No organizer selected'}`)
  if (changes.changeCategory) summary.push(`Category → ${changes.category}`)
  if (changes.changeRecurring) summary.push(`Weekly status → ${changes.is_recurring === 'weekly' ? 'Weekly' : 'Not weekly'}`)
  if (changes.changePricing) summary.push('Pricing → Replace full pricing configuration')
  return summary
}

export function filterManageableEvents(events, currentUser, role) {
  return events.filter((event) => canManageEvent(event, currentUser, role))
}

export async function applyBulkEventUpdates(events, changes, updateEvent) {
  const results = []

  for (const event of events) {
    const payload = buildBulkEventUpdatePayload(event, changes)

    try {
      const result = await updateEvent(event, payload)
      if (result?.error) {
        results.push({ event, ok: false, error: result.error })
      } else {
        results.push({ event, ok: true })
      }
    } catch (error) {
      results.push({ event, ok: false, error })
    }
  }

  return {
    succeeded: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    results
  }
}

export async function applyBulkStatusUpdates(events, payload, updateEvent) {
  const results = []

  for (const event of events) {
    try {
      const result = await updateEvent(event, payload)
      if (result?.error) {
        results.push({ event, ok: false, error: result.error })
      } else {
        results.push({ event, ok: true })
      }
    } catch (error) {
      results.push({ event, ok: false, error })
    }
  }

  return {
    succeeded: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    results
  }
}
