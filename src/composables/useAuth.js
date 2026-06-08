import { computed, ref } from 'vue'
import { supabase } from '../lib/supabase'

const user = ref(null)
const profile = ref(null)
const loading = ref(true)
const profileLoading = ref(false)
let authListenerInitialized = false
let authStatePromise = null
let profileRequestId = 0

export async function loadCurrentUserProfile(currentUser = user.value) {
  const requestId = ++profileRequestId

  if (!currentUser) {
    profile.value = null
    profileLoading.value = false
    return null
  }

  profileLoading.value = true

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', currentUser.id)
    .maybeSingle()

  if (requestId !== profileRequestId) {
    return profile.value
  }

  profileLoading.value = false

  if (error) {
    profile.value = null
    return null
  }

  profile.value = data
  return data
}

export async function initializeAuth() {
  if (authStatePromise) return authStatePromise

  authStatePromise = (async () => {
    loading.value = true
    const { data } = await supabase.auth.getUser()
    user.value = data.user
    await loadCurrentUserProfile(data.user)
    loading.value = false

    return {
      user: user.value,
      profile: profile.value
    }
  })()

  return authStatePromise
}

export async function getAuthState() {
  await initializeAuth()

  return {
    user: user.value,
    profile: profile.value,
    role: profile.value?.role || null
  }
}

export function setupAuthListener() {
  if (authListenerInitialized) return

  supabase.auth.onAuthStateChange((event, session) => {
    user.value = session?.user || null
    authStatePromise = null

    if (!session?.user) {
      profileRequestId += 1
      profile.value = null
      profileLoading.value = false
      loading.value = false
      return
    }

    loading.value = true
    loadCurrentUserProfile(session.user).finally(() => {
      loading.value = false
    })
  })

  authListenerInitialized = true
}

initializeAuth()
setupAuthListener()

export function useAuth() {
  const isAuthenticated = computed(() => !!user.value)
  const role = computed(() => profile.value?.role || null)
  const isAdmin = computed(() => role.value === 'admin')
  const isOrganizer = computed(() => role.value === 'organizer')
  const canManageEvents = computed(() => isOrganizer.value || isAdmin.value)

  async function logout() {
    await supabase.auth.signOut()
    user.value = null
    profile.value = null
  }

  return {
    user,
    profile,
    role,
    isAdmin,
    isOrganizer,
    canManageEvents,
    isAuthenticated,
    loading,
    profileLoading,
    loadCurrentUserProfile,
    logout
  }
}
