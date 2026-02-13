import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  Building2,
  Users,
  Package,
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  Upload,
  FileSpreadsheet,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import Layout from '../components/Layout'
import Card, { CardHeader } from '../components/Card'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import { supabase } from '../lib/supabaseClient'

// Tenant Form Component (moved outside to prevent re-creation)
const TenantForm = React.memo(({ onSubmit, submitLabel, tenantFormData, handleTenantInputChange, formError, formLoading, resetTenantForm, setIsAddTenantModalOpen, setIsEditTenantModalOpen }) => (
  <form onSubmit={onSubmit} className="p-8 space-y-8">
    {formError && (
      <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm border border-red-100 animate-in fade-in slide-in-from-top-2">
        {formError}
      </div>
    )}

    {/* Section: Organization Details */}
    <div className="space-y-4">
      <div>
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Tenant Name</label>
        <input
          type="text"
          name="name"
          value={tenantFormData.name}
          onChange={handleTenantInputChange}
          className="input-soft w-full text-lg font-bold"
          placeholder="e.g., Grand Hotel"
          required
        />
      </div>
    </div>

    {/* Section: Admin Account */}
    <div className="p-6 bg-gray-50/50 rounded-[2rem] border border-gray-100 space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-4 h-4 text-gray-400" />
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Administrative Access</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 mb-1.5 ml-1">Admin Email</label>
          <input
            type="email"
            name="admin_email"
            value={tenantFormData.admin_email || ''}
            onChange={handleTenantInputChange}
            className="input-soft w-full bg-white font-medium"
            placeholder="admin@hotel.com"
            required
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 mb-1.5 ml-1">
            Admin Password {submitLabel === 'Save Changes' && <span className="text-[9px] font-normal text-amber-500 ml-1 uppercase">(Leave blank to keep current)</span>}
          </label>
          <input
            type="password"
            name="admin_password"
            value={tenantFormData.admin_password || ''}
            onChange={handleTenantInputChange}
            className="input-soft w-full bg-white font-medium"
            placeholder={submitLabel === 'Add Tenant' ? 'Min 6 characters' : '••••••••'}
            required={submitLabel === 'Add Tenant'}
            minLength={6}
          />
        </div>
      </div>
    </div>

    <div className="flex gap-4 pt-4">
      <button
        type="button"
        onClick={() => {
          setIsAddTenantModalOpen(false)
          setIsEditTenantModalOpen(false)
          resetTenantForm()
        }}
        className="flex-1 px-6 py-4 rounded-2xl border border-gray-100 text-gray-500 font-bold hover:bg-gray-50 transition-all uppercase tracking-widest text-xs"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={formLoading}
        className="flex-1 px-6 py-4 rounded-2xl bg-gray-900 text-white font-bold hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 uppercase tracking-widest text-xs disabled:opacity-50"
      >
        {formLoading ? 'Saving...' : submitLabel}
      </button>
    </div>
  </form>
))

/**
 * Super Admin Dashboard
 * Homepage for super admins to manage tenants and their inventories
 * Features: Tenant CRUD, Single product upload, CSV mass upload
 */
