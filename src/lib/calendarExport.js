const CALENDAR_TIME_ZONE = 'Europe/Copenhagen'
const PRODUCT_ID = '-//Copenhagen Bachata//Event Calendar Export//EN'

function compact(value) {
  return String(value || '').trim()
}

export function escapeIcsText(value) {
  return compact(value)
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

function foldIcsLine(line) {
  const maxLength = 75
  let remaining = line
  const lines = []

  while (remaining.length > maxLength) {
    lines.push(remaining.slice(0, maxLength))
    remaining = ` ${remaining.slice(maxLength)}`
  }

  lines.push(remaining)
  return lines.join('\r\n')
}

function formatUtcDateTime(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function getTimeZoneParts(date, timeZone = CALENDAR_TIME_ZONE) {
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

  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]))
}

function formatCopenhagenDateTime(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    throw new Error('Event date is invalid.')
  }

  const parts = getTimeZoneParts(date)
  return `${parts.year}${parts.month}${parts.day}T${parts.hour}${parts.minute}${parts.second}`
}

function getSafeFileName(title) {
  const slug = compact(title)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

  return `copenhagen-bachata-event-${slug || 'event'}.ics`
}

function getEventUid(event) {
  const id = compact(event?.id) || `${compact(event?.title)}-${compact(event?.start_time)}`
  const fallbackId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())
  return `${id.replace(/[^a-zA-Z0-9-]/g, '-') || fallbackId}@copenhagen-bachata.app`
}

function getDescription(event) {
  const parts = []
  const description = compact(event?.description)
  const organizer = compact(event?.organizer_display || event?.organizer_name || event?.organizer)
  const link = compact(event?.event_link)

  if (description) parts.push(description)
  if (organizer) parts.push(`Organizer: ${organizer}`)
  if (link) parts.push(`Event link: ${link}`)

  return parts.join('\n\n') || 'Copenhagen Bachata event.'
}

function getEventIcsLines(event, timestamp) {
  if (!event) throw new Error('Event is missing.')

  const title = compact(event.title) || 'Copenhagen Bachata event'
  const startTime = event.start_time
  const endTime = event.end_time || event.start_time

  if (!startTime) throw new Error('Event start time is missing.')

  const lines = [
    'BEGIN:VEVENT',
    `UID:${escapeIcsText(getEventUid(event))}`,
    `DTSTAMP:${timestamp}`,
    `DTSTART;TZID=${CALENDAR_TIME_ZONE}:${formatCopenhagenDateTime(startTime)}`,
    `DTEND;TZID=${CALENDAR_TIME_ZONE}:${formatCopenhagenDateTime(endTime)}`,
    `SUMMARY:${escapeIcsText(title)}`,
    `DESCRIPTION:${escapeIcsText(getDescription(event))}`,
    `LOCATION:${escapeIcsText(event.location || '')}`
  ]

  if (compact(event.event_link)) {
    lines.push(`URL:${escapeIcsText(event.event_link)}`)
  }

  lines.push('END:VEVENT')
  return lines
}

function getCalendarHeaderLines() {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODUCT_ID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-TIMEZONE:${CALENDAR_TIME_ZONE}`,
    'BEGIN:VTIMEZONE',
    `TZID:${CALENDAR_TIME_ZONE}`,
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0200',
    'TZNAME:CEST',
    'DTSTART:19700329T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0200',
    'TZOFFSETTO:+0100',
    'TZNAME:CET',
    'DTSTART:19701025T030000',
    'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
    'END:STANDARD',
    'END:VTIMEZONE'
  ]
}

export function generateIcsCalendar(events) {
  const eventList = Array.isArray(events) ? events.filter(Boolean) : []

  if (eventList.length === 0) {
    throw new Error('No events to export.')
  }

  const timestamp = formatUtcDateTime(new Date())
  const sortedEvents = [...eventList].sort((first, second) => new Date(first.start_time) - new Date(second.start_time))
  const lines = getCalendarHeaderLines()

  sortedEvents.forEach((event) => {
    lines.push(...getEventIcsLines(event, timestamp))
  })

  lines.push('END:VCALENDAR')

  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`
}

export function buildEventIcs(event) {
  return generateIcsCalendar([event])
}

export function downloadIcsCalendar(events, fileName = 'copenhagen-bachata-events.ics') {
  const icsContent = generateIcsCalendar(events)
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function downloadEventIcs(event) {
  downloadIcsCalendar([event], getSafeFileName(event?.title))
}
