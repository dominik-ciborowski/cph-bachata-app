export const SERIES_GENERATION_TYPES = {
  WEEKLY: 'WEEKLY',
  MULTIPLE_DATES: 'MULTIPLE_DATES'
}

export function buildEventSeriesPayload(form, organizerId, userId) {
  return {
    organizer_id: organizerId,
    title: form.title,
    generation_type: form.generation_type,
    recurrence_start_date: form.recurrence_start_date || null,
    recurrence_end_date: form.recurrence_end_date || null,
    weekdays: form.weekdays?.length ? form.weekdays : null,
    event_duration_days: Math.max(1, Number(form.event_duration_days) || 1),
    created_by: userId
  }
}
