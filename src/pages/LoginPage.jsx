import { useState, useEffect } from 'react'
import { supabase, getCurrentUser } from '../lib/supabaseClient'
import { Building2, Shield, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import Card from '../components/Card'

/**
 * Login Page
 * Supports both Super Admin and Tenant Admin login
 */
export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checkingSession, setCheckingSession] = useState(true)

  // Check for existing session on mount
  useEffect(() => {
    checkExistingSession()
  }, [])

  const checkExistingSession = async () => {
    try {
      const { user, profile } = await getCurrentUser()
      if (user && profile) {
        onLogin({ user, profile })
      }
    } catch (err) {
      console.error('Session check error:', err)
    } finally {
      setCheckingSession(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      console.log('Attempting login with:', { email: email.trim() })

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      })

      if (authError) {
        console.error('Auth error:', authError)
        throw authError
      }

      if (!authData.user) {
        throw new Error('No user returned from authentication')
      }

      console.log('Auth successful, getting profile...')

      const { user, profile, error: profileError } = await getCurrentUser()

      if (profileError) {
        console.error('Profile error:', profileError)
        throw profileError
      }

      if (!profile) {
        throw new Error('No profile found. Please contact support.')
      }

      console.log('Profile found:', profile)

      onLogin({ user, profile })
    } catch (err) {
      console.error('Login error:', err)
      setError(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Checking session...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl overflow-hidden border-0 !p-0">
          {/* Decorative Header Overlay */}
          <div className="h-2 bg-gray-900" />

          <div className="p-8 pt-10">
            {/* Logo & Header */}
            <div className="text-center mb-10">
              <div className="w-16 h-16 rounded-2xl bg-gray-900 flex items-center justify-center mx-auto mb-4 shadow-lg ring-4 ring-gray-50">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Uniform App</h1>
              <p className="text-gray-500 mt-2">Sign in to manage your inventory</p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email Field */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 ml-1">
                  Email Address
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-gray-900 transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@organization.com"
                    className="input-soft w-full pl-12 h-12 bg-gray-50 border-gray-100 focus:bg-white transition-all text-sm"
                    required
                    disabled={loading}
                    autoFocus
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 ml-1">
                  Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-gray-900 transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-soft w-full pl-12 pr-12 h-12 bg-gray-50 border-gray-100 focus:bg-white transition-all text-sm"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100 animate-in fade-in slide-in-from-top-2">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-4 mt-2 flex items-center justify-center gap-3 disabled:opacity-50 shadow-lg shadow-gray-900/10 hover:shadow-gray-900/20 active:scale-[0.98] transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Verifying credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-8 border-t border-gray-50 text-center">
              <p className="text-xs text-gray-400">
                Secure access for authorized personnel only.
              </p>
            </div>
          </div>
        </Card>

        {/* Support Link */}
        <div className="mt-8 text-center animate-in fade-in duration-500 delay-300">
          <p className="text-sm text-gray-500">
            Forgot password? <a href="#" className="text-gray-900 font-semibold hover:underline">Contact System Admin</a>
          </p>
        </div>
      </div>
    </div>
  )
}
