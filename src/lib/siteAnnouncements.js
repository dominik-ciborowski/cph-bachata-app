import { supabase } from './supabase.js'
import { isAnnouncementCurrentlyActive, normalizeAnnouncement } from './siteAnnouncementUtils.js'

export {
  announcementDismissStorageKey,
  announcementTypes,
  dismissAnnouncementId,
  isAnnouncementCurrentlyActive,
  normalizeAnnouncement,
  readDismissedAnnouncementIds
} from './siteAnnouncementUtils.js'

export async function fetchActiveAnnouncements(now = new Date()) {
  const nowIso = now.toISOString()
  const { data, error } = await supabase
    .from('site_announcements')
    .select('id,title,message,type,is_active,starts_at,ends_at,created_at')
    .eq('is_active', true)
    .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
    .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) throw error

  return (data || [])
    .map(normalizeAnnouncement)
    .filter((announcement) => isAnnouncementCurrentlyActive(announcement, now))
}
