function eventTimestamp(event) {
  return new Date(event.start_time).getTime()
}

export function groupManagementEvents(events) {
  const items = []
  const seriesItems = new Map()

  for (const event of events || []) {
    if (!event.series_id) {
      items.push({ type: 'event', key: `event-${event.id}`, event, sortTime: eventTimestamp(event) })
      continue
    }

    const key = String(event.series_id)
    let item = seriesItems.get(key)
    if (!item) {
      item = { type: 'series', key: `series-${key}`, seriesId: event.series_id, events: [], sortTime: eventTimestamp(event) }
      seriesItems.set(key, item)
      items.push(item)
    }
    item.events.push(event)
    item.sortTime = Math.min(item.sortTime, eventTimestamp(event))
  }

  for (const item of seriesItems.values()) {
    item.events.sort((first, second) => eventTimestamp(first) - eventTimestamp(second))
  }

  return items.sort((first, second) => first.sortTime - second.sortTime)
}

export function selectSeriesEventIds(selectedIds, seriesEvents) {
  const next = new Set(selectedIds)
  for (const event of seriesEvents || []) next.add(String(event.id))
  return next
}
