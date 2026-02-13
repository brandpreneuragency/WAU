import React, { useState } from 'react'
import { 
  LayoutDashboard, 
  Package, 
  Users,
  ClipboardList,
  MessageSquare,
  Menu,
  X,
  LogOut
} from 'lucide-react'

// Navigation items configuration
const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/inventory', label: 'Inventory', icon: Package },
  { path: '/assignments', label: 'Assignments', icon: ClipboardList },
  { path: '/support', label: 'Support', icon: MessageSquare },
]

/**
 * Layout Component
 * Responsive layout with sidebar for desktop and hamburger menu for mobile
 * Soft UI design with generous padding and rounded corners
 */
export default function Layout({ children, currentPath = '/', onNavigate, onLogout, profile }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleNavClick = (path) => {
    setMobileMenuOpen(false)
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b76d771a-5050-4b8a-bdf0-427a48cd31c1',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        runId:'initial',
        hypothesisId:'H1',
        location:'components/Layout.jsx:28',
        message:'nav_click',
        data:{from:currentPath,to:path,hasOnNavigate:!!onNavigate},
        timestamp:Date.now()
      })
    }).catch(()=>{})
    // #endregion
    // Call the navigation function passed from parent
    if (onNavigate) {
      onNavigate(path)
    }
  }

  const handleLogout = () => {
    if (onLogout) {
      onLogout()
    }
  }

  // Get user role display
  const roleDisplay = profile?.role === 'super_admin' ? 'Super Admin' : 'Tenant Admin'
  const tenantName = profile?.tenants?.name || 'No Tenant'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 bg-white shadow-soft-lg z-40 flex-col">
        {/* Logo Area */}
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-bold text-gray-900">Uniform Manager</h1>
          <p className="text-sm text-gray-500 mt-1">Staff & Inventory</p>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-2">
          {NAV_ITEMS
            .filter(item => {
              // Super admins only need the main dashboard (tenants list)
              if (profile?.role === 'super_admin') {
                return item.path === '/'
              }
              return true
            })
            .map((item) => {
            const Icon = item.icon
            const isActive = currentPath === item.path
            
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-2xl
                  transition-all duration-200 touch-target
                  ${isActive 
                    ? 'bg-gray-900 text-white' 
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* User Profile / Logout */}
        <div className="p-4 border-t border-gray-100">
          <div className="px-4 py-2 mb-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{roleDisplay}</p>
            <p className="text-sm text-gray-900 truncate">{profile?.email || 'No email'}</p>
            {profile?.tenants?.name && (
              <p className="text-xs text-gray-500 truncate">{tenantName}</p>
            )}
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-500 hover:bg-gray-100 hover:text-red-600 transition-all duration-200 touch-target"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 bg-white shadow-soft z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold text-gray-900">Uniform Manager</h1>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 touch-target"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-white">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Menu</h3>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-xl text-gray-600 hover:text-gray-900"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <nav className="p-4 space-y-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = currentPath === item.path
              
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-4 rounded-2xl
                    transition-all duration-200 touch-target
                    ${isActive 
                      ? 'bg-gray-900 text-white' 
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                >
                  <Icon className="w-6 h-6" />
                  <span className="font-medium text-lg">{item.label}</span>
                </button>
              )
            })}
            
            <div className="pt-4 border-t border-gray-100 mt-4">
              <div className="px-4 py-2 mb-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{roleDisplay}</p>
                <p className="text-sm text-gray-900 truncate">{profile?.email || 'No email'}</p>
                {profile?.tenants?.name && (
                  <p className="text-xs text-gray-500 truncate">{tenantName}</p>
                )}
              </div>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-gray-500 hover:bg-gray-100 hover:text-red-600 transition-all duration-200 touch-target"
              >
                <LogOut className="w-6 h-6" />
                <span className="font-medium text-lg">Sign Out</span>
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* Main Content Area */}
      <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
