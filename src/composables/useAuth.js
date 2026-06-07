import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

const user = ref(null)
const loading = ref(true)
let authListenerInitialized = false

// Initialize auth state on app startup
async function initializeAuth() {
  const { data } = await supabase.auth.getUser()
  user.value = data.user
  loading.value = false
}

// Set up auth state listener
export function setupAuthListener() {
  if (authListenerInitialized) return

  supabase.auth.onAuthStateChange((event, session) => {
    user.value = session?.user || null
    loading.value = false
  })

  authListenerInitialized = true
}

// Initialize immediately
initializeAuth()
setupAuthListener()

export function useAuth() {
  const isAuthenticated = computed(() => !!user.value)

  async function logout() {
    await supabase.auth.signOut()
    user.value = null
  }

  return {
    user,
    isAuthenticated,
    loading,
    logout
  }
}
