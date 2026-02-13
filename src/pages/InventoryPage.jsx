import React, { useState, useEffect } from 'react'
import { Search, Package, Plus, ShoppingCart, MoreVertical, ArrowUpDown, Edit2, Trash2, Filter, X, ChevronRight, Info, Heart, Ruler } from 'lucide-react'
import Layout from '../components/Layout'
import Card from '../components/Card'
import Badge, { StockBadge } from '../components/Badge'
import Modal from '../components/Modal'
import { supabase, getCurrentUser } from '../lib/supabaseClient'
import { useCart } from '../contexts/CartContext'

// Mock data injector for missing fields (now fallback only)
const enrichItem = (item) => ({
  ...item,
  sku: item.sku || item.item_name.substring(0, 3).toUpperCase() + '-' + (100 + item.id.substring(0, 3).length) + '-WHT',
  fabric: item.fabric || 'Not Specified',
  care: item.care || 'Check Label',
  color: item.color || 'N/A',
  unit_price: item.unit_price || 0.00
})

// Group inventory by item_name
const groupInventoryByProduct = (items) => {
  const groups = {}
  items.forEach(item => {
    const enriched = enrichItem(item)
    if (!groups[item.item_name]) {
      groups[item.item_name] = {
        name: item.item_name,
        category: item.category,
        sku: enriched.sku,
        department: item.department || 'N/A',
        position: item.position || 'N/A',
        fabric: enriched.fabric,
        care: enriched.care,
        price: enriched.unit_price,
        items: [],
        totalQuantity: 0,
        image_url: item.image_url
      }
    }
    groups[item.item_name].items.push(enriched)
    groups[item.item_name].totalQuantity += item.quantity
  })
  return Object.values(groups)
}


