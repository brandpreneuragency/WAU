import React, { useState, useEffect } from 'react'
import { LayoutDashboard, Package, Users, ShoppingCart, AlertTriangle, Plus, ArrowRight } from 'lucide-react'
import Layout from '../components/Layout'
import Card, { CardHeader } from '../components/Card'
import StatWidget from '../components/StatWidget'
import Badge, { StockBadge } from '../components/Badge'
import { useCart } from '../contexts/CartContext'
import { supabase, getCurrentUser } from '../lib/supabaseClient'

/**
 * Dashboard Page
 * Overview with stats, low stock alerts, and one-click restock
 */
export default function DashboardPage({ currentPath, onNavigate, onLogout, profile }) {
  const [stats, setStats] = useState({
    totalStaff: 0,
    totalInventory: 0,
    pendingOrders: 0,
    lowStockItems: []
  })
  const [loading, setLoading] = useState(true)
  const { restockItem, setIsOpen } = useCart()

  // Replace mock data with Supabase queries
  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // Get current user and tenant
        const { profile } = await getCurrentUser()
        if (!profile) {
          setLoading(false)
          return
        }

        const tenantId = profile.tenant_id

        // 1. Fetch total staff count
        const { count: staffCount, error: staffError } = await supabase
          .from('staff')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)

        if (staffError) console.error('Staff error:', staffError)

        // 2. Fetch total inventory count
        const { count: inventoryCount, error: inventoryError } = await supabase
          .from('inventory')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)

        if (inventoryError) console.error('Inventory error:', inventoryError)

        // 3. Fetch pending orders count
        const { count: ordersCount, error: ordersError } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('status', 'pending')

        if (ordersError) console.error('Orders error:', ordersError)

        // 4. Fetch low stock items (quantity <= min_threshold)
        const { data: lowStock, error: lowStockError } = await supabase
          .from('inventory')
          .select('*')
          .eq('tenant_id', tenantId)
          .lte('quantity', 10) // You can adjust threshold or use a custom value
          .order('quantity', { ascending: true })

        if (lowStockError) console.error('Low stock error:', lowStockError)

        setStats({
          totalStaff: staffCount || 0,
          totalInventory: inventoryCount || 0,
          pendingOrders: ordersCount || 0,
          lowStockItems: lowStock || []
        })
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const handleRestock = (item) => {
    restockItem({
      id: item.id,
      name: `${item.item_name} - Size ${item.size}`,
      description: 'Uniform item',
      size: item.size,
      price: 45.00,
      stock_quantity: item.quantity
    })
    setIsOpen(true)
  }

  if (loading) {
    return (
      <Layout currentPath={currentPath} onNavigate={onNavigate} onLogout={onLogout} profile={profile}>
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout currentPath={currentPath} onNavigate={onNavigate} onLogout={onLogout} profile={profile}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-500">Overview of your uniform management</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatWidget
          title="Total Staff"
          value={stats.totalStaff}
          icon={Users}
          color="blue"
          trend={{ value: 12, direction: 'up' }}
        />
        <StatWidget
          title="Inventory Items"
          value={stats.totalInventory}
          icon={Package}
          color="green"
        />
        <StatWidget
          title="Pending Orders"
          value={stats.pendingOrders}
          icon={ShoppingCart}
          color="yellow"
          trend={{ value: 2, direction: 'up' }}
        />
        <StatWidget
          title="Low Stock Alerts"
          value={stats.lowStockItems.length}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* Low Stock Alert Section */}
      {stats.lowStockItems.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Low Stock Alerts</h2>
                <p className="text-sm text-gray-500">Items below minimum threshold that need restocking</p>
              </div>
            </div>
            <Badge variant="red">{stats.lowStockItems.length} items</Badge>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block pb-6">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-2 font-medium text-gray-700">Item</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Size</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Current Stock</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {stats.lowStockItems.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-2 font-medium text-gray-900">{item.item_name}</td>
                    <td className="py-4 px-4 text-gray-600">{item.size}</td>
                    <td className="py-4 px-4">
                      <span className={`font-semibold ${item.quantity === 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                        {item.quantity} units
                      </span>
                      <span className="text-gray-400 text-sm ml-2">(min: {item.min_threshold})</span>
                    </td>
                    <td className="py-4 px-4">
                      <StockBadge quantity={item.quantity} minThreshold={item.min_threshold} />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => handleRestock(item)}
                        className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-full font-medium text-sm hover:bg-gray-800 transition-colors touch-target"
                      >
                        <Plus className="w-4 h-4" />
                        Restock 3
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {stats.lowStockItems.map((item) => (
              <div key={item.id} className="p-4 bg-white rounded-3xl border border-gray-100 shadow-soft-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{item.item_name}</h4>
                    <p className="text-sm text-gray-500">Size: {item.size}</p>
                  </div>
                  <StockBadge quantity={item.quantity} minThreshold={item.min_threshold} />
                </div>

                <div className="flex items-center justify-between">
                  <span className={`font-semibold ${item.quantity === 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                    {item.quantity} units
                  </span>
                  <button
                    onClick={() => handleRestock(item)}
                    className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-full font-medium text-sm hover:bg-gray-800 transition-colors touch-target"
                  >
                    <Plus className="w-4 h-4" />
                    Restock 3
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">


        <Card padding="normal" hover>
          <CardHeader
            title="Manage Staff"
            subtitle="View and assign uniforms to staff members"
            icon={Users}
            action={
              <button
                onClick={() => onNavigate('/assignments')}
                className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            }
          />
        </Card>
      </div>
    </Layout>
  )
}
