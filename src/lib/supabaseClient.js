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
 * Includes a mandatory 5-second timeout to prevent UI hangs.
 */
export async function getCurrentUser(forceRefresh = false) {
  const fetchWithTimeout = async () => {
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
      return { user: null, profile: null, error: err }
    }
  }

  // Mandatory 5-second timeout wrapper
  return Promise.race([
    fetchWithTimeout(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Profile fetch timed out. Check your database connection and RLS rules.')), 5000)
    )
  ]).catch(err => {
    console.error('getCurrentUser: Hang detected and aborted:', err)
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
