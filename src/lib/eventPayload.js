function toDateTime(date, time) {
  return new Date(`${date}T${time}:00`).toISOString()
}

export function buildEventPayload(form) {
  return {
    title: form.title,
    organizer: form.organizer || null,
    category: form.category,
    location: form.location || null,
    description: form.description || null,
    price_text: form.price_text || null,
    event_link: form.event_link || null,
    start_time: toDateTime(form.date, form.start_time),
    end_time: form.end_time ? toDateTime(form.date, form.end_time) : null,
    approved: true
  }
}

export function buildNewEventPayload(form, userId) {
  return {
    ...buildEventPayload(form),
    created_by: userId
  }
}

export function buildBulkEventPayloads(form, dates, userId) {
  return dates.map((date) => buildNewEventPayload({ ...form, date }, userId))
}
