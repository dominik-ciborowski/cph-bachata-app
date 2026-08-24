import { createDefaultPrice, PRICE_TYPES } from './pricing.js'

const copenhagenTimeZone = 'Europe/Copenhagen'
const supportedCategories = ['social', 'class', 'festival', 'workshop']

function unescapeIcsText(value = '') {
  return value
    .replace(/\\[nN]/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
}

function readContentLine(line) {
  const separatorIndex = line.indexOf(':')
  if (separatorIndex < 0) return null

  const descriptor = line.slice(0, separatorIndex).split(';')
  const name = descriptor.shift().toUpperCase()
  const parameters = Object.fromEntries(descriptor.map((parameter) => {
    const [key, ...valueParts] = parameter.split('=')
    return [key.toUpperCase(), valueParts.join('=').replace(/^"|"$/g, '')]
  }))

  return { name, parameters, value: line.slice(separatorIndex + 1) }
}

function getZonedParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date)

  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]))
}

function zonedDateToUtc(parts, timeZone) {
  let timestamp = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const actual = getZonedParts(new Date(timestamp), timeZone)
    const actualTimestamp = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second)
    const wantedTimestamp = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
    timestamp += wantedTimestamp - actualTimestamp
  }

  return new Date(timestamp)
}

function toFormDateTime(date) {
  const parts = getZonedParts(date, copenhagenTimeZone)
  return {
    date: `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`,
    time: `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`
  }
}

export function parseIcsDateTime(value, parameters = {}) {
  const rawValue = String(value || '').trim()
  const dateMatch = rawValue.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (dateMatch) {
    return { date: `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`, time: '00:00', allDay: true }
  }

  const dateTimeMatch = rawValue.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/)
  if (!dateTimeMatch) throw new Error(`Unsupported ICS date/time: ${rawValue || 'empty value'}`)

  const parts = {
    year: Number(dateTimeMatch[1]),
    month: Number(dateTimeMatch[2]),
    day: Number(dateTimeMatch[3]),
    hour: Number(dateTimeMatch[4]),
    minute: Number(dateTimeMatch[5]),
    second: Number(dateTimeMatch[6] || 0)
  }
  const timeZone = dateTimeMatch[7] ? 'UTC' : (parameters.TZID || copenhagenTimeZone)

  try {
    return { ...toFormDateTime(zonedDateToUtc(parts, timeZone)), allDay: false }
  } catch {
    throw new Error(`Unsupported ICS timezone: ${timeZone}`)
  }
}

export function copenhagenDateTimeToIso(date, time) {
  const match = `${date || ''}T${time || ''}`.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/)
  if (!match) throw new Error('A valid date and time are required.')

  return zonedDateToUtc({
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: 0
  }, copenhagenTimeZone).toISOString()
}

function buildPreviewEvent(properties, index) {
  const startProperty = properties.DTSTART?.[0]
  const endProperty = properties.DTEND?.[0]
  const start = startProperty ? parseIcsDateTime(startProperty.value, startProperty.parameters) : null
  const end = endProperty ? parseIcsDateTime(endProperty.value, endProperty.parameters) : null

  return {
    importId: `ics-event-${index + 1}`,
    title: unescapeIcsText(properties.SUMMARY?.[0]?.value || ''),
    date: start?.date || '',
    start_time: start?.time || '',
    end_date: end?.date || start?.date || '',
    end_time: end?.time || '',
    location: unescapeIcsText(properties.LOCATION?.[0]?.value || ''),
    description: unescapeIcsText(properties.DESCRIPTION?.[0]?.value || ''),
    event_link: unescapeIcsText(properties.URL?.[0]?.value || ''),
    organizer_id: '',
    organizer: '',
    category: '',
    price: { ...createDefaultPrice(), type: '' },
    is_recurring: false,
    allDay: Boolean(start?.allDay)
  }
}

export function parseIcsEvents(source) {
  if (typeof source !== 'string' || !source.trim()) throw new Error('The ICS file is empty.')

  const lines = source.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n[ \t]/g, '').split('\n')
  const events = []
  let currentProperties = null

  for (const line of lines) {
    if (line.trim().toUpperCase() === 'BEGIN:VEVENT') {
      currentProperties = {}
      continue
    }
    if (line.trim().toUpperCase() === 'END:VEVENT') {
      if (currentProperties) events.push(buildPreviewEvent(currentProperties, events.length))
      currentProperties = null
      continue
    }
    if (!currentProperties) continue

    const property = readContentLine(line)
    if (!property) continue
    currentProperties[property.name] ||= []
    currentProperties[property.name].push(property)
  }

  if (currentProperties) throw new Error('The ICS file contains an incomplete event.')
  if (events.length === 0) throw new Error('No events were found in the ICS file.')
  return events
}

export function getIcsImportErrors(event) {
  const errors = []
  if (!event.title?.trim()) errors.push('Title is required.')
  if (!event.date) errors.push('Date is required.')
  if (!event.start_time) errors.push('Start time is required.')
  if (!event.organizer_id) errors.push('Organizer must be selected.')
  if (!supportedCategories.includes(event.category)) errors.push('Category must be selected.')
  if (!Object.values(PRICE_TYPES).includes(event.price?.type)) errors.push('Price must be confirmed.')
  if (event.price?.type === PRICE_TYPES.FIXED && !String(event.price.amount || '').trim()) errors.push('Price amount is required.')
  if (event.price?.type === PRICE_TYPES.MULTIPLE && !(event.price.options || []).some((option) => option.label?.trim() && String(option.amount || '').trim())) {
    errors.push('At least one complete price option is required.')
  }
  if (event.event_link && !/^https?:\/\//i.test(event.event_link)) errors.push('Event link must be a valid http(s) URL.')
  return errors
}

export function getImportableOrganizers(organizers, currentUser, role, manageableEvents = []) {
  if (!currentUser || !['admin', 'organizer'].includes(role)) return []
  if (role === 'admin') return organizers

  const permittedIds = new Set(
    manageableEvents
      .filter((event) => event.created_by === currentUser.id)
      .map((event) => String(event.organizer_id || ''))
      .filter(Boolean)
  )

  return organizers.filter((organizer) => (
    organizer.created_by === currentUser.id || permittedIds.has(String(organizer.id))
  ))
}

export function isPossibleIcsDuplicate(importedEvent, existingEvents) {
  if (!importedEvent.title || !importedEvent.date || !importedEvent.start_time || !importedEvent.organizer_id) return false

  return existingEvents.some((event) => {
    const existingStart = getZonedParts(new Date(event.start_time), copenhagenTimeZone)
    const existingDate = `${existingStart.year}-${String(existingStart.month).padStart(2, '0')}-${String(existingStart.day).padStart(2, '0')}`
    const existingTime = `${String(existingStart.hour).padStart(2, '0')}:${String(existingStart.minute).padStart(2, '0')}`

    return event.title?.trim().toLowerCase() === importedEvent.title.trim().toLowerCase() &&
      String(event.organizer_id || '') === String(importedEvent.organizer_id) &&
      existingDate === importedEvent.date &&
      existingTime === importedEvent.start_time
  })
}
