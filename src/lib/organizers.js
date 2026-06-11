import { supabase } from './supabase.js'
import { findOrganizerByName, normalizeOrganizerName, sortOrganizersByName } from './organizerDisplay.js'

export {
  ADD_NEW_ORGANIZER_VALUE,
  findOrganizerByName,
  formatOrganizerDisplay,
  getOrganizerDisplayName,
  getOrganizerRecord,
  normalizeOrganizerName,
  sortOrganizersByName
} from './organizerDisplay.js'

export async function fetchOrganizers() {
  const { data, error } = await supabase
    .from('organizers')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw error
  return sortOrganizersByName(data || [])
}

export async function findOrganizerByNameInDatabase(name) {
  const normalizedName = normalizeOrganizerName(name)
  if (!normalizedName) return null

  const { data, error } = await supabase
    .from('organizers')
    .select('*')
    .ilike('name', normalizedName)
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data || null
}

export async function resolveOrganizerForEvent(form, userId, organizers = []) {
  const newOrganizerName = normalizeOrganizerName(form.newOrganizerName)

  if (newOrganizerName) {
    const localMatch = findOrganizerByName(organizers, newOrganizerName)
    if (localMatch) {
      return localMatch
    }

    const databaseMatch = await findOrganizerByNameInDatabase(newOrganizerName)
    if (databaseMatch) {
      return databaseMatch
    }

    const { data, error } = await supabase
      .from('organizers')
      .insert({
        name: newOrganizerName,
        verified: false,
        created_by: userId
      })
      .select('*')
      .single()

    if (error) throw error
    return data
  }

  if (form.organizer_id) {
    return (organizers || []).find((organizer) => String(organizer.id) === String(form.organizer_id)) || {
      id: form.organizer_id,
      name: form.organizer || ''
    }
  }

  return null
}
