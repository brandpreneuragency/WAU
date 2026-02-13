import { useState, useEffect } from 'react'
import { CartProvider } from './contexts/CartContext'
import { getCurrentUser, supabase } from './lib/supabaseClient'
import CartDrawer from './components/CartDrawer'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import SuperAdminDashboard from './pages/SuperAdminDashboard'
import InventoryPage from './pages/InventoryPage'
import AssignmentsPage from './pages/AssignmentsPage'
import SupportTicketPage from './pages/SupportTicketPage'

function App() {
  const [currentPath, setCurrentPath] = useState('/')
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Check for existing session on mount
  useEffect(() => {
    checkSession()

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const { profile } = await getCurrentUser()
        setUser(session.user)
        setProfile(profile)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const checkSession = async () => {
    try {
      const { user, profile } = await getCurrentUser()
      if (user && profile) {
        setUser(user)
        setProfile(profile)
      }
    } catch (err) {
      console.error('Session error:', err)
      setUser(null)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = ({ user, profile }) => {
    setUser(user)
    setProfile(profile)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setCurrentPath('/')
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-600">
          <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  // Show login page if not authenticated
  if (!user || !profile) {
    return <LoginPage onLogin={handleLogin} />
  }

  // Render current page based on path
  const renderPage = () => {
    const pageProps = {
      currentPath,
      onNavigate: setCurrentPath,
      user,
      profile,
      onLogout: handleLogout
    }

    // Super admin: support tenant-scoped views like /super/tenants/:tenantId/{staff,inventory,assignments}
    if (profile?.role === 'super_admin' && currentPath.startsWith('/super/tenants/')) {
      const parts = currentPath.split('/').filter(Boolean) // ['super', 'tenants', ':tenantId', 'section']
      const tenantId = parts[2]
      const section = parts[3]

      if (!tenantId || !section) {
        return <SuperAdminDashboard {...pageProps} />
      }

      const overrideProps = { ...pageProps, overrideTenantId: tenantId }

      switch (section) {
        // Staff page removed; map 'staff' to 'assignments' view
        case 'staff':
          return <AssignmentsPage {...overrideProps} />
        case 'inventory':
          return <InventoryPage {...overrideProps} />
        case 'assignments':
          return <AssignmentsPage {...overrideProps} />
        default:
          return <SuperAdminDashboard {...pageProps} />
      }
    }

    switch (currentPath) {
      case '/':
        // Super admins see the super admin dashboard, tenants see regular dashboard
        return profile?.role === 'super_admin'
          ? <SuperAdminDashboard {...pageProps} />
          : <DashboardPage {...pageProps} />
      case '/inventory':
        return <InventoryPage {...pageProps} />
      case '/assignments':
        return <AssignmentsPage {...pageProps} />
      case '/support':
        return <SupportTicketPage {...pageProps} />
      default:
        return profile?.role === 'super_admin'
          ? <SuperAdminDashboard {...pageProps} />
          : <DashboardPage {...pageProps} />
    }
  }

  return (
    <CartProvider>
      <div className="min-h-screen bg-gray-50">
        {renderPage()}
        <CartDrawer />
      </div>
    </CartProvider>
  )
}

export default App
