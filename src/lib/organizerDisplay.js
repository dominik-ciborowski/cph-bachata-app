export const ADD_NEW_ORGANIZER_VALUE = '__add_new_organizer__'

export function normalizeOrganizerName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ')
}

export function getOrganizerRecord(event) {
  return event?.organizer_record || event?.organizers || null
}

export function getOrganizerDisplayName(event) {
  const organizerRecord = getOrganizerRecord(event)
  return organizerRecord?.name || event?.organizer || ''
}

export function formatOrganizerDisplay(event) {
  const name = getOrganizerDisplayName(event)
  const organizerRecord = getOrganizerRecord(event)

  if (!name) return ''
  if (organizerRecord && organizerRecord.verified === false) {
    return `${name} (Unverified)`
  }

  return name
}

export function sortOrganizersByName(organizers) {
  return [...(organizers || [])].sort((first, second) =>
    String(first.name || '').localeCompare(String(second.name || ''), undefined, { sensitivity: 'base' })
  )
}

export function findOrganizerByName(organizers, name) {
  const normalizedName = normalizeOrganizerName(name).toLowerCase()
  if (!normalizedName) return null

  return (organizers || []).find(
    (organizer) => normalizeOrganizerName(organizer.name).toLowerCase() === normalizedName
  ) || null
}
