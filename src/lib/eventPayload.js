import { serializePrice } from './pricing.js'
function toDateTime(date, time) {
  return new Date(`${date}T${time}:00`).toISOString()
}

export function buildEventPayload(form) {
  return {
    title: form.title,
    organizer_id: form.organizer_id || null,
    organizer: form.organizer || form.newOrganizerName || null,
    category: form.category,
    location: form.location || null,
    description: form.description || null,
    price_text: serializePrice(form.price),
    is_recurring: Boolean(form.is_recurring),
    event_link: form.event_link || null,
    start_time: toDateTime(form.date, form.start_time),
    end_time: form.end_time ? toDateTime(form.date, form.end_time) : null,
    status: form.status || 'approved'
  }
}

export function buildNewEventPayload(form, userId) {
  return {
    ...buildEventPayload(form),
    status: form.status || 'approved',
    created_by: userId
  }
}

export function buildSubmittedEventPayload(form, userId) {
  return {
    ...buildEventPayload({ ...form, status: 'pending' }),
    created_by: userId,
    submitted_by: userId,
    submitted_at: new Date().toISOString()
  }
}

export function buildBulkEventPayloads(form, dates, userId) {
  return dates.map((date) => buildNewEventPayload({ ...form, date }, userId))
}
