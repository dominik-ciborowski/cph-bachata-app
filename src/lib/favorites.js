import { supabase } from './supabase.js'

export async function loadFavoriteEventIds(userId) {
  if (!userId) return new Set()

  const { data, error } = await supabase
    .from('user_event_favorites')
    .select('event_id')
    .eq('user_id', userId)

  if (error) throw error

  return new Set((data || []).map((favorite) => String(favorite.event_id)))
}

export async function favoriteEvent(userId, eventId) {
  if (!userId) throw new Error('You must be logged in to save events.')

  const { error } = await supabase
    .from('user_event_favorites')
    .insert({ user_id: userId, event_id: eventId })

  if (error) throw error
}

export async function unfavoriteEvent(userId, eventId) {
  if (!userId) throw new Error('You must be logged in to remove saved events.')

  const { error } = await supabase
    .from('user_event_favorites')
    .delete()
    .eq('user_id', userId)
    .eq('event_id', eventId)

  if (error) throw error
}

export function applyFavoriteState(events, favoriteIds) {
  return events.map((event) => ({
    ...event,
    is_favorited: favoriteIds.has(String(event.id))
  }))
}
