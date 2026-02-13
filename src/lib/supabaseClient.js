import { createClient } from '@supabase/supabase-js'

// Supabase client configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
  )
}

// 1. Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  db: {
    schema: 'public',
  },
})

// Simple in-memory cache to speed up repeated profile checks
let cachedProfile = null
let cachedUser = null

/**
 * Helper to get current user with tenant info
 * Uses caching to avoid redundant network requests during the same session
 * Includes a timeout guard with a retry and a cached fallback to avoid UI hangs.
 */
export async function getCurrentUser(forceRefresh = false) {
  const fetchWithTimeout = async (attempt = 1) => {
    try {
      console.log('getCurrentUser: Checking session...')
      // If not forcing refresh and we have a cached version, return it
      if (!forceRefresh && cachedUser && cachedProfile) {
        console.log('getCurrentUser: Returning cached data')
        return { user: cachedUser, profile: cachedProfile, error: null }
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        console.log('getCurrentUser: No user found')
        cachedUser = null
        cachedProfile = null
        return { user: null, profile: null, error: userError }
      }

      cachedUser = user
      console.log('getCurrentUser: User found, fetching profile...')

      // Fetch profile from database
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*, tenants(*)')
        .eq('id', user.id)
        .single()

      if (profileError && profileError.code === 'PGRST116') {
        console.log('getCurrentUser: Profile record missing, using metadata fallback')
        const basicProfile = {
          id: user.id,
          email: user.email,
          role: user.user_metadata?.role || 'tenant_admin',
          tenant_id: user.user_metadata?.tenant_id || null,
          created_at: user.created_at
        }
        cachedProfile = basicProfile
        return { user, profile: basicProfile, error: null }
      }

      if (profileError) {
        console.error('getCurrentUser: Profile fetch error:', profileError)
        return { user, profile: null, error: profileError }
      }

      console.log('getCurrentUser: Profile fetched successfully')
      cachedProfile = profile
      return { user, profile, error: null }
    } catch (err) {
      console.error('getCurrentUser: Internal error:', err)
      // If first attempt failed, retry once before giving up
      if (attempt === 1) {
        console.warn('getCurrentUser: retrying after error...')
        return fetchWithTimeout(2)
      }
      return { user: null, profile: null, error: err }
    }
  }

  // Timeout wrapper with fallback to cached data instead of hard failure
  const timeoutMs = 12000
  const timedFetch = Promise.race([
    fetchWithTimeout(),
    new Promise((resolve) =>
      setTimeout(() => {
        console.warn('getCurrentUser: Timeout hit, returning cached user/profile if available')
        if (cachedUser && cachedProfile) {
          resolve({ user: cachedUser, profile: cachedProfile, error: new Error('Profile fetch timed out (using cache)') })
        } else {
          resolve({ user: null, profile: null, error: new Error('Profile fetch timed out.') })
        }
      }, timeoutMs)
    )
  ])

  return timedFetch.catch(err => {
    console.error('getCurrentUser: Hang detected and aborted:', err)
    if (cachedUser && cachedProfile) {
      return { user: cachedUser, profile: cachedProfile, error: err }
    }
    return { user: null, profile: null, error: err }
  })
}

// Clear cache on logout
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') {
    cachedUser = null
    cachedProfile = null
  }
})

// Helper to check user role
export function hasRole(profile, role) {
  return profile?.role === role
}

// Helper to get tenant ID from profile
export function getTenantId(profile) {
  return profile?.tenant_id
}

export default supabase