export default function SuperAdminDashboard({ currentPath, onNavigate, onLogout, profile }) {
  // Tenants state
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Tenant modals
  const [isAddTenantModalOpen, setIsAddTenantModalOpen] = useState(false)
  const [isEditTenantModalOpen, setIsEditTenantModalOpen] = useState(false)
  const [isDeleteTenantModalOpen, setIsDeleteTenantModalOpen] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState(null)

  // Inventory upload modals
  const [isAddInventoryModalOpen, setIsAddInventoryModalOpen] = useState(false)
  const [isCsvUploadModalOpen, setIsCsvUploadModalOpen] = useState(false)
  const [inventoryTenantId, setInventoryTenantId] = useState('')

  // Form states
  const [tenantFormData, setTenantFormData] = useState({
    name: '',
    admin_email: '',
    admin_password: ''
  })

  const [inventoryFormData, setInventoryFormData] = useState({
    item_name: '',
    size: '',
    chest_cm: '',
    chest_in: '',
    shoulder_cm: '',
    shoulder_in: '',
    waist_cm: '',
    waist_in: '',
    hip_cm: '',
    hip_in: '',
    height_cm: '',
    height_in: '',
    sku: '',
    category: '',
    department: '',
    position: '',
    fabric: '',
    care: '',
    image_url: '',
    unit_price: '',
    quantity: ''
  })

  const [csvFile, setCsvFile] = useState(null)
  const [csvPreview, setCsvPreview] = useState([])
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [actionMenuOpen, setActionMenuOpen] = useState(null)

  // Fetch tenants
  useEffect(() => {
    fetchTenants()
  }, [])

  const fetchTenants = async () => {
    try {
      // Fetch tenants and their admin profile
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          *,
          profiles (
            id,
            email,
            role
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Flatten the profile data for easier use
      const enrichedTenants = data.map(tenant => ({
        ...tenant,
        admin_profile: tenant.profiles?.find(p => p.role === 'tenant_admin') || null
      }))

      setTenants(enrichedTenants || [])
    } catch (err) {
      console.error('Error fetching tenants:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filter tenants
  const filteredTenants = tenants.filter(tenant =>
    tenant.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Memoized handlers to prevent re-creation
  const handleTenantInputChange = useCallback((e) => {
    const { name, value } = e.target
    setTenantFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }, [])

  const resetTenantForm = useCallback(() => {
    setTenantFormData({
      name: '',
      admin_email: '',
      admin_password: ''
    })
    setFormError('')
  }, [])

  // Add tenant
  const handleAddTenant = async (e) => {
    e.preventDefault()
    const { name, admin_email, admin_password } = tenantFormData

    if (!name || !admin_email || !admin_password) {
      setFormError('Name, admin email, and password are required')
      return
    }

    setFormLoading(true)
    try {
      // 1. Create the tenant entry
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .insert([{ name }])
        .select()
        .single()

      if (tenantError) throw tenantError

      // 2. Create the admin user using Edge Function
      const { data: edgeData, error: edgeError } = await supabase.functions.invoke('create-tenant-admin', {
        body: {
          action: 'create',
          email: admin_email,
          password: admin_password,
          tenant_id: tenantData.id
        }
      })

      if (edgeError) throw edgeError

      // Update local state with the new tenant and its new admin profile
      const newTenant = {
        ...tenantData,
        admin_profile: {
          id: edgeData.user.id,
          email: admin_email,
          role: 'tenant_admin'
        }
      }

      setTenants(prev => [newTenant, ...prev])
      setIsAddTenantModalOpen(false)
      resetTenantForm()
      alert('Tenant and Admin user created successfully!')
    } catch (err) {
      console.error('handleAddTenant error:', err)
      setFormError(err.message)
    } finally {
      setFormLoading(false)
    }
  }

  // Edit tenant
  const handleEditTenant = async (e) => {
    e.preventDefault()
    const { name, admin_email, admin_password } = tenantFormData
    setFormLoading(true)
    try {
      // 1. Update the tenant name
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .update({ name })
        .eq('id', selectedTenant.id)
        .select()
        .single()

      if (tenantError) throw tenantError

      // 2. Update credentials if provided and we have an admin user
      if (selectedTenant.admin_profile && (admin_email !== selectedTenant.admin_profile.email || admin_password)) {
        const { error: edgeError } = await supabase.functions.invoke('create-tenant-admin', {
          body: {
            action: 'update',
            user_id: selectedTenant.admin_profile.id,
            email: admin_email !== selectedTenant.admin_profile.email ? admin_email : undefined,
            password: admin_password || undefined
          }
        })

        if (edgeError) throw edgeError

        // Also update the email in the profiles table since it's redundant but used for display
        if (admin_email !== selectedTenant.admin_profile.email) {
          await supabase
            .from('profiles')
            .update({ email: admin_email })
            .eq('id', selectedTenant.admin_profile.id)
        }
      }

      // Re-fetch or update local state
      fetchTenants()
      setIsEditTenantModalOpen(false)
      setSelectedTenant(null)
      resetTenantForm()
      alert('Tenant and credentials updated successfully!')
    } catch (err) {
      console.error('handleEditTenant error:', err)
      setFormError(err.message)
    } finally {
      setFormLoading(false)
    }
  }

  // Delete tenant
  const handleDeleteTenant = async () => {
    setFormLoading(true)
    try {
      const { error } = await supabase
        .from('tenants')
        .delete()
        .eq('id', selectedTenant.id)

      if (error) throw error

      setTenants(prev => prev.filter(t => t.id !== selectedTenant.id))
      setIsDeleteTenantModalOpen(false)
      setSelectedTenant(null)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setFormLoading(false)
    }
  }

  // Inventory form handlers
  const handleInventoryInputChange = (e) => {
    const { name, value } = e.target

    setInventoryFormData(prev => {
      const newState = { ...prev, [name]: value }

      // Auto-conversion logic
      if (name.endsWith('_cm')) {
        const baseName = name.replace('_cm', '')
        const cm = parseFloat(value)
        newState[`${baseName}_in`] = isNaN(cm) ? '' : (cm / 2.54).toFixed(2)
      } else if (name.endsWith('_in')) {
        const baseName = name.replace('_in', '')
        const inches = parseFloat(value)
        newState[`${baseName}_cm`] = isNaN(inches) ? '' : (inches * 2.54).toFixed(2)
      }

      // Numeric cleanup
      if (['quantity', 'unit_price'].includes(name)) {
        newState[name] = value === '' ? '' : parseFloat(value) || 0
      }

      return newState
    })
  }

  const resetInventoryForm = () => {
    setInventoryFormData({
      item_name: '',
      size: '',
      chest_cm: '',
      chest_in: '',
      shoulder_cm: '',
      shoulder_in: '',
      waist_cm: '',
      waist_in: '',
      hip_cm: '',
      hip_in: '',
      height_cm: '',
      height_in: '',
      sku: '',
      category: '',
      department: '',
      position: '',
      fabric: '',
      care: '',
      image_url: '',
      unit_price: '',
      quantity: ''
    })
    setInventoryTenantId('')
    setFormError('')
  }

  // Add single inventory item
  const handleAddInventory = async (e) => {
    e.preventDefault()
    if (!inventoryFormData.item_name || !inventoryTenantId) {
      setFormError('Item name and tenant are required')
      return
    }

    setFormLoading(true)
    try {
      // Strip UI-only fields (_in)
      const { chest_in, shoulder_in, waist_in, hip_in, height_in, ...dbData } = inventoryFormData

      // Convert empty strings to null/0 for numeric fields
      const cleanData = {
        ...dbData,
        chest_cm: dbData.chest_cm === '' ? null : parseFloat(dbData.chest_cm),
        shoulder_cm: dbData.shoulder_cm === '' ? null : parseFloat(dbData.shoulder_cm),
        waist_cm: dbData.waist_cm === '' ? null : parseFloat(dbData.waist_cm),
        hip_cm: dbData.hip_cm === '' ? null : parseFloat(dbData.hip_cm),
        height_cm: dbData.height_cm === '' ? null : parseFloat(dbData.height_cm),
        unit_price: dbData.unit_price === '' ? 0 : parseFloat(dbData.unit_price),
        quantity: dbData.quantity === '' ? 0 : parseInt(dbData.quantity),
        tenant_id: inventoryTenantId
      }

      const { data, error } = await supabase
        .from('inventory')
        .insert([cleanData])
        .select()

      if (error) throw error

      setIsAddInventoryModalOpen(false)
      resetInventoryForm()
      // Show success notification
    } catch (err) {
      setFormError(err.message)
    } finally {
      setFormLoading(false)
    }
  }

  // CSV Upload handlers
  const handleCsvFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    setCsvFile(file)

    // Parse CSV for preview
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target.result
      const lines = text.split('\n').filter(line => line.trim())
      const headers = lines[0].split(',').map(h => h.trim())

      const preview = lines.slice(1, 6).map(line => {
        const values = line.split(',').map(v => v.trim())
        const obj = {}
        headers.forEach((header, i) => {
          obj[header] = values[i] || ''
        })
        return obj
      })

      setCsvPreview(preview)
    }
    reader.readAsText(file)
  }

  // Process CSV upload
  const handleCsvUpload = async () => {
    if (!csvFile || !inventoryTenantId) {
      setFormError('Please select a CSV file and tenant')
      return
    }

    setFormLoading(true)
    try {
      const reader = new FileReader()
      reader.onload = async (event) => {
        const text = event.target.result
        const lines = text.split('\n').filter(line => line.trim())
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase())

        const items = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim())
          const obj = { tenant_id: inventoryTenantId }
          headers.forEach((header, i) => {
            const value = values[i] || ''
            if (['quantity', 'unit_price'].includes(header)) {
              obj[header] = parseFloat(value) || 0
            } else {
              obj[header] = value
            }
          })
          // Fallback if image_url is missing in CSV
          if (!obj.image_url) obj.image_url = ''
          return obj
        }).filter(item => item.item_name) // Filter out empty rows

        const { error } = await supabase
          .from('inventory')
          .insert(items)

        if (error) throw error

        setIsCsvUploadModalOpen(false)
        setCsvFile(null)
        setCsvPreview([])
        setInventoryTenantId('')
        setFormError('')
      }
      reader.readAsText(csvFile)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setFormLoading(false)
    }
  }

  // Open edit tenant modal
  const openEditTenantModal = (tenant) => {
    setSelectedTenant(tenant)
    setTenantFormData({
      name: tenant.name,
      admin_email: tenant.admin_profile?.email || '',
      admin_password: ''
    })
    setIsEditTenantModalOpen(true)
    setActionMenuOpen(null)
  }

  // Open delete tenant modal
  const openDeleteTenantModal = (tenant) => {
    setSelectedTenant(tenant)
    setIsDeleteTenantModalOpen(true)
    setActionMenuOpen(null)
  }

  // Open add inventory modal for specific tenant
  const openAddInventoryModal = (tenantId = '') => {
    setInventoryTenantId(tenantId)
    setIsAddInventoryModalOpen(true)
    setActionMenuOpen(null)
  }


  // Inventory Form Component
  const InventoryForm = () => {
    const DynamicInputField = ({ label, name, value, options, placeholder }) => {
      const [isCreatingNew, setIsCreatingNew] = useState(false);

      const handleSelectChange = (e) => {
        if (e.target.value === '__NEW__') {
          setIsCreatingNew(true);
        } else {
          handleInventoryInputChange(e);
        }
      };

      return (
        <div className="space-y-2">
          <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest">{label}</label>
          {!isCreatingNew ? (
            <div className="space-y-2">
              <select
                name={name}
                value={value}
                onChange={handleSelectChange}
                className="input-soft w-full font-bold appearance-none bg-white border-2 border-transparent"
              >
                <option value="">-- Select {label} --</option>
                {options.filter(opt => opt && opt !== 'all').map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
                <option value="__NEW__" className="text-indigo-600 font-black">+ Create new {label}</option>
              </select>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  name={name}
                  value={value}
                  onChange={handleInventoryInputChange}
                  className="input-soft w-full font-bold bg-white pr-20"
                  placeholder={placeholder}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      );
    };

    const uniqueCategories = [...new Set(inventory.map(i => i.category))].filter(Boolean);
    const uniqueDepartments = [...new Set(inventory.map(i => i.department))].filter(Boolean);
    const uniquePositions = [...new Set(inventory.map(i => i.position))].filter(Boolean);

    return (
      <form onSubmit={handleAddInventory} className="p-8 space-y-8">
        {formError && (
          <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm border border-red-100 animate-in fade-in slide-in-from-top-2">
            {formError}
          </div>
        )}

        {/* Section 1: Basic Info */}
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2">Item Name</label>
            <input
              type="text"
              name="item_name"
              value={inventoryFormData.item_name}
              onChange={handleInventoryInputChange}
              className="input-soft w-full text-base font-bold text-gray-900"
              placeholder="e.g., Chef Jacket"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2">Target Tenant</label>
            <select
              value={inventoryTenantId}
              onChange={(e) => setInventoryTenantId(e.target.value)}
              className="input-soft w-full font-bold text-gray-900"
              required
            >
              <option value="">-- Select Tenant --</option>
              {tenants.map(tenant => (
                <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="h-px bg-gray-100 w-full" />

        {/* Section 2: Classification */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2">SKU</label>
            <input
              type="text"
              name="sku"
              value={inventoryFormData.sku || ''}
              onChange={handleInventoryInputChange}
              className="input-soft w-full text-sm font-bold"
              placeholder="e.g., KITCH-101"
            />
          </div>
          <DynamicInputField
            label="Category"
            name="category"
            value={inventoryFormData.category}
            options={uniqueCategories}
            placeholder="New Category..."
          />
          <DynamicInputField
            label="Department"
            name="department"
            value={inventoryFormData.department}
            options={uniqueDepartments}
            placeholder="New Department..."
          />
          <DynamicInputField
            label="Position"
            name="position"
            value={inventoryFormData.position}
            options={uniquePositions}
            placeholder="New Position..."
          />
        </div>

        <div className="h-px bg-gray-100 w-full" />

        {/* Section 3: Fabric & Care */}
        <div className="space-y-6">
          <div>
            <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2">Fabric Content</label>
            <input
              type="text"
              name="fabric"
              value={inventoryFormData.fabric || ''}
              onChange={handleInventoryInputChange}
              className="input-soft w-full text-sm font-medium"
              placeholder="e.g., 65% Polyester, 35% Cotton"
            />
          </div>
          <div>
            <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2">Care Instructions</label>
            <textarea
              name="care"
              value={inventoryFormData.care || ''}
              onChange={handleInventoryInputChange}
              className="input-soft w-full text-sm font-medium min-h-[100px] py-4"
              placeholder="e.g., Machine wash warm, tumble dry low..."
            />
          </div>
        </div>

        <div className="h-px bg-gray-100 w-full" />

        {/* Section 4: Physical Specifications & Measurements */}
        <div className="space-y-6">
          <div>
            <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-4">Physical Specifications</label>
            <div className="mb-6">
              <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-tighter">Tag Size</label>
              <input
                type="text"
                name="size"
                value={inventoryFormData.size}
                onChange={handleInventoryInputChange}
                className="input-soft w-full text-base font-black border-2 border-gray-50"
                placeholder="e.g., Medium (M)"
                required
              />
            </div>

            <div className="grid grid-cols-[1fr,100px,100px] gap-4 items-center mb-4 px-2">
              <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Measurement</span>
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest text-center">CM</span>
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest text-center">Inches</span>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Chest', base: 'chest' },
                { label: 'Shoulder', base: 'shoulder' },
                { label: 'Waist', base: 'waist' },
                { label: 'Hip', base: 'hip' },
                { label: 'Height', base: 'height' }
              ].map(f => (
                <div key={f.base} className="grid grid-cols-[1fr,100px,100px] gap-4 items-center">
                  <label className="text-xs font-bold text-gray-500">{f.label}</label>
                  <input
                    type="number"
                    step="0.01"
                    name={`${f.base}_cm`}
                    value={inventoryFormData[`${f.base}_cm`]}
                    onChange={handleInventoryInputChange}
                    className="input-soft w-full text-sm text-center bg-gray-50 shadow-none border-transparent focus:bg-white focus:border-indigo-100"
                    placeholder="0.0"
                  />
                  <input
                    type="number"
                    step="0.01"
                    name={`${f.base}_in`}
                    value={inventoryFormData[`${f.base}_in`]}
                    onChange={handleInventoryInputChange}
                    className="input-soft w-full text-sm text-center bg-amber-50/30 shadow-none border-transparent focus:bg-white focus:border-amber-100"
                    placeholder="0.0"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="h-px bg-gray-100 w-full" />

        {/* Section 5: Media & Pricing */}
        <div className="space-y-6">
          <div>
            <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2">Product Image URL</label>
            <input
              type="text"
              name="image_url"
              value={inventoryFormData.image_url || ''}
              onChange={handleInventoryInputChange}
              className="input-soft w-full text-sm"
              placeholder="https://images.unsplash.com/photo..."
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2">Unit Price ($)</label>
              <input
                type="number"
                step="0.01"
                name="unit_price"
                value={inventoryFormData.unit_price}
                onChange={handleInventoryInputChange}
                className="input-soft w-full text-base font-bold text-blue-600 border-2 border-blue-50"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2">Initial Quantity</label>
              <input
                type="number"
                name="quantity"
                value={inventoryFormData.quantity}
                onChange={handleInventoryInputChange}
                className="input-soft w-full text-base font-bold"
                min="0"
                required
              />
            </div>
          </div>
        </div>

        <div className="flex gap-4 pt-6">
          <button
            type="button"
            onClick={() => {
              setIsAddInventoryModalOpen(false)
              resetInventoryForm()
            }}
            className="flex-1 px-6 py-4 rounded-2xl border border-gray-100 text-gray-500 font-bold hover:bg-gray-50 transition-all uppercase tracking-widest text-[10px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={formLoading}
            className="flex-1 px-6 py-4 rounded-2xl bg-gray-900 text-white font-bold hover:bg-black transition-all shadow-lg shadow-gray-200 uppercase tracking-widest text-[10px] disabled:opacity-50"
          >
            {formLoading ? 'Processing...' : 'Save Product Data'}
          </button>
        </div>
      </form>
    );
  };

  // Action Menu Component for Tenants
  const TenantActionMenu = ({ tenant }) => (
    <div className="relative">
      <button
        onClick={() => setActionMenuOpen(actionMenuOpen === tenant.id ? null : tenant.id)}
        className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 touch-target"
      >
        <MoreVertical className="w-5 h-5" />
      </button>
      {actionMenuOpen === tenant.id && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-2xl shadow-soft-lg border border-gray-100 z-10 py-2">
          <button
            onClick={() => onNavigate(`/super/tenants/${tenant.id}/assignments`)}
            className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700 flex items-center gap-2"
          >
            <Package className="w-4 h-4" /> Assignments
          </button>
          <button
            onClick={() => onNavigate(`/super/tenants/${tenant.id}/assignments`)}
            className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700 flex items-center gap-2"
          >
            <Package className="w-4 h-4" /> Assignments
          </button>
          <button
            onClick={() => openAddInventoryModal(tenant.id)}
            className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Inventory
          </button>
          <button
            onClick={() => openEditTenantModal(tenant)}
            className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700 flex items-center gap-2"
          >
            <Edit2 className="w-4 h-4" /> Edit Tenant
          </button>
          <button
            onClick={() => openDeleteTenantModal(tenant)}
            className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-red-600 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> Delete Tenant
          </button>
        </div>
      )}
    </div>
  )

  if (loading) {
    return (
      <Layout currentPath={currentPath} onNavigate={onNavigate} onLogout={onLogout} profile={profile}>
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">Loading tenants...</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout currentPath={currentPath} onNavigate={onNavigate} onLogout={onLogout} profile={profile}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Super Admin Dashboard</h1>
            <p className="text-gray-500">Manage tenants and their inventories</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsCsvUploadModalOpen(true)}
              className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-3 rounded-2xl font-medium hover:bg-gray-50 transition-colors touch-target"
            >
              <FileSpreadsheet className="w-5 h-5" />
              CSV Upload
            </button>
            <button
              onClick={() => openAddInventoryModal()}
              className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-3 rounded-2xl font-medium hover:bg-gray-50 transition-colors touch-target"
            >
              <Package className="w-5 h-5" />
              Add Product
            </button>
            <button
              onClick={() => {
                resetTenantForm()
                setIsAddTenantModalOpen(true)
              }}
              className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-3 rounded-2xl font-medium hover:bg-gray-800 transition-colors touch-target"
            >
              <Plus className="w-5 h-5" />
              Add Tenant
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card padding="normal">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Tenants</p>
              <p className="text-2xl font-bold text-gray-900">{tenants.length}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card padding="normal">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Active Tenants</p>
              <p className="text-2xl font-bold text-green-600">
                {tenants.filter(t => t.is_active !== false).length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card padding="normal">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Inventory</p>
              <p className="text-2xl font-bold text-gray-900">-</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search tenants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-soft w-full pl-12"
          />
        </div>
      </div>

      {/* Tenants Table */}
      <div className="hidden md:block pb-12">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-100">
              <th className="text-left py-4 px-2 font-medium text-gray-700">Tenant</th>
              <th className="text-left py-4 px-4 font-medium text-gray-700">Created</th>
              <th className="text-right py-4 px-4 font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTenants.map((tenant) => (
              <tr key={tenant.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/80 transition-all group">
                <td className="py-5 px-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center group-hover:border-indigo-100 transition-colors">
                      <Building2 className="w-6 h-6 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-lg tracking-tight">{tenant.name}</div>
                      <div className="text-[10px] text-gray-400 uppercase font-black tracking-widest mt-0.5">
                        Tenant ID: {tenant.id.slice(0, 8)}...
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-5 px-6">
                  <div className="text-sm font-medium text-gray-600">
                    {new Date(tenant.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                </td>
                <td className="py-5 px-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onNavigate(`/super/tenants/${tenant.id}/inventory`)}
                      title="Edit Inventory"
                      className="p-2.5 rounded-xl bg-white border border-gray-100 text-indigo-500 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm group/btn"
                    >
                      <Package className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                    </button>
                    <TenantActionMenu tenant={tenant} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden space-y-4 pb-8">
        {filteredTenants.map((tenant) => (
          <div key={tenant.id} className="p-6 bg-white rounded-[2rem] border-2 border-gray-50 shadow-soft-md hover:border-indigo-100 transition-all active:scale-[0.98] group">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50/50 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-100/50 transition-colors">
                <Building2 className="w-7 h-7 text-indigo-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 text-lg tracking-tight mb-1 truncate">{tenant.name}</h3>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                  Joined {new Date(tenant.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate(`/super/tenants/${tenant.id}/inventory`)}
                  className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100"
                >
                  <Package className="w-5 h-5" />
                </button>
                <TenantActionMenu tenant={tenant} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {
        filteredTenants.length === 0 && (
          <div className="text-center py-20">
            <Building2 className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-1">No tenants found</h3>
            <p className="text-gray-500">Try adjusting your search or add a new tenant</p>
          </div>
        )
      }

      {/* Add Tenant Modal */}
      <Modal
        isOpen={isAddTenantModalOpen}
        onClose={() => {
          setIsAddTenantModalOpen(false)
          resetTenantForm()
        }}
        title="Add Tenant"
      >
        <TenantForm
          onSubmit={handleAddTenant}
          submitLabel="Add Tenant"
          tenantFormData={tenantFormData}
          handleTenantInputChange={handleTenantInputChange}
          formError={formError}
          formLoading={formLoading}
          resetTenantForm={resetTenantForm}
          setIsAddTenantModalOpen={setIsAddTenantModalOpen}
          setIsEditTenantModalOpen={setIsEditTenantModalOpen}
        />
      </Modal>

      {/* Edit Tenant Modal */}
      <Modal
        isOpen={isEditTenantModalOpen}
        onClose={() => {
          setIsEditTenantModalOpen(false)
          setSelectedTenant(null)
          resetTenantForm()
        }}
        title="Edit Tenant"
      >
        <TenantForm
          onSubmit={handleEditTenant}
          submitLabel="Save Changes"
          tenantFormData={tenantFormData}
          handleTenantInputChange={handleTenantInputChange}
          formError={formError}
          formLoading={formLoading}
          resetTenantForm={resetTenantForm}
          setIsAddTenantModalOpen={setIsAddTenantModalOpen}
          setIsEditTenantModalOpen={setIsEditTenantModalOpen}
        />
      </Modal>

      {/* Delete Tenant Modal */}
      <Modal
        isOpen={isDeleteTenantModalOpen}
        onClose={() => {
          setIsDeleteTenantModalOpen(false)
          setSelectedTenant(null)
        }}
        title="Delete Tenant"
        maxWidth="sm"
      >
        <div className="p-6">
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete <strong>{selectedTenant?.name}</strong>? This will also delete all associated data (staff, inventory, orders). This action cannot be undone.
          </p>
          {formError && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm mb-4">
              {formError}
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setIsDeleteTenantModalOpen(false)
                setSelectedTenant(null)
              }}
              className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteTenant}
              disabled={formLoading}
              className="flex-1 px-4 py-3 rounded-2xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {formLoading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Inventory Modal */}
      <Modal
        isOpen={isAddInventoryModalOpen}
        onClose={() => {
          setIsAddInventoryModalOpen(false)
          resetInventoryForm()
        }}
        title="Add Inventory Item"
      >
        <InventoryForm />
      </Modal>

      {/* CSV Upload Modal */}
      <Modal
        isOpen={isCsvUploadModalOpen}
        onClose={() => {
          setIsCsvUploadModalOpen(false)
          setCsvFile(null)
          setCsvPreview([])
          setInventoryTenantId('')
          setFormError('')
        }}
        title="CSV Mass Upload"
        maxWidth="lg"
      >
        <div className="p-6 space-y-6">
          {formError && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Tenant</label>
            <select
              value={inventoryTenantId}
              onChange={(e) => setInventoryTenantId(e.target.value)}
              className="input-soft w-full"
              required
            >
              <option value="">-- Select Tenant --</option>
              {tenants.map(tenant => (
                <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload CSV File</label>
            <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-gray-400 transition-colors">
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvFileChange}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-900 font-medium mb-1">Click to upload CSV</p>
                <p className="text-gray-500 text-sm">or drag and drop</p>
              </label>
            </div>
            {csvFile && (
              <div className="mt-4 p-4 bg-blue-50 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                  <span className="font-medium text-gray-900">{csvFile.name}</span>
                </div>
                <button
                  onClick={() => {
                    setCsvFile(null)
                    setCsvPreview([])
                  }}
                  className="p-1 hover:bg-blue-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-blue-600" />
                </button>
              </div>
            )}
          </div>

          {csvPreview.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Preview (first 5 rows):</h4>
              <div className="overflow-x-auto bg-gray-50 rounded-2xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {Object.keys(csvPreview[0]).map(header => (
                        <th key={header} className="text-left py-2 px-3 font-medium text-gray-700">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.map((row, i) => (
                      <tr key={i} className="border-b border-gray-200 last:border-0">
                        {Object.values(row).map((value, j) => (
                          <td key={j} className="py-2 px-3 text-gray-600">{value}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-2xl p-4">
            <h4 className="font-medium text-gray-900 mb-2">CSV Format Requirements:</h4>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>Required columns: item_name, size, category, quantity, min_threshold</li>
              <li>Optional columns: unit_price, description</li>
              <li>First row must be header names</li>
              <li>Category options: uniforms, aprons, headwear, footwear, accessories</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => {
                setIsCsvUploadModalOpen(false)
                setCsvFile(null)
                setCsvPreview([])
                setInventoryTenantId('')
                setFormError('')
              }}
              className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCsvUpload}
              disabled={!csvFile || !inventoryTenantId || formLoading}
              className="flex-1 px-4 py-3 rounded-2xl bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {formLoading ? 'Uploading...' : 'Upload CSV'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Click outside to close action menu */}
      {
        actionMenuOpen && (
          <div
            className="fixed inset-0 z-0"
            onClick={() => setActionMenuOpen(null)}
          />
        )
      }
    </Layout >
  )
}
