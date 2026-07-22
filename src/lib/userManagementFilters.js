export const userRoleFilters = ['all', 'user', 'organizer', 'admin']

export function getProfileRole(profile) {
  return profile?.role || 'user'
}

export function sortProfilesByEmail(profiles) {
  return [...profiles].sort((a, b) => String(a.email || '').localeCompare(String(b.email || ''), undefined, { sensitivity: 'base' }))
}

export function getUserRoleCounts(profiles) {
  return profiles.reduce((counts, profile) => {
    const role = getProfileRole(profile)
    counts.all += 1
    if (role === 'admin') counts.admin += 1
    else if (role === 'organizer') counts.organizer += 1
    else counts.user += 1
    return counts
  }, { all: 0, user: 0, organizer: 0, admin: 0 })
}

export function filterProfiles(profiles, searchQuery = '', roleFilter = 'all') {
  const term = searchQuery.trim().toLowerCase()

  return sortProfilesByEmail(profiles).filter((profile) => {
    const role = getProfileRole(profile)
    const matchesRole = roleFilter === 'all' || role === roleFilter
    const matchesSearch = !term || String(profile.email || '').toLowerCase().includes(term)
    return matchesRole && matchesSearch
  })
}