// Product Card Component for the Grid
const ProductCard = ({
  product,
  profile,
  setSelectedProduct,
  setIsDetailsModalOpen,
  setSelectedSize,
  actionMenuOpen,
  setActionMenuOpen,
  handleQuickRestock,
  openEditModal,
  openDeleteModal
}) => (
  <div className="group bg-white rounded-[2rem] border border-gray-100 shadow-soft hover:shadow-soft-lg transition-all duration-300 overflow-hidden flex flex-col">
    {/* Image Area */}
    <div className="aspect-square bg-gray-50 relative overflow-hidden">
      {product.image_url ? (
        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
          <Package className="w-12 h-12 mb-2 opacity-20" />
          <span className="text-sm font-medium">Product Image</span>
        </div>
      )}
      <div className="absolute top-4 left-4">
        <Badge variant="gray" size="sm" className="bg-white/90 backdrop-blur-md shadow-sm uppercase tracking-wider font-bold">
          {product.category}
        </Badge>
      </div>
    </div>

    {/* Content Area */}
    <div className="p-6 flex-1 flex flex-col">
      <div className="flex justify-between items-start mb-1">
        <h3 className="font-bold text-gray-900 text-lg group-hover:text-gray-900 transition-colors">
          {product.name}
        </h3>
        {profile?.role === 'super_admin' && (
          <button
            onClick={() => openEditModal(product.items[0])}
            className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm border border-gray-100 flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:border-indigo-100 hover:bg-white transition-all shadow-sm"
            title="Edit Product"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
      </div>
      <p className="text-gray-400 text-sm mb-4 font-medium">{product.sku}</p>

      <div className="mt-auto space-y-4">
        <div className="flex items-center justify-between py-3 border-y border-gray-50">
          <span className="text-sm text-gray-500 font-medium">Total Stock:</span>
          <span className="font-bold text-gray-900">{product.totalQuantity}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xl font-black text-gray-900">
            ${product.price.toFixed(2)}
          </div>
          <button
            onClick={() => {
              // debug: ensure product selection populates modal
              console.debug('Inventory - open details for', product && product.name)
              setSelectedProduct(product)
              setSelectedSize(product.items[0]?.size || null)
              setIsDetailsModalOpen(true)
            }}
            className="px-5 py-2.5 bg-gray-50 hover:bg-gray-900 hover:text-white text-gray-900 rounded-xl text-sm font-bold transition-all duration-200"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  </div>
)

// Dynamic select/create input extracted to keep focus stable during typing
const DynamicInputField = React.memo(function DynamicInputField({ label, name, value, options, placeholder, onChange }) {
  const [isCreatingNew, setIsCreatingNew] = useState(false)

  const handleSelectChange = (e) => {
    if (e.target.value === '__NEW__') {
      setIsCreatingNew(true)
    } else {
      onChange(e)
    }
  }

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
              onChange={onChange}
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
  )
})

// Item Form Component hoisted to avoid remounting (keeps focus while typing)
function ItemForm({
  onSubmit,
  submitLabel,
  formData,
  handleInputChange,
  setIsAddModalOpen,
  setIsEditModalOpen,
  resetForm,
  formLoading,
  formError,
  inventory
}) {
  const uniqueCategories = [...new Set(inventory.map(i => i.category))].filter(Boolean)
  const uniqueDepartments = [...new Set(inventory.map(i => i.department))].filter(Boolean)
  const uniquePositions = [...new Set(inventory.map(i => i.position))].filter(Boolean)

  return (
    <form onSubmit={onSubmit} className="p-8 space-y-8 max-h-[80vh] overflow-y-auto">
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
            value={formData.item_name}
            onChange={handleInputChange}
            className="input-soft w-full text-base font-bold text-gray-900"
            placeholder="e.g., Chef Jacket"
            required
          />
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
            value={formData.sku || ''}
            onChange={handleInputChange}
            className="input-soft w-full text-sm font-bold"
            placeholder="e.g., KITCH-101"
          />
        </div>
        <DynamicInputField
          label="Category"
          name="category"
          value={formData.category}
          options={uniqueCategories}
          placeholder="New Category..."
          onChange={handleInputChange}
        />
        <DynamicInputField
          label="Department"
          name="department"
          value={formData.department}
          options={uniqueDepartments}
          placeholder="New Department..."
          onChange={handleInputChange}
        />
        <DynamicInputField
          label="Position"
          name="position"
          value={formData.position}
          options={uniquePositions}
          placeholder="New Position..."
          onChange={handleInputChange}
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
            value={formData.fabric || ''}
            onChange={handleInputChange}
            className="input-soft w-full text-sm font-medium"
            placeholder="e.g., 65% Polyester, 35% Cotton"
          />
        </div>
        <div>
          <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2">Care Instructions</label>
          <textarea
            name="care"
            value={formData.care || ''}
            onChange={handleInputChange}
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
              value={formData.size}
              onChange={handleInputChange}
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
                  value={formData[`${f.base}_cm`]}
                  onChange={handleInputChange}
                  className="input-soft w-full text-sm text-center bg-gray-50 shadow-none border-transparent focus:bg-white focus:border-indigo-100"
                  placeholder="0.0"
                />
                <input
                  type="number"
                  step="0.01"
                  name={`${f.base}_in`}
                  value={formData[`${f.base}_in`]}
                  onChange={handleInputChange}
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
            value={formData.image_url || ''}
            onChange={handleInputChange}
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
              value={formData.unit_price}
              onChange={handleInputChange}
              className="input-soft w-full text-base font-bold text-blue-600 border-2 border-blue-50"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2">Quantity</label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleInputChange}
              className="input-soft w-full text-base font-bold"
              min="0"
              required
            />
          </div>
        </div>
      </div>

      <div className="flex gap-4 pt-6 sticky bottom-0 bg-white/90 backdrop-blur-md pb-2 -mx-2 px-2">
        <button
          type="button"
          onClick={() => {
            setIsAddModalOpen(false)
            setIsEditModalOpen(false)
            resetForm()
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
          {formLoading ? 'Processing...' : submitLabel}
        </button>
      </div>
    </form>
  )
}

// Item Form Component
export default function InventoryPage({ currentPath, onNavigate, onLogout, profile, overrideTenantId }) {
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterFabric, setFilterFabric] = useState('all')
  const [filterCare, setFilterCare] = useState('all')
  const [tenantId, setTenantId] = useState(null)

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedSize, setSelectedSize] = useState(null)
  const [actionMenuOpen, setActionMenuOpen] = useState(null)

  // Form state
  const [formData, setFormData] = useState({
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
    unit_price: 0,
    quantity: 0
  })
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  // Get real data from Supabase
  useEffect(() => {
    async function fetchInventory() {
      try {
        let effectiveTenantId = overrideTenantId

        if (!effectiveTenantId) {
          const { profile: currentProfile } = await getCurrentUser()
          if (!currentProfile) {
            setLoading(false)
            return
          }
          effectiveTenantId = currentProfile.tenant_id
        }

        setTenantId(effectiveTenantId)

        const { data, error } = await supabase
          .from('inventory')
          .select('*')
          .eq('tenant_id', effectiveTenantId)
          .order('item_name', { ascending: true })

        if (error) {
          console.log('Error fetching inventory:', error)
        } else {
          setInventory(data || [])
        }
      } catch (err) {
        console.log('Something went wrong:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchInventory()
  }, [])

  const groupedProducts = groupInventoryByProduct(inventory)

  // Cart API for ordering from modal
  const { addItem, setIsOpen: setCartOpen, MOQ } = useCart()

  const filteredProducts = groupedProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = filterCategory === 'all' || product.category === filterCategory
    const matchesFabric = filterFabric === 'all' || product.fabric === filterFabric
    const matchesCare = filterCare === 'all' || product.care === filterCare

    return matchesSearch && matchesCategory && matchesFabric && matchesCare
  }).sort((a, b) => {
    let comparison = 0
    if (sortBy === 'name') comparison = a.name.localeCompare(b.name)
    if (sortBy === 'quantity') comparison = a.totalQuantity - b.totalQuantity
    if (sortBy === 'category') comparison = a.category.localeCompare(b.category)
    return sortOrder === 'asc' ? comparison : -comparison
  })

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  // Stats
  const totalItems = inventory.length
  const lowStockItems = inventory.filter(i => i.quantity > 0 && i.quantity <= i.min_threshold).length
  const outOfStockItems = inventory.filter(i => i.quantity === 0).length

  // Form handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target

    setFormData(prev => {
      const newState = { ...prev, [name]: value }

      // Auto-conversion logic for measurements
      if (name.endsWith('_cm')) {
        const baseName = name.replace('_cm', '')
        const cm = parseFloat(value)
        newState[`${baseName}_in`] = isNaN(cm) ? '' : (cm / 2.54).toFixed(2)
      } else if (name.endsWith('_in')) {
        const baseName = name.replace('_in', '')
        const inches = parseFloat(value)
        newState[`${baseName}_cm`] = isNaN(inches) ? '' : (inches * 2.54).toFixed(2)
      }

      // Numeric cleanup for quantities and price
      if (['quantity', 'unit_price'].includes(name)) {
        newState[name] = value === '' ? '' : parseFloat(value) || 0
      }

      return newState
    })
  }

  const resetForm = () => {
    setFormData({
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
      category: 'uniforms',
      department: '',
      position: '',
      fabric: '',
      care: '',
      image_url: '',
      unit_price: 0,
      quantity: 0
    })
    setFormError('')
  }

  // Add item
  const handleAddItem = async (e) => {
    e.preventDefault()
    if (!formData.item_name || !formData.size) {
      setFormError('Item name and size are required')
      return
    }

    setFormLoading(true)
    try {
      // Strip UI-only fields (_in)
      const { chest_in, shoulder_in, waist_in, hip_in, height_in, ...dbData } = formData

      // Convert empty strings to null for numeric fields
      const cleanData = {
        ...dbData,
        chest_cm: dbData.chest_cm === '' ? null : parseFloat(dbData.chest_cm),
        shoulder_cm: dbData.shoulder_cm === '' ? null : parseFloat(dbData.shoulder_cm),
        waist_cm: dbData.waist_cm === '' ? null : parseFloat(dbData.waist_cm),
        hip_cm: dbData.hip_cm === '' ? null : parseFloat(dbData.hip_cm),
        height_cm: dbData.height_cm === '' ? null : parseFloat(dbData.height_cm),
        unit_price: dbData.unit_price === '' ? 0 : parseFloat(dbData.unit_price),
        quantity: dbData.quantity === '' ? 0 : parseInt(dbData.quantity),
        tenant_id: tenantId
      }

      const { data, error } = await supabase
        .from('inventory')
        .insert([cleanData])
        .select()

      if (error) {
        setFormError(error.message)
      } else {
        setInventory(prev => [...prev, data[0]].sort((a, b) => a.item_name.localeCompare(b.item_name)))
        setIsAddModalOpen(false)
        resetForm()
      }
    } catch (err) {
      setFormError('Something went wrong')
    } finally {
      setFormLoading(false)
    }
  }

  // Edit item
  const handleEditItem = async (e) => {
    e.preventDefault()
    if (!formData.item_name || !formData.size) {
      setFormError('Item name and size are required')
      return
    }

    setFormLoading(true)
    try {
      // Strip UI-only fields (_in)
      const { chest_in, shoulder_in, waist_in, hip_in, height_in, ...dbData } = formData

      // Convert empty strings to null for numeric fields
      const cleanData = {
        ...dbData,
        chest_cm: dbData.chest_cm === '' ? null : parseFloat(dbData.chest_cm),
        shoulder_cm: dbData.shoulder_cm === '' ? null : parseFloat(dbData.shoulder_cm),
        waist_cm: dbData.waist_cm === '' ? null : parseFloat(dbData.waist_cm),
        hip_cm: dbData.hip_cm === '' ? null : parseFloat(dbData.hip_cm),
        height_cm: dbData.height_cm === '' ? null : parseFloat(dbData.height_cm),
        unit_price: dbData.unit_price === '' ? 0 : parseFloat(dbData.unit_price),
        quantity: dbData.quantity === '' ? 0 : parseInt(dbData.quantity)
      }

      const { data, error } = await supabase
        .from('inventory')
        .update(cleanData)
        .eq('id', selectedItem.id)
        .select()

      if (error) {
        setFormError(error.message)
      } else {
        setInventory(prev => prev.map(item => item.id === selectedItem.id ? data[0] : item))
        setIsEditModalOpen(false)
        setSelectedItem(null)
        resetForm()
      }
    } catch (err) {
      setFormError('Something went wrong')
    } finally {
      setFormLoading(false)
    }
  }

  // Delete item
  const handleDeleteItem = async () => {
    setFormLoading(true)
    try {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', selectedItem.id)

      if (error) {
        setFormError(error.message)
      } else {
        setInventory(prev => prev.filter(item => item.id !== selectedItem.id))
        setIsDeleteModalOpen(false)
        setSelectedItem(null)
      }
    } catch (err) {
      setFormError('Something went wrong')
    } finally {
      setFormLoading(false)
    }
  }

  // Open edit modal
  const openEditModal = (item) => {
    setSelectedItem(item)

    // Pre-calculate inches for display
    const chest_in = item.chest_cm ? (item.chest_cm / 2.54).toFixed(2) : ''
    const shoulder_in = item.shoulder_cm ? (item.shoulder_cm / 2.54).toFixed(2) : ''
    const waist_in = item.waist_cm ? (item.waist_cm / 2.54).toFixed(2) : ''
    const hip_in = item.hip_cm ? (item.hip_cm / 2.54).toFixed(2) : ''
    const height_in = item.height_cm ? (item.height_cm / 2.54).toFixed(2) : ''

    setFormData({
      item_name: item.item_name,
      size: item.size,
      chest_cm: item.chest_cm || '',
      chest_in,
      shoulder_cm: item.shoulder_cm || '',
      shoulder_in,
      waist_cm: item.waist_cm || '',
      waist_in,
      hip_cm: item.hip_cm || '',
      hip_in,
      height_cm: item.height_cm || '',
      height_in,
      sku: item.sku || '',
      category: item.category,
      department: item.department || '',
      position: item.position || '',
      fabric: item.fabric || '',
      care: item.care || '',
      image_url: item.image_url || '',
      unit_price: item.unit_price || 0,
      quantity: item.quantity
    })
    setIsEditModalOpen(true)
    setActionMenuOpen(null)
  }

  // Open delete modal
  const openDeleteModal = (item) => {
    setSelectedItem(item)
    setIsDeleteModalOpen(true)
    setActionMenuOpen(null)
  }

  // Quick restock
  const handleQuickRestock = async (item, amount) => {
    const newQuantity = item.quantity + amount
    try {
      const { data, error } = await supabase
        .from('inventory')
        .update({ quantity: newQuantity })
        .eq('id', item.id)
        .select()

      if (!error) {
        setInventory(prev => prev.map(i => i.id === item.id ? data[0] : i))
      }
    } catch (err) {
      console.log('Restock error:', err)
    }
    setActionMenuOpen(null)
  }

  if (loading) {
    return (
      <Layout currentPath={currentPath} onNavigate={onNavigate} onLogout={onLogout} profile={profile}>
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">Loading inventory...</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout currentPath={currentPath} onNavigate={onNavigate} onLogout={onLogout} profile={profile}>
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Inventory</h1>
          <p className="text-gray-500">
            {profile?.role === 'super_admin'
              ? 'Manage all tenant inventory'
              : 'View your uniform stock levels'}
          </p>
        </div>
        {profile?.role === 'super_admin' && (
          <button
            onClick={() => {
              resetForm()
              setIsAddModalOpen(true)
            }}
            className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-3 rounded-2xl font-medium hover:bg-gray-800 transition-colors touch-target"
          >
            <Plus className="w-5 h-5" />
            Add Item
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card padding="small" ghost>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl flex-shrink-0 flex items-center justify-center">
              <Package className="w-5 h-5 md:w-6 md:h-6 text-gray-600" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] md:text-sm text-gray-500">Total SKUs</p>
            </div>
            <div className="text-xs md:text-sm font-bold text-gray-900 flex-shrink-0">{totalItems}</div>
          </div>
        </Card>

        <Card padding="small" ghost>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl flex-shrink-0 flex items-center justify-center">
              <Package className="w-5 h-5 md:w-6 md:h-6 text-yellow-600" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] md:text-sm text-gray-500">Low Stock</p>
            </div>
            <div className="text-xs md:text-sm font-bold text-yellow-600 flex-shrink-0">{lowStockItems}</div>
          </div>
        </Card>

        <Card padding="small" ghost>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl flex-shrink-0 flex items-center justify-center">
              <Package className="w-5 h-5 md:w-6 md:h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] md:text-sm text-gray-500">Out of Stock</p>
            </div>
            <div className="text-xs md:text-sm font-bold text-red-600 flex-shrink-0">{outOfStockItems}</div>
          </div>
        </Card>
      </div>

      {/* Filters Area */}
      <Card padding="small" className="mb-8 border border-gray-100">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
          <div className="flex items-center gap-2 text-gray-400 pr-4 lg:border-r border-gray-100">
            <Filter className="w-5 h-5" />
            <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Filters:</span>
          </div>

          <div className="flex-1 flex flex-wrap gap-3">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-transparent border-none text-sm font-bold text-gray-900 focus:ring-0 cursor-pointer py-2"
            >
              <option value="all">All Departments</option>
              {[...new Set(inventory.map(i => i.category).filter(Boolean))].map(cat => (
                <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
              ))}
            </select>

            <select
              value={filterFabric}
              onChange={(e) => setFilterFabric(e.target.value)}
              className="bg-transparent border-none text-sm font-bold text-gray-900 focus:ring-0 cursor-pointer py-2"
            >
              <option value="all">All Fabrics</option>
              {[...new Set(inventory.map(i => i.fabric).filter(Boolean))].map(fab => (
                <option key={fab} value={fab}>{fab}</option>
              ))}
            </select>

            <select
              value={filterCare}
              onChange={(e) => setFilterCare(e.target.value)}
              className="bg-transparent border-none text-sm font-bold text-gray-900 focus:ring-0 cursor-pointer py-2"
            >
              <option value="all">All Care Types</option>
              {[...new Set(inventory.map(i => i.care).filter(Boolean))].map(care => (
                <option key={care} value={care}>{care}</option>
              ))}
            </select>
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search product or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-gray-100 transition-all font-medium"
            />
          </div>
        </div>
      </Card>

      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.name}
              product={product}
              profile={profile}
              setSelectedProduct={setSelectedProduct}
              setIsDetailsModalOpen={setIsDetailsModalOpen}
              setSelectedSize={setSelectedSize}
              actionMenuOpen={actionMenuOpen}
              setActionMenuOpen={setActionMenuOpen}
              handleQuickRestock={handleQuickRestock}
              openEditModal={openEditModal}
              openDeleteModal={openDeleteModal}

            />
          ))}
        </div>

        {
          filteredProducts.length === 0 && (
            <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-gray-100 mb-12">
              <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-1">No products found</h3>
              <p className="text-gray-500">Try adjusting your filters or search query</p>
            </div>
          )
        }

        {/* Product Details Modal */}
        <Modal
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false)
            setSelectedProduct(null)
            setSelectedSize(null)
          }}
          title=""
          maxWidth="2xl"
          showCloseButton={false}
        >
          {selectedProduct ? (
            <div className="p-8 flex flex-col bg-white">
              {/* Close button - top right */}
              <div className="absolute top-4 right-4">
                <button 
                  onClick={() => {
                    setIsDetailsModalOpen(false)
                    setSelectedProduct(null)
                    setSelectedSize(null)
                  }}
                  className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Product Image with Title/SKU/Price Row - Desktop: 2 columns, Mobile: 1 column */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-6 items-start">
                {/* Left Column: Image */}
                <div className="bg-gradient-to-br from-purple-100 to-purple-50 rounded-3xl p-8 flex items-center justify-center aspect-square">
                  {selectedProduct.image_url ? (
                    <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-gray-300 flex flex-col items-center">
                      <Package className="w-16 h-16 mb-2 opacity-20" />
                      <span className="text-sm uppercase font-black tracking-wide opacity-30">No Image</span>
                    </div>
                  )}
                </div>

                {/* Right Column: Title, SKU, Price */}
                <div className="flex flex-col justify-center lg:justify-start">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedProduct.name}</h2>
                  <p className="text-xs md:text-sm text-gray-400 font-medium mb-4">SKU: {selectedProduct.sku}</p>
                  <div className="inline-flex w-fit items-center justify-center bg-gray-900 text-white px-6 py-2 rounded-full font-bold text-xs md:text-sm">
                    ${(selectedProduct.price || 0).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Info Rows (Department, Fabric, Care) */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl mb-6 border border-gray-100">
                <div className="text-xs md:text-sm text-gray-500 font-medium">Department</div>
                <div className="text-xs md:text-sm font-medium text-gray-900">{selectedProduct.department || 'Apparel'}</div>

                <div className="text-xs md:text-sm text-gray-500 font-medium">Fabric</div>
                <div className="text-xs md:text-sm font-medium text-gray-900">{selectedProduct.fabric || '100% Organic Cotton'}</div>

                <div className="text-xs md:text-sm text-gray-500 font-medium">Care Instructions</div>
                <div className="text-xs md:text-sm font-medium text-gray-900 flex items-center gap-2">{selectedProduct.care || 'Check Label'} <Info className="w-4 h-4 text-blue-500" /></div>
              </div>

              {/* Size & Measurements Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs md:text-sm font-bold text-gray-900">Size & Measurements</h3>
                <button className="text-xs md:text-sm text-blue-600 font-bold flex items-center gap-1">
                  <span>Selected: {selectedSize || (selectedProduct.items[0] && selectedProduct.items[0].size)}</span>
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Measurement Badges Grid */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-blue-50/80 rounded-2xl p-4 flex items-center gap-3 border border-blue-100">
                  <Ruler className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="text-xs md:text-sm font-bold text-gray-400 uppercase tracking-wide">Chest</div>
                    <div className="text-xs md:text-sm font-bold text-gray-900">{(selectedProduct.items.find(i => i.size === selectedSize) || selectedProduct.items[0]).chest_cm || '—'} cm</div>
                  </div>
                </div>

                <div className="bg-blue-50/80 rounded-2xl p-4 flex items-center gap-3 border border-blue-100">
                  <Ruler className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="text-xs md:text-sm font-bold text-gray-400 uppercase tracking-wide">Shoulder</div>
                    <div className="text-xs md:text-sm font-bold text-gray-900">{(selectedProduct.items.find(i => i.size === selectedSize) || selectedProduct.items[0]).shoulder_cm || '—'} cm</div>
                  </div>
                </div>

                <div className="bg-blue-50/80 rounded-2xl p-4 flex items-center gap-3 border border-blue-100">
                  <Ruler className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="text-xs md:text-sm font-bold text-gray-400 uppercase tracking-wide">Waist</div>
                    <div className="text-xs md:text-sm font-bold text-gray-900">{(selectedProduct.items.find(i => i.size === selectedSize) || selectedProduct.items[0]).waist_cm || '—'} cm</div>
                  </div>
                </div>

                <div className="bg-blue-50/80 rounded-2xl p-4 flex items-center gap-3 border border-blue-100">
                  <Ruler className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="text-xs md:text-sm font-bold text-gray-400 uppercase tracking-wide">Weight</div>
                    <div className="text-xs md:text-sm font-bold text-gray-900">280g</div>
                  </div>
                </div>
              </div>

              {/* Stock Availability Header */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs md:text-sm font-bold text-gray-900">Stock Availability</h3>
                <span className="text-xs md:text-sm text-gray-400">{selectedProduct.totalQuantity} units total</span>
              </div>

              {/* Size Chips */}
              <div className="flex items-center gap-3 flex-wrap mb-6">
                {selectedProduct.items.map((item) => (
                  <button
                    key={item.size}
                    onClick={() => setSelectedSize(item.size)}
                    className={`px-4 py-3 rounded-full text-xs md:text-sm font-semibold transition-all flex items-center gap-3 border ${
                      selectedSize === item.size
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-bold ${
                      selectedSize === item.size
                        ? 'bg-white text-gray-900'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {item.size}
                    </div>
                    <div className="text-xs md:text-sm opacity-80">{item.quantity} units</div>
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const chosen = selectedProduct.items.find(i => i.size === selectedSize) || selectedProduct.items[0]
                    const payload = {
                      id: chosen.id,
                      name: selectedProduct.name,
                      size: chosen.size,
                      price: selectedProduct.price || chosen.unit_price || 0,
                      stock_quantity: chosen.quantity,
                      image_url: selectedProduct.image_url
                    }
                    addItem(payload)
                    setCartOpen(true)
                    setIsDetailsModalOpen(false)
                  }}
                  className="flex-1 py-3 px-6 rounded-2xl bg-white border-2 border-gray-900 text-gray-900 font-bold text-xs md:text-sm flex items-center justify-center gap-2 hover:bg-gray-900 hover:text-white transition-all"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Add to Cart
                </button>

                <button
                  onClick={() => {
                    const chosen = selectedProduct.items.find(i => i.size === selectedSize) || selectedProduct.items[0]
                    const payload = {
                      id: chosen.id,
                      name: selectedProduct.name,
                      size: chosen.size,
                      price: selectedProduct.price || chosen.unit_price || 0,
                      stock_quantity: chosen.quantity,
                      image_url: selectedProduct.image_url
                    }
                    addItem(payload)
                    setCartOpen(true)
                    setIsDetailsModalOpen(false)
                  }}
                  className="flex-1 py-3 px-6 rounded-2xl bg-gray-900 text-white font-bold text-xs md:text-sm hover:bg-black transition-all"
                >
                  Buy Now
                </button>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-gray-500">
              <div className="animate-spin w-8 h-8 border-2 border-gray-200 border-t-gray-900 rounded-full mx-auto mb-4"></div>
              <div>Loading product...</div>
            </div>
          )}
        </Modal>

        <Modal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false)
            resetForm()
          }}
          title="Add Inventory Item"
        >
          <ItemForm
            onSubmit={handleAddItem}
            submitLabel="Add Item"
            formData={formData}
            handleInputChange={handleInputChange}
            setIsAddModalOpen={setIsAddModalOpen}
            setIsEditModalOpen={setIsEditModalOpen}
            resetForm={resetForm}
            formLoading={formLoading}
            formError={formError}
          />
        </Modal>

        {/* Edit Item Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setSelectedItem(null)
            resetForm()
          }}
          title="Edit Inventory Item"
        >
          <ItemForm
            onSubmit={handleEditItem}
            submitLabel="Save Changes"
            formData={formData}
            handleInputChange={handleInputChange}
            setIsAddModalOpen={setIsAddModalOpen}
            setIsEditModalOpen={setIsEditModalOpen}
            resetForm={resetForm}
            formLoading={formLoading}
            formError={formError}
          />
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false)
            setSelectedItem(null)
          }}
          title="Delete Item"
          maxWidth="sm"
        >
          <div className="p-6">
            <p className="text-gray-600 mb-6 text-center">
              Are you sure you want to delete <br /><strong className="text-gray-900 text-lg">{selectedItem?.item_name}</strong>?<br />
              <span className="text-sm text-red-500">This action cannot be undone.</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false)
                  setSelectedItem(null)
                }}
                className="flex-1 px-4 py-3 rounded-2xl border border-gray-100 text-gray-700 font-bold hover:bg-gray-50 transition-colors uppercase text-xs tracking-widest"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteItem}
                disabled={formLoading}
                className="flex-1 px-4 py-3 rounded-2xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors disabled:opacity-50 uppercase text-xs tracking-widest"
              >
                {formLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </Modal>

        {/* Click outside to close action menu */}
        {
          actionMenuOpen && (
            <div
              className="fixed inset-0 z-[5]"
              onClick={() => setActionMenuOpen(null)}
            />
          )
        }
      </>
    </Layout >
  )
}
