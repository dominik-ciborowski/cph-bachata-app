export function normalizeDefaultOrganizer(value) {
  const normalized = String(value || '').trim()
  return normalized || null
}

export async function saveDefaultOrganizer(userId, defaultOrganizer, client) {
  const { data, error } = await client
    .from('profiles')
    .update({ default_organizer: normalizeDefaultOrganizer(defaultOrganizer) })
    .eq('id', userId)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export function findDefaultOrganizer(organizers, profile, role) {
  if (role !== 'organizer' || !profile?.default_organizer) return null
  const wanted = normalizeDefaultOrganizer(profile.default_organizer)?.toLocaleLowerCase()
  return (organizers || []).find((organizer) => organizer.name?.trim().toLocaleLowerCase() === wanted) || null
}
