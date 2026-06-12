export function canManageEvent(event, currentUser, role) {
  if (!event || !currentUser || !role) return false
  if (role === 'admin') return true
  if (role === 'organizer') return event.created_by === currentUser.id

  return false
}
